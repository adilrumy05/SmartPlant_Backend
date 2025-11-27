const crypto = require("crypto");       // Built-in AES/HMAC
const bcrypt = require("bcryptjs");     // Password hashing
require("dotenv").config();             // Load .env

// AES settings
const ALGO = "aes-256-gcm";             // Encryption algorithm
const KEY_LEN = 32;                     // 32 bytes key
const IV_LEN = 12;                      // 12 bytes IV
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_COST || 12);

// -----------------------------------------------------
// Load main AES key for encrypting plant locations
// -----------------------------------------------------
function loadKey() {
  const b64 = process.env.DATA_KEY_B64;
  if (!b64) {
    console.log("Missing DATA_KEY_B64 in .env");
    return null;
  }

  const key = Buffer.from(b64, "base64");
  if (key.length !== KEY_LEN) {
    console.log("DATA_KEY_B64 must decode to 32 bytes");
    return null;
  }

  return key;
}

// -----------------------------------------------------
// Encrypt text → AES-256-GCM
// -----------------------------------------------------
exports.encryptText = function (text) {
  if (!text) {
    console.log("encryptText: no text provided");
    return null;
  }

  const key = loadKey();
  if (!key) return null;

  const iv = crypto.randomBytes(IV_LEN);       // Random IV each time
  const cipher = crypto.createCipheriv(ALGO, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();             // Authentication tag

  // Return encrypted bundle object
  return {
    iv: iv.toString("base64"),
    ct: encrypted.toString("base64"),
    tag: tag.toString("base64"),
  };
};

// -----------------------------------------------------
// Decrypt AES-GCM bundle → plain text
// -----------------------------------------------------
exports.decryptText = function (bundle) {
  if (!bundle || !bundle.iv || !bundle.ct || !bundle.tag) {
    console.log("decryptText: invalid bundle");
    return null;
  }

  const key = loadKey();
  if (!key) return null;

  const iv = Buffer.from(bundle.iv, "base64");
  const ct = Buffer.from(bundle.ct, "base64");
  const tag = Buffer.from(bundle.tag, "base64");

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ct),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
};

// -----------------------------------------------------
// Hashing key for lookup indexes (email_index, etc.)
// -----------------------------------------------------
function loadIndexKey() {
  const b64 = process.env.INDEX_KEY_B64;
  if (!b64) {
    console.log("❌ Missing INDEX_KEY_B64 in .env");
    return null;
  }

  const key = Buffer.from(b64, "base64");
  if (key.length !== KEY_LEN) {
    console.log("❌ INDEX_KEY_B64 must decode to 32 bytes");
    return null;
  }

  return key;
}

// Create lookup hash (NOT reversible)
exports.makeLookupKey = function (value) {
  if (!value) return null;

  const indexKey = loadIndexKey();
  if (!indexKey) return null;

  const clean = value.trim().toLowerCase();

  return crypto
    .createHmac("sha256", indexKey)
    .update(clean, "utf8")
    .digest("base64");
};

// -----------------------------------------------------
// Password helpers
// -----------------------------------------------------
exports.hashPassword = async function (password) {
  if (!password) throw new Error("Password required");
  return bcrypt.hash(password, BCRYPT_ROUNDS);
};

exports.checkPassword = async function (password, savedHash) {
  if (!password || !savedHash) return false;
  return bcrypt.compare(password, savedHash);
};

// -----------------------------------------------------
// Helpers for storing encryption bundles in DB
// -----------------------------------------------------
exports.saveBundle = function (obj) {
  // Convert bundle object → JSON string
  return JSON.stringify(obj);
};

exports.loadBundle = function (str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};
