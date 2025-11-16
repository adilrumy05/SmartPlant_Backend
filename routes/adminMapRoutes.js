const express = require('express');
const router = express.Router();

const adminMapController = require('../controllers/adminMapController');

router.patch(
  '/observations/:id/mask',
  adminMapController.updateObservationMask
);

router.patch(
  '/observations/:id/location',
  adminMapController.updateObservationLocation
);

module.exports = router;
