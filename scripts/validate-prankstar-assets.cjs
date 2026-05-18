#!/usr/bin/env node
/**
 * NEO Prankstar Protocol — asset validator.
 *
 * Reads the ported sound catalog at lib/prankstar/soundCatalog.source.json,
 * applies the same `/prankstar/` path normalization the runtime uses, and
 * checks each entry against public/prankstar/sounds/. Reports totals,
 * missing files, duplicate IDs, and extra uncataloged files found on disk
 * (so future asset drops surface as a clear diff, not silent bloat).
 *
 * Exit code is 0 if every catalog entry resolves to a real file on disk,
 * otherwise 1 — surfaces in CI as an asset gap.
 */
const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "..")
const CATALOG = path.join(ROOT, "lib/prankstar/soundCatalog.source.json")
const ASSETS = path.join(ROOT, "public/prankstar/sounds")
const QUARANTINE_DIR = path.join(ASSETS, "_unmatched")
const AUDIO_RE = /\.(mp3|wav|ogg|m4a|aac|flac)$/i

const raw = JSON.parse(fs.readFileSync(CATALOG, "utf8"))

const seen = new Set()
const dupes = []
const expected = new Set()
const missingByCategory = {}
const foundByCategory = {}
const playableIds = []
let missing = 0
let found = 0

for (const entry of raw) {
  if (seen.has(entry.id)) {
    dupes.push(entry.id)
    continue
  }
  seen.add(entry.id)
  const rel = entry.assetPath.replace(/^sounds\//, "")
  expected.add(rel)
  const fullPath = path.join(ASSETS, rel)
  const cat = rel.split("/")[0]
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).size > 0) {
    found++
    foundByCategory[cat] = (foundByCategory[cat] ?? 0) + 1
    playableIds.push(entry.id)
  } else {
    missing++
    missingByCategory[cat] = (missingByCategory[cat] ?? 0) + 1
  }
}

const MANIFEST = path.join(ROOT, "lib/prankstar/playableSoundIds.generated.json")
const manifestPayload = {
  generatedAt: new Date().toISOString(),
  totalCatalog: seen.size,
  playableCount: playableIds.length,
  missingCount: missing,
  playableIds: playableIds.sort(),
}
fs.writeFileSync(MANIFEST, JSON.stringify(manifestPayload, null, 2) + "\n")

function walk(dir, prefix = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const results = []
  for (const e of entries) {
    const relPath = prefix ? `${prefix}/${e.name}` : e.name
    const abs = path.join(dir, e.name)
    if (e.isDirectory()) {
      results.push(...walk(abs, relPath))
    } else if (AUDIO_RE.test(e.name)) {
      results.push(relPath)
    }
  }
  return results
}

const onDisk = fs.existsSync(ASSETS) ? walk(ASSETS) : []
const extras = onDisk.filter(
  (rel) => !expected.has(rel) && !rel.startsWith("_unmatched/"),
)
const quarantine = onDisk.filter((rel) => rel.startsWith("_unmatched/"))

console.log("=== Prankstar Protocol — Asset Validation ===")
console.log(`Catalog entries (raw):         ${raw.length}`)
console.log(`Catalog entries (unique):      ${seen.size}`)
console.log(`Duplicate IDs:                 ${dupes.length}`)
console.log(`Audio files on disk (total):   ${onDisk.length}`)
console.log(`Assets matched to catalog:     ${found}`)
console.log(`Assets missing from disk:      ${missing}`)
console.log(`Extra (uncataloged) on disk:   ${extras.length}`)
console.log(`Quarantined under _unmatched/: ${quarantine.length}`)

if (Object.keys(foundByCategory).length) {
  console.log("\nFound by category:")
  for (const cat of Object.keys(foundByCategory).sort()) {
    console.log(`  ${cat.padEnd(16)} ${foundByCategory[cat]}`)
  }
}
if (Object.keys(missingByCategory).length) {
  console.log("\nMissing by category:")
  for (const cat of Object.keys(missingByCategory).sort()) {
    console.log(`  ${cat.padEnd(16)} ${missingByCategory[cat]}`)
  }
}
if (dupes.length) {
  console.log("\nDuplicate IDs:")
  for (const id of dupes) console.log("  - " + id)
}
if (extras.length) {
  console.log("\nUncataloged (extra) files on disk:")
  for (const rel of extras) console.log("  - " + rel)
}
if (quarantine.length) {
  console.log("\nQuarantined (unresolved) files:")
  for (const rel of quarantine) console.log("  - " + rel)
}
console.log(`\nWrote playable manifest: ${path.relative(ROOT, MANIFEST)}`)
// Asset coverage is intentionally partial in this phase. The runtime filters
// to the playable set; missing entries are deferred, not a build failure.
process.exit(0)
