const db = require('../config/db');

// Fetches a clean list of species (ID and name)
exports.getAllSpecies = () => {
  return new Promise((resolve, reject) => {
    // We get both names and use COALESCE to pick the best one to show
    const query = `
      SELECT 
        species_id, 
        COALESCE(scientific_name, common_name, 'Unnamed Species') AS display_name
      FROM species
      ORDER BY display_name;
    `;
    
    db.query(query, (err, rows) => {
      if (err) {
        console.error('❌ Error fetching species list:', err);
        return reject(err);
      }
      resolve(rows);
    });
  });
};