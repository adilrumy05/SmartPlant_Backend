// controllers/deviceController.js
const deviceModel = require('../models/deviceModel');

exports.getAllDevices = async (req, res) => {
  try {
    const devices = await deviceModel.getAllDeviceStatuses();
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getDeviceHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { range } = req.query; // Get range from query (e.g., ?range=7D)
    
    const history = await deviceModel.getDeviceHistory(id, range);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.addNewDevice = async (req, res) => {
  try {
    const { device_name, species_id, latitude, longitude } = req.body;

    // ⬇️ *** CHANGE THIS VALIDATION *** ⬇️
    // Add '!species_id' to the check.
    if (!device_name || !latitude || !longitude || !species_id) {
      return res.status(400).json({ error: 'Missing required fields. All fields are mandatory.' });
    }

    // ⬇️ *** CHANGE THIS DATA OBJECT *** ⬇️
    // Remove the '|| null' fallback
    const newDeviceData = {
      device_name,
      species_id: species_id, // <-- No longer defaults to null
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
    };

    const newDeviceId = await deviceModel.addNewDevice(newDeviceData);
    res.status(201).json({ 
      message: 'Device added successfully', 
      deviceId: newDeviceId 
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};