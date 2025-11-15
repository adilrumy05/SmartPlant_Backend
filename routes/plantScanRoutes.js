const express = require('express');
const multer = require('multer');
const path = require('path');
const { scanImage } = require('../controllers/plantScanController');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');

const fs = require('fs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || '.jpg');
    cb(null, unique + ext);
  },
});

const upload = multer({ storage });

// POST /api/scan
router.post('/scan', upload.single('image'), scanImage);

module.exports = router;
