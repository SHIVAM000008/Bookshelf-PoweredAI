import { useState } from 'react';
import { apiRequest } from '../lib/api';
import { getBookIdentity } from '../lib/bookSource';
import UnifiedBookCard from './UnifiedBookCard';
import './DiscoverBooks.css';
const normalize = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
function isSameBook(a, b) {
  return Boolean((a.openLibraryKey && a.openLibraryKey === b.openLibraryKey) ||
    (a.catalogProvider && a.catalogId && a.catalogProvider === b.catalogProvider && a.catalogId === b.catalogId) ||
    (normalize(a.title) === normalize(b.title) && normalize(a.author) === normalize(b.author)));
}
export default function DiscoverBooks({ onBookAdded }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [addingKey, setAddingKey] = useState('');
  const [success, setSuccess] = useState('');
  async function handleSearch(event) {
    event.preventDefault();
    const term = query.trim();
    if (term.length < 2) { setError('Enter at least 2 characters'); return; }
    setLoading(true); setError(''); setSuccess(''); setSearched(true); setResults([]);
    try {
      const [catalog, shelf] = await Promise.all([
        apiRequest(`/catalog/search?q=${encodeURIComponent(term)}`), apiRequest('/books'),
      ]);
      setResults((catalog.books || []).filter((book) => !(shelf.books || []).some((saved) => isSameBook(book, saved))));
    } catch (err) { setError(err.message || 'Could not search the catalog.'); }
    finally { setLoading(false); }
  }
  async function handleAddBook(book) {
    if (addingKey) return;
    const key = getBookIdentity(book);
    setAddingKey(key); setError(''); setSuccess('');
    try {
      const data = await apiRequest('/books', { method:'POST', body:JSON.stringify({
        title:book.title, author:book.author, genre:book.genre || '', status:'Want to Read',
        description:book.description || '', firstPublishYear:book.firstPublishYear || null,
        coverUrl:book.coverUrl || '', openLibraryKey:book.openLibraryKey || '',
        catalogProvider:book.catalogProvider || '', catalogId:book.catalogId || '',
      }) });
      setResults((previous) => previous.filter((candidate) => !isSameBook(candidate, data.book)));
      onBookAdded?.(data.book);
      setSuccess(data.alreadySaved ? `"${book.title}" is already on your bookshelf.` : `"${book.title}" added to your bookshelf!`);
    } catch (err) { setError(err.message || 'Could not add this book.'); }
    finally { setAddingKey(''); }
  }
  return <section className="discover-books">
    <form className="discover-search" onSubmit={handleSearch}>
      <input type="search" placeholder="Search for a book or author..." value={query}
        onChange={(event) => setQuery(event.target.value)} minLength={2} maxLength={100} required />
      <button type="submit" disabled={loading}>{loading ? 'Searching...' : 'Search'}</button>
    </form>
    {error && <p className="error" role="alert">{error}</p>}
    {success && <p className="success" role="status">{success}</p>}
    {loading && <p role="status">Searching both book catalogs...</p>}
    {!loading && searched && !error && !results.length && <p>No new books found.</p>}
    {!loading && results.length > 0 && <p role="status">Showing {results.length} available books.</p>}
    <div className="catalog-grid">{results.map((book) => <UnifiedBookCard key={getBookIdentity(book)} book={book}
      onAdd={handleAddBook} adding={addingKey === getBookIdentity(book)} disabled={Boolean(addingKey)} />)}</div>
  </section>;
}
