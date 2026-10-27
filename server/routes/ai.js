
const express = require("express");
const { protect } = require("../middleware/auth");
const { generateAIResponse } = require("../services/openrouter");

const router = express.Router();

/**
 * Temporary AI connection test endpoint.
 *
 * Route: GET /api/ai/test
 *
 * Purpose:
 * 1. Verify user authentication.
 * 2. Identify which client is calling the endpoint.
 * 3. Verify the configured OpenRouter model.
 * 4. Test AI response generation.
 *
 * IMPORTANT:
 * Remove this endpoint before production deployment.
 */
router.get("/test", protect, async (req, res) => {
  // Generate a unique ID for this request.
  // This helps us distinguish multiple requests in the logs.
  const requestId = crypto.randomUUID();

  const startTime = Date.now();

  // Log request details without exposing passwords,
  // authentication cookies, or API keys.
  console.log("\n========== AI TEST REQUEST ==========");

  console.log("Request ID:", requestId);
  console.log("Time:", new Date().toISOString());
  console.log("Method:", req.method);
  console.log("Path:", req.originalUrl);

  console.log(
    "Origin:",
    req.get("origin") || "Not provided"
  );

  console.log(
    "User-Agent:",
    req.get("user-agent") || "Unknown"
  );

  console.log(
    "Configured OpenRouter model:",
    process.env.OPENROUTER_MODEL || "openrouter/free"
  );

  console.log("=====================================\n");

  try {
    // Send a small test prompt to OpenRouter.
    const result = await generateAIResponse(
      [
        {
          role: "system",
          content:
            "You are a helpful book recommendation assistant.",
        },
        {
          role: "user",
          content:
            "Recommend one classic science fiction book in one sentence.",
        },
      ],
      {
        maxTokens: 500,
      }
    );

    // Log successful requests.
    console.log("AI TEST SUCCESS:", {
      requestId,
      model: result.model,
      durationMs: Date.now() - startTime,
    });

    // Return the generated response to the client.
    return res.json({
      success: true,
      model: result.model,
      response: result.content,
    });
  } catch (error) {
    // Log useful debugging information.
    console.error("AI TEST FAILED:", {
      requestId,
      message: error.message,
      status: error.status || null,
      retryAfter: error.retryAfter || null,
      durationMs: Date.now() - startTime,
    });

    // Handle OpenRouter rate limits separately.
    if (error.status === 429) {
      if (error.retryAfter) {
        res.set("Retry-After", String(error.retryAfter));
      }

      return res.status(429).json({
        success: false,
        message:
          "OpenRouter rate limit reached. Please try again later.",
      });
    }

    // Handle all other AI provider failures.
    return res.status(502).json({
      success: false,
      message:
        "AI connection failed. Check the server logs and OpenRouter configuration.",
    });
  }
});

module.exports = router;
