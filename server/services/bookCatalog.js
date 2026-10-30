const { searchOpenLibrary } = require('./bookProviders/openLibrary');
const { searchGoogleBooks } = require('./bookProviders/googleBooks');
const cache = new Map();
const normalize = (s) => String(s || '').toLowerCase().trim().replace(/\s+/g, ' ');
function score(book, query) {
  const q = normalize(query), title = normalize(book.title), author = normalize(book.author);
  const terms = q.split(' ').filter(Boolean);
  let points = title === q ? 100 : author === q ? 90 : 0;
  if (title.startsWith(q)) points += 65;
  else if (title.includes(q)) points += 45;
  if (author.includes(q)) points += 40;
  points += terms.reduce((sum, term) => sum + (title.includes(term) ? 9 : 0) + (author.includes(term) ? 5 : 0), 0);
  points += book.coverUrl ? 3 : 0;
  points += book.genre ? 2 : 0;
  points += book.description ? 2 : 0;
  return points;
}
function deduplicateBooks(books) {
  const map = new Map();
  for (const book of books) {
    if (!book?.title || !book?.catalogProvider || !book?.catalogId) continue;
    const key = `${normalize(book.title)}::${normalize(book.author)}`;
    const previous = map.get(key);
    if (!previous) { map.set(key, book); continue; }
    const quality = (item) => Number(Boolean(item.coverUrl)) + Number(Boolean(item.genre)) + Number(Boolean(item.description));
    const winner = quality(book) > quality(previous) ? book : previous;
    // Provider identity and link must always come from the same winning record.
    map.set(key, { ...winner, genre: winner.genre || book.genre || previous.genre || '',
      description: winner.description || book.description || previous.description || '' });
  }
  return [...map.values()];
}
function selectRanked(books, query, limit) {
  const ranked = deduplicateBooks(books).map((book) => ({ book, rank: score(book, query) }))
    .sort((a, b) => b.rank - a.rank);
  // The ranking is relevance-first. A provider is represented when its best eligible
  // match is reasonably close to the last displayed match.
  const selected = ranked.slice(0, limit);
  const providers = new Set(selected.map((entry) => entry.book.catalogProvider));
  for (const provider of ['openlibrary', 'googlebooks']) {
    if (providers.has(provider) || !selected.length) continue;
    const alternative = ranked.find((entry) => entry.book.catalogProvider === provider &&
      !selected.includes(entry) && entry.rank >= selected[selected.length - 1].rank - 12);
    if (alternative) { selected[selected.length - 1] = alternative; selected.sort((a,b) => b.rank-a.rank); }
  }
  return selected.map(({book, rank}) => ({ ...book, relevanceScore: rank }));
}
async function searchBookCatalog(query, limit = 20) {
  const clean = String(query || '').trim();
  const count = Math.min(Math.max(Number(limit) || 20, 1), 40);
  const key = `${normalize(clean)}:${count}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.books;
  const results = await Promise.allSettled([searchOpenLibrary(clean, count), searchGoogleBooks(clean, count)]);
  if (results.every((r) => r.status === 'rejected')) throw new Error('All book catalog providers are unavailable');
  const books = selectRanked(results.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value), clean, count);
  cache.set(key, { books, expiresAt: Date.now() + 60000 });
  return books;
}
module.exports = { searchBookCatalog, selectRanked, deduplicateBooks };
