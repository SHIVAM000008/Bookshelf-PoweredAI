
import { useState } from "react";
import { apiRequest } from "../lib/api";
import "./DiscoverBooks.css";

function normalize(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function isSameBook(candidate, saved) {
  if (
    candidate.openLibraryKey &&
    saved.openLibraryKey &&
    candidate.openLibraryKey === saved.openLibraryKey
  ) {
    return true;
  }

  if (
    candidate.catalogProvider &&
    candidate.catalogId &&
    candidate.catalogProvider === saved.catalogProvider &&
    candidate.catalogId === saved.catalogId
  ) {
    return true;
  }

  return (
    normalize(candidate.title) === normalize(saved.title) &&
    normalize(candidate.author) === normalize(saved.author)
  );
}

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
      book.catalogId ||
      book.openLibraryKey ||
      `${book.title}-${index}`
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
      const [catalogData, bookshelfData] = await Promise.all([
        apiRequest(
          `/catalog/search?q=${encodeURIComponent(searchTerm)}`
        ),
        apiRequest("/books"),
      ]);

      const savedBooks = bookshelfData.books || [];
      const catalogBooks = catalogData.books || [];

      setResults(
  catalogBooks
    .filter((book) =>
      !savedBooks.some((saved) =>
        isSameBook(book, saved)
      )
    )
    .slice(0, 5)
);
    } catch (err) {
      setError(
        err.message || "Could not search the catalog."
      );
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
          genre: book.genre || "",
          status: "Want to Read",
          description: "",
          coverUrl: book.coverUrl || "",
          openLibraryKey: book.openLibraryKey || "",
          catalogProvider: book.catalogProvider || "",
          catalogId: book.catalogId || "",
        }),
      });

      const savedBook = data.book;

      setResults((previous) =>
        previous.filter(
          (candidate) =>
            !isSameBook(candidate, savedBook)
        )
      );

      onBookAdded?.(savedBook);

      setSuccess(
        data.alreadySaved
          ? `"${book.title}" is already on your bookshelf.`
          : `"${book.title}" added to your bookshelf!`
      );
    } catch (err) {
      setError(
        err.message || "Could not add this book."
      );
    } finally {
      setAddingKey("");
    }
  }

  return (
    <section className="discover-books">
      <form
        className="discover-search"
        onSubmit={handleSearch}
      >
        <input
          type="search"
          placeholder="Search for a book or author..."
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
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

      {loading && (
        <p role="status">
          Searching book catalogs...
        </p>
      )}

      {!loading &&
        searched &&
        !error &&
        results.length === 0 && (
          <p>
            No new books found. Matching books may
            already be on your bookshelf.
          </p>
        )}

      <div className="catalog-grid">
        {results.map((book, index) => {
          const bookKey = getBookKey(book, index);

          return (
            <article
              className="catalog-card"
              key={bookKey}
            >
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
                Genre: {book.genre || "Not specified"}
              </p>
              <p>
                Published:{" "}
                {book.firstPublishYear || "Unknown"}
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
