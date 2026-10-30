
const { searchOpenLibrary } = require("./bookProviders/openLibrary");
const { searchGoogleBooks } = require("./bookProviders/googleBooks");

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map();

function normalize(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function deduplicateBooks(books) {
  const unique = new Map();

  for (const book of books) {
    const key = `${normalize(book.title)}::${normalize(book.author)}`;

    if (!unique.has(key)) {
      unique.set(key, book);
      continue;
    }

    const current = unique.get(key);

    const preferIncoming =
      (!current.coverUrl && book.coverUrl) ||
      (!current.openLibraryKey && book.openLibraryKey);

    if (preferIncoming) {
      unique.set(key, {
        ...current,
        ...book,
        coverUrl: book.coverUrl || current.coverUrl,
        openLibraryKey:
          book.openLibraryKey || current.openLibraryKey,
        genre: book.genre || current.genre || "",
      });
    } else if (!current.genre && book.genre) {
      unique.set(key, {
        ...current,
        genre: book.genre,
      });
    }
  }

  return [...unique.values()];
}

async function searchBookCatalog(query, limit = 12) {
  const cleanQuery = String(query || "").trim();
  const cacheKey = `${normalize(cleanQuery)}::${limit}`;
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.books;
  }

  const results = await Promise.allSettled([
    searchOpenLibrary(cleanQuery, limit),
    searchGoogleBooks(cleanQuery, limit),
  ]);

  const books = results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value);

  if (books.length === 0) {
    const errors = results
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason);

    if (errors.length === results.length) {
      throw new Error("All book catalog providers are unavailable");
    }
  }

  const uniqueBooks = deduplicateBooks(books).slice(0, limit * 2);

  cache.set(cacheKey, {
    books: uniqueBooks,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return uniqueBooks;
}

module.exports = { searchBookCatalog };
