const db = require("../config/db");

// --- Find User By Email ---
exports.findUserByEmail = async (email) => {
  const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
  return rows[0] || null;
};

// --- Create User (public role) ---
exports.createUser = async (username, email, passwordPlain) => {
  // Find public role
  const [roleRows] = await db.query(
    "SELECT role_id FROM roles WHERE role_name = ?",
    ["public"]
  );

  if (!roleRows.length) {
    throw new Error("Role 'public' not found.");
  }

  const publicRoleId = roleRows[0].role_id;

  // Insert user
  const [result] = await db.query(
    `INSERT INTO users (username, email, password_hash, role_id)
     VALUES (?, ?, ?, ?)`,
    [username, email, passwordPlain, publicRoleId]
  );

  return result.insertId;
};

// --- Get User Profile ---
exports.getUserProfile = async (userId) => {
  const [rows] = await db.query(
    `
    SELECT 
      u.user_id,
      u.username,
      u.email,
      u.avatar_url,
      u.role_id,
      r.role_name
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.role_id
    WHERE u.user_id = ?
    `,
    [userId]
  );

  return rows[0] || null;
};

// --- Get User Posts ---
exports.getUserPosts = async (userId) => {
  const [rows] = await db.query(
    `
    SELECT 
      o.observation_id,
      o.user_id,
      o.location_latitude AS latitude,
      o.location_longitude AS longitude,
      o.photo_url,
      o.created_at,
      o.notes,
      s.scientific_name,
      s.common_name,
      u.username AS uploadedBy
    FROM plant_observations o
    LEFT JOIN species s ON o.species_id = s.species_id
    LEFT JOIN users u ON o.user_id = u.user_id
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
    `,
    [userId]
  );

  return rows.map((p) => ({
    ...p,
    species_name: p.scientific_name || p.common_name || "Unknown species",
  }));
};
