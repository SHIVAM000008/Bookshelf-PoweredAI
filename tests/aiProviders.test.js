const test = require('node:test');
const assert = require('node:assert/strict');
const { generateAIResponse } = require('../server/services/aiProviders');
const messages = [{ role: 'user', content: 'Hello' }];

test('Gemini success is preferred over Groq', async () => {
  const original = { fetch: global.fetch, gemini: process.env.GEMINI_API_KEY, groq: process.env.GROQ_API_KEY };
  process.env.GEMINI_API_KEY = 'test-gemini'; process.env.GROQ_API_KEY = 'test-groq';
  let calls = 0;
  global.fetch = async (url, opts) => { calls++; assert.match(url, /generativelanguage/);
    assert.equal(opts.headers['x-goog-api-key'], 'test-gemini');
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Hello back' }] }, finishReason: 'STOP' }] }) };
  };
  try { const r = await generateAIResponse(messages); assert.equal(r.content, 'Hello back'); assert.equal(calls, 1); }
  finally { global.fetch = original.fetch; if (original.gemini === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = original.gemini; if (original.groq === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = original.groq; }
});

test('Groq handles Gemini HTTP 429 without retrying Gemini', async () => {
  const original = { fetch: global.fetch, gemini: process.env.GEMINI_API_KEY, groq: process.env.GROQ_API_KEY };
  process.env.GEMINI_API_KEY = 'test-gemini'; process.env.GROQ_API_KEY = 'test-groq';
  const urls = [];
  global.fetch = async (url) => { urls.push(url);
    if (url.includes('generativelanguage')) return { ok: false, status: 429, headers: { get: () => null } };
    return { ok: true, json: async () => ({ model: 'llama-3.1-8b-instant', choices: [{ finish_reason: 'stop', message: { content: '{"indices":[1]}' } }] }) };
  };
  try { const r = await generateAIResponse(messages, { json: true }); assert.equal(r.content, '{"indices":[1]}'); assert.match(r.model, /^groq\//); assert.equal(urls.length, 2); }
  finally { global.fetch = original.fetch; if (original.gemini === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = original.gemini; if (original.groq === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = original.groq; }
});
