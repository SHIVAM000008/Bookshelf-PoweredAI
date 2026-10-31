
import { useState } from "react";
import BookForm from "./BookForm";
import "./AddBookPage.css";

export default function AddBookPage({ onBookAdded, onViewBookshelf }) {
  const [addedTitle, setAddedTitle] = useState("");

  function handleBookAdded(book) {
    onBookAdded?.(book);
    setAddedTitle(book?.title || "Your book");
  }

  return (
    <section className="add-book-page">
      {addedTitle && (
        <div
          role="status"
          aria-live="polite"
          className="add-book-success"
        >
          <p>
            <strong>{addedTitle}</strong> has been added to your bookshelf.
          </p>
        </div>
      )}

      <BookForm onBookAdded={handleBookAdded} />

      <div className="add-book-page-bottom">
        <button
          type="button"
          className="bs-text-button"
          onClick={onViewBookshelf}
        >
          View My Bookshelf →
        </button>
      </div>
    </section>
  );
}
