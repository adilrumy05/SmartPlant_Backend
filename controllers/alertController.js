// controllers/alertController.js
const alertModel = require('../models/alertModel');

exports.getActiveAlerts = async (req, res) => {
  try {
    const alerts = await alertModel.getActiveAlerts();
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;
    await alertModel.resolveAlert(id);
    res.json({ success: true, message: 'Alert resolved' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.resolveAlertsForDevice = async (req, res) => {
  try {
    const { id } = req.params; // This will be the raw device_id
    await alertModel.resolveAlertsForDevice(id);
    res.json({ success: true, message: 'Alerts for device resolved' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};