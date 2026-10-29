
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  searchOpenLibrary,
} = require("../server/services/bookProviders/openLibrary");
const {
  searchGoogleBooks,
} = require("../server/services/bookProviders/googleBooks");
const {
  searchBookCatalog,
} = require("../server/services/bookCatalog");

// Test-only key. All API requests are mocked; no real key is needed.
process.env.GOOGLE_BOOKS_API_KEY = "test-google-books-api-key";

function mockFetch(responses) {
  let index = 0;

  global.fetch = async () => {
    const response = responses[index++];

    if (!response) {
      throw new Error("Unexpected fetch call");
    }

    return {
      ok: response.ok !== false,
      status: response.status || 200,
      json: async () => response.body,
    };
  };
}

test("Open Library results use provider-neutral identifiers", async () => {
  mockFetch([
    {
      body: {
        docs: [
          {
            key: "/works/OL123W",
            title: "Atomic Habits",
            author_name: ["James Clear"],
            first_publish_year: 2018,
            cover_i: 12345,
          },
        ],
      },
    },
  ]);

  const books = await searchOpenLibrary("Atomic Habits");

  assert.equal(books.length, 1);
  assert.equal(books[0].catalogProvider, "openlibrary");
  assert.equal(books[0].catalogId, "/works/OL123W");
  assert.equal(books[0].openLibraryKey, "/works/OL123W");
  assert.match(books[0].coverUrl, /^https:\/\/covers\.openlibrary\.org\//);
});

test("Google Books results map volume IDs and HTTPS covers", async () => {
  mockFetch([
    {
      body: {
        items: [
          {
            id: "google-volume-123",
            volumeInfo: {
              title: "Atomic Habits",
              authors: ["James Clear"],
              publishedDate: "2018-10-16",
              imageLinks: {
                thumbnail: "http://books.google.com/cover.jpg",
              },
            },
          },
        ],
      },
    },
  ]);

  const books = await searchGoogleBooks("Atomic Habits");

  assert.equal(books.length, 1);
  assert.equal(books[0].catalogProvider, "googlebooks");
  assert.equal(books[0].catalogId, "google-volume-123");
  assert.equal(books[0].openLibraryKey, "");
  assert.equal(books[0].firstPublishYear, 2018);
  assert.match(books[0].coverUrl, /^https:\/\//);
});

test("catalog combines providers and deduplicates matching title and author", async () => {
  mockFetch([
    {
      body: {
        docs: [
          {
            key: "/works/OL123W",
            title: "Atomic Habits",
            author_name: ["James Clear"],
            cover_i: 123,
          },
        ],
      },
    },
    {
      body: {
        items: [
          {
            id: "google-volume-123",
            volumeInfo: {
              title: "Atomic Habits",
              authors: ["James Clear"],
            },
          },
          {
            id: "google-volume-456",
            volumeInfo: {
              title: "Deep Work",
              authors: ["Cal Newport"],
            },
          },
        ],
      },
    },
  ]);

  const books = await searchBookCatalog("unique test query");

  assert.equal(books.length, 2);
  assert.ok(books.some((book) => book.title === "Atomic Habits"));
  assert.ok(books.some((book) => book.title === "Deep Work"));
});

test("catalog returns available results if one provider fails", async () => {
  mockFetch([
    {
      ok: false,
      status: 502,
      body: {},
    },
    {
      body: {
        items: [
          {
            id: "google-volume-789",
            volumeInfo: {
              title: "Deep Work",
              authors: ["Cal Newport"],
            },
          },
        ],
      },
    },
  ]);

  const books = await searchBookCatalog("another unique test query");

  assert.equal(books.length, 1);
  assert.equal(books[0].catalogProvider, "googlebooks");
});
