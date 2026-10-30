const { searchOpenLibrary } = require("./bookProviders/openLibrary");
const { searchGoogleBooks } = require("./bookProviders/googleBooks");

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map();

function normalize(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function deduplicateBooks(books) {
  const unique = new Map();
  for (const book of books) {
    const key = `${normalize(book.title)}::${normalize(book.author)}`;
    const current = unique.get(key);
    if (!current) {
      unique.set(key, book);
      continue;
    }
    // A record's provider and ID must always come from the same result.
    const currentQuality = Number(Boolean(current.coverUrl)) + Number(Boolean(current.genre));
    const nextQuality = Number(Boolean(book.coverUrl)) + Number(Boolean(book.genre));
    const winner = nextQuality > currentQuality ? book : current;
    unique.set(key, { ...winner, genre: winner.genre || current.genre || book.genre || "" });
  }
  return [...unique.values()];
}

async function searchBookCatalog(query, limit = 12) {
  const cleanQuery = String(query || "").trim();
  const cacheKey = `${normalize(cleanQuery)}::${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.books;

  const results = await Promise.allSettled([
    searchOpenLibrary(cleanQuery, limit),
    searchGoogleBooks(cleanQuery, limit),
  ]);
  if (results.every((result) => result.status === "rejected")) {
    throw new Error("All book catalog providers are unavailable");
  }
  const books = results.filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value);
  const uniqueBooks = deduplicateBooks(books).slice(0, limit * 2);
  cache.set(cacheKey, { books: uniqueBooks, expiresAt: Date.now() + CACHE_TTL_MS });
  return uniqueBooks;
}

module.exports = { searchBookCatalog };
