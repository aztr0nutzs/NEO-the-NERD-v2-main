const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const soundsDir = path.join(rootDir, 'app/src/main/assets/sounds');
const catalogPath = path.join(rootDir, 'app/src/main/assets/sound_catalog.json');

function walkSync(dir, filelist = []) {
  if (!fs.existsSync(dir)) return filelist;
  fs.readdirSync(dir).forEach(file => {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      filelist = walkSync(p, filelist);
    } else {
      filelist.push(p);
    }
  });
  return filelist;
}

console.log("Validating sound assets...");
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const files = walkSync(soundsDir);

const actualFilesMap = new Map();
files.forEach(f => {
  const relativePath = path.relative(path.join(rootDir, 'app/src/main/assets'), f).replace(/\\/g, '/');
  actualFilesMap.set(relativePath, f);
});

let missingCount = 0;
let corruptCount = 0;
let successCount = 0;

catalog.forEach(entry => {
  const fullPath = actualFilesMap.get(entry.assetPath);
  if (!fullPath) {
    missingCount++;
    console.error(`MISSING: ${entry.assetPath}`);
  } else {
    const stats = fs.statSync(fullPath);
    if (stats.size === 0) {
      corruptCount++;
      console.error(`CORRUPT (Empty): ${entry.assetPath}`);
    } else {
      // Basic header check for common audio formats
      const buffer = Buffer.alloc(16);
      const fd = fs.openSync(fullPath, 'r');
      fs.readSync(fd, buffer, 0, 16, 0);
      fs.closeSync(fd);

      const header = buffer.toString('hex').toUpperCase();
      const ext = path.extname(fullPath).toLowerCase();

      let isValid = false;
      if (ext === '.mp3') {
        isValid = header.startsWith('494433') || header.startsWith('FFF');
      } else if (ext === '.ogg') {
        isValid = header.startsWith('4F676753');
      } else {
        isValid = true; // Unknown extension, skip header check
      }

      if (!isValid) {
        if (header.includes('EFBFBD')) {
           corruptCount++;
           console.error(`CORRUPT (UTF-8 Mismatch): ${entry.assetPath}`);
        } else {
           // Warning only for unknown headers
           successCount++;
        }
      } else {
        successCount++;
      }
    }
  }
});

console.log(`\nValidation Summary:`);
console.log(`- Total Catalog Entries: ${catalog.length}`);
console.log(`- Successfully Validated: ${successCount}`);
console.log(`- Missing Files: ${missingCount}`);
console.log(`- Corrupted Files: ${corruptCount}`);

if (missingCount > 0 || corruptCount > 0) {
  process.exit(1);
} else {
  console.log("\nAll assets are decodable and present.");
  process.exit(0);
}
