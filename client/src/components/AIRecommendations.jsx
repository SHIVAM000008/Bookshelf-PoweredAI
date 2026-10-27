
import { useState } from "react";
import { apiRequest } from "../lib/api";
import RecommendationBookCard from "./RecommendationBookCard";
import "./AIRecommendations.css";

/**
 * AI-powered recommendations.
 *
 * Uses:
 * POST /api/recommendations/ai
 *
 * AI generation occurs only when the user clicks
 * the Generate AI Picks button.
 */
export default function AIRecommendations({ onBookAdded }) {
  const [recommendations, setRecommendations] = useState([]);
  const [basedOn, setBasedOn] = useState([]);
  const [model, setModel] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [addingKey, setAddingKey] = useState("");
  const [addedKeys, setAddedKeys] = useState([]);

  // Request AI recommendations only when clicked.
  async function generateRecommendations() {
    if (loading) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const data = await apiRequest("/recommendations/ai", {
        method: "POST",
      });

      setRecommendations(
        (data.recommendations || []).slice(0, 4)
      );

      setBasedOn(data.basedOn || []);
      setModel(data.model || "");
      setAddedKeys([]);

      if (!data.recommendations?.length) {
        setMessage(
          data.message ||
            "No AI recommendations available yet."
        );
      }
    } catch (err) {
      setError(
        err.message ||
          "Could not generate AI recommendations."
      );
    } finally {
      setLoading(false);
    }
  }

  // Save an AI-recommended book to the bookshelf.
  async function handleAddBook(book) {
    if (
      addingKey ||
      addedKeys.includes(book.openLibraryKey)
    ) {
      return;
    }

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
          description: book.recommendedBecause || "",
          coverUrl: book.coverUrl || "",
          openLibraryKey: book.openLibraryKey,
        }),
      });

      // Mark this book as successfully added.
      setAddedKeys((previous) => [
        ...previous,
        book.openLibraryKey,
      ]);

      // Notify App.jsx to refresh the bookshelf.
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
          <h2>AI Picks for You</h2>

          <p>
            Discover books selected by AI based on your
            reading history and interests.
          </p>
        </div>

        <button
          type="button"
          onClick={generateRecommendations}
          disabled={loading}
          className="ai-generate-button"
        >
          {loading
            ? "Generating..."
            : recommendations.length > 0
              ? "Regenerate AI Picks"
              : "Generate AI Picks"}
        </button>
      </div>

      {loading && (
        <p className="ai-status" role="status">
          Analyzing your reading preferences...
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

      {basedOn.length > 0 &&
        recommendations.length > 0 && (
          <p className="ai-preferences">
            <strong>Based on:</strong>{" "}
            {basedOn.join(", ")}
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
            isAdded={addedKeys.includes(
              book.openLibraryKey
            )}
            disabled={Boolean(addingKey)}
          />
        ))}
      </div>

      {model && (
        <p className="ai-model-info">
          Generated using: {model}
        </p>
      )}
    </section>
  );
}
