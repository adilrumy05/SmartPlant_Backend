const axios = require('axios');
const deviceModel = require('../models/deviceModel');
const https = require('https'); // For SSL 

// NGROK URL
const AI_SERVICE_URL = 'https://ripe-jadiel-illy.ngrok-free.dev/generate';

// Agent to bypass SSL verification (SSL FIX)
const agent = new https.Agent({  
  rejectUnauthorized: false
});


const buildMessages = (allDevices, userQuery) => {

  // Create a clean summary of the data
  const deviceDataSummary = allDevices.map(device => ({
    device_name: device.device_name,
    species_name: device.species_name,
    status: (device.alerts && device.alerts.length > 0) ? `ALERT: ${device.alerts}` : 'Nominal',
    readings: device.readings
  }));

  //summarization prompt
  const systemMessage = `You are a specialized AI assistant for a plant monitoring dashboard.
Your primary role is to summarize the current status of all devices and answer questions using the real-time data provided.

Here is the current real-time data for all devices:
${JSON.stringify(deviceDataSummary, null, 2)}

---
INSTRUCTIONS:
- Each device is associated with a device_id and is monitoring one plant species, the device reports back the latest sensor readings of the plant.
- Your default behavior is to summarize. If the user asks a general question like "How are things?" or "What's the status?", provide a summary.
- In your summary, state the total number of devices, how many have active alerts and the type of active alerts for each device.
- When asked a specific question (e.g., "What's the temperature of Device 1?"), use the data to provide a direct, factual answer about that one specific device.
- When asked ("Is any of my plants thirsty?"), refer to the plant's 'soil_moisture' and if below 20, provide that plant's details.
- When asked if its going to rain soon, take the average between all the plant's humidity readings to give a more accurate prediction.
- Be concise , short and data-driven. Do not make up information.
- If the user greets you, greet back in a short sentence.
- If the user asks something unrelated, politely say you can only discuss plant sensor data.
---`;
  
  return [
    { role: 'system', content: systemMessage },
    { role: 'user', content: userQuery }
  ];
};

/**
 * Handles the chat request from any client (app or web)
 */
exports.handleChat = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const allDeviceData = await deviceModel.getAllDeviceStatuses();

    if (!allDeviceData || allDeviceData.length === 0) {
      return res.json({ reply: "Sensor Data are currently unavailable, please try again later." });
    }

    const messages = buildMessages(allDeviceData, query);

    // Call the AI service
    const aiResponse = await axios.post(
      AI_SERVICE_URL, 
      { messages },
      { 
        httpsAgent: agent, // SSL
        headers: {
          'ngrok-skip-browser-warning': 'true' // NGROK 403
        },
        timeout: 90000 // TIMEOUT
      }
    );

    res.json({ reply: aiResponse.data.reply });
    
  } catch (err) {
    console.error('Error in AI controller:', err.message);
    res.status(500).json({ error: 'Error processing AI request' });
  }
};