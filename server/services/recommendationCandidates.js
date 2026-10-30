
const { normalizeBookGenre } = require("./bookGenre");

const OPEN_LIBRARY_URL = "https://openlibrary.org/search.json";
const REQUEST_TIMEOUT_MS = 15000;
const MAX_RECOMMENDATIONS = 8;

function normalize(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function statusWeight(status) {
  return status === "Finished" ? 3 : status === "Reading" ? 2 : 1;
}

function getPreferredGenres(savedBooks = [], interests = []) {
  const scores = new Map();

  function add(name, weight) {
    if (typeof name !== "string" || !name.trim()) return;

    const key = normalize(name);
    const previous = scores.get(key);

    scores.set(key, {
      name: previous?.name || name.trim(),
      score: (previous?.score || 0) + weight,
    });
  }

  for (const book of savedBooks) {
    add(book.genre, statusWeight(book.status));
  }

  for (const interest of interests) {
    add(interest, 3);
  }

  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function getSearchSignals(preferredGenres = [], savedBooks = []) {
  const signals = [];
  const seen = new Set();

  function add(type, value, weight) {
    if (typeof value !== "string" || !value.trim()) return;

    const key = `${type}:${normalize(value)}`;
    if (seen.has(key)) return;

    seen.add(key);
    signals.push({
      type,
      value: value.trim(),
      weight,
    });
  }

  for (const genre of preferredGenres.slice(0, 3)) {
    add("genre", genre.name, genre.score + 2);
  }

  const rankedBooks = [...savedBooks].sort(
    (a, b) => statusWeight(b.status) - statusWeight(a.status)
  );

  for (const book of rankedBooks) {
    if (signals.filter((signal) => signal.type === "author").length >= 3) {
      break;
    }

    if (normalize(book.author) !== "unknown author") {
      add("author", book.author, statusWeight(book.status) + 2);
    }
  }

  for (const book of rankedBooks) {
    if (signals.filter((signal) => signal.type === "title").length >= 3) {
      break;
    }

    add("title", book.title, statusWeight(book.status) + 1);
  }

  return signals;
}

async function searchOpenLibrary(signal, limit) {
  const params = new URLSearchParams({
    limit: String(limit),
    fields: "key,title,author_name,cover_i,first_publish_year,subject",
  });

  if (signal.type === "author") {
    params.set("author", signal.value);
  } else if (signal.type === "title") {
    params.set("title", signal.value);
  } else if (signal.type === "subject") {
    params.set("subject", signal.value);
  } else {
    params.set("q", signal.value);
  }

  const response = await fetch(`${OPEN_LIBRARY_URL}?${params}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Open Library HTTP ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data.docs) ? data.docs : [];
}

function getSavedIdentity(savedBooks) {
  return {
    keys: new Set(
      savedBooks.map((book) => book.openLibraryKey).filter(Boolean)
    ),
    titles: new Set(
      savedBooks.map((book) => normalize(book.title)).filter(Boolean)
    ),
    titleAuthors: new Set(
      savedBooks.map(
        (book) => `${normalize(book.title)}:${normalize(book.author)}`
      )
    ),
  };
}

function isSavedBook(item, savedIdentity) {
  const title = normalize(item.title);
  const authors = Array.isArray(item.author_name)
    ? item.author_name
    : [];

  return (
    savedIdentity.keys.has(item.key) ||
    savedIdentity.titles.has(title) ||
    authors.some((author) =>
      savedIdentity.titleAuthors.has(`${title}:${normalize(author)}`)
    )
  );
}

function getReason(signal) {
  if (signal.type === "author") {
    return `More books by ${signal.value}, an author on your bookshelf.`;
  }

  if (signal.type === "subject") {
    return `Related to themes found in books on your bookshelf.`;
  }

  if (signal.type === "title") {
    return `Related to ${signal.value} on your bookshelf.`;
  }

  return `Matches your interest in ${signal.value}.`;
}

function addCandidates(candidates, docs, signal, savedIdentity) {
  for (const item of docs) {
    if (
      typeof item.key !== "string" ||
      !/^\/works\/OL\d+W$/.test(item.key) ||
      typeof item.title !== "string" ||
      !item.title.trim() ||
      isSavedBook(item, savedIdentity)
    ) {
      continue;
    }

    const genre = normalizeBookGenre(item.subject);
    const previous = candidates.get(item.key);

    if (previous) {
      previous.score += signal.weight;

      if (!previous.genre && genre) {
        previous.genre = genre;
      }

      continue;
    }

    candidates.set(item.key, {
      openLibraryKey: item.key,
      title: item.title.trim(),
      author: item.author_name?.[0] || "Unknown author",
      genre,
      firstPublishYear: item.first_publish_year || null,
      coverUrl: item.cover_i
        ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg`
        : "",
      recommendedBecause: getReason(signal),
      score: signal.weight,
    });
  }
}

