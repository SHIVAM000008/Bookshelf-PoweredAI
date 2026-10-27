
const OPENROUTER_URL =
  "https://openrouter.ai/api/v1/chat/completions";

/**
 * Bookshelf PoweredAI — Shared OpenRouter Service
 *
 * Used by:
 * 1. AI-powered book recommendations
 * 2. AI Research Assistant (upcoming)
 *
 * Security:
 * - API key stays on the Express backend.
 * - Never log API keys or complete user prompts.
 * - External requests have a timeout.
 */

/**
 * Generate an AI response using OpenRouter.
 *
 * @param {Array} messages
 * Array of messages with role and content.
 *
 * @param {Object} options
 * Optional generation settings.
 *
 * @returns {Promise<{content: string, model: string}>}
 */
async function generateAIResponse(messages, options = {}) {
  // ============================================================
  // 1. LOAD ENVIRONMENT CONFIGURATION
  // ============================================================

  const apiKey = process.env.OPENROUTER_API_KEY;

  const model =
    process.env.OPENROUTER_MODEL || "openrouter/free";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  // ============================================================
  // 2. VALIDATE INPUT MESSAGES
  // ============================================================

  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.some(
      (message) =>
        !message ||
        !["system", "user", "assistant"].includes(message.role) ||
        typeof message.content !== "string" ||
        !message.content.trim()
    )
  ) {
    throw new Error("Invalid AI messages");
  }

  // ============================================================
  // 3. CONFIGURE GENERATION SETTINGS
  // ============================================================

  // Default to 500 tokens.
  // Allow a maximum of 1500 tokens to control usage.
   


  // ============================================================
  // 4. SEND REQUEST TO OPENROUTER
  // ============================================================

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",

    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-OpenRouter-Title": "Bookshelf PoweredAI",
    },

   body: JSON.stringify({
  model,
  messages,
  temperature: 0.4,
  stream: false,

  // Ask compatible models to avoid unnecessary reasoning.
  reasoning: {
    effort: "none",
  },

  // No max_tokens property.
  // The provider determines the output-token allowance.
}),

    // Abort if OpenRouter takes longer than 30 seconds.
    signal: AbortSignal.timeout(30000),
  });

  // ============================================================
  // 5. HANDLE PROVIDER HTTP ERRORS
  // ============================================================

  
if (!response.ok) {
  // Log the status without exposing credentials or prompts.
  console.error("OpenRouter HTTP error:", response.status);

  const error = new Error(
    response.status === 429
      ? "OpenRouter rate limit reached. Please try again later."
      : `OpenRouter request failed with HTTP ${response.status}`
  );

  error.status = response.status;

  // Preserve retry information when the provider supplies it.
  const retryAfter = response.headers.get("retry-after");

  if (retryAfter) {
    error.retryAfter = retryAfter;
    console.error("OpenRouter retry-after:", retryAfter);
  }

  throw error;
}


  // ============================================================
  // 6. PARSE AND DIAGNOSE THE RESPONSE
  // ============================================================

  const data = await response.json();

  const choice = data.choices?.[0];
  const message = choice?.message;

  // Safe diagnostics for debugging empty model responses.
  // Does not print the complete AI response or API key.
  console.log("OpenRouter response diagnostics:", {
    model: data.model || model,
    choicesCount: data.choices?.length ?? 0,
    finishReason: choice?.finish_reason ?? null,
    contentType: typeof message?.content,
    contentLength:
      typeof message?.content === "string"
        ? message.content.length
        : null,
    reasoningPresent: Boolean(
      message?.reasoning || message?.reasoning_details
    ),
    providerErrorPresent: Boolean(data.error),
  });

  // ============================================================
  // 7. EXTRACT THE GENERATED TEXT
  // ============================================================

  // Most OpenRouter chat models return text in:
  // choices[0].message.content
  let content = "";

  if (typeof message?.content === "string") {
    content = message.content.trim();
  } else if (Array.isArray(message?.content)) {
    // Handle responses containing text content blocks.
    content = message.content
      .filter(
        (part) =>
          part &&
          part.type === "text" &&
          typeof part.text === "string"
      )
      .map((part) => part.text)
      .join("\n")
      .trim();
  }

  // If the model only generated reasoning and no final
  // answer, report that clearly rather than treating
  // reasoning as the user-facing answer.
  if (!content) {
    const error = new Error(
      "AI provider returned an empty response"
    );

    error.code = "EMPTY_AI_RESPONSE";
    throw error;
  }

  // ============================================================
  // 8. RETURN A CONSISTENT RESULT
  // ============================================================

  return {
    content,
    model: data.model || model,
  };
}

module.exports = {
  generateAIResponse,
};
