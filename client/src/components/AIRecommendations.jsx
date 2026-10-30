
import { useState } from "react";
import { apiRequest } from "../lib/api";
import RecommendationBookCard from "./RecommendationBookCard";
import "./AIRecommendations.css";

export default function AIRecommendations({ onBookAdded }) {
  const [recommendations, setRecommendations] = useState([]);
  const [basedOn, setBasedOn] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [addingKey, setAddingKey] = useState("");
  const [addedKeys, setAddedKeys] = useState([]);

  async function generateRecommendations() {
    if (loading) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const data = await apiRequest("/recommendations/ai", {
        method: "POST",
      });

      setRecommendations((data.recommendations || []).slice(0, 4));
      setBasedOn(data.basedOn || []);
      setAddedKeys([]);

      if (!data.recommendations?.length) {
        setMessage(
          data.message || "No AI recommendations available yet."
        );
      }
    } catch (err) {
      setError(err.message || "Could not generate AI recommendations.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddBook(book) {
    if (addingKey || addedKeys.includes(book.openLibraryKey)) {
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
          genre: book.genre || "",
          status: "Want to Read",
          description: book.recommendedBecause || "",
          coverUrl: book.coverUrl || "",
          openLibraryKey: book.openLibraryKey,
        }),
      });

      setAddedKeys((previous) => [
        ...previous,
        book.openLibraryKey,
      ]);

      onBookAdded?.(data.book);

      setMessage(
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
    <section className="ai-recommendations">
      <div className="ai-recommendations-header">
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

      {basedOn.length > 0 && recommendations.length > 0 && (
        <p className="ai-preferences">
          <strong>Based on:</strong> {basedOn.join(", ")}
        </p>
      )}

            <div className="ai-recommendations-grid">
        {recommendations.map((book) => (
          <RecommendationBookCard
            key={book.openLibraryKey}
            book={book}
            onAdd={handleAddBook}
            isAdding={addingKey === book.openLibraryKey}
            isAdded={addedKeys.includes(book.openLibraryKey)}
            disabled={Boolean(addingKey)}
          />
        ))}
      </div>
    </section>
  );
}
