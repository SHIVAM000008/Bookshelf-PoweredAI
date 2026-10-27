
const express = require("express");
const { protect } = require("../middleware/auth");

const router = express.Router();

// GET /api/catalog/search?q=atomic habits
router.get("/search", protect, async (req, res) => {
  try {
    const query = req.query.q;

    if (
      typeof query !== "string" ||
      query.trim().length < 2 ||
      query.length > 100
    ) {
      return res.status(400).json({
        message: "Search must contain 2 to 100 characters",
      });
    }

    const params = new URLSearchParams({
      q: query.trim(),
      limit: "12",
      fields:
        "key,title,author_name,first_publish_year,cover_i",
    });

    const response = await fetch(
      `https://openlibrary.org/search.json?${params}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      return res.status(502).json({
        message: "Book catalog is temporarily unavailable",
      });
    }

    const data = await response.json();

    const books = (data.docs || []).map((book) => ({
      openLibraryKey: book.key,
      title: book.title,
      author: book.author_name?.[0] || "Unknown author",
      firstPublishYear: book.first_publish_year || null,
      coverUrl: book.cover_i
        ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
        : "",
    }));

    return res.json({
      books,
    });
  } catch (error) {
    console.error("Catalog search error:", error);

    return res.status(502).json({
      message: "Could not retrieve books from Open Library",
    });
  }
});

module.exports = router;
