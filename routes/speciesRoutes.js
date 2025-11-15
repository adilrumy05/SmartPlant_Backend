const express = require('express');
const router = express.Router();
const speciesController = require('../controllers/speciesController');

// GET /api/species/all
router.get('/all', speciesController.getAllSpecies);

module.exports = router;