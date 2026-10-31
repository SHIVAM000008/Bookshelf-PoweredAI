
const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const { Resend } = require("resend");
const { rateLimit } = require("express-rate-limit");

const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();

const isProduction = process.env.NODE_ENV === "production";
const RESET_TOKEN_LIFETIME = 15 * 60 * 1000;

const GENERIC_RESET_MESSAGE =
  "If an account exists for this email, password reset instructions will be provided.";

const INVALID_RESET_MESSAGE =
  "Invalid or expired password reset link";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message:
      "Too many password reset requests. Please try again later.",
  },
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message:
      "Too many password reset attempts. Please try again later.",
  },
});

function setAuthCookie(res, user) {
  const token = jwt.sign(
    {
      id: user._id.toString(),
      sessionVersion: user.sessionVersion ?? 0,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
      algorithm: "HS256",
    }
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function normalizeEmail(email) {
  if (typeof email !== "string") return null;

  const normalized = email.trim().toLowerCase();

  if (
    normalized.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  ) {
    return null;
  }

  return normalized;
}

function validPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 12 &&
    password.length <= 72
  );
}

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function getAppUrl() {
  const raw = process.env.APP_URL;

  if (!raw) return null;

  try {
    const url = new URL(raw);

    if (url.username || url.password) return null;
    if (url.search || url.hash) return null;
    if (url.pathname !== "/") return null;

    if (
      isProduction &&
      url.protocol !== "https:"
    ) {
      return null;
    }

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function emailIsConfigured() {
  return Boolean(
    resend &&
    process.env.EMAIL_FROM &&
    getAppUrl()
  );
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]
  );
}

async function sendPasswordResetEmail(email, resetUrl) {
  const safeUrl = escapeHtml(resetUrl);

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: [email],
    subject: "Reset your Bookshelf Powerd password",
    text: [
      "You requested a password reset for Bookshelf Powerd.",
      "",
      "Open this link to create a new password:",
      resetUrl,
      "",
      "This link expires in 15 minutes and can be used only once.",
      "",
      "If you did not request this reset, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#242424;line-height:1.6">
        <h2>Bookshelf Powerd</h2>
        <h3>Reset your password</h3>
        <p>We received a request to reset your password.</p>
        <p>
          <a
            href="${safeUrl}"
            style="display:inline-block;background:#70233f;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none"
          >
            Reset password
          </a>
        </p>
        <p>This link expires in 15 minutes and can only be used once.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p style="font-size:12px;color:#777">
          Bookshelf Security
        </p>
      </div>
    `,
  });

  if (error || !data?.id) {
    throw new Error(
      `Resend email submission failed: ${
        error?.message || "No email ID returned"
      }`
    );
  }

  return data.id;
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 80 ||
      !normalizedEmail ||
      !validPassword(password)
    ) {
      return res.status(400).json({
        message:
          "Provide a valid name, email, and password of 12–72 characters",
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    setAuthCookie(res, user);

    return res.status(201).json({
      message: "Registration successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        interests: user.interests,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    console.error("Registration error:", error);

    return res.status(500).json({
      message: "Unable to register user",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (
      !normalizedEmail ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        message: "Valid email and password are required",
      });
    }

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (
      !user ||
      !(await bcrypt.compare(password, user.password))
    ) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    setAuthCookie(res, user);

    return res.status(200).json({
      message: "Login credentials verified",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        interests: user.interests,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Unable to log in",
    });
  }
});

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  async (req, res) => {
    try {
      const email = normalizeEmail(req.body?.email);

      if (!email) {
        return res.status(400).json({
          message: "Enter a valid email address",
        });
      }

      if (!emailIsConfigured()) {
        console.error(
          "Password reset email configuration is missing or invalid."
        );

        return res.status(503).json({
          message:
            "Password reset is temporarily unavailable.",
        });
      }

      const user = await User.findOne({ email });

      if (user) {
        const token = crypto
          .randomBytes(32)
          .toString("hex");

        const tokenHash = hashToken(token);

        const resetUrl = new URL(getAppUrl());
        resetUrl.searchParams.set("resetToken", token);

        user.resetPasswordToken = tokenHash;
        user.resetPasswordExpires = new Date(
          Date.now() + RESET_TOKEN_LIFETIME
        );

        await user.save();

        try {
          await sendPasswordResetEmail(
            email,
            resetUrl.toString()
          );
        } catch (emailError) {
          console.error(
            "Password reset email delivery error:",
            emailError.message
          );

          await User.updateOne(
            {
              _id: user._id,
              resetPasswordToken: tokenHash,
            },
            {
              $unset: {
                resetPasswordToken: "",
                resetPasswordExpires: "",
              },
            }
          );
        }
      }

      return res.status(200).json({
        message: GENERIC_RESET_MESSAGE,
      });
    } catch (error) {
      console.error(
        "Password reset request error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to process password reset request",
      });
    }
  }
);

router.post(
  "/reset-password",
  resetPasswordLimiter,
  async (req, res) => {
    try {
      const { token, password } = req.body || {};

      if (
        typeof token !== "string" ||
        !/^[a-f0-9]{64}$/.test(token) ||
        !validPassword(password)
      ) {
        return res.status(400).json({
          message:
            "Provide a valid reset token and password of 12–72 characters",
        });
      }

      const tokenHash = hashToken(token);

      const user = await User.findOne({
        resetPasswordToken: tokenHash,
        resetPasswordExpires: {
          $gt: new Date(),
        },
      }).select(
        "+resetPasswordToken +resetPasswordExpires"
      );

      if (!user) {
        return res.status(400).json({
          message: INVALID_RESET_MESSAGE,
        });
      }

      const hashedPassword = await bcrypt.hash(
        password,
        12
      );

      const updatedUser = await User.findOneAndUpdate(
        {
          _id: user._id,
          resetPasswordToken: tokenHash,
          resetPasswordExpires: {
            $gt: new Date(),
          },
        },
        {
          $set: {
            password: hashedPassword,
          },
          $unset: {
            resetPasswordToken: "",
            resetPasswordExpires: "",
          },
          $inc: {
            sessionVersion: 1,
          },
        },
        {
          returnDocument: "after",
        }
      );

      if (!updatedUser) {
        return res.status(400).json({
          message: INVALID_RESET_MESSAGE,
        });
      }

      res.clearCookie("token", {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
      });

      return res.status(200).json({
        message:
          "Password updated successfully. Please log in again.",
      });
    } catch (error) {
      console.error("Password reset error:", error);

      return res.status(500).json({
        message: "Unable to reset password",
      });
    }
  }
);

router.get("/me", protect, (req, res) => {
  res.set("Cache-Control", "no-store");

  return res.status(200).json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      interests: req.user.interests,
    },
  });
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
  });

  return res.status(200).json({
    message: "Logged out successfully",
  });
});

module.exports = router;
