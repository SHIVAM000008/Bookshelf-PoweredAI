
const express = require("express");
const Book = require("../models/Book");
const { protect } = require("../middleware/auth");
const { generateAIResponse } = require("../services/openrouter");

const router = express.Router();

router.get("/", protect, async (req, res) => {
  try {
    const savedBooks = await Book.find({
      owner: req.user._id,
    }).lean();

    // Books a user has finished carry more preference weight.
    const genreScores = new Map();

    for (const book of savedBooks) {
      const genre = book.genre?.trim();
      if (!genre) continue;

      const weight =
        book.status === "Finished" ? 3 :
        book.status === "Reading" ? 2 : 1;

      const key = genre.toLowerCase();
      const existing = genreScores.get(key);

      genreScores.set(key, {
        name: existing?.name || genre,
        score: (existing?.score || 0) + weight,
      });
    }

    // Explicit interests also contribute to preferences.
    for (const interest of req.user.interests || []) {
      if (typeof interest !== "string") continue;

      const name = interest.trim();
      if (!name) continue;

      const key = name.toLowerCase();
      const existing = genreScores.get(key);

      genreScores.set(key, {
        name: existing?.name || name,
        score: (existing?.score || 0) + 3,
      });
    }

    const topGenres = [...genreScores.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (topGenres.length === 0) {
      return res.json({
        message: "Add books with genres to get recommendations",
        recommendations: [],
      });
    }

    const savedKeys = new Set(
      savedBooks
        .map((book) => book.openLibraryKey)
        .filter(Boolean)
    );

    const savedTitles = new Set(
      savedBooks.map((book) =>
        book.title.trim().toLowerCase()
      )
    );

    const recommendations = [];
    const seenKeys = new Set();

    // Search the highest-ranked interests first.
    for (const genre of topGenres) {
      const params = new URLSearchParams({
        q: genre.name,
        limit: "20",
        fields: "key,title,author_name,cover_i,first_publish_year",
      });

      const response = await fetch(
        `https://openlibrary.org/search.json?${params}`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) {
        throw new Error("Open Library request failed");
      }

      const data = await response.json();

      for (const book of data.docs || []) {
        if (!book.key || !book.title) continue;

        const normalizedTitle = book.title.trim().toLowerCase();

        if (
          savedKeys.has(book.key) ||
          savedTitles.has(normalizedTitle) ||
          seenKeys.has(book.key)
        ) {
          continue;
        }

        seenKeys.add(book.key);

        recommendations.push({
          openLibraryKey: book.key,
          title: book.title,
          author: book.author_name?.[0] || "Unknown author",
          firstPublishYear: book.first_publish_year || null,
          coverUrl: book.cover_i
            ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
            : "",
          recommendedBecause:
  `Recommended because ${genre.name} is one of your preferred reading genres.`,
          score: genre.score,
        });
      }
    }

    recommendations.sort((a, b) => b.score - a.score);

    return res.json({
      basedOn: topGenres.map((genre) => genre.name),
      recommendations: recommendations.slice(0, 4),
    });
  } catch (error) {
    console.error("Recommendation error:", error);

    return res.status(502).json({
      message: "Could not generate recommendations right now",
    });
  }
});

/**
 * POST /api/recommendations/ai
 *
 * Generates personalized AI book recommendations.
 *
 * The AI does not invent books. Instead:
 * 1. We read the user's existing bookshelf.
 * 2. We fetch real candidates from Open Library.
 * 3. OpenRouter ranks those candidates.
 * 4. We validate every selected book against our candidates.
 *
 * The existing GET /api/recommendations route is unchanged.
 */
router.post("/ai", protect, async (req, res) => {
  try {
    // Fetch the authenticated user's saved books.
    const savedBooks = await Book.find({
      owner: req.user._id,
    })
      .select("title author genre status openLibraryKey")
      .lean();

    // Build preference scores from saved genres.
    const genreScores = new Map();

    for (const book of savedBooks) {
      const genre = book.genre?.trim();

      if (!genre) continue;

      const weight =
        book.status === "Finished"
          ? 3
          : book.status === "Reading"
            ? 2
            : 1;

      const key = genre.toLowerCase();

      genreScores.set(
        key,
        (genreScores.get(key) || 0) + weight
      );
    }

    // Include interests saved in the user's profile.
    for (const interest of req.user.interests || []) {
      if (typeof interest !== "string") continue;

      const genre = interest.trim().toLowerCase();

      if (!genre) continue;

      genreScores.set(
        genre,
        (genreScores.get(genre) || 0) + 3
      );
    }

    // Select up to three preferred genres.
    const topGenres = [...genreScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre);

    if (topGenres.length === 0) {
      return res.json({
        basedOn: [],
        recommendations: [],
        message:
          "Add books with genres to get AI recommendations.",
      });
    }

    // Exclude books already saved by the user.
    const savedKeys = new Set(
      savedBooks
        .map((book) => book.openLibraryKey)
        .filter(Boolean)
    );

    const savedTitles = new Set(
      savedBooks
        .map((book) => book.title?.trim().toLowerCase())
        .filter(Boolean)
    );

    const candidates = new Map();

    // Fetch real book candidates from Open Library.
    for (const genre of topGenres) {
      const params = new URLSearchParams({
        q: genre,
        limit: "15",
        fields:
          "key,title,author_name,cover_i,first_publish_year",
      });

      const response = await fetch(
        `https://openlibrary.org/search.json?${params}`,
        {
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        throw new Error("Open Library request failed");
      }

      const data = await response.json();

      for (const item of data.docs || []) {
        if (
          typeof item.key !== "string" ||
          !/^\/works\/OL\d+W$/.test(item.key) ||
          typeof item.title !== "string" ||
          !item.title.trim()
        ) {
          continue;
        }

        const normalizedTitle =
          item.title.trim().toLowerCase();

        if (
          savedKeys.has(item.key) ||
          savedTitles.has(normalizedTitle) ||
          candidates.has(item.key)
        ) {
          continue;
        }

        candidates.set(item.key, {
          openLibraryKey: item.key,
          title: item.title,
          author:
            item.author_name?.[0] || "Unknown author",
          firstPublishYear:
            item.first_publish_year || null,
          coverUrl: item.cover_i
            ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg`
            : "",
        });
      }
    }

    // Limit candidate count to control token usage.
    const candidateList = [...candidates.values()]
      .slice(0, 30);

    if (candidateList.length === 0) {
      return res.json({
        basedOn: topGenres,
        recommendations: [],
        message: "No suitable book candidates found.",
      });
    }

    // Send the reading profile and real candidates to AI.
    const aiResult = await generateAIResponse(
      [
        {
          role: "system",
          content: [
            "You are a personalized book recommendation engine.",
            "Select exactly 4 books from the supplied candidates when at least 4 suitable candidates exist.",
            "Prefer books relevant to the user's reading history.",
            "Never invent books or book identifiers.",
            "Return ONLY valid JSON in this exact shape:",
            '{"recommendations":[{"openLibraryKey":"/works/OL123W","reason":"Short personalized explanation"}]}',
            "Use exact candidate identifiers.",
            "Keep each reason under 160 characters.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            preferredGenres: topGenres,
            bookshelf: savedBooks.slice(0, 20).map(
              (book) => ({
                title: book.title,
                author: book.author,
                genre: book.genre,
                status: book.status,
              })
            ),
            candidates: candidateList.map(
              (book) => ({
                openLibraryKey: book.openLibraryKey,
                title: book.title,
                author: book.author,
              })
            ),
          }),
        },
      ],
    );

    // Extract the JSON object from the AI response.
    // Some free models wrap JSON in Markdown fences.
    const raw = aiResult.content;
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");

    if (start === -1 || end <= start) {
      throw new Error("AI returned no JSON object");
    }

    const parsed = JSON.parse(
      raw.slice(start, end + 1)
    );

    if (!Array.isArray(parsed.recommendations)) {
      throw new Error("Invalid AI recommendation format");
    }

    // Only allow IDs belonging to real fetched candidates.
    const selectedKeys = new Set();
    const recommendations = [];

    for (const choice of parsed.recommendations) {
      if (recommendations.length >= 4) break;

      const key = choice?.openLibraryKey;

      if (
        typeof key !== "string" ||
        !candidates.has(key) ||
        selectedKeys.has(key)
      ) {
        continue;
      }

      selectedKeys.add(key);

      recommendations.push({
        ...candidates.get(key),
        recommendedBecause:
          typeof choice.reason === "string" &&
          choice.reason.trim()
            ? choice.reason.trim().slice(0, 160)
            : "Matches your reading interests.",
      });
    }

    return res.json({
      basedOn: topGenres,
      model: aiResult.model,
      recommendations,
    });
  } catch (error) {
    console.error(
      "AI recommendation error:",
      error.message
    );

    return res.status(
      error.status === 429 ? 429 : 502
    ).json({
      message:
        error.status === 429
          ? "AI recommendations are temporarily rate-limited. Try again later."
          : "Could not generate AI recommendations right now.",
    });
  }
});


module.exports = router;
