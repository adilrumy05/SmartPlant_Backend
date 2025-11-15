const adminUserModel = require("../models/adminUserModel");

/* ------------ ROLES ------------ */

exports.listRoles = async (req, res) => {
  try {
    const rows = await adminUserModel.getAllRoles();
    res.json(rows);
  } catch (err) {
    console.error("Error loading roles:", err);
    res.status(500).json({ error: "Failed to load roles" });
  }
};

/* ------------ USERS ------------ */

// POST /users/list
exports.listUsers = async (req, res) => {
  try {
    const rows = await adminUserModel.getAllUsers();

    const users = rows.map((u) => ({
      user_id: u.user_id,
      username: u.username,
      email: u.email,
      role_id: u.role_id,
      avatar_url: u.avatar_url,
      phone: u.phone,
      is_active: u.is_active === 1,
      created_at: u.created_at,
    }));

    res.json(users);
  } catch (err) {
    console.error("Error in listUsers():", err);
    res.status(500).json({ error: "Failed to load users" });
  }
};

// POST /users/get
exports.getUserPost = async (req, res) => {
  try {
    const { user_id } = req.body;
    const row = await adminUserModel.getUserById(user_id);

    if (!row) return res.status(404).json({ error: "User not found" });

    res.json({
      user_id: row.user_id,
      username: row.username,
      email: row.email,
      role_id: row.role_id,
      avatar_url: row.avatar_url,
      phone: row.phone,
      is_active: row.is_active === 1,
      created_at: row.created_at,
    });
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

// POST /users/update
exports.updateUserPost = async (req, res) => {
  try {
    const {
      user_id,
      username,
      email,
      role_id,
      avatar_url,
      phone,
      is_active,
    } = req.body;

    await adminUserModel.updateUser(user_id, {
      username,
      email,
      role_id,
      avatar_url,
      phone,
      is_active,
    });

    res.json({ success: true, message: "User updated" });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
};
