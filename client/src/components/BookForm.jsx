
import { useState } from "react";
import { apiRequest } from "../lib/api";

const initialForm = {
  title: "",
  author: "",
  genre: "",
  status: "Want to Read",
  description: "",
};

export default function BookForm({ onBookAdded }) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const data = await apiRequest("/books", {
        method: "POST",
        body: JSON.stringify(form),
      });

      onBookAdded(data.book);
      setForm(initialForm);
    } catch (err) {
      setError(err.message);
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

      {error && <p className="error" role="alert">{error}</p>}

      <button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Add Book"}
      </button>
    </form>
  );
}
