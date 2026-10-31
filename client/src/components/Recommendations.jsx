
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../lib/api";
import { getBookIdentity } from "../lib/bookSource";
import {
  readPageState,
  savePageState,
} from "../lib/persistedPageState";
import RecommendationBookCard from "./RecommendationBookCard";
import "./AIRecommendations.css";

const PAGE = "content-recommendations";

export default function Recommendations({ userId, onBookAdded }) {
  const [saved, setSaved] = useState(() =>
    readPageState(userId, PAGE, {})
  );

  const [recommendations, setRecommendations] = useState(
    saved.recommendations || []
  );
  const [basedOn, setBasedOn] = useState(saved.basedOn || []);
  const [message, setMessage] = useState(saved.message || "");
  const [hasGenerated, setHasGenerated] = useState(
    Boolean(saved.hasGenerated)
  );

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
      hasGenerated,
    });
  }, [userId, recommendations, basedOn, message, hasGenerated]);

  async function generateRecommendations() {
    if (loading) return;

    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/recommendations");

      if (
        !mountedRef.current ||
        requestId !== requestIdRef.current
      ) {
        return;
      }

      setRecommendations(data.recommendations || []);
      setBasedOn(data.basedOn || []);
      setMessage(data.message || "");
      setHasGenerated(true);
    } catch (err) {
      if (
        mountedRef.current &&
        requestId === requestIdRef.current
      ) {
        setError(
          err.message || "Could not generate recommendations."
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
          description: book.description || "",
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
            : "Generate Content-Based Recommendations"}
        </button>
      </div>

      {basedOn.length > 0 && (
        <p className="ai-preferences">
          <strong>Based on:</strong> {basedOn.join(", ")}
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
        hasGenerated &&
        !recommendations.length &&
        !message && (
          <p className="ai-status">
            No new recommendations found.
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
