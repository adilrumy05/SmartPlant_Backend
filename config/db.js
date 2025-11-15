const mysql = require('mysql2/promise');

// Single promise-based pool for everything
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS ?? '',
  database: process.env.DB_NAME || 'sarawak_plant_db',
  port: process.env.DB_PORT || 3307,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
});

// Test connectivity once at startup
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('Connected to MySQL database');
    conn.release();
  } catch (err) {
    console.error('MySQL connection error:', err);
  }
})();

async function insertSpecies({
  scientific_name,
  common_name = null,
  is_endangered = false,
  description = null,
  image_url = null,
}) {
  if (!scientific_name) {
    throw new Error('scientific_name is required');
  }

  const endangeredFlag = is_endangered ? 1 : 0;

  const [result] = await pool.query(
    `
      INSERT INTO species
        (scientific_name, common_name, is_endangered, description, image_url, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `,
    [scientific_name, common_name, endangeredFlag, description, image_url]
  );

  return result.insertId;
}

async function attachObservationToSpecies({
  observation_id,
  species_id,
  status = 'verified',
}) {
  if (!observation_id || !species_id) {
    throw new Error('observation_id and species_id are required');
  }

  await pool.query(
    `
      UPDATE plant_observations
      SET species_id = ?, status = ?
      WHERE observation_id = ?
    `,
    [species_id, status, observation_id]
  );
}

// Retrieve species_id from database if it exists, otherwise, insert a new record and return the new ID
async function getOrCreateSpeciesId(scientific_name) {
  const conn = await pool.getConnection(); // Get a dedicated connection from the pool
  try {
    // Attempt to find an existing species by its scientific name
    const [rows] = await conn.query(
      'SELECT species_id FROM species WHERE scientific_name = ? LIMIT 1',
      [scientific_name]
    );
    if (rows.length) return rows[0].species_id; // If a match is found, return the existing species_id

    // If not found, create a placeholder row
    const [ins] = await conn.query(
      'INSERT INTO species (scientific_name) VALUES (?)',
      [scientific_name]
    );
    return ins.insertId; // Return the ID of the newly inserted species
  } finally {
    conn.release(); // Always release the connection back to the pool
  }
}

