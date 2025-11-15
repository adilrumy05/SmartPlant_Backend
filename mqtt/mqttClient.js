const mqtt = require('mqtt');
const sensorController = require('../controllers/sensorController');

const client = mqtt.connect('mqtt://broker.hivemq.com');
let latestValue = null; // store most recent message

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  client.subscribe('iot/sensor/swinburne/#');
});

client.on('message', (topic, message) => {
  console.log(`Received message from ${topic}: ${message.toString()}`);

  try {
    const data = JSON.parse(message.toString());
    latestValue = data; // update latest value

    // save to DB
    sensorController.insertSensorData(data);
  } catch (e) {
    console.error('Invalid JSON received:', e);
  }
});

module.exports = {
  getLatestValue: () => latestValue
};
