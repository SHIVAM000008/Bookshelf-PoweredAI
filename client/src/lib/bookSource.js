export function getBookSource(book) {
  const provider = book?.catalogProvider || (book?.openLibraryKey ? "openlibrary" : "");
  const id = book?.catalogId || (provider === "openlibrary" ? book?.openLibraryKey : "");
  if (provider === "openlibrary" && /^\/(works|books)\/OL[A-Za-z0-9]+$/.test(id || "")) {
    return { name: "Open Library", url: `https://openlibrary.org${id}` };
  }
  if (provider === "googlebooks" && /^[A-Za-z0-9_-]+$/.test(id || "")) {
    return { name: "Google Books", url: `https://books.google.com/books?id=${encodeURIComponent(id)}` };
  }
  return { name: "Not available", url: "" };
}

export function getBookIdentity(book) {
  const provider = book?.catalogProvider || (book?.openLibraryKey ? "openlibrary" : "");
  const id = book?.catalogId || book?.openLibraryKey;
  return provider && id ? `${provider}:${id}` : `${book?.title || ""}:${book?.author || ""}`;
}