// Add a new observation record into the 'plant_observations' table
async function insertObservation({
  user_id = null,
  species_id = null,
  photo_url,
  location_latitude = null,
  location_longitude = null,
  location_name = null,
  source = 'camera',
  status = 'pending',
  notes = null,
}) {
  /// Ensure latitude and longitude are numeric and non-null
  const lat =
    Number.isFinite(Number(location_latitude)) ? Number(location_latitude) : 0.0;
  const lon =
    Number.isFinite(Number(location_longitude)) ? Number(location_longitude) : 0.0;
  // Provide safe defaults for optional fields
  const locName = (location_name ?? '') || ''; // empty string instead of NULL
  const src = (source ?? 'camera') || 'camera';
  const st = (status ?? 'pending') || 'pending';
  const nts = notes ?? null; // notes can be NULL if not provided

  // Insert a new observation record
  const [res] = await pool.query(
    `INSERT INTO plant_observations
     (user_id, species_id, photo_url, location_latitude, location_longitude, location_name, source, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user_id,
      species_id,
      photo_url,
      lat,
      lon,
      locName,
      src,
      st,
      nts,
    ]
  );

  return res.insertId; // Return the new observation_id for later linking with AI results
}

async function insertAiResults(observation_id, items) {
  if (!items || !items.length) return;

  const values = [];

  for (const it of items) {
    const scoreRaw = Number(it.confidence);
    const scoreClamped = Math.max(0, Math.min(1, scoreRaw));
    const score = Number(scoreClamped.toFixed(4));
    const rank = Number(it.rank);
    const species_id = Number(it.species_id);

    values.push([observation_id, species_id, score, rank]);
  }

  await pool.query(
    `INSERT INTO ai_results (observation_id, species_id, confidence_score, rank)
     VALUES ?`,
    [values]
  );
}

async function getObservationWithResults(observation_id) {
  const [obsRows] = await pool.query(
    `SELECT observation_id, user_id, species_id, photo_url,
            location_latitude, location_longitude,
            location_name, source, status, created_at
     FROM plant_observations
     WHERE observation_id = ?`,
    [observation_id]
  );
  const observation = obsRows[0] || null;
  if (!observation) return null;

  const [resRows] = await pool.query(
    `SELECT
        ar.ai_result_id,
        ar.observation_id,
        ar.confidence_score,
        ar.rank,
        s.species_id,
        s.scientific_name,
        s.common_name,
        s.description,
        s.image_url
     FROM ai_results ar
     LEFT JOIN species s ON s.species_id = ar.species_id
     WHERE ar.observation_id = ?
     ORDER BY ar.rank ASC`,
    [observation_id]
  );

  return { observation, results: resRows };
}

async function listObservationsByStatus(
  statuses = ['pending'],
  limit = 20,
  offset = 0,
  opts = {}
) {
  const { autoFlagged = false, threshold = null } = opts;

  const placeholders = statuses.map(() => '?').join(',');
  const topExpr = 'COALESCE(MAX(ar.confidence_score), 0)';

  const sqlParts = [];
  sqlParts.push(`
    SELECT
      po.observation_id,
      po.photo_url,
      po.status,
      ${topExpr} AS top_confidence,
      po.created_at,
      po.location_name,
      po.location_latitude,
      po.location_longitude,
      po.user_id,
      (
        SELECT s.scientific_name
        FROM ai_results ar2
        LEFT JOIN species s ON s.species_id = ar2.species_id
        WHERE ar2.observation_id = po.observation_id
        ORDER BY ar2.rank ASC, ar2.confidence_score DESC
        LIMIT 1
      ) AS top_species_name
    FROM plant_observations po
    LEFT JOIN ai_results ar ON ar.observation_id = po.observation_id
    WHERE po.status IN (${placeholders})
    GROUP BY
      po.observation_id,
      po.photo_url,
      po.status,
      po.created_at,
      po.location_name,
      po.location_latitude,
      po.location_longitude,
      po.user_id
  `);

  const params = [...statuses];

  if (autoFlagged && Number.isFinite(Number(threshold))) {
    sqlParts.push(`HAVING ${topExpr} < ?`);
    params.push(Number(threshold));
  }

  sqlParts.push(`ORDER BY po.created_at DESC LIMIT ? OFFSET ?`);
  params.push(Number(limit), Number(offset));

  const sql = sqlParts.join('\n');

  const [rows] = await pool.query(sql, params);
  return rows;
}

async function updateObservationStatus(observation_id, status) {
  await pool.query(
    'UPDATE plant_observations SET status = ? WHERE observation_id = ?',
    [status, observation_id]
  );
}

async function updateObservation({ observation_id, status, notes = null, species_name = null }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let species_id = null;
    if (species_name && String(species_name).trim()) {
      const [rows] = await conn.query(
        'SELECT species_id FROM species WHERE scientific_name = ? LIMIT 1',
        [species_name.trim()]
      );
      if (rows.length) {
        species_id = rows[0].species_id;
      } else {
        const [ins] = await conn.query(
          'INSERT INTO species (scientific_name) VALUES (?)',
          [species_name.trim()]
        );
        species_id = ins.insertId;
      }
    }

    const fields = [];
    const params = [];

    if (status) { fields.push('status = ?'); params.push(status); }
    if (notes !== undefined) { fields.push('notes = ?'); params.push(notes); }
    if (species_id !== null) { fields.push('species_id = ?'); params.push(species_id); }

    if (fields.length) {
      params.push(observation_id);
      await conn.query(
        `UPDATE plant_observations SET ${fields.join(', ')} WHERE observation_id = ?`,
        params
      );
    }

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = {
  pool,
  query: (...args) => pool.query(...args),
  getConnection: (...args) => pool.getConnection(...args),

  insertSpecies,
  attachObservationToSpecies,
  getOrCreateSpeciesId,
  insertObservation,
  insertAiResults,
  getObservationWithResults,
  listObservationsByStatus,
  updateObservationStatus,
  updateObservation,
};
