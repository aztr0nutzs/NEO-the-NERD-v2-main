const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mm = require('music-metadata');

const assetsDir = path.join(__dirname, '../app/src/main/assets/sounds');
const catalogPath = path.join(__dirname, '../app/src/main/assets/sound_catalog.json');

async function validate() {
  console.log('--- ADVANCED ASSET VALIDATION V3 ---');
  
  if (!fs.existsSync(catalogPath)) {
    console.error('ERROR: Catalog missing at ' + catalogPath);
    process.exit(1);
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const catalogPaths = new Set(catalog.map(e => e.assetPath));
  const catalogIds = new Set();
  const fileHashes = new Map();
  const errors = [];
  const warnings = [];
  
  const supportedExtensions = ['.mp3', '.ogg', '.wav'];

  function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      file = path.join(dir, file);
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) {
        results = results.concat(walk(file));
      } else {
        results.push(file);
      }
    });
    return results;
  }

  const allFiles = walk(assetsDir);
  console.log(`Scanning ${allFiles.length} files in assets...`);

  for (const file of allFiles) {
    const relPath = path.relative(path.join(__dirname, '../app/src/main/assets'), file).replace(/\\/g, '/');
    const ext = path.extname(file).toLowerCase();
    const name = path.basename(file);

    // 1. Extension check
    if (!supportedExtensions.includes(ext)) {
      errors.push(`${relPath}: Unsupported extension ${ext}`);
      continue;
    }

    // 2. Unsafe names
    if (/[^a-zA-Z0-9.\-_ ()]/.test(name)) {
      errors.push(`${relPath}: Unsafe filename (contains special characters)`);
    }

    // 3. Catalog coverage
    if (!catalogPaths.has(relPath)) {
      errors.push(`${relPath}: Orphaned file (not in catalog)`);
    }

    // 4. Decodability & Duration
    try {
      const metadata = await mm.parseFile(file);
      if (!metadata.format || !metadata.format.duration || metadata.format.duration <= 0) {
        errors.push(`${relPath}: Invalid duration or metadata corrupted`);
      }
    } catch (e) {
      errors.push(`${relPath}: Failed to decode: ${e.message}`);
    }

    // 5. Duplicate content (Hash)
    const hash = crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
    if (fileHashes.has(hash)) {
      warnings.push(`${relPath}: Duplicate content found (same as ${fileHashes.get(hash)})`);
    } else {
      fileHashes.set(hash, relPath);
    }
  }

  // 6. Catalog Integrity
  catalog.forEach(entry => {
    // Duplicate IDs
    if (catalogIds.has(entry.id)) {
      errors.push(`CATALOG: Duplicate ID ${entry.id}`);
    }
    catalogIds.add(entry.id);

    // Path existence
    const fullPath = path.join(__dirname, '../app/src/main/assets', entry.assetPath);
    if (!fs.existsSync(fullPath)) {
      errors.push(`CATALOG: Path ${entry.assetPath} (ID: ${entry.id}) does not exist on disk`);
    }

    // Missing category
    if (!entry.category || entry.category === 'UNKNOWN') {
      errors.push(`CATALOG: Missing category for ${entry.id}`);
    }
  });

  console.log('\n--- RESULTS ---');
  if (errors.length > 0) {
    console.error(`Total Errors: ${errors.length}`);
    errors.forEach(e => console.error('  [ERR] ' + e));
  } else {
    console.log('No critical errors found.');
  }

  if (warnings.length > 0) {
    console.warn(`Total Warnings: ${warnings.length}`);
    warnings.forEach(w => console.warn('  [WARN] ' + w));
  }

  if (errors.length > 0) process.exit(1);
  console.log('Validation successful!');
}

validate().catch(err => {
  console.error(err);
  process.exit(1);
});
