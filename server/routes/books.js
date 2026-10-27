
const express = require("express");
const Book = require("../models/Book");
const { protect } = require("../middleware/auth");

const router = express.Router();
const mongoose = require("mongoose");

// POST /api/books - Add a book to the logged-in user's bookshelf
router.post("/", protect, async (req, res) => {
  try {
    const {
  title,
  author,
  genre,
  status,
  description,
  coverUrl,
  openLibraryKey,
} = req.body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof author !== "string" ||
      !author.trim()
    ) {
      return res.status(400).json({
        message: "Title and author are required",
      });
    }

    const book = await Book.create({
      owner: req.user._id,
      title: title.trim(),
      author: author.trim(),
      genre,
      status,
      description,
      coverUrl,
      openLibraryKey,
    });

    return res.status(201).json({
      message: "Book added successfully",
      book,
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid book information",
      });
    }

    console.error("Add book error:", error);
    return res.status(500).json({
      message: "Failed to add book",
    });
  }
});

 // GET /api/books - Get books belonging to the logged-in user
router.get("/", protect, async (req, res) => {
  try {
    const books = await Book.find({
      owner: req.user._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Books retrieved successfully",
      count: books.length,
      books,
    });
  } catch (error) {
    console.error("Get books error:", error);

    return res.status(500).json({
      message: "Failed to retrieve books",
    });
  }
});

// PATCH /api/books/:id - Update a book owned by the logged-in user
router.patch("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    if (!require("mongoose").isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid book ID",
      });
    }

    const allowedFields = [
      "title",
      "author",
      "genre",
      "status",
      "description",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided",
      });
    }

    const book = await Book.findOneAndUpdate(
      {
        _id: id,
        owner: req.user._id,
      },
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!book) {
      return res.status(404).json({
        message: "Book not found",
      });
    }

    return res.status(200).json({
      message: "Book updated successfully",
      book,
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid book information",
      });
    }

    console.error("Update book error:", error);

    return res.status(500).json({
      message: "Failed to update book",
    });
  }
});

// DELETE /api/books/:id - Delete a book owned by the logged-in user
router.delete("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid book ID",
      });
    }

    const book = await Book.findOneAndDelete({
      _id: id,
      owner: req.user._id,
    });

    if (!book) {
      return res.status(404).json({
        message: "Book not found",
      });
    }

    return res.status(200).json({
      message: "Book deleted successfully",
    });
  } catch (error) {
    console.error("Delete book error:", error);

    return res.status(500).json({
      message: "Failed to delete book",
    });
  }
});

module.exports = router;
