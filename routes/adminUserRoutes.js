const express = require("express");
const router = express.Router();
const adminUserController = require("../controllers/adminUserController");

/* -------- ROLES (POST-only) -------- */
router.post("/roles/list", adminUserController.listRoles);

/* -------- USERS (POST-only) -------- */
router.post("/users/list", adminUserController.listUsers);
router.post("/users/get", adminUserController.getUserPost);
router.post("/users/update", adminUserController.updateUserPost);

module.exports = router;
