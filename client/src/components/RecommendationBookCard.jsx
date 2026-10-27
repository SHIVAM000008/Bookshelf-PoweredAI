
import "./RecommendationBookCard.css";

/**
 * Shared recommendation book card.
 *
 * Used by:
 * - Recommendations.jsx (content-based)
 * - AIRecommendations.jsx (AI-powered)
 *
 * Props:
 * book       - Recommended book data from the backend
 * onAdd      - Function to save the selected book
 * isAdding   - Whether this book is currently being saved
 * isAdded    - Whether this book was already added
 * disabled   - Whether saving is temporarily disabled
 */
export default function RecommendationBookCard({
  book,
  onAdd,
  isAdding = false,
  isAdded = false,
  disabled = false,
}) {
  return (
    <article className="recommendation-book-card">
      {/* Book cover */}
      {book.coverUrl ? (
        <img
          className="recommendation-book-cover"
          src={book.coverUrl}
          alt={`Cover of ${book.title}`}
          loading="lazy"
        />
      ) : (
        <div className="recommendation-book-placeholder">
          No cover available
        </div>
      )}

      {/* Book information */}
      <div className="recommendation-book-details">
        <h3>{book.title}</h3>

        <p className="recommendation-book-author">
          {book.author}
        </p>

        {book.firstPublishYear && (
          <p className="recommendation-book-year">
            First published: {book.firstPublishYear}
          </p>
        )}

        {/* Personalized recommendation explanation */}
        <p className="recommendation-book-reason">
          <strong>Why this book?</strong>{" "}
          {book.recommendedBecause ||
            "This book matches your reading interests."}
        </p>

        {/* Add to bookshelf */}
        <button
          type="button"
          onClick={() => onAdd(book)}
          disabled={disabled || isAdding || isAdded}
          className="recommendation-book-button"
        >
          {isAdded
            ? "Added to Bookshelf"
            : isAdding
              ? "Adding..."
              : "Add to My Bookshelf"}
        </button>
      </div>
    </article>
  );
}
