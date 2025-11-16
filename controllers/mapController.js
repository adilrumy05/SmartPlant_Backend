const db = require('../config/db');
// const { decryptLocation } = require('../modules/encryption_module');

function maskCoords(lat, lon) {
  if (lat == null || lon == null) return { lat, lon };
  const roundedLat = Math.round(lat * 100) / 100;  // about 1 km
  const roundedLon = Math.round(lon * 100) / 100;
  return { lat: roundedLat, lon: roundedLon };
}

async function listMapObservations(req, res) {
  try {
    const role = req.query.role === 'admin' ? 'admin' : 'public';

    const [rows] = await db.query(
        `
        SELECT 
            po.observation_id,
            po.user_id,
            po.species_id,
            po.location_latitude   AS location_latitude,
            po.location_longitude  AS location_longitude,
            po.location_name       AS location_name,
            po.created_at,
            po.notes,
            po.is_masked,
            s.common_name,
            s.scientific_name,
            s.is_endangered,
            u.username,
            ar.confidence_score    AS confidence_score
        FROM plant_observations po
        JOIN species s ON po.species_id = s.species_id
        LEFT JOIN users u ON po.user_id = u.user_id
        LEFT JOIN ai_results ar 
            ON ar.observation_id = po.observation_id
        AND ar.rank = 1               -- top prediction only
        WHERE po.status = 'verified'
        `
    );

    const data = rows.map((row) => {
      let lat = row.location_latitude;
      let lon = row.location_longitude;
      let location_name = row.location_name;

      // If later encrypted GPS needs decrypting, do it here

      if (role === 'public' && row.is_endangered && row.is_masked) {
        const masked = maskCoords(lat, lon);
        lat = masked.lat;
        lon = masked.lon;
        location_name = 'Protected habitat (approximate)';
      }

      return {
        observation_id: row.observation_id,
        user: {
          user_id: row.user_id,
          username: row.username || 'Anonymous',
        },
        species: {
          species_id: row.species_id,
          common_name: row.common_name,
          scientific_name: row.scientific_name,
          is_endangered: !!row.is_endangered,
        },
        photo_url: null,          
        location_latitude: lat,
        location_longitude: lon,
        location_name,
        created_at: row.created_at,
        notes: row.notes,
        is_masked: !!row.is_masked,
        confidence_score: row.confidence_score ?? null,
      };
    });

    return res.json({ success: true, data });
  } catch (err) {
    console.error('[listMapObservations] error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to load map observations',
    });
  }
}

module.exports = {
  listMapObservations,
};
