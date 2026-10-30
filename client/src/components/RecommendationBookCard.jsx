import "./RecommendationBookCard.css";

function getOpenBookUrl(book) {
  const key = book?.openLibraryKey;
  if (typeof key === "string" && (key.startsWith("/works/") || key.startsWith("/books/"))) {
    return `https://openlibrary.org${key}`;
  }
  const query = [book?.title, book?.author].filter(Boolean).join(" ");
  return `https://openlibrary.org/search?q=${encodeURIComponent(query)}`;
}

export default function RecommendationBookCard({
  book,
  onAdd,
  isAdding = false,
  isAdded = false,
  disabled = false,
}) {
  const openBookUrl = getOpenBookUrl(book);
  return (
    <article className="recommendation-book-card">
      {book.coverUrl ? (
        <img className="recommendation-book-cover" src={book.coverUrl}
          alt={`Cover of ${book.title}`} loading="lazy" />
      ) : (
        <div className="recommendation-book-placeholder">
          <span aria-hidden="true">▤</span>
          <span>No cover available</span>
        </div>
      )}
      <div className="recommendation-book-details">
        <h3>{book.title}</h3>
        <p className="recommendation-book-author">{book.author || "Author unknown"}</p>
        <p className="recommendation-book-genre">Genre: {book.genre || "Not specified"}</p>
        {book.firstPublishYear && (
          <p className="recommendation-book-year">First published: {book.firstPublishYear}</p>
        )}
        <p className="recommendation-book-reason">
          <strong>Why this book?</strong>{" "}
          {book.recommendedBecause || "This book matches your reading interests."}
        </p>
        <div className="recommendation-book-actions">
          <a className="recommendation-book-open" href={openBookUrl}
            target="_blank" rel="noopener noreferrer">
            Open Book <span aria-hidden="true">↗</span>
          </a>
          <button type="button" onClick={() => onAdd(book)}
            disabled={disabled || isAdding || isAdded}
            className="recommendation-book-button">
            {isAdded ? "Added to Bookshelf" : isAdding ? "Adding..." : "Add to Bookshelf"}
          </button>
        </div>
      </div>
    </article>
  );
}
