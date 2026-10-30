const express = require("express");
const Book = require("../models/Book");
const { protect } = require("../middleware/auth");
const { generateAIResponse } = require("../services/openrouter");
const {
  getPreferredGenres,
  fetchCandidates,
  parseAIChoices,
  chooseAIRecommendations,
} = require("../services/recommendationCandidates");

const router = express.Router();

async function loadRecommendations(req) {
  const savedBooks = await Book.find({ owner: req.user._id })
    .select("title author genre status openLibraryKey")
    .lean();
  const preferences = getPreferredGenres(savedBooks, req.user.interests || []);
  return { savedBooks, preferences, basedOn: preferences.map((item) => item.name) };
}

router.get("/", protect, async (req, res) => {
  try {
    const { savedBooks, preferences, basedOn } = await loadRecommendations(req);
    if (!preferences.length) {
      return res.json({ basedOn, recommendations: [], message: "Add books with genres to get recommendations." });
    }
    const { candidates, successfulSearches } = await fetchCandidates(preferences, savedBooks);
    if (!successfulSearches) {
      return res.status(502).json({ message: "Book catalog is temporarily unavailable. Please try again." });
    }
    return res.json({
      basedOn,
      recommendations: candidates.slice(0, 8),
      message: candidates.length ? undefined : "No new matching books found.",
    });
  } catch (error) {
    console.error("Recommendation error:", error.message);
    return res.status(502).json({ message: "Could not generate recommendations right now" });
  }
});

router.post("/ai", protect, async (req, res) => {
  try {
    const { savedBooks, preferences, basedOn } = await loadRecommendations(req);
    if (!preferences.length) {
      return res.json({ basedOn, recommendations: [], message: "Add books with genres to get AI recommendations." });
    }
    const { candidates, successfulSearches } = await fetchCandidates(preferences, savedBooks, { limit: 15 });
    if (!successfulSearches) {
      return res.status(502).json({ message: "Book catalog is temporarily unavailable. Please try again." });
    }
    const candidateList = candidates.slice(0, 30);
    if (!candidateList.length) {
      return res.json({ basedOn, recommendations: [], message: "No suitable book candidates found." });
    }

    try {
      const aiResult = await generateAIResponse([
        {
          role: "system",
          content: [
            "You recommend books from the supplied candidate list only.",
            "Select up to 8 distinct candidates using their exact openLibraryKey values.",
            "Return only a valid JSON object, with no Markdown:",
            '{"recommendations":[{"openLibraryKey":"/works/OL123W","reason":"Short explanation"}]}',
            "Each reason must be under 160 characters. Do not invent identifiers.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            preferredGenres: basedOn,
            bookshelf: savedBooks.slice(0, 20).map((book) => ({
              title: book.title, author: book.author, genre: book.genre, status: book.status,
            })),
            candidates: candidateList.map((book) => ({
              openLibraryKey: book.openLibraryKey, title: book.title,
              author: book.author, genre: book.genre,
            })),
          }),
        },
      ]);
      const choices = parseAIChoices(aiResult.content);
      const recommendations = chooseAIRecommendations(choices, candidateList, 8);
      if (!recommendations.length) throw new Error("AI selected no valid catalog candidates");
      return res.json({ basedOn, model: aiResult.model, recommendations, fallback: false });
    } catch (error) {
      console.warn("AI ranking unavailable; returning catalog-based picks:", error.message);
      return res.json({
        basedOn,
        recommendations: candidateList.slice(0, 8),
        fallback: true,
        message: "AI ranking is temporarily unavailable. Showing catalog-based picks instead.",
      });
    }
  } catch (error) {
    console.error("AI recommendation error:", error.message);
    return res.status(502).json({ message: "Could not generate AI recommendations right now." });
  }
});

module.exports = router;
