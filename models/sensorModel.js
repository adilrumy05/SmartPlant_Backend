// models/sensorModel.js
const db = require('../config/db');

/**
 * Inserts sensor data and an ARRAY of alerts within a single database transaction.
 */
async function processSensorReading(sensorData, alertInfoList) {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const sqlReading = `
      INSERT INTO sensor_readings
        (device_id, temperature, humidity, soil_moisture, motion_detected,
         alert_generated, reading_timestamp)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;
    const paramsReading = [
      sensorData.device_id,
      sensorData.temperature,
      sensorData.humidity,
      sensorData.soil_moisture,
      sensorData.motion_detected ? 1 : 0,
      sensorData.alert_generated ? 1 : 0,
    ];

    const [readingResult] = await conn.query(sqlReading, paramsReading);
    const newReadingId = readingResult.insertId;

    if (!alertInfoList || alertInfoList.length === 0) {
      await conn.commit();
      return { readingId: newReadingId };
    }

    const sqlAlert = `
      INSERT INTO alerts
        (device_id, reading_id, alert_type, alert_message, is_resolved)
      VALUES ?
    `;

    const alertValues = alertInfoList.map(alertInfo => [
      sensorData.device_id,
      newReadingId,
      alertInfo.type,
      alertInfo.message,
      0,
    ]);

    const [alertResult] = await conn.query(sqlAlert, [alertValues]);

    await conn.commit();

    return {
      readingId: newReadingId,
      alertsInserted: alertResult.affectedRows,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Return the latest reading across all devices (joined with device info)
 */
async function getLatestSensorData() {
  const query = `
    WITH LatestReading AS (
      SELECT *
      FROM sensor_readings
      ORDER BY reading_timestamp DESC
      LIMIT 1
    )
    SELECT 
        sd.device_id,
        sd.device_name,
        sd.species_name,
        lr.reading_id,
        lr.reading_status,
        lr.alert_generated,
        lr.reading_timestamp,
        (SELECT temperature FROM sensor_readings 
         WHERE device_id = lr.device_id AND temperature IS NOT NULL 
         ORDER BY reading_timestamp DESC LIMIT 1) as temperature,
        (SELECT humidity FROM sensor_readings 
         WHERE device_id = lr.device_id AND humidity IS NOT NULL 
         ORDER BY reading_timestamp DESC LIMIT 1) as humidity,
        (SELECT soil_moisture FROM sensor_readings 
         WHERE device_id = lr.device_id AND soil_moisture IS NOT NULL 
         ORDER BY reading_timestamp DESC LIMIT 1) as soil_moisture,
        (SELECT motion_detected FROM sensor_readings 
         WHERE device_id = lr.device_id AND motion_detected IS NOT NULL 
         ORDER BY reading_timestamp DESC LIMIT 1) as motion_detected,
        COALESCE(sd.location_latitude, lr.location_latitude) AS location_latitude,
        COALESCE(sd.location_longitude, lr.location_longitude) AS location_longitude
    FROM LatestReading lr
    JOIN sensor_devices sd ON lr.device_id = sd.device_id;
  `;

  const [rows] = await db.query(query);
  if (!rows || rows.length === 0) return null;

  const r = rows[0];
  return {
    device_id: `DEV-${r.device_id}`,
    device_name: r.device_name,
    species_name: r.species_name,
    location: {
      latitude: r.location_latitude,
      longitude: r.location_longitude,
    },
    readings: {
      temperature: r.temperature,
      humidity: r.humidity,
      soil_moisture: r.soil_moisture,
      motion_detected: Boolean(r.motion_detected),
    },
    last_updated: r.reading_timestamp,
    alerts: r.alert_generated ? ['A new alert was just triggered!'] : [],
  };
}

module.exports = {
  processSensorReading,
  getLatestSensorData,
};