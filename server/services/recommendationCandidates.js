const { normalizeBookGenre } = require("./bookGenre");
const { searchGoogleBooks } = require("./bookProviders/googleBooks");

const OPEN_LIBRARY_URL = "https://openlibrary.org/search.json";
const REQUEST_TIMEOUT_MS = 15000;

function normalize(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}
function statusWeight(status) {
  return status === "Finished" ? 3 : status === "Reading" ? 2 : 1;
}
function getPreferredGenres(savedBooks = [], interests = []) {
  const scores = new Map();
  function add(name, weight) {
    if (typeof name !== "string" || !name.trim()) return;
    const key = normalize(name);
    const old = scores.get(key);
    scores.set(key, { name: old?.name || name.trim(), score: (old?.score || 0) + weight });
  }
  for (const book of savedBooks) add(book.genre, statusWeight(book.status));
  for (const interest of interests) add(interest, 3);
  return [...scores.values()].sort((a, b) => b.score - a.score).slice(0, 3);
}
function getSearchSignals(preferredGenres = [], savedBooks = []) {
  const signals = [];
  const seen = new Set();
  function add(type, value, weight) {
    if (typeof value !== "string" || !value.trim()) return;
    const key = `${type}:${normalize(value)}`;
    if (seen.has(key)) return;
    seen.add(key);
    signals.push({ type, value: value.trim(), weight });
  }
  for (const genre of preferredGenres.slice(0, 3)) add("genre", genre.name, genre.score + 2);
  const ranked = [...savedBooks].sort((a, b) => statusWeight(b.status) - statusWeight(a.status));
  let authors = 0;
  for (const book of ranked) {
    if (authors >= 3) break;
    if (book.author && normalize(book.author) !== "unknown author") {
      const before = signals.length;
      add("author", book.author, statusWeight(book.status) + 2);
      if (signals.length > before) authors++;
    }
  }
  let titles = 0;
  for (const book of ranked) {
    if (titles >= 3) break;
    if (book.title) {
      const before = signals.length;
      add("title", book.title, statusWeight(book.status) + 1);
      if (signals.length > before) titles++;
    }
  }
  return signals;
}
async function searchOpenLibrary(signal, limit) {
  const params = new URLSearchParams({
    limit: String(limit),
    fields: "key,title,author_name,cover_i,first_publish_year,subject",
  });
  if (signal.type === "author") params.set("author", signal.value);
  else if (signal.type === "title") params.set("title", signal.value);
  else if (signal.type === "subject") params.set("subject", signal.value);
  else params.set("q", signal.value);
  const response = await fetch(`${OPEN_LIBRARY_URL}?${params}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Open Library HTTP ${response.status}`);
  const data = await response.json();
  return Array.isArray(data.docs) ? data.docs : [];
}
function asOpenLibraryBook(item) {
  if (!/^\/works\/OL\d+W$/.test(item?.key || "") || !item?.title) return null;
  return {
    catalogProvider: "openlibrary", catalogId: item.key, openLibraryKey: item.key,
    title: item.title, author: item.author_name?.[0] || "Unknown author",
    genre: normalizeBookGenre(item.subject), firstPublishYear: item.first_publish_year || null,
    coverUrl: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : "",
  };
}
function isSaved(book, savedBooks) {
  return savedBooks.some((saved) =>
    (book.openLibraryKey && saved.openLibraryKey === book.openLibraryKey) ||
    (book.catalogProvider && book.catalogId && saved.catalogProvider === book.catalogProvider && saved.catalogId === book.catalogId) ||
    (normalize(book.title) === normalize(saved.title) && normalize(book.author) === normalize(saved.author))
  );
}
function getReason(signal) {
  if (signal.type === "author") return `More books by ${signal.value}, an author on your bookshelf.`;
  if (signal.type === "subject") return "Related to themes found in books on your bookshelf.";
  if (signal.type === "title") return `Related to ${signal.value} on your bookshelf.`;
  return `Matches your interest in ${signal.value}.`;
}
function addCandidates(map, books, signal, savedBooks) {
  for (const book of books) {
    if (!book?.catalogProvider || !book?.catalogId || !book?.title || isSaved(book, savedBooks)) continue;
    const key = `${normalize(book.title)}::${normalize(book.author)}`;
    const previous = map.get(key);
    if (previous) {
      previous.score += signal.weight;
      if (!previous.genre && book.genre) previous.genre = book.genre;
      // Keep provider and ID together. Prefer the more complete catalog record.
      if (!previous.coverUrl && book.coverUrl) {
        map.set(key, { ...book, genre: book.genre || previous.genre, score: previous.score,
          recommendedBecause: previous.recommendedBecause });
      }
      continue;
    }
    map.set(key, { ...book, score: signal.weight, recommendedBecause: getReason(signal) });
  }
}
function collectRelatedSubjects(results, savedBooks) {
  const subjects = new Map();
  const savedTitles = new Set(savedBooks.map((book) => normalize(book.title)));
  for (const result of results) {
    if (result.status !== "fulfilled" || result.value.signal.type !== "title" || result.value.provider !== "openlibrary") continue;
    for (const item of result.value.rawDocs || []) {
      if (!savedTitles.has(normalize(item.title))) continue;
      for (const subject of (item.subject || []).slice(0, 20)) {
        if (typeof subject !== "string") continue;
        const value = subject.trim();
        if (value.length < 4 || value.length > 65 || /^(fiction|general|accessible book|protected daisy|large type books)$/i.test(value)) continue;
        const key = normalize(value);
        subjects.set(key, { value, count: (subjects.get(key)?.count || 0) + 1 });
      }
    }
  }
  return [...subjects.values()].sort((a, b) => b.count - a.count).slice(0, 2)
    .map((subject) => ({ type: "subject", value: subject.value, weight: 4 }));
}
async function runSearches(signals, limit) {
  const jobs = signals.flatMap((signal) => [
    (async () => {
      const rawDocs = await searchOpenLibrary(signal, limit);
      return { provider: "openlibrary", signal, rawDocs, books: rawDocs.map(asOpenLibraryBook).filter(Boolean) };
    })(),
    (async () => {
      // The provider adapter handles the configured API key and normalizes metadata.
      const q = signal.type === "author" ? `inauthor:${signal.value}`
        : signal.type === "title" ? `intitle:${signal.value}`
        : signal.type === "subject" ? `subject:${signal.value}` : signal.value;
      const books = await searchGoogleBooks(q, Math.min(limit, 40));
      return { provider: "googlebooks", signal, books };
    })(),
  ]);
  return Promise.allSettled(jobs);
}
async function fetchCandidates(preferredGenres, savedBooks, { limit = 20 } = {}) {
  const signals = getSearchSignals(preferredGenres, savedBooks);
  if (!signals.length) return { candidates: [], successfulSearches: 0 };
  const candidates = new Map();
  let successfulSearches = 0;
  function consume(results) {
    for (const result of results) {
      if (result.status !== "fulfilled") {
        console.warn("Recommendation provider search failed:", result.reason?.message || String(result.reason));
        continue;
      }
      successfulSearches++;
      addCandidates(candidates, result.value.books, result.value.signal, savedBooks);
    }
  }
  const firstResults = await runSearches(signals, limit);
  consume(firstResults);
  const relatedSubjects = collectRelatedSubjects(firstResults, savedBooks);
  if (relatedSubjects.length) consume(await runSearches(relatedSubjects, limit));
  return { candidates: [...candidates.values()].sort((a, b) => b.score - a.score).slice(0, 60), successfulSearches };
}
function parseAIChoices(content) {
  if (typeof content !== "string") throw new Error("AI response is not text");
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI response has no JSON object");
  const parsed = JSON.parse(content.slice(start, end + 1));
  if (!Array.isArray(parsed.recommendations)) throw new Error("Invalid AI recommendation structure");
  return parsed.recommendations;
}
function candidateKey(book) {
  return `${book.catalogProvider}:${book.catalogId}`;
}
function chooseAIRecommendations(choices, candidates, count = 8) {
  const lookup = new Map(candidates.map((book) => [candidateKey(book), book]));
  const selected = new Set();
  const books = [];
  for (const choice of choices) {
    const key = `${choice?.catalogProvider}:${choice?.catalogId}`;
    if (!lookup.has(key) || selected.has(key)) continue;
    selected.add(key);
    const book = lookup.get(key);
    books.push({ ...book, recommendedBecause: typeof choice.reason === "string" && choice.reason.trim()
      ? choice.reason.trim().slice(0, 160) : book.recommendedBecause });
    if (books.length >= count) break;
  }
  return books;
}
module.exports = { getPreferredGenres, getSearchSignals, fetchCandidates, parseAIChoices, chooseAIRecommendations };
