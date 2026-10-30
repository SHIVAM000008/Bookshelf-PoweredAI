
const OPENROUTER_URL =
  "https://openrouter.ai/api/v1/chat/completions";

async function generateAIResponse(messages, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "openrouter/free";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

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

  const requestedTokens = Number(options.maxTokens);
  const maxTokens = Number.isFinite(requestedTokens)
    ? Math.min(Math.max(Math.trunc(requestedTokens), 1), 1500)
    : 500;

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
      max_tokens: maxTokens,
      stream: false,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    let providerCode = null;
    let providerMessage = "";

    try {
      const errorBody = await response.json();

      providerCode =
        typeof errorBody?.error?.code === "number" ||
        typeof errorBody?.error?.code === "string"
          ? String(errorBody.error.code).slice(0, 40)
          : null;

      providerMessage =
        typeof errorBody?.error?.message === "string"
          ? errorBody.error.message
          : "";
    } catch {
      // Provider may return an empty or non-JSON error response.
    }

    // Avoid logging arbitrary provider text, which could contain
    // request details. Log only known diagnostic categories.
    const diagnostic = /model.*(not found|invalid|unavailable|unsupported)/i.test(
      providerMessage
    )
      ? "model configuration"
      : /reasoning|temperature|parameter|max_tokens/i.test(
          providerMessage
        )
        ? "unsupported request parameter"
        : /credits|balance|quota/i.test(providerMessage)
          ? "account quota or credits"
          : /provider|routing/i.test(providerMessage)
            ? "provider routing"
            : "unspecified provider error";

    console.error("OpenRouter request failed:", {
      status: response.status,
      model,
      providerCode,
      diagnostic,
    });

    const error = new Error(
      response.status === 429
        ? "OpenRouter rate limit reached. Please try again later."
        : `OpenRouter request failed with HTTP ${response.status}`
    );

    error.status = response.status;

    const retryAfter = response.headers.get("retry-after");
    if (retryAfter) {
      error.retryAfter = retryAfter;
    }

    throw error;
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const message = choice?.message;

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

  let content = "";

  if (typeof message?.content === "string") {
    content = message.content.trim();
  } else if (Array.isArray(message?.content)) {
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

  if (!content) {
    const error = new Error("AI provider returned an empty response");
    error.code = "EMPTY_AI_RESPONSE";
    throw error;
  }

  return {
    content,
    model: data.model || model,
  };
}

module.exports = {
  generateAIResponse,
};
