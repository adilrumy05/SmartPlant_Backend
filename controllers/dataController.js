// controllers/dataController.js
const sensorModel = require('../models/sensorModel');

exports.getLatestSensorData = async (req, res) => {
  try {
    const data = await sensorModel.getLatestSensorData();
    if (!data) {
      return res.status(404).json({ message: 'No sensor data found' });
    }
    return res.json(data);
  } catch (err) {
    console.error('Error in getLatestSensorData controller:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
