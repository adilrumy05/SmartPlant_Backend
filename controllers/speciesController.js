const speciesModel = require('../models/speciesModel');

exports.getAllSpecies = async (req, res) => {
  try {
    const speciesList = await speciesModel.getAllSpecies();
    res.json(speciesList);
  } catch (err) {
    console.error('[getAllSpecies] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
