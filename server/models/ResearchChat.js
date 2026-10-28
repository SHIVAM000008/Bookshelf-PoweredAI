const mongoose = require("mongoose");

// One message within a research conversation.
const researchMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20000,
    },

    // Record which AI model generated assistant responses.
    model: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// A conversation belongs to one user and contains its messages.
const researchChatSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "New Research Chat",
    },

    messages: {
      type: [researchMessageSchema],
      default: [],
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Help retrieve a user's conversations, newest activity first.
researchChatSchema.index({
  owner: 1,
  lastMessageAt: -1,
});

module.exports = mongoose.model(
  "ResearchChat",
  researchChatSchema
);
