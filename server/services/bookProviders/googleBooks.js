const { normalizeBookGenre } = require('../bookGenre');
const GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes';
function plainText(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim().slice(0, 3000);
}
async function searchGoogleBooks(query, limit = 12) {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_BOOKS_API_KEY is not configured');
  const params = new URLSearchParams({ q: query, maxResults: String(Math.min(Math.max(limit, 1), 40)), printType: 'books', key: apiKey });
  const response = await fetch(`${GOOGLE_BOOKS_URL}?${params}`, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Google Books returned HTTP ${response.status}`);
  const data = await response.json();
  return (data.items || []).filter((item) => item.id && item.volumeInfo?.title).map((item) => {
    const info = item.volumeInfo;
    const year = Number.parseInt(String(info.publishedDate || '').slice(0, 4), 10);
    return { catalogProvider: 'googlebooks', catalogId: item.id, openLibraryKey: '',
      title: info.title, author: info.authors?.[0] || 'Unknown author',
      genre: normalizeBookGenre(info.categories), firstPublishYear: Number.isFinite(year) ? year : null,
      coverUrl: (info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || '').replace(/^http:\/\//i, 'https://'),
      description: plainText(info.description) };
  });
}
module.exports = { searchGoogleBooks };
