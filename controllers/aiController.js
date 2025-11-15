const axios = require('axios');
// 1. IMPORT 'deviceModel' instead of 'sensorModel'
const deviceModel = require('../models/deviceModel');

// NGROK URL (unchanged)
const AI_SERVICE_URL = 'https://ripe-jadiel-illy.ngrok-free.dev/generate';

// 2. REWRITE 'buildMessages' to handle a FULL LIST of devices
const buildMessages = (allDevices, userQuery) => {

  // Create a clean summary of the data
  const deviceDataSummary = allDevices.map(device => ({
    device_name: device.device_name,
    species_name: device.species_name,
    status: device.alerts ? `ALERT: ${device.alerts}` : 'Nominal',
    readings: device.readings
  }));

  // System prompt
  const systemMessage = `You are a plant-monitoring assistant for a dashboard with ${allDevices.length} devices.
    
    Here is the current real-time data for all devices:
    ${JSON.stringify(deviceDataSummary, null, 2)}

    Use this data to answer the user's questions. You can summarize, compare, and triage alerts across all nodes.
    If the user greets you, greet back.
    If the user asks something unrelated, politely say you can only discuss plant sensor data.`;
  
  // Message history (unchanged)
  return [
    { role: 'system', content: systemMessage },
    { role: 'user', content: userQuery }
  ];
};

exports.handleChat = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // 3. CALL 'getAllDeviceStatuses' to get the FULL dashboard list
    const allDeviceData = await deviceModel.getAllDeviceStatuses();

    // Check if sensor data is available
    if (!allDeviceData || allDeviceData.length === 0) {
      // If no data, send the fallback message
      return res.json({ reply: "Sensor Data are currently unavailable, please try again later." });
    }

    // If data exists, build the multi-node prompt
    const messages = buildMessages(allDeviceData, query);

    // Call the AI service (unchanged)
    const aiResponse = await axios.post(AI_SERVICE_URL, { messages });

    // Send the AI's reply back to the React Native app (unchanged)
    res.json({ reply: aiResponse.data.reply });
    
  } catch (err) {
    console.error('Error in AI controller:', err.message);
    res.status(500).json({ error: 'Error processing AI request' });
  }
};