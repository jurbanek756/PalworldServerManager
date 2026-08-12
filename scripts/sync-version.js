import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Read version from command line argument, env variable (TAG_NAME or GIT_TAG), or package.json
let targetVersion = process.argv[2] || process.env.TAG_NAME || process.env.GIT_TAG;

if (targetVersion) {
  // Strip leading 'v' if present (e.g. v0.2.0 -> 0.2.0)
  targetVersion = targetVersion.replace(/^v/, '').trim();
} else {
  // Fallback to package.json version
  const pkgPath = path.join(rootDir, 'package.json');
  const pkgData = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  targetVersion = pkgData.version;
}

if (!targetVersion || !/^\d+\.\d+\.\d+/.test(targetVersion)) {
  console.error(`Invalid version format: ${targetVersion}`);
  process.exit(1);
}

console.log(`Syncing project files to version: ${targetVersion}`);

// 1. Update package.json
const pkgPath = path.join(rootDir, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = targetVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`Updated package.json -> ${targetVersion}`);
}

// 2. Update src-tauri/tauri.conf.json
const tauriConfPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');
if (fs.existsSync(tauriConfPath)) {
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
  tauriConf.version = targetVersion;
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
  console.log(`Updated src-tauri/tauri.conf.json -> ${targetVersion}`);
}

// 3. Update src-tauri/Cargo.toml
const cargoPath = path.join(rootDir, 'src-tauri', 'Cargo.toml');
if (fs.existsSync(cargoPath)) {
  let cargoContent = fs.readFileSync(cargoPath, 'utf8');
  cargoContent = cargoContent.replace(
    /^version\s*=\s*"[^"]+"/m,
    `version = "${targetVersion}"`
  );
  fs.writeFileSync(cargoPath, cargoContent);
  console.log(`Updated src-tauri/Cargo.toml -> ${targetVersion}`);
}

console.log('Version synchronization complete.');
