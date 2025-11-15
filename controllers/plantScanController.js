// controllers/plantScanController.js
const path = require('path');
const db = require('../config/db');
const { inferWithWorker } = require('../services/pythonWorker');
const { encryptText, saveBundle, } = require('../modules/encryption_module');

// function for encrypting location
function encryptLocation(lat, lon) {
  try {
    const plain = `${lat},${lon}`;
    const bundle = encryptText(plain);  // AES-GCM {iv, tag, ciphertext}
    return saveBundle(bundle);          // JSON string for DB
  } catch (err) {
    console.error('[encryptLocation] error:', err);
    return null;
  }
}

async function scanImage(req, res) {
  try {
    // 1. Validate upload
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const {
      user_id = null,
      location_latitude,
      location_longitude,
      location_name,
      source = 'camera',
    } = req.body || {};

    const lat = Number.isFinite(Number(location_latitude))
      ? Number(location_latitude)
      : 0.0;
    const lon = Number.isFinite(Number(location_longitude))
      ? Number(location_longitude)
      : 0.0;

    // Normalize for disk and public URL
    // const photoUrl = req.file.path.replace(/\\/g, '/');
    const absPath = path.resolve(req.file.path);                   // full path for Python
    const photoUrl = `/uploads/${req.file.filename}`;              // public URL for DB

    let encryptedLocation = null;
    if (lat && lon) {
      encryptedLocation = encryptLocation(lat, lon);
    }

    // 2. Insert observation first
    const observation_id = await db.insertObservation({
      user_id,
      species_id: null,
      photo_url: photoUrl,
      location_latitude: lat,         // plaintext
      location_longitude: lon,        // plaintext
      location_enc: encryptedLocation, // encrypted data stored here
      location_name: location_name || '',
      source,
      status: 'pending',
      notes: null,
    });

    // 3. Call Python worker
    const inferResult = await inferWithWorker(absPath, 5);

    const rawTopK = Array.isArray(inferResult.topk)
      ? inferResult.topk
      : [];

    console.log('[scanImage] rawTopK from python:', rawTopK);

    // 4. Map python -> app + DB format
    const topK = [];

    for (let i = 0; i < rawTopK.length; i++) {
      const item = rawTopK[i];

      // Be defensive: support both `name` and `species_name`
      const scientific_name = item.name || item.species_name;

      console.log('[scanImage] mapping prediction', i, scientific_name, item);

      if (!scientific_name) continue;

      let species_id = null;
      try {
        species_id = await db.getOrCreateSpeciesId(scientific_name);
      } catch (e) {
        console.error('[scanImage] getOrCreateSpeciesId error', e);
      }

      topK.push({
        species: scientific_name,
        confidence: Number(item.confidence), // 0..1
        species_id,
        rank: i + 1,
      });
    }

    console.log('[scanImage] mapped topK:', topK);

    // 5. Save into ai_results
    if (topK.length > 0) {
      try {
        await db.insertAiResults(observation_id, topK);
      } catch (e) {
        console.error('[scanImage] insertAiResults error', e);
      }
    } else {
      console.warn('[scanImage] No predictions, topK empty');
    }

    // 6. Threshold / confidence
    const clamp = v => Math.max(0, Math.min(1, Number(v)));
    const rawConf = topK[0] ? topK[0].confidence : 0;
    const confidence = clamp(rawConf);
    const rawThresh = Number(process.env.UNSURE_THRESHOLD || 0.6);
    const thresh = Number.isFinite(rawThresh) ? clamp(rawThresh) : 0.6;
    const auto_flagged = confidence < thresh;

    
    // const top = topK[0] || null;
    // const flagged = !top || Number(top.confidence) < 0.6;

    // 7. Respond to app

    // res.json({
    //   ok: true,
    //   observation_id,
    //   topK,
    //   flagged,
    // });

    const detail = await db.getObservationWithResults(observation_id);

    // Flatten candidates list from python topk
    const candidates = topK.map((t) => ({
      species: t.species,
      confidence: clamp(t.confidence),
      rank: t.rank,
    }));

    // Mirror DB confidence_score to confidence for the "results" array
    const resultsNormalized = (detail?.results || []).map((r) => ({
      ...r,
      confidence: Number(r.confidence_score) || 0,
    }));

    const primary = {
      species_name: topK[0]?.species || null,
      confidence,
      image_path: photoUrl,
    };

    return res.json({
      observation_id,
      status: 'pending',
      threshold: thresh,
      auto_flagged,
      primary,
      candidates,
      results: resultsNormalized,
      created_at: detail?.observation?.created_at,
    });
  } catch (err) {
    console.error('[scanImage] error', err);
    return res.status(500).json({
      error: 'Inference failed',
      details: err?.message || String(err),
    });
  }
}

module.exports = { scanImage };
