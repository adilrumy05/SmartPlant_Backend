// routes/dataRoutes.js
const express = require('express');
const router = express.Router();
const mqttClient = require('../mqtt/mqttClient');
const dataController = require('../controllers/dataController'); 
const aiController = require('../controllers/aiController'); 

router.get('/', (req, res) => {
  res.send('MQTT Backend Running...');
});

// New route for latest stored readings
router.get('/iot/latest', dataController.getLatestSensorData);

// Existing MQTT-based endpoint (keeps your current behavior)
const sensorController = require('../controllers/sensorController');
router.get('/data', (req, res) => {
  const latestValue = mqttClient.getLatestValue();
  res.json(sensorController.getLatestSensorData(latestValue));
});

router.post('/chat', aiController.handleChat);

module.exports = router;
