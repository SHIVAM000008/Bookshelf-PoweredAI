import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../lib/api";

const initialForm = {
  title: "",
  author: "",
  genre: "",
  status: "Want to Read",
  description: "",
};

const MAX_COVER_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function BookForm({ onBookAdded, onCancel }) {
  const [form, setForm] = useState(initialForm);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const coverInputRef = useRef(null);
  const previewUrlRef = useRef("");

  function clearCoverPreview() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }
    setCoverPreview("");
  }

  function replaceCoverPreview(file) {
    clearCoverPreview();
    if (file) {
      const url = URL.createObjectURL(file);
      previewUrlRef.current = url;
      setCoverPreview(url);
    }
  }

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function handleCoverChange(event) {
    const file = event.target.files?.[0];
    setError("");

    if (!file) {
      clearCoverPreview();
      setCoverFile(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      event.target.value = "";
      clearCoverPreview();
      setCoverFile(null);
      return;
    }
    if (file.size > MAX_COVER_SIZE) {
      setError("Cover image must be 5 MB or smaller.");
      event.target.value = "";
      clearCoverPreview();
      setCoverFile(null);
      return;
    }

    replaceCoverPreview(file);
    setCoverFile(file);
  }

  function handleRemoveCover() {
    clearCoverPreview();
    setCoverFile(null);
    if (coverInputRef.current) coverInputRef.current.value = "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    const formElement = event.currentTarget;
    setError("");
    setSaving(true);

    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, value));
      if (coverFile) body.append("cover", coverFile);

      const data = await apiRequest("/books", { method: "POST", body });
      onBookAdded?.(data.book);
      setForm(initialForm);
      setCoverFile(null);
      clearCoverPreview();
      if (coverInputRef.current) coverInputRef.current.value = "";
      formElement.reset();
    } catch (err) {
      setError(err.message || "Could not add this book.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="book-form add-book-form" onSubmit={handleSubmit}>
      <header className="add-book-form-header">
        <div className="add-book-form-icon" aria-hidden="true">▤</div>
        <div>
          <h3>Book information</h3>
          <p>Fields marked * are required.</p>
        </div>
      </header>

      <div className="add-book-fields">
        <label className="add-book-field add-book-field-full">
          <span>Book title <span aria-hidden="true">*</span></span>
          <input name="title" value={form.title} onChange={handleChange} required maxLength={200} placeholder="Enter the book title" autoComplete="off" />
        </label>
        <label className="add-book-field">
          <span>Author <span aria-hidden="true">*</span></span>
          <input name="author" value={form.author} onChange={handleChange} required maxLength={150} placeholder="Author name" autoComplete="off" />
        </label>
        <label className="add-book-field">
          <span>Genre</span>
          <input name="genre" value={form.genre} onChange={handleChange} maxLength={100} placeholder="e.g. Fiction, Biography" />
        </label>
        <label className="add-book-field add-book-field-full">
          <span>Reading status</span>
          <select name="status" value={form.status} onChange={handleChange}>
            <option value="Want to Read">Want to Read</option>
            <option value="Reading">Reading</option>
            <option value="Finished">Finished</option>
          </select>
        </label>
        <label className="add-book-field add-book-field-full">
          <span>Description <small>(optional)</small></span>
          <textarea name="description" value={form.description} onChange={handleChange} maxLength={3000} rows={4} placeholder="Add a summary or a note about this book..." />
        </label>
      </div>

      <div className="add-book-upload-section">
        <div className="add-book-upload-heading">
          <h4>Book cover</h4>
          <p>Optional · JPEG, PNG, or WebP · Up to 5 MB</p>
        </div>
        <label className="add-book-upload-area">
          <span className="add-book-upload-icon" aria-hidden="true">↑</span>
          <span className="add-book-upload-title">Choose a cover image</span>
          <span className="add-book-upload-hint">Select an image from your device</span>
          <input ref={coverInputRef} type="file" name="cover" accept="image/jpeg,image/png,image/webp" onChange={handleCoverChange} />
        </label>
        {coverPreview && (
          <div className="book-cover-preview add-book-cover-preview">
            <img src={coverPreview} alt="Selected book cover preview" />
            <button type="button" className="secondary-button" onClick={handleRemoveCover}>Remove selected image</button>
          </div>
        )}
      </div>

      {error && <p className="add-book-form-error error" role="alert">{error}</p>}

      <div className="add-book-form-actions">
        {onCancel && <button type="button" className="add-book-cancel" onClick={onCancel} disabled={saving}>Cancel</button>}
        <button type="submit" className="add-book-submit" disabled={saving}>
          <span aria-hidden="true">＋</span> {saving ? "Saving..." : "Add to Bookshelf"}
        </button>
      </div>
    </form>
  );
}
