
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../lib/api";
import { getBookIdentity } from "../lib/bookSource";
import {
  readPageState,
  savePageState,
} from "../lib/persistedPageState";
import RecommendationBookCard from "./RecommendationBookCard";
import "./AIRecommendations.css";

const PAGE = "ai-recommendations";

export default function AIRecommendations({ userId, onBookAdded }) {
  const [saved] = useState(() =>
    readPageState(userId, PAGE, {})
  );

  const [recommendations, setRecommendations] = useState(
    saved.recommendations || []
  );
  const [basedOn, setBasedOn] = useState(saved.basedOn || []);
  const [message, setMessage] = useState(saved.message || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [addingKey, setAddingKey] = useState("");

  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    savePageState(userId, PAGE, {
      recommendations,
      basedOn,
      message,
    });
  }, [userId, recommendations, basedOn, message]);

  async function generateRecommendations() {
    if (loading) return;

    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/recommendations/ai", {
        method: "POST",
      });

      if (
        !mountedRef.current ||
        requestId !== requestIdRef.current
      ) {
        return;
      }

      setRecommendations(data.recommendations || []);
      setBasedOn(data.basedOn || []);
      setMessage(data.message || "");
    } catch (err) {
      if (
        mountedRef.current &&
        requestId === requestIdRef.current
      ) {
        setError(
          err.message ||
            "Could not generate AI recommendations."
        );
      }
    } finally {
      if (
        mountedRef.current &&
        requestId === requestIdRef.current
      ) {
        setLoading(false);
      }
    }
  }

  async function handleAddBook(book) {
    if (addingKey) return;

    const key = getBookIdentity(book);

    setAddingKey(key);
    setError("");

    try {
      const data = await apiRequest("/books", {
        method: "POST",
        body: JSON.stringify({
          title: book.title,
          author: book.author,
          genre: book.genre || "",
          status: "Want to Read",
          description:
            book.description ||
            book.recommendedBecause ||
            "",
          firstPublishYear: book.firstPublishYear || null,
          coverUrl: book.coverUrl || "",
          openLibraryKey: book.openLibraryKey || "",
          catalogProvider: book.catalogProvider || "",
          catalogId: book.catalogId || "",
        }),
      });

      setRecommendations((previous) =>
        previous.filter(
          (item) => getBookIdentity(item) !== key
        )
      );

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
          className="ai-generate-button"
          onClick={generateRecommendations}
          disabled={loading}
        >
          {loading
            ? "Generating..."
            : "Generate AI Recommendations"}
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

      {!loading && recommendations.length > 0 && (
        <p className="ai-status">
          Showing {recommendations.length} available recommendations.
        </p>
      )}

      <div className="ai-recommendations-grid">
        {recommendations.map((book) => (
          <RecommendationBookCard
            key={getBookIdentity(book)}
            book={book}
            onAdd={handleAddBook}
            isAdding={addingKey === getBookIdentity(book)}
            disabled={Boolean(addingKey)}
          />
        ))}
      </div>
    </section>
  );
}
