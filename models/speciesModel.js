const db = require('../config/db');

// Fetches a clean list of species (ID and name)
exports.getAllSpecies = async () => {
  const query = `
    SELECT 
      species_id, 
      COALESCE(scientific_name, common_name, 'Unnamed Species') AS display_name
    FROM species
    ORDER BY display_name;
  `;

  const [rows] = await db.query(query);
  return rows;
};
