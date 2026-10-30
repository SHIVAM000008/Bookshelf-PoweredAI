import { useState } from "react";
import { apiRequest, API_ORIGIN } from "../lib/api";
import { getBookSource } from "../lib/bookSource";
import "./BookCard.css";

export default function BookCard({ book, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [coverFailed, setCoverFailed] = useState(false);
  const [form, setForm] = useState({ title: book.title, author: book.author, genre: book.genre || "",
    status: book.status, description: book.description || "" });
  const source = getBookSource(book);
  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }
  async function handleSave(event) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const data = await apiRequest(`/books/${book._id}`, { method: "PATCH", body: JSON.stringify(form) });
      onUpdated(data.book); setEditing(false);
    } catch (err) { setError(err.message || "Could not save changes."); }
    finally { setSaving(false); }
  }
  async function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete "${book.title}"?`)) return;
    setSaving(true); setError("");
    try { await apiRequest(`/books/${book._id}`, { method: "DELETE" }); onDeleted(book._id); }
    catch (err) { setError(err.message || "Could not delete this book."); setSaving(false); }
  }
  function handleCancel() {
    setForm({ title: book.title, author: book.author, genre: book.genre || "",
      status: book.status, description: book.description || "" });
    setError(""); setEditing(false);
  }
  if (editing) return (
    <article className="book-card">
      <form className="book-form" onSubmit={handleSave}>
        <h3>Edit book</h3>
        <label>Title<input name="title" value={form.title} onChange={handleChange} required maxLength={200} /></label>
        <label>Author<input name="author" value={form.author} onChange={handleChange} required maxLength={150} /></label>
        <label>Genre<input name="genre" value={form.genre} onChange={handleChange} maxLength={100} /></label>
        <label>Reading status<select name="status" value={form.status} onChange={handleChange}>
          <option value="Want to Read">Want to Read</option><option value="Reading">Reading</option>
          <option value="Finished">Finished</option>
        </select></label>
        <label>Description<textarea name="description" value={form.description} onChange={handleChange} maxLength={3000} rows={3} /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="book-actions">
          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
          <button type="button" className="secondary-button" onClick={handleCancel} disabled={saving}>Cancel</button>
        </div>
      </form>
    </article>
  );
  return (
    <article className="book-card">
      <div className="book-cover-container">
        {book.coverUrl && !coverFailed ? (
          <img className="book-cover" src={book.coverUrl.startsWith("/uploads/") ? `${API_ORIGIN}${book.coverUrl}` : book.coverUrl}
            alt={`Cover of ${book.title}`} loading="lazy" onError={() => setCoverFailed(true)} />
        ) : <div className="book-cover-placeholder"><span className="book-cover-placeholder-icon" aria-hidden="true">▤</span>
          <span>Cover unavailable</span></div>}
      </div>
      <div className="book-card-content">
        <h3 className="book-card-title">{book.title}</h3>
        <p className="book-author">By {book.author}</p>
        <p className="book-meta"><span>Genre</span><strong>{book.genre || "Not specified"}</strong></p>
        <p className="book-meta"><span>Reading status</span><strong className="book-status">{book.status}</strong></p>
        <p className="book-meta"><span>Source</span><strong>{source.name}</strong></p>
        {book.description && <p className="book-description">{book.description}</p>}
        {error && <p className="error" role="alert">{error}</p>}
        <div className="book-actions">
          {source.url && <a className="book-open-button" href={source.url} target="_blank" rel="noopener noreferrer">
            Open on {source.name} <span aria-hidden="true">↗</span>
          </a>}
          <button type="button" onClick={() => setEditing(true)} disabled={saving}>Edit</button>
          <button type="button" className="delete-button" onClick={handleDelete} disabled={saving}>
            {saving ? "Please wait..." : "Delete"}
          </button>
        </div>
      </div>
    </article>
  );
}
