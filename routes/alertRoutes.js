// routes/alertRoutes.js
const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');

// GET /api/alerts/active
router.get('/active', alertController.getActiveAlerts);

// POST /api/alerts/resolve/:id
router.post('/resolve/:id', alertController.resolveAlert);

router.post('/resolve/device/:id', alertController.resolveAlertsForDevice);

module.exports = router;