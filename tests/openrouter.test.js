const test = require('node:test');
const assert = require('node:assert/strict');
const { generateAIResponse } = require('../server/services/openrouter');
const messages = [{ role: 'user', content: 'Rank candidates' }];

test('ranking request accepts custom token budget and preserves default for other callers', async () => {
  const oldFetch = global.fetch;
  const oldKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = 'test-only';
  const requests = [];
  global.fetch = async (_url, init) => {
    requests.push(JSON.parse(init.body));
    return { ok: true, json: async () => ({ model: 'test-model', choices: [{ finish_reason: 'stop', message: { content: '{"indices":[1,2]}' } }] }) };
  };
  try {
    assert.equal((await generateAIResponse(messages, { maxTokens: 1200, temperature: 0.2 })).content, '{"indices":[1,2]}');
    await generateAIResponse(messages);
    assert.equal(requests[0].max_tokens, 1200);
    assert.equal(requests[0].temperature, 0.2);
    assert.equal(requests[1].max_tokens, 500);
    assert.equal(requests[1].temperature, 0.4);
  } finally {
    global.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = oldKey;
  }
});

test('truncated responses are rejected before JSON parsing', async () => {
  const oldFetch = global.fetch;
  const oldKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = 'test-only';
  global.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ finish_reason: 'length', message: { content: '{"indices":', reasoning: 'thinking' } }] }) });
  try {
    await assert.rejects(generateAIResponse(messages), { code: 'AI_OUTPUT_TRUNCATED' });
  } finally {
    global.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = oldKey;
  }
});


test('explicit recommendation model overrides automatic routing without changing other callers', async () => {
  const oldFetch = global.fetch;
  const oldKey = process.env.OPENROUTER_API_KEY;
  const oldModel = process.env.OPENROUTER_MODEL;
  process.env.OPENROUTER_API_KEY = 'test-only';
  process.env.OPENROUTER_MODEL = 'openrouter/free';
  const requested = [];
  global.fetch = async (_url, init) => {
    requested.push(JSON.parse(init.body).model);
    return { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: '{"indices":[1]}' } }] }) };
  };
  try {
    await generateAIResponse(messages, { model: 'google/gemma-3-27b-it:free' });
    await generateAIResponse(messages);
    assert.deepEqual(requested, ['google/gemma-3-27b-it:free', 'openrouter/free']);
  } finally {
    global.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = oldKey;
    if (oldModel === undefined) delete process.env.OPENROUTER_MODEL;
    else process.env.OPENROUTER_MODEL = oldModel;
  }
});
