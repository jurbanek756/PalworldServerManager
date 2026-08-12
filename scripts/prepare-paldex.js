import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const TMP_REPO_PATH = path.resolve('tmp/palworld-paldex-api');
const DATA_DEST = path.resolve('src/assets/paldex');
const ASSETS_DEST = path.resolve('public/paldex');

console.log('📦 Preparing Paldex API data for app build...');

// 1. Ensure tmp clone exists (auto clone in CI if missing)
if (!fs.existsSync(TMP_REPO_PATH)) {
  console.log('📥 Cloning palworld-paldex-api for build process...');
  try {
    execSync('git clone --depth 1 https://github.com/mlg404/palworld-paldex-api.git tmp/palworld-paldex-api', { stdio: 'inherit' });
  } catch (err) {
    console.error('Failed to clone palworld-paldex-api:', err);
  }
}

if (!fs.existsSync(TMP_REPO_PATH)) {
  console.error('❌ Could not locate tmp/palworld-paldex-api directory.');
  process.exit(1);
}

// 2. Ensure destination directories exist
fs.mkdirSync(DATA_DEST, { recursive: true });
fs.mkdirSync(path.join(ASSETS_DEST, 'images'), { recursive: true });

// 3. Copy & rewrite JSON Datasets
const jsonFiles = ['pals.json', 'item.json', 'passive_skills.json', 'gear.json', 'breeding.json'];
jsonFiles.forEach((file) => {
  const src = path.join(TMP_REPO_PATH, 'src', file);
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
  const srcDir = path.join(TMP_REPO_PATH, 'public/images', dir);
  const destDir = path.join(ASSETS_DEST, 'images', dir);
  if (fs.existsSync(srcDir)) {
    fs.cpSync(srcDir, destDir, { recursive: true });
    console.log(`  ✓ Copied UI icons: public/images/${dir}`);
  }
});

console.log('✅ Paldex API data preparation complete!');
