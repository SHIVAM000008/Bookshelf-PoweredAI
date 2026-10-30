const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getPreferredGenres, fetchCandidates, parseAIChoices, chooseAIRecommendations,
} = require("../server/services/recommendationCandidates");

test("preferences retain finished-book weighting and interests", () => {
  const result = getPreferredGenres([
    { genre: "Fantasy", status: "Finished" },
    { genre: "History", status: "Reading" },
  ], ["Fantasy"]);
  assert.deepEqual(result.map((item) => [item.name, item.score]), [["Fantasy", 6], ["History", 2]]);
});

test("a failed provider search does not discard other results", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    if (String(url).includes("Fantasy")) throw new Error("timeout");
    return { ok: true, json: async () => ({ docs: [
      { key: "/works/OL123W", title: "History Book", author_name: ["Author"], subject: ["History"] },
    ] }) };
  };
  try {
    const result = await fetchCandidates([
      { name: "Fantasy", score: 3 }, { name: "History", score: 2 },
    ], []);
    assert.equal(result.successfulSearches, 1);
    assert.equal(result.candidates.length, 1);
    assert.equal(result.candidates[0].genre, "History");
  } finally { global.fetch = originalFetch; }
});

test("saved books are excluded and duplicate works are merged", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ docs: [
    { key: "/works/OL1W", title: "Saved", subject: ["Fantasy"] },
    { key: "/works/OL2W", title: "New", subject: ["Science fiction"] },
  ] }) });
  try {
    const result = await fetchCandidates([
      { name: "Fantasy", score: 2 }, { name: "Science Fiction", score: 1 },
    ], [{ title: "Saved", openLibraryKey: "/works/OL1W" }]);
    assert.equal(result.candidates.length, 1);
    assert.equal(result.candidates[0].genre, "Science Fiction");
  } finally { global.fetch = originalFetch; }
});

test("malformed AI JSON is rejected and unknown book IDs are ignored", () => {
  assert.throws(() => parseAIChoices('{"recommendations":[{"openLibraryKey":"x"}'), SyntaxError);
  const choices = parseAIChoices('{"recommendations":[{"openLibraryKey":"fake"},{"openLibraryKey":"/works/OL2W","reason":"Relevant"}]}');
  const result = chooseAIRecommendations(choices, [{ openLibraryKey: "/works/OL2W", title: "Verified" }]);
  assert.equal(result.length, 1);
  assert.equal(result[0].title, "Verified");
});
