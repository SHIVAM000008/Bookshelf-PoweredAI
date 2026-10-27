
import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import RecommendationBookCard from "./RecommendationBookCard";
import "./AIRecommendations.css";

/**
 * Content-based recommendations.
 *
 * Uses:
 * GET /api/recommendations
 *
 * The backend scores genres and interests.
 * No OpenRouter request is made here.
 */
export default function Recommendations({ onBookAdded }) {
  const [recommendations, setRecommendations] = useState([]);
  const [basedOn, setBasedOn] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [addingKey, setAddingKey] = useState("");

  // Load recommendations from the existing backend endpoint.
  async function loadRecommendations() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const data = await apiRequest("/recommendations");

      setRecommendations(
        (data.recommendations || []).slice(0, 4)
      );

      setBasedOn(data.basedOn || []);
    } catch (err) {
      setError(
        err.message || "Could not load recommendations."
      );
    } finally {
      setLoading(false);
    }
  }

  // Load once when the component mounts.
  useEffect(() => {
    loadRecommendations();
  }, []);

  // Save a recommended book to the user's bookshelf.
  async function handleAddBook(book) {
    if (addingKey) return;

    setAddingKey(book.openLibraryKey);
    setError("");
    setMessage("");

    try {
      const data = await apiRequest("/books", {
        method: "POST",
        body: JSON.stringify({
          title: book.title,
          author: book.author,
          genre: basedOn[0] || "",
          status: "Want to Read",
          description: "",
          coverUrl: book.coverUrl || "",
          openLibraryKey: book.openLibraryKey,
        }),
      });

      // Remove the saved book from the recommendation list.
      setRecommendations((previous) =>
        previous.filter(
          (item) =>
            item.openLibraryKey !== book.openLibraryKey
        )
      );

      // Refresh the user's bookshelf through App.jsx.
      onBookAdded?.(data.book);

      setMessage(
        `"${book.title}" added to your bookshelf!`
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
    <section className="ai-recommendations">
      <div className="ai-recommendations-header">
        <div>
          <h2>Recommended for You</h2>

          <p>
            Discover books based on your reading interests
            and bookshelf activity.
          </p>
        </div>

        <button
          type="button"
          onClick={loadRecommendations}
          disabled={loading}
          className="ai-generate-button"
        >
          {loading
            ? "Loading..."
            : "Refresh Recommendations"}
        </button>
      </div>

      {basedOn.length > 0 && (
        <p className="ai-preferences">
          <strong>Based on:</strong>{" "}
          {basedOn.join(", ")}
        </p>
      )}

      {loading && (
        <p className="ai-status" role="status">
          Finding books that match your interests...
        </p>
      )}

      {error && (
        <p className="ai-error" role="alert">
          {error}
        </p>
      )}

      {message && (
        <p className="ai-status" role="status">
          {message}
        </p>
      )}

      {!loading &&
        !error &&
        recommendations.length === 0 && (
          <p className="ai-status">
            {basedOn.length === 0
              ? "Add books with genres to receive personalized recommendations."
              : "No new recommendations found. Try refreshing or exploring different genres."}
          </p>
        )}

      {/* Shared recommendation cards */}
      <div className="ai-recommendations-grid">
        {recommendations.map((book) => (
          <RecommendationBookCard
            key={book.openLibraryKey}
            book={book}
            onAdd={handleAddBook}
            isAdding={
              addingKey === book.openLibraryKey
            }
            disabled={Boolean(addingKey)}
          />
        ))}
      </div>
    </section>
  );
}
