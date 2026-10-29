
import { useState } from "react";
import { apiRequest } from "../lib/api";
import "./DiscoverBooks.css";

export default function DiscoverBooks({ onBookAdded }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [addingKey, setAddingKey] = useState("");
  const [success, setSuccess] = useState("");

  function getBookKey(book, index = 0) {
    return `${book.catalogProvider || "openlibrary"}:${
      book.catalogId || book.openLibraryKey || `${book.title}-${index}`
    }`;
  }

  async function handleSearch(event) {
    event.preventDefault();

    const searchTerm = query.trim();

    if (searchTerm.length < 2) {
      setError("Enter at least 2 characters");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    setSearched(true);
    setResults([]);

    try {
      const data = await apiRequest(
        `/catalog/search?q=${encodeURIComponent(searchTerm)}`
      );

      setResults(data.books || []);
    } catch (err) {
      setError(err.message || "Could not search the catalog.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddBook(book) {
    const bookKey = getBookKey(book);

    if (addingKey) return;

    setAddingKey(bookKey);
    setError("");
    setSuccess("");

    try {
      const data = await apiRequest("/books", {
        method: "POST",
        body: JSON.stringify({
          title: book.title,
          author: book.author,
          genre: "",
          status: "Want to Read",
          description: "",
          coverUrl: book.coverUrl || "",
          openLibraryKey: book.openLibraryKey || "",
          catalogProvider: book.catalogProvider || "",
          catalogId: book.catalogId || "",
        }),
      });

      onBookAdded?.(data.book);

      setSuccess(
        data.alreadySaved
          ? `"${book.title}" is already on your bookshelf.`
          : `"${book.title}" added to your bookshelf!`
      );
    } catch (err) {
      setError(err.message || "Could not add this book.");
    } finally {
      setAddingKey("");
    }
  }

  return (
    <section className="discover-books">
      <form className="discover-search" onSubmit={handleSearch}>
        <input
          type="search"
          placeholder="Search for a book or author..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          minLength={2}
          maxLength={100}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {success && (
        <p className="success" role="status">
          {success}
        </p>
      )}

      {loading && <p role="status">Searching book catalogs...</p>}

      {!loading && searched && !error && results.length === 0 && (
        <p>No books found. Try another search.</p>
      )}

      <div className="catalog-grid">
        {results.map((book, index) => {
          const bookKey = getBookKey(book, index);

          return (
            <article className="catalog-card" key={bookKey}>
              {book.coverUrl ? (
                <img
                  src={book.coverUrl}
                  alt={`Cover of ${book.title}`}
                  loading="lazy"
                />
              ) : (
                <div className="cover-placeholder">
                  No cover available
                </div>
              )}

              <h3>{book.title}</h3>
              <p>By {book.author}</p>
              <p>
                Published: {book.firstPublishYear || "Unknown"}
              </p>
              <p className="catalog-source">
                Source:{" "}
                {book.catalogProvider === "googlebooks"
                  ? "Google Books"
                  : "Open Library"}
              </p>

              <button
                type="button"
                onClick={() => handleAddBook(book)}
                disabled={Boolean(addingKey)}
              >
                {addingKey === bookKey
                  ? "Adding..."
                  : "Add to My Bookshelf"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
