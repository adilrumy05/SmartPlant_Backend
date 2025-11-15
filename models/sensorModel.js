// models/sensorModel.js
const db = require('../config/db');

/**
 * Inserts sensor data and an ARRAY of alerts within a single database transaction.
 * @param {object} sensorData - The sensor data to insert.
 * @param {Array} alertInfoList - An array of alert objects, or an empty array.
 * @returns {Promise<object>} A promise that resolves with the new readingId.
 */
function processSensorReading(sensorData, alertInfoList) {
  return new Promise((resolve, reject) => {
    
    // Start a database transaction
    db.beginTransaction(err => {
      if (err) {
        return reject(err);
      }

      // 1. Insert into sensor_readings
      const sqlReading = `
        INSERT INTO sensor_readings
        (device_id, temperature, humidity, soil_moisture, motion_detected, alert_generated, reading_status, reading_timestamp)
        VALUES (?, ?, ?, ?, ?, ?, 'ok', NOW())
      `;
      const paramsReading = [
        sensorData.device_id,
        sensorData.temperature,
        sensorData.humidity,
        sensorData.soil_moisture,
        sensorData.motion_detected ? 1 : 0,
        sensorData.alert_generated ? 1 : 0
      ];

      db.query(sqlReading, paramsReading, (err, result) => {
        if (err) {
          return db.rollback(() => reject(err));
        }

        const newReadingId = result.insertId;

        // 2. If no alerts, commit and finish
        if (alertInfoList.length === 0) {
          return db.commit(err => {
            if (err) {
              return db.rollback(() => reject(err));
            }
            resolve({ readingId: newReadingId });
          });
        }

        // 3. If alerts EXIST, loop and insert all of them
        const sqlAlert = `
          INSERT INTO alerts
          (device_id, reading_id, alert_type, alert_message, is_resolved)
          VALUES ?  -- We will use bulk insert
        `;
        
        const alertValues = alertInfoList.map(alertInfo => [
          sensorData.device_id,
          newReadingId,
          alertInfo.type,
          alertInfo.message
        ]);

        db.query(sqlAlert, [alertValues], (err, alertResult) => {
          if (err) {
            return db.rollback(() => reject(err));
          }

          // 4. Commit the transaction
          db.commit(err => {
            if (err) {
              return db.rollback(() => reject(err));
            }
            resolve({ readingId: newReadingId, alertsInserted: alertResult.affectedRows });
          });
        });
      });
    });
  });
}


// Return the latest reading across all devices (joined with device info)
function getLatestSensorData() {
  // This function is the complex, hybrid-safe query we created before.
  // It is UNCHANGED.
  return new Promise((resolve, reject) => {
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

    db.query(query, (err, rows) => {
      if (err) {
        console.error('❌ Error querying latest sensor data:', err);
        return reject(err);
      }
      if (!rows || rows.length === 0) return resolve(null);

      const r = rows[0];
      const result = {
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
        alerts: r.alert_generated ? ['A new alert was just triggered!'] : []
      };

      resolve(result);
    });
  });
}

module.exports = {
  processSensorReading,
  getLatestSensorData,
};