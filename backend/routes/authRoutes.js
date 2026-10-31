const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

const router = express.Router();

// ==========================================
// USER SIGNUP
// ==========================================

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
    }

    if (name.trim().length < 2 || name.trim().length > 50) {
      return res.status(400).json({
        success: false,
        message: "Name must be between 2 and 50 characters.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    console.error("Signup error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create account. Please try again.",
    });
  }
});

// ==========================================
// USER LOGIN
// ==========================================

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured.");
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to login. Please try again.",
    });
  }
});

// ==========================================
// FORGOT PASSWORD
// ==========================================

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email address is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    const successMessage =
      "If an account exists with this email, a password reset link will be sent.";

    // Do not reveal whether an account exists.
    if (!user) {
      return res.status(200).json({
        success: true,
        message: successMessage,
      });
    }

    if (!process.env.FRONTEND_URL) {
      throw new Error("FRONTEND_URL is not configured.");
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
      throw new Error("Email configuration is missing in .env.");
    }

    // Generate a cryptographically secure reset token.
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Store only the SHA-256 hash of the token.
    user.passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Reset token expires after 15 minutes.
    user.passwordResetExpires = new Date(
      Date.now() + 15 * 60 * 1000
    );

    await user.save();

    const resetUrl =
      `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "FileVault Password Reset",
        text: [
          "You requested a password reset for FileVault.",
          `Open this link within 15 minutes: ${resetUrl}`,
          "If you did not request this, ignore this email.",
        ].join("\n\n"),
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px">
            <h2>Reset your FileVault password</h2>
            <p>We received a request to reset your password.</p>
            <p>
              <a
                href="${resetUrl}"
                style="display:inline-block;background:#111827;color:#ffffff;padding:12px 20px;text-decoration:none;border-radius:6px"
              >
                Reset Password
              </a>
            </p>
            <p>This link expires in 15 minutes.</p>
            <p>If you did not request this, you can safely ignore this email.</p>
          </div>
        `,
      });
    } catch (emailError) {
      // Invalidate the reset token if email delivery fails.
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;

      await user.save();

      console.error(
        "Password reset email error:",
        emailError.message
      );

      return res.status(500).json({
        success: false,
        message: "Unable to send reset email. Please try again later.",
      });
    }

    return res.status(200).json({
      success: true,
      message: successMessage,
    });
  } catch (error) {
    console.error("Forgot password error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to process your request. Please try again.",
    });
  }
});

// ==========================================
// RESET PASSWORD
// ==========================================

router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (
      typeof token !== "string" ||
      !token.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Reset token and new password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    // Hash the token received from the reset link.
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find a matching token that has not expired.
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetToken +passwordResetExpires");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Reset link is invalid or expired. Please request a new one.",
      });
    }

    // Hash the new password.
    user.password = await bcrypt.hash(password, 12);

    // Prevent the reset link from being reused.
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Reset password error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to reset password. Please try again.",
    });
  }
});

module.exports = router;
