
const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { protect } = require("../middleware/auth");

const router = express.Router();

const isProduction = process.env.NODE_ENV === "production";
const RESET_TOKEN_LIFETIME = 15 * 60 * 1000;

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

router.post("/forgot-password", async (req, res) => {
  const genericMessage =
    "If an account exists for this email, password reset instructions will be provided.";

  try {
    const email = normalizeEmail(req.body?.email);

    if (!email) {
      return res.status(400).json({
        message: "Enter a valid email address",
      });
    }

    const user = await User.findOne({ email });

    if (user) {
      if (isProduction) {
        return res.status(503).json({
          message: "Password reset is temporarily unavailable.",
        });
      }

      const token = crypto.randomBytes(32).toString("hex");

      user.resetPasswordToken = hashToken(token);
      user.resetPasswordExpires = new Date(
        Date.now() + RESET_TOKEN_LIFETIME
      );

      await user.save();

      const resetUrl =
        `http://localhost:5173/?resetToken=${encodeURIComponent(token)}`;

      console.log("\n--- DEVELOPMENT PASSWORD RESET ---");
      console.log("Reset URL:", resetUrl);
      console.log("Expires in: 15 minutes");
      console.log("----------------------------------\n");
    }

    return res.status(200).json({
      message: genericMessage,
    });
  } catch (error) {
    console.error("Password reset request error:", error);

    return res.status(500).json({
      message: "Unable to process password reset request",
    });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    if (isProduction) {
      return res.status(503).json({
        message: "Password reset is temporarily unavailable.",
      });
    }

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

    const user = await User.findOne({
      resetPasswordToken: hashToken(token),
      resetPasswordExpires: { $gt: new Date() },
    }).select("+password +resetPasswordToken +resetPasswordExpires");

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired password reset link",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const updatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        resetPasswordToken: hashToken(token),
        resetPasswordExpires: { $gt: new Date() },
      },
      {
        $set: { password: hashedPassword },
        $unset: {
          resetPasswordToken: "",
          resetPasswordExpires: "",
        },
        $inc: { sessionVersion: 1 },
      },
      { returnDocument: "after" }
    );

    if (!updatedUser) {
      return res.status(400).json({
        message: "Invalid or expired password reset link",
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
});

router.get("/me", protect, (req, res) => {
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
