// routes/adminObservationRoutes.js
const express = require('express');
const {
  listObservations,
  getObservationDetail,
  verifyObservation,
  rejectObservation,
  confirmExisting,
  confirmNew,
  updateObservationRoute,
  flagUnsureObservation,   
} = require('../controllers/adminObservationController');

const router = express.Router();

// list + filters
router.get('/observations', listObservations);

// detail
router.get('/observations/:id', getObservationDetail);

// simple status changes
router.put('/observations/:id/verify', verifyObservation);
router.put('/observations/:id/reject', rejectObservation);
router.put('/observations/:id/flag-unsure', flagUnsureObservation);

// confirm existing / new species
router.post('/observations/:id/confirm-existing', confirmExisting);
router.post('/observations/:id/confirm-new', confirmNew);

// generic update (status / notes / species_name)
router.put('/plant-observations/:id', updateObservationRoute);

module.exports = router;
