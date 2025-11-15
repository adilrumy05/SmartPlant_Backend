const db = require('../config/db');

/**
 * Gets the status and latest readings for ALL devices.
 * This is the primary data source for the Admin IoT Dashboard.
 */
exports.getAllDeviceStatuses = () => {
  return new Promise((resolve, reject) => {
    
    // This query now joins with the 'species' table to get names and photos.
    // It is designed to be safe against NULL values.
    const query = `
      SELECT 
          sd.device_id,
          sd.device_name,
          sd.location_latitude,
          sd.location_longitude,
          lr.temperature,
          lr.humidity,
          lr.soil_moisture,
          lr.motion_detected,
          lr.reading_timestamp as last_updated,
          
          -- ⬇️ *** THIS IS THE FIX *** ⬇️
          -- It will try scientific_name, then common_name, then fall back.
          COALESCE(s.scientific_name, s.common_name, 'Unknown species') AS species_name,
          
          s.image_url AS species_photo_url,
          
          (
            SELECT GROUP_CONCAT(DISTINCT alert_type SEPARATOR ', ') 
            FROM alerts a 
            WHERE a.device_id = sd.device_id AND a.is_resolved = 0
          ) as active_alert_types
          
      FROM sensor_devices sd
      
      -- 1. LEFT JOIN for readings (gets devices even if no readings)
      LEFT JOIN sensor_readings lr ON lr.reading_id = (
          SELECT reading_id 
          FROM sensor_readings
          WHERE device_id = sd.device_id
          ORDER BY reading_timestamp DESC
          LIMIT 1
      )
      
      -- 2. LEFT JOIN for species (gets devices even if species_id is NULL)
      LEFT JOIN species s ON sd.species_id = s.species_id
      
      ORDER BY sd.device_id;
    `;
    
    db.query(query, (err, rows) => {
      if (err) {
        console.error('❌ Error fetching all device statuses:', err);
        return reject(err);
      }

      const allDevices = rows.map(r => ({
        device_id_raw: r.device_id, // For API calls
        device_id: `DEV-${r.device_id}`, 
        device_name: r.device_name,
        
        // This is the new, safe species name
        species_name: r.species_name, 
        
        // This is the new photo URL (can be null)
        species_photo: r.species_photo_url, 

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
        last_updated: r.last_updated,
        alerts: r.active_alert_types
      }));
      
      resolve(allDevices);
    });
  });
};

/**
 * Gets the historical sensor readings for a single device over a given range.
 * This is for the Admin IoT Analytics screen.
 */
exports.getDeviceHistory = (deviceId, rangeKey) => {
  return new Promise((resolve, reject) => {
    
    let interval;
    switch (rangeKey) {
      case '1H':
        interval = 'INTERVAL 1 HOUR';
        break;
      case '7D':
        interval = 'INTERVAL 7 DAY';
        break;
      case '24H':
      default:
        interval = 'INTERVAL 24 HOUR';
    }

    const query = `
      SELECT 
        reading_timestamp as timestamp,
        temperature,
        humidity,
        soil_moisture,
        motion_detected
      FROM sensor_readings
      WHERE 
        device_id = ? 
        AND reading_timestamp >= DATE_SUB(NOW(), ${interval})
      ORDER BY reading_timestamp ASC;
    `;
    
    db.query(query, [deviceId], (err, rows) => {
      if (err) {
        console.error('❌ Error fetching device history:', err);
        return reject(err);
      }
      
      const history = rows.map(r => ({
        ...r,
        motion_detected: Boolean(r.motion_detected)
      }));
      
      resolve(history);
    });
  });
};

exports.addNewDevice = (deviceData) => {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO sensor_devices 
        (device_name, species_id, location_latitude, location_longitude, is_active)
      VALUES 
        (?, ?, ?, ?, 1)
    `;
    
    const params = [
      deviceData.device_name,
      deviceData.species_id,
      deviceData.latitude,
      deviceData.longitude
    ];
    
    db.query(query, params, (err, result) => {
      if (err) {
        console.error('❌ Error adding new device:', err);
        return reject(err);
      }
      resolve(result.insertId); // Returns the new device_id
    });
  });
};