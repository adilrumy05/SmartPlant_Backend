const mfaModel = require("../models/mfaModel");
const { generateOtp, sendOtpToEmail, maskEmail } = require("../modules/mfa_module");
const db = require("../config/db");
const userModel = require("../models/userModel");

exports.startMfaForUser = async (user) => {
  const otp = generateOtp();

  // FIXED: email was undefined before
  const challenge_id = await mfaModel.createMfaChallenge({
    user_id: user.user_id,
    email: user.email,
    otp
  });

  await sendOtpToEmail(user.email, otp);

  return {
    challenge_id,
    email_masked: maskEmail(user.email)
  };
};

exports.verifyMfa = async (req, res) => {
  try {
    const { challenge_id, otp } = req.body;

    const challenge = await mfaModel.getMfaChallenge(challenge_id);
    if (!challenge) {
      return res.status(400).json({ success: false, message: "Invalid MFA challenge." });
    }

    if (challenge.verified) {
      return res.status(400).json({ success: false, message: "Already verified." });
    }

    if (new Date() > new Date(challenge.expires_at)) {
      await mfaModel.deleteChallenge(challenge_id);
      return res.status(400).json({ success: false, message: "OTP expired." });
    }

    if (otp !== challenge.otp_code) {
      return res.status(400).json({ success: false, message: "Incorrect OTP." });
    }

    // Mark verified
    await mfaModel.markChallengeVerified(challenge_id);

    // Fetch role
    const profile = await userModel.getUserProfile(challenge.user_id);
    if (!profile) {
      return res.status(404).json({ success: false, message: "User profile not found." });
    }

    return res.json({
      success: true,
      user: profile
    });

  } catch (err) {
    console.error("MFA verify error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
