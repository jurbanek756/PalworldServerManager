import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const RELEASE_VERSION = 'v1.3.0';
const TARBALL_URL = `https://github.com/mlg404/palworld-paldex-api/archive/refs/tags/${RELEASE_VERSION}.tar.gz`;
const EXPECTED_SHA256 = '20cf71a98144ee792ff42e631685f8013675cc5434e5795e3568113125d5aebe';

const TMP_DIR = path.resolve('tmp');
const TAR_FILE_PATH = path.resolve('tmp/paldex-release.tar.gz');
const TMP_EXTRACT_PATH = path.resolve('tmp/extracted');
const DATA_DEST = path.resolve('src/assets/paldex');
const ASSETS_DEST = path.resolve('public/paldex');

console.log('📦 Preparing Paldex API data for app build...');

async function ensurePaldexData() {
  fs.mkdirSync(TMP_DIR, { recursive: true });

  let sourceDir = '';

  // Check if already extracted in tmp/
  if (fs.existsSync(TMP_EXTRACT_PATH)) {
    const subdirs = fs.readdirSync(TMP_EXTRACT_PATH);
    if (subdirs.length > 0) {
      sourceDir = path.join(TMP_EXTRACT_PATH, subdirs[0]);
    }
  }

  // 1. Download & verify tarball archive if missing or empty
  if (!sourceDir || !fs.existsSync(sourceDir)) {
    console.log(`📥 Downloading Paldex API release archive (${RELEASE_VERSION})...`);
    const res = await fetch(TARBALL_URL);
    if (!res.ok) {
      throw new Error(`Failed to fetch release archive from ${TARBALL_URL}: HTTP ${res.status}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    // Verify cryptographic SHA-256 checksum
    console.log('🔒 Verifying SHA-256 checksum integrity...');
    const actualHash = crypto.createHash('sha256').update(buffer).digest('hex');
    if (actualHash !== EXPECTED_SHA256) {
      throw new Error(`Security Exception: Release archive SHA-256 mismatch!\n  Expected: ${EXPECTED_SHA256}\n  Actual:   ${actualHash}`);
    }
    console.log('  ✓ Checksum verified successfully.');

    fs.writeFileSync(TAR_FILE_PATH, buffer);

    fs.mkdirSync(TMP_EXTRACT_PATH, { recursive: true });
    console.log('📦 Extracting release tarball archive...');
    execSync(`tar -xzf "${TAR_FILE_PATH}" -C "${TMP_EXTRACT_PATH}"`);

    const subdirs = fs.readdirSync(TMP_EXTRACT_PATH);
    if (subdirs.length === 0) {
      throw new Error('Extraction resulted in an empty directory.');
    }
    sourceDir = path.join(TMP_EXTRACT_PATH, subdirs[0]);
  }

  if (!fs.existsSync(sourceDir)) {
    console.error('❌ Could not locate Paldex API source directory.');
    process.exit(1);
  }

  // 2. Ensure destination directories exist
  fs.mkdirSync(DATA_DEST, { recursive: true });
  fs.mkdirSync(path.join(ASSETS_DEST, 'images'), { recursive: true });

  // 3. Copy & rewrite JSON Datasets
  const jsonFiles = ['pals.json', 'item.json', 'passive_skills.json', 'gear.json', 'breeding.json'];
  jsonFiles.forEach((file) => {
    const src = path.join(sourceDir, 'src', file);
    if (fs.existsSync(src)) {
      let content = fs.readFileSync(src, 'utf-8');
      // Rewrite image paths from /public/images/ to /paldex/images/ for frontend static serving
      content = content.replaceAll('/public/images/', '/paldex/images/');
      fs.writeFileSync(path.join(DATA_DEST, file), content, 'utf-8');
      console.log(`  ✓ Processed data: ${file}`);
    }
  });

  // 4. Copy UI Icon directories (excluding heavy T_WorldMap.png)
  const imageDirs = ['paldeck', 'elements', 'works', 'items'];
  imageDirs.forEach((dir) => {
    const srcDir = path.join(sourceDir, 'public/images', dir);
    const destDir = path.join(ASSETS_DEST, 'images', dir);
    if (fs.existsSync(srcDir)) {
      fs.cpSync(srcDir, destDir, { recursive: true });
      console.log(`  ✓ Copied UI icons: public/images/${dir}`);
    }
  });

  console.log('✅ Paldex API data preparation complete!');
}

ensurePaldexData().catch((err) => {
  console.error('❌ Error preparing Paldex API data:', err);
  process.exit(1);
});

