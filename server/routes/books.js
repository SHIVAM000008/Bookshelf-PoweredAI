
const {
  uploadBookCover,
  saveCover,
} = require("../middleware/bookCoverUpload");
const express = require("express");
const mongoose = require("mongoose");
const Book = require("../models/Book");
const { protect } = require("../middleware/auth");

const router = express.Router();

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// POST /api/books - Add a book to the logged-in user's bookshelf.
// Duplicate saves return the existing book instead of creating another.
router.post("/", protect, uploadBookCover, async (req, res) => {
  try {
    const {
      title,
      author,
      genre,
      status,
      description,
      coverUrl,
      openLibraryKey,
      catalogProvider,
      catalogId,
      firstPublishYear,
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

    const cleanTitle = title.trim();
    const cleanAuthor = author.trim();
    const cleanKey =
      typeof openLibraryKey === "string" ? openLibraryKey.trim() : "";
    const cleanCatalogId =
      typeof catalogId === "string" ? catalogId.trim() : "";

    const allowedProviders = ["openlibrary", "googlebooks"];
    const cleanProvider = allowedProviders.includes(catalogProvider)
      ? catalogProvider
      : cleanKey
        ? "openlibrary"
        : "";

    // Search by provider ID when available, and also by title + author
    // to catch books added manually or through another catalog.
    const duplicateConditions = [];

    if (cleanKey) {
      duplicateConditions.push({ openLibraryKey: cleanKey });
    }

    if (cleanProvider && cleanCatalogId) {
      duplicateConditions.push({
        catalogProvider: cleanProvider,
        catalogId: cleanCatalogId,
      });
    }

    duplicateConditions.push({
      title: {
        $regex: `^${escapeRegex(cleanTitle)}$`,
        $options: "i",
      },
      author: {
        $regex: `^${escapeRegex(cleanAuthor)}$`,
        $options: "i",
      },
    });

    const existingBook = await Book.findOne({
      owner: req.user._id,
      $or: duplicateConditions,
    });

    if (existingBook) {
      let changed = false;

      if (
        !existingBook.coverUrl &&
        typeof coverUrl === "string" &&
        coverUrl.trim()
      ) {
        existingBook.coverUrl = coverUrl.trim();
        changed = true;
      }

      if (!existingBook.openLibraryKey && cleanKey) {
        existingBook.openLibraryKey = cleanKey;
        changed = true;
      }

      if (
        !existingBook.catalogProvider &&
        cleanProvider
      ) {
        existingBook.catalogProvider = cleanProvider;
        changed = true;
      }

      if (!existingBook.catalogId && cleanCatalogId) {
        existingBook.catalogId = cleanCatalogId;
        changed = true;
      }

      if (changed) {
        await existingBook.save();
      }

      return res.status(200).json({
        message: "This book is already on your bookshelf",
        book: existingBook,
        alreadySaved: true,
      });
    }

    let uploadedCoverUrl = "";

    if (req.file) {
      uploadedCoverUrl = await saveCover(req.file);
    }

    const book = await Book.create({
      owner: req.user._id,
      title: cleanTitle,
      author: cleanAuthor,
      genre,
      status,
      description,
      coverUrl:
        uploadedCoverUrl ||
        (typeof coverUrl === "string" ? coverUrl.trim() : ""),
      coverType: uploadedCoverUrl ? "upload" : "external",
      openLibraryKey: cleanKey,
      catalogProvider: cleanProvider,
      catalogId: cleanCatalogId,
      firstPublishYear: Number.isInteger(Number(firstPublishYear)) && Number(firstPublishYear) >= 1000 && Number(firstPublishYear) <= 2200 ? Number(firstPublishYear) : null,
    });

    return res.status(201).json({
      message: "Book added successfully",
      book,
      alreadySaved: false,
    });
  } catch (error) {
    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
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

// GET /api/books - Get books belonging to the logged-in user.
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

// PATCH /api/books/:id - Update a book owned by the logged-in user.
router.patch("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
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
      { returnDocument: "after", runValidators: true }
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
    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
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

// DELETE /api/books/:id - Delete a book owned by the logged-in user.
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
