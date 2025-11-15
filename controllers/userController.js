const userModel = require('../models/userModel');
const { startMfaForUser } = require('./mfaController');

// --- Register ---
const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existing = await userModel.findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    await userModel.createUser(username, email, password);

    return res.status(201).json({ success: true, message: "User registered successfully" });

  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// --- Login ---
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userModel.findUserByEmail(email);
    if (!user || user.password_hash !== password) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_INACTIVE",
        message:
          "Your account has been deactivated. Please contact the administrator.",
      });
    }

    const profile = await userModel.getUserProfile(user.user_id);

    const mfa = await startMfaForUser(user);

    return res.json({
      success: true,
      mfa_required: true,
      challenge_id: mfa.challenge_id,
      email_masked: mfa.email_masked,
      role_name: profile.role_name,
      user_id: user.user_id
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// --- Forgot Password ---
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await userModel.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ success: false, message: "Email not found" });
    }

    return res.json({
      success: true,
      message: "Password reset email sent (mock)"
    });

  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// --- Profile ---
const getUserProfile = async (req, res) => {
  try {
    const profile = await userModel.getUserProfile(req.params.id);
    if (!profile) return res.status(404).json({ success: false, message: "User not found" });
    res.json(profile);
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// --- Posts ---
const getUserPosts = async (req, res) => {
  try {
    const posts = await userModel.getUserPosts(req.params.id);
    res.json(posts);
  } catch (err) {
    console.error("Posts error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  getUserProfile,
  getUserPosts
};
