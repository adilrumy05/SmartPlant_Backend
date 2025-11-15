// controllers/adminObservationController.js
const fs = require('fs');
const path = require('path');
const db = require('../config/db'); // MySQL connection for backend

const SPECIES_IMAGE_ROOT = path.join(__dirname, '..', 'species_images');

// same slugify as in your AI backend
function slugifyName(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function copyObservationImageToSpeciesFolder(scientific_name, photoUrl) {
  if (!scientific_name || !photoUrl) return null;

  const safeName = slugifyName(scientific_name);
  const speciesDir = path.join(SPECIES_IMAGE_ROOT, safeName);

  await fs.promises.mkdir(speciesDir, { recursive: true });

  const filename = path.basename(photoUrl);
  const uploadsDir = path.join(__dirname, '..');
  const srcPath = path.join(uploadsDir, photoUrl.replace(/^\//, ''));
  const destPath = path.join(speciesDir, filename);

  await fs.promises.copyFile(srcPath, destPath);

  return `/species_images/${safeName}/${filename}`;
}

function getScientificNameById(species_id) {
  return new Promise((resolve, reject) => {
    db.query(
      'SELECT scientific_name FROM species WHERE species_id = ? LIMIT 1',
      [species_id],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows && rows[0] ? rows[0].scientific_name : null);
      }
    );
  });
}

/**
 * GET /api/admin/observations
 * list observations by status, with auto_flagged + threshold logic
 */
async function listObservations(req, res) {
  try {
    const statusParam = req.query.status;
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.max(
      1,
      Math.min(1000, Number(req.query.page_size) || 100)
    );
    const offset = (page - 1) * pageSize;

    const statuses = statusParam
      ? String(statusParam)
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      : ['pending'];

    const autoFlagged = req.query.auto_flagged === '1';
    const rawThresh = Number(req.query.threshold);
    const threshold = Number.isFinite(rawThresh)
      ? Math.max(0, Math.min(1, rawThresh))
      : null;

    // This replicates your listObservationsByStatus query
    const statusPlaceholders = statuses.map(() => '?').join(',');
    const params = [...statuses];

    // let topExpr = 'MAX(ar.confidence_score)';
    // if (autoFlagged && threshold != null) {
    //   topExpr = `
    //     CASE
    //       WHEN MAX(ar.confidence_score) < ${threshold}
    //         THEN MAX(ar.confidence_score)
    //       ELSE MAX(ar.confidence_score)
    //     END
    //   `;
    // }

    const topExpr = 'MAX(ar.confidence_score)';
    let sql = `
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
      WHERE po.status IN (${statusPlaceholders})
      GROUP BY
        po.observation_id,
        po.photo_url,
        po.status,
        po.created_at,
        po.location_name,
        po.location_latitude,
        po.location_longitude,
        po.user_id
    `;

    if (autoFlagged && threshold != null) {
      sql += ` HAVING ${topExpr} < ? `;
      params.push(threshold);
    }

    sql += ' ORDER BY po.created_at DESC LIMIT ? OFFSET ?';

    params.push(pageSize, offset);

    db.query(sql, params, (err, rows) => {
      if (err) {
        console.error('[admin listObservations] db error', err);
        return res.status(500).json({ error: 'Failed to fetch observations' });
      }

      const origin = `${req.protocol}://${req.get('host')}`;
      const data = rows.map(r => ({
        observation_id: r.observation_id,
        plant_name: r.top_species_name || 'Unknown',
        confidence: Number(r.top_confidence) || 0,
        photo: r.photo_url && r.photo_url.startsWith('/')
          ? origin + r.photo_url
          : r.photo_url,
        submitted_at: r.created_at,
        location: r.location_name || '',
        location_latitude: r.location_latitude,
        location_longitude: r.location_longitude,
        user: r.user_id ? `user_${r.user_id}` : '',
      }));

      const hasMore = rows.length === pageSize;
      const next_page = hasMore ? page + 1 : null;

      res.json({
        page,
        page_size: pageSize,
        statuses,
        auto_flagged: autoFlagged,
        threshold,
        next_page,
        data,
      });
    });
  } catch (e) {
    console.error('[admin listObservations] error', e);
    res.status(500).json({ error: 'Failed to fetch observations' });
  }
}

/**
 * GET /api/admin/observations/:id
 * (you can wire this later if needed)
 */
function getObservationDetail(req, res) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid observation id' });
  }

  const obsSql = 'SELECT * FROM plant_observations WHERE observation_id = ?';
  db.query(obsSql, [id], (err, obsRows) => {
    if (err) {
      console.error('[getObservationDetail] obs error', err);
      return res.status(500).json({ error: 'Failed to fetch observation' });
    }
    if (!obsRows || !obsRows[0]) {
      return res.status(404).json({ error: 'Observation not found' });
    }

    const observation = obsRows[0];
    const resSql = `
      SELECT ar.*, s.scientific_name, s.common_name
      FROM ai_results ar
      LEFT JOIN species s ON s.species_id = ar.species_id
      WHERE ar.observation_id = ?
      ORDER BY ar.rank ASC
    `;
    db.query(resSql, [id], (err2, resRows) => {
      if (err2) {
        console.error('[getObservationDetail] ai error', err2);
        return res.status(500).json({ error: 'Failed to fetch results' });
      }
      res.json({ observation, results: resRows });
    });
  });
}

