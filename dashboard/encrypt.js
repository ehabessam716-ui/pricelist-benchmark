/**
 * Encrypts benchmark_data.json → public/benchmark_data.enc
 * Usage: node encrypt.js <password>
 * Password defaults to env var ENCRYPT_PW if not supplied.
 *
 * Format: iv(12 bytes) | authTag(16 bytes) | ciphertext  →  base64
 * Algorithm: AES-256-GCM, key derived via PBKDF2-SHA256 (100,000 rounds)
 */
const crypto = require("crypto");
const fs     = require("fs");
const path   = require("path");

const PASSWORD = process.argv[2] || process.env.ENCRYPT_PW;
if (!PASSWORD) {
  console.error("Usage: node encrypt.js <password>");
  process.exit(1);
}

const SALT    = "SGH-PRICELIST-BENCH-V1";
const SRC     = path.join(__dirname, "..", "benchmark_data.json");
const DST     = path.join(__dirname, "public", "benchmark_data.enc");

if (!fs.existsSync(SRC)) {
  console.error("Source not found:", SRC);
  console.error("Run preprocess.py first to generate benchmark_data.json");
  process.exit(1);
}

const plaintext = fs.readFileSync(SRC, "utf8");
const key       = crypto.pbkdf2Sync(PASSWORD, SALT, 100000, 32, "sha256");
const iv        = crypto.randomBytes(12);
const cipher    = crypto.createCipheriv("aes-256-gcm", key, iv);

let encrypted = cipher.update(plaintext, "utf8");
encrypted     = Buffer.concat([encrypted, cipher.final()]);
const tag     = cipher.getAuthTag();

// Layout: iv(12) | tag(16) | ciphertext
const out = Buffer.concat([iv, tag, encrypted]).toString("base64");
fs.writeFileSync(DST, out);

const kb = (plaintext.length / 1024).toFixed(0);
console.log(`✓ Encrypted ${kb} KB  →  ${DST}`);
