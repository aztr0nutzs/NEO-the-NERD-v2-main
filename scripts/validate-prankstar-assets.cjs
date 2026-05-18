#!/usr/bin/env node
/**
 * NEO Prankstar Protocol — asset validator.
 *
 * Reads the ported sound catalog at lib/prankstar/soundCatalog.source.json,
 * applies the same `/prankstar/` path normalization the runtime uses, and
 * checks each entry against public/prankstar/sounds/. Reports totals,
 * missing files, and duplicate IDs.
 */
const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "..")
const CATALOG = path.join(ROOT, "lib/prankstar/soundCatalog.source.json")
const ASSETS = path.join(ROOT, "public/prankstar/sounds")

const raw = JSON.parse(fs.readFileSync(CATALOG, "utf8"))

const seen = new Set()
const dupes = []
let missing = 0
let found = 0

for (const entry of raw) {
  if (seen.has(entry.id)) {
    dupes.push(entry.id)
    continue
  }
  seen.add(entry.id)
  const rel = entry.assetPath.replace(/^sounds\//, "")
  const fullPath = path.join(ASSETS, rel)
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).size > 0) {
    found++
  } else {
    missing++
  }
}

console.log("=== Prankstar Protocol — Asset Validation ===")
console.log(`Catalog entries (raw):       ${raw.length}`)
console.log(`Catalog entries (unique):    ${seen.size}`)
console.log(`Duplicate IDs:               ${dupes.length}`)
console.log(`Assets found on disk:        ${found}`)
console.log(`Assets missing:              ${missing}`)
if (dupes.length) {
  console.log("\nDuplicate IDs:")
  for (const id of dupes) console.log("  - " + id)
}
process.exit(missing > 0 ? 1 : 0)