async function verifyObservation(req, res) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Invalid observation id' });
  }

  try {
    // get top AI species for this observation
    const [rows] = await db.query(
      `SELECT species_id
       FROM ai_results
       WHERE observation_id = ?
       ORDER BY rank ASC, confidence_score DESC
       LIMIT 1`,
      [id]
    );

    const top = rows && rows[0] ? rows[0] : null;
    const speciesId = top ? top.species_id : null;

    if (speciesId != null) {
      // set both status and species_id
      await db.query(
        'UPDATE plant_observations SET status = ?, species_id = ? WHERE observation_id = ?',
        ['verified', speciesId, id]
      );
    } else {
      // no AI result, just set status
      await db.query(
        'UPDATE plant_observations SET status = ? WHERE observation_id = ?',
        ['verified', id]
      );
    }

    return res.json({ ok: true, observation_id: id, species_id: speciesId });
  } catch (err) {
    console.error('[verifyObservation] db error', err);
    return res.status(500).json({ error: 'Failed to verify' });
  }
}

async function rejectObservation(req, res) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Invalid observation id' });
  }

  db.query(
    'UPDATE plant_observations SET status = ? WHERE observation_id = ?',
    ['rejected', id],
    (err) => {
      if (err) {
        console.error('[rejectObservation] db error', err);
        return res.status(500).json({ error: 'Failed to reject' });
      }
      res.json({ ok: true });
    }
  );
}

async function flagUnsureObservation(req, res) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid observation id' });
  }

  try {
    const { notes } = req.body || {};

    // Keep / set status as 'pending', optionally record a note
    await db.updateObservation({
      observation_id: id,
      status: 'pending',
      notes,
      species_name: null,   // no change to species
    });

    return res.json({ ok: true, id, status: 'pending' });
  } catch (err) {
    console.error('[flagUnsureObservation] db error', err);
    return res.status(500).json({ error: 'Failed to flag observation as unsure' });
  }
}

/**
 * POST /api/admin/observations/:id/confirm-existing
 */
async function confirmExisting(req, res) {
  try {
    const observation_id = Number(req.params.id);
    const { species_id, scientific_name } = req.body;

    if (!Number.isFinite(observation_id)) {
      return res.status(400).json({ error: 'Invalid observation_id' });
    }

    let resolvedSpeciesId = null;
    let sciName = null;

    if (species_id != null) {
      resolvedSpeciesId = Number(species_id);
      if (!Number.isFinite(resolvedSpeciesId)) {
        return res.status(400).json({ error: 'Invalid species_id' });
      }
      sciName = await getScientificNameById(resolvedSpeciesId);
    } else if (scientific_name) {
      const cleaned = scientific_name.trim();
      if (!cleaned) {
        return res
          .status(400)
          .json({ error: 'scientific_name cannot be empty' });
      }
      // get or create species row
      resolvedSpeciesId = await new Promise((resolve, reject) => {
        db.query(
          'SELECT species_id FROM species WHERE scientific_name = ? LIMIT 1',
          [cleaned],
          (err, rows) => {
            if (err) return reject(err);
            if (rows && rows[0]) return resolve(rows[0].species_id);
            db.query(
              'INSERT INTO species (scientific_name) VALUES (?)',
              [cleaned],
              (err2, result) => {
                if (err2) return reject(err2);
                resolve(result.insertId);
              }
            );
          }
        );
      });
      sciName = cleaned;
    } else {
      return res.status(400).json({
        error: 'species_id or scientific_name is required',
      });
    }

    // fetch observation for photo_url
    const obs = await new Promise((resolve, reject) => {
      db.query(
        'SELECT photo_url FROM plant_observations WHERE observation_id = ?',
        [observation_id],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows && rows[0] ? rows[0] : null);
        }
      );
    });
    if (!obs) {
      return res.status(404).json({ error: 'Observation not found' });
    }

    const photoUrl = obs.photo_url;
    let imgUrl = null;

    if (sciName && photoUrl) {
      imgUrl = await copyObservationImageToSpeciesFolder(sciName, photoUrl);

      if (imgUrl) {
        await new Promise((resolve, reject) => {
          db.query(
            'UPDATE species SET image_url = COALESCE(image_url, ?) WHERE species_id = ?',
            [imgUrl, resolvedSpeciesId],
            (err) => (err ? reject(err) : resolve())
          );
        });
      }
    }

    // attach observation to species + mark verified
    await new Promise((resolve, reject) => {
      db.query(
        'UPDATE plant_observations SET species_id = ?, status = ? WHERE observation_id = ?',
        [resolvedSpeciesId, 'verified', observation_id],
        (err) => (err ? reject(err) : resolve())
      );
    });

    res.json({
      ok: true,
      observation_id,
      species_id: resolvedSpeciesId,
      scientific_name: sciName,
      image_url: imgUrl,
    });
  } catch (err) {
    console.error('[confirm-existing] error', err);
    res.status(500).json({ error: 'Failed to confirm observation' });
  }
}

