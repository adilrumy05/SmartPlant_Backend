const express = require('express');
const { getPublicObservationFeed } = require('../controllers/observationController');

const router = express.Router();

// GET /api/observations/feed
router.get('/feed', getPublicObservationFeed);

module.exports = router;
