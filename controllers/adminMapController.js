// controllers/adminMapController.js
const db = require('../config/db');
const { encryptLocation } = require('../modules/encryption_module');

async function updateObservationMask(req, res) {
  const id = req.params.id;
  const { is_masked } = req.body;

  try {
    await db.query(
      'UPDATE plant_observations SET is_masked = ? WHERE observation_id = ?',
      [is_masked ? 1 : 0, id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[updateObservationMask]', err);
    res
      .status(500)
      .json({ success: false, error: 'Failed to update mask' });
  }
}

async function updateObservationLocation(req, res) {
  const id = req.params.id;
  const { latitude, longitude, location_name } = req.body;

  try {
    let encrypted = null;
    if (latitude != null && longitude != null) {
      encrypted = encryptLocation(Number(latitude), Number(longitude));
    }

    await db.query(
      `
      UPDATE plant_observations
      SET 
        location_enc       = ?,   -- encrypted bundle
        location_name      = ?,
        location_latitude  = ?,   -- raw coords
        location_longitude = ?
      WHERE observation_id = ?
      `,
      [
        encrypted,
        location_name || null,
        latitude != null ? latitude : null,
        longitude != null ? longitude : null,
        id,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[updateObservationLocation]', err);
    res.status(500).json({
      success: false,
      error: 'Failed to update location',
    });
  }
}

module.exports = {
  updateObservationMask,
  updateObservationLocation,
};
