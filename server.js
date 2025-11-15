require("dotenv").config();
const cors = require('cors');
const express = require('express');
const path = require('path');
const fs = require('fs');
const { getWorker } = require('./services/pythonWorker');

console.log("ADMIN ROUTES LOADED");
console.log("LOADED adminUserRoutes from:", __filename);

// --- Routes ---
const adminUserRoutes = require("./routes/adminUserRoutes");
const dataRoutes = require('./routes/dataRoutes');
const alertRoutes = require('./routes/alertRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const speciesRoutes = require('./routes/speciesRoutes'); 
const userRoutes = require('./routes/userRoutes');
const mfaRoutes = require('./routes/mfaRoutes');
//const aiRoutes = require('./routes/aiRoutes');
const plantScanRoutes = require('./routes/plantScanRoutes');
const adminObservationRoutes = require('./routes/adminObservationRoutes');

// --- MQTT ---
const mqttClient = require('./mqtt/mqttClient'); // Initializes MQTT

const app = express();
const port = 3000;

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const speciesDir = path.join(__dirname, 'species_images');
if (!fs.existsSync(speciesDir)) {
  fs.mkdirSync(speciesDir, { recursive: true });
}

app.use('/uploads', express.static(uploadDir));
app.use('/species_images', express.static(speciesDir));

// --- Middleware ---
app.use(cors());
app.use(express.json()); // Lets Express understand JSON form data

// --- API Endpoints ---
app.use("/api/admin", adminUserRoutes);

app.use('/api/alerts', alertRoutes);
app.use('/api/devices', deviceRoutes);

// Existing FIX
app.use('/api/species', speciesRoutes);

app.use('/api/users', userRoutes);
app.use('/api/mfa', mfaRoutes);
app.use('/api', dataRoutes);
// Health check (optional)
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

//app.use('/api/ai', aiRoutes);

app.use('/api', plantScanRoutes);
app.use('/api/admin', adminObservationRoutes);

// app.listen(port, () => {
//   console.log(`Server running at http://localhost:${port}`);
// });
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running`);
});
  
try {
  getWorker();
  console.log('[pyworker] warmup started');
} catch (e) {
  console.error('[pyworker] warmup failed', e);
}
