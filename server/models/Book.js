
const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    author: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    genre: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },
    status: {
      type: String,
      enum: ["Want to Read", "Reading", "Finished"],
      default: "Want to Read",
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 3000,
    },
    coverUrl: {
      type: String,
      default: "",
    },
    coverType: {
      type: String,
      enum: ["external", "upload"],
      default: "external",
    },
    openLibraryKey: {
      type: String,
      default: "",
    },
    catalogProvider: {
      type: String,
      enum: ["", "openlibrary", "googlebooks"],
      default: "",
    },
    catalogId: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Book", bookSchema);
