
const express = require("express");
const Book = require("../models/Book");
const { protect } = require("../middleware/auth");
const { generateAIResponse } = require("../services/openrouter");
const {
  getPreferredGenres,
  getSearchSignals,
  fetchCandidates,
  parseAIChoices,
  chooseAIRecommendations,
} = require("../services/recommendationCandidates");

const router = express.Router();
const RECOMMENDATION_LIMIT = 8;

async function loadRecommendations(req) {
  const savedBooks = await Book.find({ owner: req.user._id })
    .select("title author genre status openLibraryKey")
    .lean();

  const preferences = getPreferredGenres(
    savedBooks,
    req.user.interests || []
  );

  const signals = getSearchSignals(preferences, savedBooks);

  const basedOn = signals
    .filter((signal) => signal.type !== "title")
    .map((signal) => signal.value);

  return {
    savedBooks,
    preferences,
    signals,
    basedOn: [...new Set(basedOn)],
  };
}

function fillRecommendations(selected, candidates, count = 8) {
  const results = [...selected];
  const used = new Set(
    results.map((book) => book.openLibraryKey)
  );

  for (const book of candidates) {
    if (results.length >= count) break;
    if (used.has(book.openLibraryKey)) continue;

    used.add(book.openLibraryKey);
    results.push(book);
  }

  return results;
}

router.get("/", protect, async (req, res) => {
  try {
    const {
      savedBooks,
      preferences,
      signals,
      basedOn,
    } = await loadRecommendations(req);

    if (!signals.length) {
      return res.json({
        basedOn,
        recommendations: [],
        message: "Add books to your bookshelf to get recommendations.",
      });
    }

    const { candidates, successfulSearches } =
      await fetchCandidates(preferences, savedBooks);

    if (!successfulSearches) {
      return res.status(502).json({
        message:
          "Book catalog is temporarily unavailable. Please try again.",
      });
    }

    return res.json({
      basedOn,
      recommendations: candidates.slice(0, RECOMMENDATION_LIMIT),
      message: candidates.length
        ? undefined
        : "No new matching books found.",
    });
  } catch (error) {
    console.error("Recommendation error:", error.message);

    return res.status(502).json({
      message: "Could not generate recommendations right now.",
    });
  }
});

router.post("/ai", protect, async (req, res) => {
  try {
    const {
      savedBooks,
      preferences,
      signals,
      basedOn,
    } = await loadRecommendations(req);

    if (!signals.length) {
      return res.json({
        basedOn,
        recommendations: [],
        message: "Add books to your bookshelf to get AI recommendations.",
      });
    }

    const { candidates, successfulSearches } =
      await fetchCandidates(preferences, savedBooks, { limit: 15 });

    if (!successfulSearches) {
      return res.status(502).json({
        message:
          "Book catalog is temporarily unavailable. Please try again.",
      });
    }

    const candidateList = candidates.slice(0, 30);

    if (!candidateList.length) {
      return res.json({
        basedOn,
        recommendations: [],
        message: "No suitable book candidates found.",
      });
    }

    try {
      const aiResult = await generateAIResponse([
        {
          role: "system",
          content: [
            "You recommend books from the supplied candidate list only.",
            "Use the user's saved titles, authors, genres and reading status.",
            "Select up to 8 distinct candidates using their exact openLibraryKey values.",
            "Prioritize relevance and avoid recommending duplicates.",
            "Return only a valid JSON object, with no Markdown:",
            '{"recommendations":[{"openLibraryKey":"/works/OL123W","reason":"Short explanation"}]}',
            "Each reason must be under 160 characters.",
            "Do not invent books or identifiers.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            preferredGenres: preferences.map((item) => item.name),
            bookshelf: savedBooks.slice(0, 20).map((book) => ({
              title: book.title,
              author: book.author,
              genre: book.genre,
              status: book.status,
            })),
            candidates: candidateList.map((book) => ({
              openLibraryKey: book.openLibraryKey,
              title: book.title,
              author: book.author,
              genre: book.genre,
            })),
          }),
        },
      ]);

      const choices = parseAIChoices(aiResult.content);

      const selected = chooseAIRecommendations(
        choices,
        candidateList,
        RECOMMENDATION_LIMIT
      );

      if (!selected.length) {
        throw new Error("AI selected no valid catalog candidates");
      }

      const recommendations = fillRecommendations(
        selected,
        candidateList,
        RECOMMENDATION_LIMIT
      );

      return res.json({
        basedOn,
        model: aiResult.model,
        recommendations,
        fallback: false,
      });
    } catch (error) {
      console.warn(
        "AI ranking unavailable; returning catalog-based picks:",
        error.message
      );

      return res.json({
        basedOn,
        recommendations: candidateList.slice(
          0,
          RECOMMENDATION_LIMIT
        ),
        fallback: true,
        message:
          "AI ranking is temporarily unavailable. Showing catalog-based picks instead.",
      });
    }
  } catch (error) {
    console.error("AI recommendation error:", error.message);

    return res.status(502).json({
      message: "Could not generate AI recommendations right now.",
    });
  }
});

module.exports = router;
