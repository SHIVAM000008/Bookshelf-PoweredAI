
const express = require("express");
const { protect } = require("../middleware/auth");
const { searchBookCatalog } = require("../services/bookCatalog");

const router = express.Router();

// GET /api/catalog/search?q=atomic%20habits
router.get("/search", protect, async (req, res) => {
  try {
    const query = req.query.q;

    if (
      typeof query !== "string" ||
      query.trim().length < 2 ||
      query.trim().length > 100
    ) {
      return res.status(400).json({
        message: "Search must contain 2 to 100 characters",
      });
    }

    const books = await searchBookCatalog(query.trim(), 12);

    return res.status(200).json({ books });
  } catch (error) {
    console.error("Catalog search error:", error);

    return res.status(502).json({
      message: "Book catalogs are temporarily unavailable",
    });
  }
});

module.exports = router;
