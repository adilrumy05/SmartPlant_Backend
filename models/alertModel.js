const db = require('../config/db');

// Get all alerts that have not been resolved
exports.getActiveAlerts = async () => {
  const query = `
    SELECT *
    FROM alerts
    WHERE is_resolved = 0
    ORDER BY created_at DESC
  `;

  const [rows] = await db.query(query);
  return rows;
};

// Mark an alert as resolved
exports.resolveAlert = async (alertId) => {
  const query = `
    UPDATE alerts
    SET is_resolved = 1,
        resolved_at = NOW()
    WHERE alert_id = ?
  `;

  const [result] = await db.query(query, [alertId]);

  if (result.affectedRows === 0) {
    throw new Error('Alert not found or already resolved');
  }

  return { message: 'Alert resolved successfully' };
};

exports.resolveAlertsForDevice = async (deviceId) => {
  const query = `
    UPDATE alerts
    SET is_resolved = 1,
        resolved_at = NOW()
    WHERE device_id = ? AND is_resolved = 0
  `;

  const [result] = await db.query(query, [deviceId]);

  return { message: 'All alerts for device resolved' };
};
