// models/alertModel.js
const db = require('../config/db');

// Get all alerts that have not been resolved
exports.getActiveAlerts = () => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM alerts 
      WHERE is_resolved = 0 
      ORDER BY created_at DESC
    `;
    db.query(query, (err, rows) => {
      if (err) {
        console.error('❌ Error fetching active alerts:', err);
        return reject(err);
      }
      resolve(rows);
    });
  });
};

// Mark an alert as resolved
exports.resolveAlert = (alertId) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE alerts 
      SET is_resolved = 1, resolved_at = NOW() 
      WHERE alert_id = ?
    `;
    db.query(query, [alertId], (err, result) => {
      if (err) {
        console.error('❌ Error resolving alert:', err);
        return reject(err);
      }
      if (result.affectedRows === 0) {
        return reject(new Error('Alert not found or already resolved'));
      }
      resolve({ message: 'Alert resolved successfully' });
    });
  });
};

exports.resolveAlertsForDevice = (deviceId) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE alerts 
      SET is_resolved = 1, resolved_at = NOW() 
      WHERE device_id = ? AND is_resolved = 0
    `;
    db.query(query, [deviceId], (err, result) => {
      if (err) {
        console.error('❌ Error resolving alerts for device:', err);
        return reject(err);
      }
      resolve({ message: 'All alerts for device resolved' });
    });
  });
};