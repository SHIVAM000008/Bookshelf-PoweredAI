const express = require("express");
const mongoose = require("mongoose");

const ResearchChat = require("../models/ResearchChat");
const { protect } = require("../middleware/auth");
const { generateAIResponse } = require("../services/openrouter");

const router = express.Router();

router.use(protect);

const MAX_MESSAGE_LENGTH = 4000;
const MAX_CONTEXT_MESSAGES = 20;

const SYSTEM_PROMPT = `
You are the Research Assistant for Bookshelf PoweredAI.

Help users research books, authors, literary themes, genres, reading
topics, and related questions. You may also help organize research,
compare ideas, summarize supplied text, and suggest useful next steps.

Be accurate and distinguish established facts from uncertain information.
Do not invent citations, sources, quotations, or research findings.
When you cannot verify a claim, say so clearly.
Use clear headings and structured answers when they improve readability.
`;

// Convert an arbitrary value into a safe, trimmed string.
function getTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

// Validate MongoDB document IDs before querying.
function isValidObjectId(id) {
  return mongoose.isValidObjectId(id);
}

// GET /api/research/chats
// List the authenticated user's conversations.
router.get("/chats", async (req, res) => {
  try {
    const chats = await ResearchChat.find({
      owner: req.user._id,
    })
      .select("title lastMessageAt createdAt updatedAt")
      .sort({ lastMessageAt: -1 })
      .limit(100)
      .lean();

    return res.json({ chats });
  } catch (error) {
    console.error("Research chat list failed:", error.message);
    return res.status(500).json({
      message: "Unable to load research conversations.",
    });
  }
});

// POST /api/research/chats
// Create a new conversation.
router.post("/chats", async (req, res) => {
  try {
    const requestedTitle = getTrimmedString(req.body?.title);

    const chat = await ResearchChat.create({
      owner: req.user._id,
      title: requestedTitle
        ? requestedTitle.slice(0, 120)
        : "New Research Chat",
      messages: [],
      lastMessageAt: new Date(),
    });

    return res.status(201).json({ chat });
  } catch (error) {
    console.error("Research chat creation failed:", error.message);
    return res.status(500).json({
      message: "Unable to create a research conversation.",
    });
  }
});

// GET /api/research/chats/:chatId
// Retrieve one conversation, including its messages.
router.get("/chats/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!isValidObjectId(chatId)) {
      return res.status(400).json({
        message: "Invalid conversation ID.",
      });
    }

    const chat = await ResearchChat.findOne({
      _id: chatId,
      owner: req.user._id,
    }).lean();

    if (!chat) {
      return res.status(404).json({
        message: "Research conversation not found.",
      });
    }

    return res.json({ chat });
  } catch (error) {
    console.error("Research chat retrieval failed:", error.message);
    return res.status(500).json({
      message: "Unable to load this research conversation.",
    });
  }
});

// POST /api/research/chats/:chatId/messages
// Generate an AI response and save it without overwriting concurrent updates.
router.post("/chats/:chatId/messages", async (req, res) => {
  try {
    const { chatId } = req.params;
    const content = getTrimmedString(req.body?.content);

    if (!isValidObjectId(chatId)) {
      return res.status(400).json({
        message: "Invalid conversation ID.",
      });
    }

    if (!content) {
      return res.status(400).json({
        message: "Message content is required.",
      });
    }

    if (content.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        message: `Messages must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
      });
    }

    // Always scope the lookup to the authenticated user.
    const chat = await ResearchChat.findOne({
      _id: chatId,
      owner: req.user._id,
    });

    if (!chat) {
      return res.status(404).json({
        message: "Research conversation not found.",
      });
    }

    // Send only recent conversation history to the AI provider.
    const recentMessages = chat.messages
      .slice(-MAX_CONTEXT_MESSAGES)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    const messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      ...recentMessages,
      {
        role: "user",
        content,
      },
    ];

    let aiResult;

    try {
      aiResult = await generateAIResponse(messages);
    } catch (error) {
      // Do not save a user message if the AI request failed.
      console.error("Research AI request failed:", error.message);

      const status = error.status === 429 ? 429 : 502;

      return res.status(status).json({
        message:
          status === 429
            ? "The AI service is rate-limited. Please try again shortly."
            : "The AI service could not complete your request. Please try again.",
      });
    }

    const answer = getTrimmedString(aiResult?.content);

    if (!answer) {
      return res.status(502).json({
        message: "The AI service returned an empty response.",
      });
    }

    const now = new Date();

    // Prepare both messages before the atomic database update.
    const userMessage = {
      _id: new mongoose.Types.ObjectId(),
      role: "user",
      content,
      createdAt: now,
      updatedAt: now,
    };

    const assistantMessage = {
      _id: new mongoose.Types.ObjectId(),
      role: "assistant",
      content: answer,
      model:
        typeof aiResult.model === "string"
          ? aiResult.model
          : "",
      createdAt: now,
      updatedAt: now,
    };

    // Use the first exchange to set a useful conversation title.
    const updates = {
      lastMessageAt: now,
      updatedAt: now,
    };

    if (
      chat.title === "New Research Chat" &&
      chat.messages.length === 0
    ) {
      updates.title =
        content.length > 60
          ? `${content.slice(0, 57)}...`
          : content;
    }

    // Optimistic concurrency control:
    // update only if the chat version has not changed since it was read.
    const expectedVersion = chat.__v ?? 0;

    const updateResult = await ResearchChat.updateOne(
      {
        _id: chat._id,
        owner: req.user._id,
        __v: expectedVersion,
      },
      {
        $push: {
          messages: {
            $each: [userMessage, assistantMessage],
          },
        },
        $set: updates,
        $inc: {
          __v: 1,
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      // Distinguish a deleted chat from a concurrent modification.
      const stillExists = await ResearchChat.exists({
        _id: chat._id,
        owner: req.user._id,
      });

      if (!stillExists) {
        return res.status(404).json({
          message: "Research conversation not found.",
        });
      }

      return res.status(409).json({
        message:
          "This conversation changed while your response was being generated. Reload the conversation and try again.",
      });
    }

    return res.json({
      chatId: chat._id,
      messages: [userMessage, assistantMessage],
    });
  } catch (error) {
    console.error("Research message processing failed:", error.message);
    return res.status(500).json({
      message: "Unable to process your research message.",
    });
  }
});

// DELETE /api/research/chats/:chatId
// Delete a conversation belonging to the authenticated user.
router.delete("/chats/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!isValidObjectId(chatId)) {
      return res.status(400).json({
        message: "Invalid conversation ID.",
      });
    }

    const chat = await ResearchChat.findOneAndDelete({
      _id: chatId,
      owner: req.user._id,
    });

    if (!chat) {
      return res.status(404).json({
        message: "Research conversation not found.",
      });
    }

    return res.json({
      message: "Research conversation deleted successfully.",
    });
  } catch (error) {
    console.error("Research chat deletion failed:", error.message);
    return res.status(500).json({
      message: "Unable to delete this research conversation.",
    });
  }
});

module.exports = router;