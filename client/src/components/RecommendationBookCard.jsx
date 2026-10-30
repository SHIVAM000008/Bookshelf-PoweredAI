import { getBookSource } from "../lib/bookSource";
import "./RecommendationBookCard.css";

export default function RecommendationBookCard({ book, onAdd, isAdding = false, isAdded = false, disabled = false }) {
  const source = getBookSource(book);
  return (
    <article className="recommendation-book-card">
      {book.coverUrl ? (
        <img className="recommendation-book-cover" src={book.coverUrl} alt={`Cover of ${book.title}`} loading="lazy" />
      ) : (
        <div className="recommendation-book-placeholder"><span aria-hidden="true">▤</span><span>No cover available</span></div>
      )}
      <div className="recommendation-book-details">
        <h3>{book.title}</h3>
        <p className="recommendation-book-author">{book.author || "Author unknown"}</p>
        <p className="recommendation-book-genre">Genre: {book.genre || "Not specified"}</p>
        <p className="recommendation-book-genre">Source: {source.name}</p>
        {book.firstPublishYear && <p className="recommendation-book-year">First published: {book.firstPublishYear}</p>}
        <p className="recommendation-book-reason"><strong>Why this book?</strong>{" "}
          {book.recommendedBecause || "This book matches your reading interests."}</p>
        <div className="recommendation-book-actions">
          {source.url && <a className="recommendation-book-open" href={source.url} target="_blank" rel="noopener noreferrer">
            Open on {source.name} <span aria-hidden="true">↗</span>
          </a>}
          <button type="button" onClick={() => onAdd(book)} disabled={disabled || isAdding || isAdded}
            className="recommendation-book-button">
            {isAdded ? "Added to Bookshelf" : isAdding ? "Adding..." : "Add to Bookshelf"}
          </button>
        </div>
      </div>
    </article>
  );
}
