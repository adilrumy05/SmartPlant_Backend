// controllers/sensorController.js
const sensorModel = require('../models/sensorModel');
const thresholds = require('../config/alertThresholds');

// This function now returns an ARRAY of alerts
const checkAlerts = (data) => {
  const { temperature, humidity, soil_moisture, motion_detected } = data;
  const alerts = []; // Initialize an empty array

  // Check 1: Motion
  if (motion_detected) {
    alerts.push({
      type: 'motion',
      message: 'Motion detected near device.',
    });
  }

  // Check 2: Temperature
  if (temperature > thresholds.TEMP_HIGH) {
    alerts.push({
      type: 'environment',
      message: `High Temperature: ${temperature}°C. (Threshold: ${thresholds.TEMP_HIGH}°C)`,
    });
  } else if (temperature < thresholds.TEMP_LOW) {
    alerts.push({
      type: 'environment',
      message: `Low Temperature: ${temperature}°C. (Threshold: ${thresholds.TEMP_LOW}°C)`,
    });
  }

  // Check 3: Humidity
  if (humidity > thresholds.HUMIDITY_HIGH) {
    alerts.push({
      type: 'environment',
      message: `High Humidity: ${humidity}%. (Threshold: ${thresholds.HUMIDITY_HIGH}%)`,
    });
  }

  // Check 4: Soil Moisture
  if (soil_moisture < thresholds.SOIL_MOISTURE_LOW) {
    alerts.push({
      type: 'environment',
      message: `Low Soil Moisture: ${soil_moisture}%. (Threshold: ${thresholds.SOIL_MOISTURE_LOW}%)`,
    });
  }
  
  return {
    alertInfoList: alerts, // This is now an array
    alert_generated: alerts.length > 0, // True if the array is not empty
  };
};

exports.insertSensorData = (data) => {
  const { device_id, temperature, humidity, soil_moisture, motion_detected } = data;
  
  // 1. Check for alerts
  const { alertInfoList, alert_generated } = checkAlerts(data);

  // 2. Create the data packet
  const sensorData = {
    device_id,
    temperature,
    humidity,
    soil_moisture,
    motion_detected,
    alert_generated,
  };

  // 3. Call the model to process the reading and the ARRAY of alerts
  sensorModel.processSensorReading(sensorData, alertInfoList)
    .then(result => {
      console.log(`✅ Sensor data processed (Reading ID: ${result.readingId}). ${alertInfoList.length} alerts created.`);
    })
    .catch(err => {
      console.error('❌ Error processing sensor reading:', err);
    });
};

// This function is no longer used by the MQTT flow, but kept for /api/data
exports.getLatestSensorData = (latestValue) => {
  return { latest: latestValue };
};