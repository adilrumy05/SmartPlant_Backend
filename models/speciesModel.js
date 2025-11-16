const db = require('../config/db');

// Fetches full species data plus a representative location
exports.getAllSpecies = async () => {
  const query = `
    SELECT 
      s.species_id,
      s.scientific_name,
      s.common_name,
      s.is_endangered,
      COALESCE(s.common_name, s.scientific_name, 'Unnamed Species') AS display_name,
      AVG(po.location_latitude)  AS sample_latitude,
      AVG(po.location_longitude) AS sample_longitude
    FROM species s
    LEFT JOIN plant_observations po
      ON po.species_id = s.species_id
     AND po.status = 'verified'
    GROUP BY
      s.species_id,
      s.scientific_name,
      s.common_name,
      s.is_endangered
    ORDER BY display_name;
  `;

  const [rows] = await db.query(query);
  return rows;
};