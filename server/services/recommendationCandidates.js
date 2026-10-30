const { normalizeBookGenre } = require("./bookGenre");

const OPEN_LIBRARY_URL = "https://openlibrary.org/search.json";
const REQUEST_TIMEOUT_MS = 15000;

function normalize(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function getPreferredGenres(savedBooks, interests = []) {
  const scores = new Map();
  const add = (name, weight) => {
    if (typeof name !== "string" || !name.trim()) return;
    const key = normalize(name);
    const previous = scores.get(key);
    scores.set(key, {
      name: previous?.name || name.trim(),
      score: (previous?.score || 0) + weight,
    });
  };

  for (const book of savedBooks) {
    add(book.genre, book.status === "Finished" ? 3 : book.status === "Reading" ? 2 : 1);
  }
  for (const interest of interests) add(interest, 3);
  return [...scores.values()].sort((a, b) => b.score - a.score).slice(0, 3);
}

async function fetchCandidates(preferredGenres, savedBooks, { limit = 20 } = {}) {
  const savedKeys = new Set(savedBooks.map((book) => book.openLibraryKey).filter(Boolean));
  const savedTitles = new Set(savedBooks.map((book) => normalize(book.title)).filter(Boolean));
  const candidates = new Map();

  const results = await Promise.allSettled(preferredGenres.map(async (preference) => {
    const params = new URLSearchParams({
      q: preference.name,
      limit: String(limit),
      fields: "key,title,author_name,cover_i,first_publish_year,subject",
    });
    const response = await fetch(`${OPEN_LIBRARY_URL}?${params}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Open Library HTTP ${response.status}`);
    const data = await response.json();
    return Array.isArray(data.docs) ? data.docs : [];
  }));

  let successfulSearches = 0;
  results.forEach((result, index) => {
    if (result.status !== "fulfilled") {
      console.warn("Recommendation catalog search failed:", {
        genre: preferredGenres[index].name,
        reason: result.reason?.message || String(result.reason),
      });
      return;
    }
    successfulSearches += 1;
    for (const item of result.value) {
      if (typeof item.key !== "string" || !/^\/works\/OL\d+W$/.test(item.key) ||
          typeof item.title !== "string" || !item.title.trim()) continue;
      const title = normalize(item.title);
      if (savedKeys.has(item.key) || savedTitles.has(title)) continue;
      const genre = normalizeBookGenre(item.subject);
      const previous = candidates.get(item.key);
      if (previous) {
        if (!previous.genre && genre) previous.genre = genre;
        continue;
      }
      candidates.set(item.key, {
        openLibraryKey: item.key,
        title: item.title,
        author: item.author_name?.[0] || "Unknown author",
        genre,
        firstPublishYear: item.first_publish_year || null,
        coverUrl: item.cover_i
          ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg`
          : "",
        recommendedBecause: `Recommended because ${preferredGenres[index].name} is one of your preferred reading genres.`,
        score: preferredGenres[index].score,
      });
    }
  });

  return {
    candidates: [...candidates.values()].sort((a, b) => b.score - a.score),
    successfulSearches,
  };
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

function chooseAIRecommendations(choices, candidates, count = 8) {
  const lookup = new Map(candidates.map((book) => [book.openLibraryKey, book]));
  const selected = new Set();
  const books = [];
  for (const choice of choices) {
    const key = choice?.openLibraryKey;
    if (typeof key !== "string" || !lookup.has(key) || selected.has(key)) continue;
    selected.add(key);
    books.push({
      ...lookup.get(key),
      recommendedBecause: typeof choice.reason === "string" && choice.reason.trim()
        ? choice.reason.trim().slice(0, 160)
        : "Matches your reading interests.",
    });
    if (books.length >= count) break;
  }
  return books;
}

module.exports = { getPreferredGenres, fetchCandidates, parseAIChoices, chooseAIRecommendations };
