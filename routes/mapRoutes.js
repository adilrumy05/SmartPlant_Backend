const router = require('express').Router();
const { listMapObservations } = require('../controllers/mapController');

router.get('/observations', listMapObservations);

module.exports = router;