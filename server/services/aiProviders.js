// Direct-provider AI service. No OpenRouter dependency.
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash-lite';
const DEFAULT_GROQ_MODEL = 'llama-3.1-8b-instant';

function validateMessages(messages) {
  if (!Array.isArray(messages) || !messages.length || messages.some(
    (m) => !m || !['system', 'user', 'assistant'].includes(m.role) ||
      typeof m.content !== 'string' || !m.content.trim()
  )) throw new Error('Invalid AI messages');
}

function providerError(provider, status, response) {
  const error = new Error(`${provider} returned HTTP ${status}`);
  error.status = status;
  error.provider = provider;
  error.retryAfter = response.headers?.get?.('retry-after') || null;
  return error;
}

async function requestGemini(messages, options, timeoutMs) {
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const systemText = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  const contents = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const config = { temperature: options.temperature ?? 0.4 };
  if (options.maxTokens) config.maxOutputTokens = options.maxTokens;
  if (options.json) config.responseMimeType = 'application/json';
  const body = { contents, generationConfig: config };
  if (systemText) body.systemInstruction = { parts: [{ text: systemText }] };
  const response = await fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw providerError('Gemini', response.status, response);
  const data = await response.json();
  const candidate = data.candidates?.[0];
  if (candidate?.finishReason === 'MAX_TOKENS') throw new Error('Gemini output truncated');
  const content = (candidate?.content?.parts || []).filter(p => typeof p.text === 'string')
    .map(p => p.text).join('\n').trim();
  if (!content) throw new Error('Gemini returned no usable text');
  return { content, model: `gemini/${model}` };
}

async function requestGroq(messages, options, timeoutMs) {
  const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  const body = { model, messages, temperature: options.temperature ?? 0.4, stream: false };
  if (options.maxTokens) body.max_completion_tokens = options.maxTokens;
  if (options.json) body.response_format = { type: 'json_object' };
  const response = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw providerError('Groq', response.status, response);
  const data = await response.json();
  const choice = data.choices?.[0];
  if (choice?.finish_reason === 'length') throw new Error('Groq output truncated');
  const content = typeof choice?.message?.content === 'string' ? choice.message.content.trim() : '';
  if (!content) throw new Error('Groq returned no usable text');
  return { content, model: `groq/${data.model || model}` };
}

async function generateAIResponse(messages, options = {}) {
  validateMessages(messages);
  const providers = [
    { name: 'Gemini', key: process.env.GEMINI_API_KEY, request: requestGemini },
    { name: 'Groq', key: process.env.GROQ_API_KEY, request: requestGroq },
  ].filter(p => p.key);
  if (!providers.length) throw new Error('Configure GEMINI_API_KEY or GROQ_API_KEY');
  const timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
    ? Math.min(Math.trunc(options.timeoutMs), 45000) : 25000;
  let lastError;
  for (const provider of providers) {
    try {
      return await provider.request(messages, options, timeoutMs);
    } catch (error) {
      lastError = error;
      // Never log credentials, response bodies, or user messages.
      console.warn('AI provider failed:', { provider: provider.name, status: error.status || null,
        reason: error.name === 'TimeoutError' ? 'timeout' : error.message });
    }
  }
  throw lastError;
}

module.exports = { generateAIResponse };
