const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// POST /api/users/register
router.post('/register', userController.registerUser);

// POST /api/users/login
router.post('/login', userController.loginUser);
router.post('/forgot-password', userController.forgotPassword);

// GET /api/users/:id/profile
router.get('/:id/profile', userController.getUserProfile);

// GET /api/users/:id/posts
router.get('/:id/posts', userController.getUserPosts);

module.exports = router;