const { getVerifiedObservationFeed } = require('../config/db');

async function getPublicObservationFeed(req, res) {
  try {
    const rows = await getVerifiedObservationFeed();
    res.json(rows);
  } catch (err) {
    console.error('[getPublicObservationFeed] error:', err);
    res.status(500).json({ error: 'Failed to load observation feed' });
  }
}

module.exports = {
  getPublicObservationFeed,
};
