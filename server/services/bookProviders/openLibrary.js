
const { normalizeBookGenre } = require("../bookGenre");

const OPEN_LIBRARY_URL = "https://openlibrary.org/search.json";

async function searchOpenLibrary(query, limit = 12) {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    fields: "key,title,author_name,first_publish_year,cover_i,subject",
  });

  const response = await fetch(`${OPEN_LIBRARY_URL}?${params}`, {
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Open Library returned HTTP ${response.status}`);
  }

  const data = await response.json();

  return (data.docs || [])
    .filter((book) => book.key && book.title)
    .map((book) => ({
      catalogProvider: "openlibrary",
      catalogId: book.key,
      openLibraryKey: book.key,
      title: book.title,
      author: book.author_name?.[0] || "Unknown author",
      genre: normalizeBookGenre(book.subject),
      firstPublishYear: book.first_publish_year || null,
      coverUrl: book.cover_i
        ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
        : "",
    }));
}

module.exports = { searchOpenLibrary };
