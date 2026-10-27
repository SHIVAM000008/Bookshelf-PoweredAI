
import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import BookForm from "./BookForm";
import BookCard from "./BookCard";

export default function Bookshelf() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  useEffect(() => {
    async function loadBooks() {
      try {
        const data = await apiRequest("/books");
        setBooks(data.books);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadBooks();
  }, []);

  function handleBookAdded(newBook) {
    setBooks((previous) => [newBook, ...previous]);
  }
  
  function handleBookUpdated(updatedBook) {
  setBooks((previous) =>
    previous.map((book) =>
      book._id === updatedBook._id ? updatedBook : book
    )
  );
}

function handleBookDeleted(deletedBookId) {
  setBooks((previous) =>
    previous.filter((book) => book._id !== deletedBookId)
  );
}

  if (loading) {
    return <p>Loading your bookshelf...</p>;
  }

  if (error) {
    return <p role="alert" className="error">{error}</p>;
  }

const filteredBooks = books.filter((book) => {
  const query = search.trim().toLowerCase();

  const matchesSearch =
    book.title.toLowerCase().includes(query) ||
    book.author.toLowerCase().includes(query) ||
    (book.genre || "").toLowerCase().includes(query);

  const matchesStatus =
    statusFilter === "All" || book.status === statusFilter;

  return matchesSearch && matchesStatus;

});
  return (
    <section className="bookshelf">
      <h2>My Bookshelf ({books.length})</h2>

      <BookForm onBookAdded={handleBookAdded} />
      
<div className="bookshelf-filters">
  <label>
    Search books
    <input
      type="search"
      placeholder="Search by title, author, or genre"
      value={search}
      onChange={(event) => setSearch(event.target.value)}
    />
  </label>

  <label>
    Reading status
    <select
      value={statusFilter}
      onChange={(event) => setStatusFilter(event.target.value)}
    >
      <option value="All">All statuses</option>
      <option value="Want to Read">Want to Read</option>
      <option value="Reading">Reading</option>
      <option value="Finished">Finished</option>
    </select>
  </label>
</div>

<p className="results-count">
  Showing {filteredBooks.length} of {books.length} books
</p>


      <div className="book-grid">
        {filteredBooks.length === 0 ? (
          <p>No books match your search or filter.</p>
        ) : (
           filteredBooks.map((book) => (
  <BookCard
    key={book._id}
    book={book}
    onUpdated={handleBookUpdated}
    onDeleted={handleBookDeleted}
  />
  
))
        )}
      </div>
    </section>
  );
}
