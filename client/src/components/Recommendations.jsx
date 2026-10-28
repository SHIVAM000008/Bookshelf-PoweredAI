
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../lib/api";
import RecommendationBookCard from "./RecommendationBookCard";
import "./AIRecommendations.css";

export default function Recommendations({ onBookAdded }) {
  const [recommendations, setRecommendations] = useState([]);
  const [basedOn, setBasedOn] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [addingKey, setAddingKey] = useState("");

  const requestIdRef = useRef(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, []);

  async function loadRecommendations({ signal } = {}) {
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const data = await apiRequest("/recommendations", { signal });

      if (
        !mountedRef.current ||
        requestId !== requestIdRef.current ||
        signal?.aborted
      ) {
        return;
      }

      setRecommendations((data.recommendations || []).slice(0, 4));
      setBasedOn(data.basedOn || []);
    } catch (err) {
      if (
        signal?.aborted ||
        !mountedRef.current ||
        requestId !== requestIdRef.current
      ) {
        return;
      }

      setError(err.message || "Could not load recommendations.");
    } finally {
      if (
        mountedRef.current &&
        requestId === requestIdRef.current &&
        !signal?.aborted
      ) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++requestIdRef.current;

    async function fetchInitialRecommendations() {
      try {
        const data = await apiRequest("/recommendations", {
          signal: controller.signal,
        });

        if (
          controller.signal.aborted ||
          !mountedRef.current ||
          requestId !== requestIdRef.current
        ) {
          return;
        }

        setRecommendations((data.recommendations || []).slice(0, 4));
        setBasedOn(data.basedOn || []);
      } catch (err) {
        if (
          controller.signal.aborted ||
          !mountedRef.current ||
          requestId !== requestIdRef.current
        ) {
          return;
        }

        setError(err.message || "Could not load recommendations.");
      } finally {
        if (
          mountedRef.current &&
          requestId === requestIdRef.current &&
          !controller.signal.aborted
        ) {
          setLoading(false);
        }
      }
    }

    fetchInitialRecommendations();

    return () => controller.abort();
  }, []);

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

      setRecommendations((previous) =>
        previous.filter(
          (item) => item.openLibraryKey !== book.openLibraryKey
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
        <div className="ai-recommendations-actions">
          <button
            type="button"
            onClick={() => loadRecommendations()}
            disabled={loading}
            className="ai-generate-button"
          >
            {loading ? "Loading..." : "Refresh Recommendations"}
          </button>
        </div>
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

      {!loading && !error && recommendations.length === 0 && (
        <p className="ai-status">
          {basedOn.length === 0
            ? "Add books with genres to receive personalized recommendations."
            : "No new recommendations found. Try refreshing or exploring different genres."}
        </p>
      )}

      <div className="ai-recommendations-grid">
        {recommendations.map((book) => (
          <RecommendationBookCard
            key={book.openLibraryKey}
            book={book}
            onAdd={handleAddBook}
            isAdding={addingKey === book.openLibraryKey}
            disabled={Boolean(addingKey)}
          />
        ))}
      </div>
    </section>
  );
}
