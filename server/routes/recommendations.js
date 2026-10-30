const express = require('express');
const Book = require('../models/Book');
const { protect } = require('../middleware/auth');
const { generateAIResponse } = require('../services/aiProviders');
const { getPreferredGenres, getSearchSignals, fetchCandidates } = require('../services/recommendationCandidates');

const router = express.Router();
const RECOMMENDATION_LIMIT = 10;
const identity = (book) => `${book.catalogProvider}:${book.catalogId}`;

async function loadRecommendations(req) {
  const savedBooks = await Book.find({ owner: req.user._id })
    .select('title author genre status openLibraryKey catalogProvider catalogId').lean();
  const preferences = getPreferredGenres(savedBooks, req.user.interests || []);
  const signals = getSearchSignals(preferences, savedBooks);
  const basedOn = [...new Set(signals.filter((s) => s.type !== 'title').map((s) => s.value))];
  return { savedBooks, preferences, signals, basedOn };
}

function fillRecommendations(selected, candidates, count = RECOMMENDATION_LIMIT) {
  const results = [...selected];
  const used = new Set(results.map(identity));
  for (const book of candidates) {
    if (results.length >= count) break;
    if (used.has(identity(book))) continue;
    used.add(identity(book));
    results.push(book);
  }
  return results;
}

// Model indices are 1-based and refer only to the candidate array we supplied.
// This eliminates hallucinated catalog IDs and verbose JSON explanations.
function parseRanking(content, candidates, count = RECOMMENDATION_LIMIT) {
  if (typeof content !== 'string') throw new Error('AI ranking response is not text');
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('AI ranking response has no JSON object');
  const parsed = JSON.parse(content.slice(start, end + 1));
  if (!Array.isArray(parsed.indices)) throw new Error('Invalid AI ranking structure');
  const seen = new Set();
  const books = [];
  for (const index of parsed.indices) {
    if (!Number.isInteger(index) || index < 1 || index > candidates.length || seen.has(index)) continue;
    seen.add(index);
    books.push(candidates[index - 1]);
    if (books.length >= count) break;
  }
  if (!books.length) throw new Error('AI selected no valid catalog candidates');
  return books;
}

async function rankWithAI(messages, candidates) {
  const result = await generateAIResponse(messages, {
    maxTokens: 1200,
    temperature: 0.2,
    timeoutMs: 25000,
    json: true,
  });
  return { selected: parseRanking(result.content, candidates), model: result.model };
}

router.get('/', protect, async (req, res) => {
  try {
    const { savedBooks, preferences, signals, basedOn } = await loadRecommendations(req);
    if (!signals.length) return res.json({ basedOn, recommendations: [], message: 'Add books to your bookshelf to get recommendations.' });
    const { candidates, successfulSearches } = await fetchCandidates(preferences, savedBooks);
    if (!successfulSearches) return res.status(502).json({ message: 'Book catalogs are temporarily unavailable. Please try again.' });
    return res.json({ basedOn, recommendations: candidates.slice(0, RECOMMENDATION_LIMIT),
      message: candidates.length ? undefined : 'No new matching books found.' });
  } catch (error) {
    console.error('Recommendation error:', error.message);
    return res.status(502).json({ message: 'Could not generate recommendations right now.' });
  }
});

router.post('/ai', protect, async (req, res) => {
  try {
    const { savedBooks, preferences, signals, basedOn } = await loadRecommendations(req);
    if (!signals.length) return res.json({ basedOn, recommendations: [], message: 'Add books to your bookshelf to get AI recommendations.' });
    const { candidates, successfulSearches } = await fetchCandidates(preferences, savedBooks, { limit: 15 });
    if (!successfulSearches) return res.status(502).json({ message: 'Book catalogs are temporarily unavailable. Please try again.' });
    const candidateList = candidates.slice(0, 35);
    console.log('AI recommendation candidates:', {
  total: candidates.length,
  selected: candidateList.length,
  providers: candidateList.reduce((counts, book) => {
    const provider = book.catalogProvider || 'unknown';
    counts[provider] = (counts[provider] || 0) + 1;
    return counts;
  }, {}),
});
    if (!candidateList.length) return res.json({ basedOn, recommendations: [], message: 'No suitable book candidates found.' });
    try {
      const messages = [
        { role: 'system', content: [
          'Rank the supplied book candidates for this reader using their bookshelf, reading status, and preferred genres.',
          'Candidates are numbered from 1. Select up to 10 distinct numbers from the candidate list.',
          'Respond ONLY with a short JSON object such as {"indices":[3,1,5,2]}.',
          'Do not explain, include book metadata, invent numbers, or use Markdown.'
        ].join(' ') },
        { role: 'user', content: JSON.stringify({
          preferredGenres: preferences.map((item) => item.name),
          bookshelf: savedBooks.slice(0, 12).map((book) => ({ title: book.title, author: book.author, genre: book.genre, status: book.status })),
          candidates: candidateList.map((book, i) => ({ n: i + 1, title: book.title, author: book.author, genre: book.genre }))
        }) },
      ];
      const { selected, model } = await rankWithAI(messages, candidateList);
      return res.json({ basedOn, model,
        recommendations: fillRecommendations(selected, candidateList), fallback: false });
    } catch (error) {
      console.warn('AI ranking unavailable; returning catalog-based picks:', error.message);
      return res.json({ basedOn, recommendations: candidateList.slice(0, RECOMMENDATION_LIMIT), fallback: true,
        message: 'AI ranking is temporarily unavailable. Showing catalog-based picks instead.' });
    }
  } catch (error) {
    console.error('AI recommendation error:', error.message);
    return res.status(502).json({ message: 'Could not generate AI recommendations right now.' });
  }
});

module.exports = router;
