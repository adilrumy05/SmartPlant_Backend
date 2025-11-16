const db = require('../config/db');

// Toggle masking for an observation
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
      .json({ success: false, error: 'Failed to update mask state' });
  }
}

// Update lat / lon / location name for an observation
async function updateObservationLocation(req, res) {
  const id = req.params.id;
  const { latitude, longitude, location_name } = req.body;

  // convert to numbers or null
  const lat =
    latitude === '' || latitude == null ? null : Number(latitude);
  const lon =
    longitude === '' || longitude == null ? null : Number(longitude);

  try {
    await db.query(
      `
      UPDATE plant_observations
      SET
        location_latitude  = ?,
        location_longitude = ?,
        location_name      = ?,
        location_enc       = NULL   -- not using encrypted bundle for now
      WHERE observation_id = ?
      `,
      [lat, lon, location_name || null, id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[updateObservationLocation]', err);
    res
      .status(500)
      .json({ success: false, error: 'Failed to update location' });
  }
}

module.exports = {
  updateObservationMask,
  updateObservationLocation,
};
