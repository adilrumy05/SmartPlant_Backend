const speciesModel = require('../models/speciesModel');

// Get all species for the 'Add Device' dropdown
exports.getAllSpecies = async (req, res) => {
  try {
    const speciesList = await speciesModel.getAllSpecies();
    res.json(speciesList);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};