function collectRelatedSubjects(results, savedBooks) {
  const subjects = new Map();
  const savedTitles = new Set(
    savedBooks.map((book) => normalize(book.title))
  );

  for (const result of results) {
    if (
      result.status !== "fulfilled" ||
      result.value.signal.type !== "title"
    ) {
      continue;
    }

    const { docs } = result.value;

    for (const item of docs) {
      if (!savedTitles.has(normalize(item.title))) continue;

      for (const subject of (item.subject || []).slice(0, 20)) {
        if (typeof subject !== "string") continue;

        const value = subject.trim();

        if (
          value.length < 4 ||
          value.length > 65 ||
          /^(fiction|general|accessible book|protected daisy|large type books)$/i.test(value)
        ) {
          continue;
        }

        const key = normalize(value);
        subjects.set(key, {
          value,
          count: (subjects.get(key)?.count || 0) + 1,
        });
      }
    }
  }

  return [...subjects.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map((subject) => ({
      type: "subject",
      value: subject.value,
      weight: 4,
    }));
}

async function runSearches(signals, limit) {
  return Promise.allSettled(
    signals.map(async (signal) => ({
      signal,
      docs: await searchOpenLibrary(signal, limit),
    }))
  );
}

async function fetchCandidates(
  preferredGenres,
  savedBooks,
  { limit = 20 } = {}
) {
  const signals = getSearchSignals(preferredGenres, savedBooks);
  const savedIdentity = getSavedIdentity(savedBooks);
  const candidates = new Map();

  if (!signals.length) {
    return {
      candidates: [],
      successfulSearches: 0,
    };
  }

  const firstResults = await runSearches(signals, limit);
  let successfulSearches = 0;

  firstResults.forEach((result, index) => {
    if (result.status !== "fulfilled") {
      console.warn("Recommendation catalog search failed:", {
        type: signals[index].type,
        value: signals[index].value,
        reason: result.reason?.message || String(result.reason),
      });
      return;
    }

    successfulSearches += 1;

    addCandidates(
      candidates,
      result.value.docs,
      result.value.signal,
      savedIdentity
    );
  });

  // Search subjects discovered from the user's existing titles.
  // This provides related books even when saved genres are empty.
  const relatedSubjects = collectRelatedSubjects(firstResults, savedBooks);

  if (relatedSubjects.length) {
    const subjectResults = await runSearches(relatedSubjects, limit);

    subjectResults.forEach((result, index) => {
      if (result.status !== "fulfilled") {
        console.warn("Related subject search failed:", {
          subject: relatedSubjects[index].value,
          reason: result.reason?.message || String(result.reason),
        });
        return;
      }

      successfulSearches += 1;

      addCandidates(
        candidates,
        result.value.docs,
        result.value.signal,
        savedIdentity
      );
    });
  }

  return {
    candidates: [...candidates.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 60),
    successfulSearches,
  };
}

function parseAIChoices(content) {
  if (typeof content !== "string") {
    throw new Error("AI response is not text");
  }

  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");

  if (start < 0 || end <= start) {
    throw new Error("AI response has no JSON object");
  }

  const parsed = JSON.parse(content.slice(start, end + 1));

  if (!Array.isArray(parsed.recommendations)) {
    throw new Error("Invalid AI recommendation structure");
  }

  return parsed.recommendations;
}

function chooseAIRecommendations(
  choices,
  candidates,
  count = MAX_RECOMMENDATIONS
) {
  const lookup = new Map(
    candidates.map((book) => [book.openLibraryKey, book])
  );

  const selected = new Set();
  const books = [];

  for (const choice of choices) {
    const key = choice?.openLibraryKey;

    if (
      typeof key !== "string" ||
      !lookup.has(key) ||
      selected.has(key)
    ) {
      continue;
    }

    selected.add(key);

    books.push({
      ...lookup.get(key),
      recommendedBecause:
        typeof choice.reason === "string" && choice.reason.trim()
          ? choice.reason.trim().slice(0, 160)
          : lookup.get(key).recommendedBecause,
    });

    if (books.length >= count) break;
  }

  return books;
}

module.exports = {
  getPreferredGenres,
  getSearchSignals,
  fetchCandidates,
  parseAIChoices,
  chooseAIRecommendations,
};
