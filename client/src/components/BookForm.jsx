
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

export default function BookForm({ onBookAdded }) {
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
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
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

    if (coverInputRef.current) {
      coverInputRef.current.value = "";
    }
  }

  
  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    const formElement = event.currentTarget;

    setError("");
    setSaving(true);

    try {
      const body = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        body.append(key, value);
      });

      if (coverFile) {
        body.append("cover", coverFile);
      }

      const data = await apiRequest("/books", {
        method: "POST",
        body,
      });

      onBookAdded?.(data.book);

      setForm(initialForm);
      setCoverFile(null);
      clearCoverPreview();

      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }

      formElement.reset();
    } catch (err) {
      setError(err.message || "Could not add this book.");
    } finally {
      setSaving(false);
    }
  }


  return (
    <form className="book-form" onSubmit={handleSubmit}>
      <h3>Add a Book</h3>

      <label>
        Title
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          required
          maxLength={200}
        />
      </label>

      <label>
        Author
        <input
          name="author"
          value={form.author}
          onChange={handleChange}
          required
          maxLength={150}
        />
      </label>

      <label>
        Genre
        <input
          name="genre"
          value={form.genre}
          onChange={handleChange}
          maxLength={100}
        />
      </label>

      <label>
        Reading Status
        <select
          name="status"
          value={form.status}
          onChange={handleChange}
        >
          <option value="Want to Read">Want to Read</option>
          <option value="Reading">Reading</option>
          <option value="Finished">Finished</option>
        </select>
      </label>

      <label>
        Description
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          maxLength={3000}
          rows={3}
        />
      </label>

      <label>
        Cover Image (optional)
        <input
          ref={coverInputRef}
          type="file"
          name="cover"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleCoverChange}
        />
      </label>

      {coverPreview && (
        <div className="book-cover-preview">
          <img
            src={coverPreview}
            alt="Selected book cover preview"
          />

          <button
            type="button"
            className="secondary-button"
            onClick={handleRemoveCover}
          >
            Remove selected image
          </button>
        </div>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Add Book"}
      </button>
    </form>
  );
}