/**
 * POST /api/admin/observations/:id/confirm-new
 */
async function confirmNew(req, res) {
  try {
    const observation_id = Number(req.params.id);
    const {
      scientific_name,
      common_name,
      is_endangered,
      description,
    } = req.body;

    if (!Number.isFinite(observation_id)) {
      return res.status(400).json({ error: 'Invalid observation_id' });
    }
    if (!scientific_name) {
      return res.status(400).json({ error: 'scientific_name is required' });
    }

    // fetch observation for photo_url
    const obs = await new Promise((resolve, reject) => {
      db.query(
        'SELECT photo_url FROM plant_observations WHERE observation_id = ?',
        [observation_id],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows && rows[0] ? rows[0] : null);
        }
      );
    });
    if (!obs) {
      return res.status(404).json({ error: 'Observation not found' });
    }

    const photoUrl = obs.photo_url;
    const imgUrl = await copyObservationImageToSpeciesFolder(
      scientific_name,
      photoUrl
    );

    const species_id = await new Promise((resolve, reject) => {
      db.query(
        'INSERT INTO species (scientific_name, common_name, is_endangered, description, image_url) VALUES (?, ?, ?, ?, ?)',
        [
          scientific_name,
          common_name || null,
          is_endangered ? 1 : 0,
          description || null,
          imgUrl,
        ],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.insertId);
        }
      );
    });

    await new Promise((resolve, reject) => {
      db.query(
        'UPDATE plant_observations SET species_id = ?, status = ? WHERE observation_id = ?',
        [species_id, 'verified', observation_id],
        (err) => (err ? reject(err) : resolve())
      );
    });

    res.json({
      ok: true,
      observation_id,
      species_id,
      scientific_name,
      image_url: imgUrl,
    });
  } catch (err) {
    console.error('[confirm-new] error', err);
    res.status(500).json({ error: 'Failed to confirm new species' });
  }
}

/**
 * PUT /plant-observations/:id
 * generic update (status / notes / species_name)
 */
async function updateObservationRoute(req, res) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid observation id' });
  }

  const { status, notes, species_name } = req.body || {};

  if (
    status &&
    !['pending', 'verified', 'rejected'].includes(String(status))
  ) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    await db.updateObservation({
      observation_id: id,
      status,
      notes,
      species_name,
    });
    res.json({ ok: true, id, status: status || null });
  } catch (err) {
    console.error('[updateObservationRoute] db error', err);
    res.status(500).json({ error: 'Failed to update observation' });
  }

  // const fields = [];
  // const params = [];

  // if (status) {
  //   fields.push('status = ?');
  //   params.push(status);
  // }
  // if (notes !== undefined) {
  //   fields.push('notes = ?');
  //   params.push(notes);
  // }
  // if (species_name !== undefined) {
  //   fields.push('species_name = ?');
  //   params.push(species_name);
  // }

  // if (!fields.length) {
  //   return res.json({ ok: true, id, status: null });
  // }

  // params.push(id);

  // const sql = `UPDATE plant_observations SET ${fields.join(', ')} WHERE observation_id = ?`;

  // db.query(sql, params, (err) => {
  //   if (err) {
  //     console.error('[updateObservationRoute] db error', err);
  //     return res.status(500).json({ error: 'Failed to update observation' });
  //   }
  //   res.json({ ok: true, id, status: status || null });
  // });

}

module.exports = {
  listObservations,
  getObservationDetail,
  verifyObservation,
  rejectObservation,
  confirmExisting,
  confirmNew,
  updateObservationRoute,
  flagUnsureObservation, 
};
