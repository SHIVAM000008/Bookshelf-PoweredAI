import { useState } from 'react';
import { API_ORIGIN } from '../lib/api';
import { getBookSource } from '../lib/bookSource';
import './UnifiedBookCard.css';
export default function UnifiedBookCard({ book, onAdd, adding = false, disabled = false, children }) {
  const source = getBookSource(book);
  const [coverFailed, setCoverFailed] = useState(false);
  const coverUrl = book.coverUrl?.startsWith('/uploads/') ? `${API_ORIGIN}${book.coverUrl}` : book.coverUrl;
  return <article className="unified-book-card">
    <div className="unified-book-cover">
      {coverUrl && !coverFailed ? <img src={coverUrl} alt={`Cover of ${book.title}`} loading="lazy" onError={() => setCoverFailed(true)} />
        : <span>No cover available</span>}
    </div>
    <div className="unified-book-details">
      <h3>{book.title}</h3>
      <p className="unified-book-author">By {book.author || 'Unknown author'}</p>
      <p><strong>Genre:</strong> {book.genre || 'Not specified'}</p>
      <p><strong>Published:</strong> {book.firstPublishYear || 'Unknown'}</p>
      <p><strong>Source:</strong> {source.name}</p>
      {book.status && <p><strong>Reading status:</strong> {book.status}</p>}
      {book.description && <p className="unified-book-description"><strong>Description:</strong> {book.description}</p>}
      {book.recommendedBecause && <p className="unified-book-description"><strong>Why this book?</strong> {book.recommendedBecause}</p>}
      <div className="unified-book-actions">
        {source.url && <a href={source.url} target="_blank" rel="noopener noreferrer">Open on {source.name} ↗</a>}
        {onAdd && <button type="button" disabled={adding || disabled} onClick={() => onAdd(book)}>
          {adding ? 'Adding...' : 'Add to My Bookshelf'}
        </button>}
        {children}
      </div>
    </div>
  </article>;
}
