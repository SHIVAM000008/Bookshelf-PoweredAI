
import { useState } from "react";
import { apiRequest } from "../lib/api";

export default function DiscoverBooks({ onBookAdded }) {
  // ============================================================
  // 1. SEARCH STATE
  // ============================================================

  // Search text entered by the user.
  const [query, setQuery] = useState("");

  // Books returned by the Open Library catalog API.
  const [results, setResults] = useState([]);

  // Indicates whether a catalog search is running.
  const [loading, setLoading] = useState(false);

  // Displays API errors and validation messages.
  const [error, setError] = useState("");

  // Tracks whether the user has performed a search.
  const [searched, setSearched] = useState(false);

  // ============================================================
  // 2. ADD-TO-BOOKSHELF STATE
  // ============================================================

  // Identifies the book currently being saved.
  // Used to disable its button during the API request.
  const [addingKey, setAddingKey] = useState("");

  // Displays a confirmation after a successful save.
  const [success, setSuccess] = useState("");

  // ============================================================
  // 3. SEARCH OPEN LIBRARY
  // ============================================================

  async function handleSearch(event) {
    event.preventDefault();

    const searchTerm = query.trim();

    // Backend also validates search length.
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
      // Calls our protected Express catalog endpoint.
      // Express then requests data from Open Library.
      const data = await apiRequest(
        `/catalog/search?q=${encodeURIComponent(searchTerm)}`
      );

      setResults(data.books || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // 4. SAVE A CATALOG BOOK TO MONGODB
  // ============================================================

  async function handleAddBook(book) {
    // Prevent duplicate clicks while a save is in progress.
    if (addingKey) return;

    setAddingKey(book.openLibraryKey);
    setError("");
    setSuccess("");

    try {
      // Reuse our existing protected POST /api/books route.
      // The backend determines ownership from the login cookie.
      const data = await apiRequest("/books", {
        method: "POST",
        body: JSON.stringify({
          title: book.title,
          author: book.author,
          genre: "",
          status: "Want to Read",
          description: "",
          coverUrl: book.coverUrl || "",
          openLibraryKey: book.openLibraryKey,
        }),
      });

      // Notify App.jsx that the bookshelf should refresh.
      // This callback is provided by the parent component.
      if (typeof onBookAdded === "function") {
        onBookAdded(data.book);
      }

      setSuccess(`"${book.title}" added to your bookshelf!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingKey("");
    }
  }

  // ============================================================
  // 5. RENDER THE DISCOVER BOOKS INTERFACE
  // ============================================================

  return (
    <section className="discover-books">
      <h2>Discover Books</h2>

      <p>
        Search millions of published books using Open Library.
      </p>

      {/* Search form */}
      <form
        className="discover-search"
        onSubmit={handleSearch}
      >
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

      {/* Display search or save errors */}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {/* Display successful save confirmation */}
      {success && (
        <p className="success" role="status">
          {success}
        </p>
      )}

      {/* Empty search results */}
      {!loading &&
        searched &&
        !error &&
        results.length === 0 && (
          <p>No books found. Try another search.</p>
        )}

      {/* Catalog results */}
      <div className="catalog-grid">
        {results.map((book, index) => (
          <article
            className="catalog-card"
            key={`${book.openLibraryKey}-${index}`}
          >
            {/* Book cover */}
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

            {/* Book metadata */}
            <h3>{book.title}</h3>

            <p>By {book.author}</p>

            <p>
              Published:{" "}
              {book.firstPublishYear || "Unknown"}
            </p>

            {/* Save catalog book to personal bookshelf */}
            <button
              type="button"
              onClick={() => handleAddBook(book)}
              disabled={Boolean(addingKey)}
            >
              {addingKey === book.openLibraryKey
                ? "Adding..."
                : "Add to My Bookshelf"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
