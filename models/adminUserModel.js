// models/adminUserModel.js
const db = require("../config/db");

// Small helper so we always get rows
async function runQuery(sql, params = []) {
  const [rows] = await db.query(sql, params);
  return rows;
}

/* --------- ROLES QUERIES --------- */

exports.getAllRoles = async () => {
  return runQuery(
    "SELECT role_id, role_name, description FROM Roles ORDER BY role_id"
  );
};

exports.createRole = async ({ role_name, description }) => {
  const [result] = await db.query(
    "INSERT INTO Roles (role_name, description) VALUES (?, ?)",
    [role_name, description]
  );
  return result.insertId;
};

exports.deleteRole = async (roleId) => {
  await db.query("DELETE FROM Roles WHERE role_id = ?", [roleId]);
};

/* --------- USERS QUERIES --------- */

exports.getAllUsers = async () => {
  return runQuery(
    `
    SELECT 
      u.user_id,
      u.username,
      u.email,
      u.role_id,
      u.avatar_url,
      u.phone,
      u.is_active,
      u.created_at
    FROM users u
    ORDER BY u.user_id
    `
  );
};

exports.getUserById = async (userId) => {
  const rows = await runQuery(
    `
    SELECT 
      u.user_id,
      u.username,
      u.email,
      u.role_id,
      u.avatar_url,
      u.phone,
      u.is_active,
      u.created_at
    FROM users u
    WHERE u.user_id = ?
    `,
    [userId]
  );
  return rows[0] || null;
};

exports.createUser = async ({
  username,
  email,
  password_hash,
  role_id,
  avatar_url,
}) => {
  const [result] = await db.query(
    `
    INSERT INTO users (username, email, password_hash, role_id, avatar_url)
    VALUES (?, ?, ?, ?, ?)
    `,
    [username, email, password_hash, role_id, avatar_url]
  );
  return result.insertId;
};

exports.updateUser = async (userId, { 
  username,
  email,
  role_id,
  avatar_url,
  phone,
  is_active,
}) => {
  const [result] = await db.query(
    `
    UPDATE users
    SET username = ?, 
        email = ?, 
        role_id = ?, 
        avatar_url = ?, 
        phone = ?, 
        is_active = ?
    WHERE user_id = ?
    `,
    [
      username,
      email,
      role_id,
      avatar_url,
      phone ?? null,
      typeof is_active === "undefined" ? 1 : is_active ? 1 : 0,
      userId,
    ]
  );

  return result.affectedRows;
};

exports.deleteUser = async (userId) => {
  await db.query("DELETE FROM users WHERE user_id = ?", [userId]);
};
