const db = require("../config/db");

exports.createMfaChallenge = async ({ user_id, email, otp }) => {
  const expires = new Date(Date.now() + 5 * 60 * 1000);

  const [result] = await db.query(
    `
    INSERT INTO mfa_challenges (user_id, email, otp_code, expires_at)
    VALUES (?, ?, ?, ?)
    `,
    [user_id, email, otp, expires]
  );

  return result.insertId;
};

exports.getMfaChallenge = async (challenge_id) => {
  const [rows] = await db.query(
    "SELECT * FROM mfa_challenges WHERE challenge_id = ?",
    [challenge_id]
  );
  return rows[0] || null;
};

exports.markChallengeVerified = async (challenge_id) => {
  await db.query(
    "UPDATE mfa_challenges SET verified = 1 WHERE challenge_id = ?",
    [challenge_id]
  );
};

exports.deleteChallenge = async (challenge_id) => {
  await db.query(
    "DELETE FROM mfa_challenges WHERE challenge_id = ?",
    [challenge_id]
  );
};
