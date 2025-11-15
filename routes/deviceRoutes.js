// routes/deviceRoutes.js
const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

// GET /api/devices/all
router.get('/all', deviceController.getAllDevices);
// GET /api/devices/:id/history?range=7D
router.get('/:id/history', deviceController.getDeviceHistory);
// POST /api/devices/add
router.post('/add', deviceController.addNewDevice);

module.exports = router;