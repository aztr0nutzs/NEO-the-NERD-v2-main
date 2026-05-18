#!/usr/bin/env node
/**
 * One-shot organizer for loose Prankstar audio files dropped at the repo root.
 *
 * - Reads lib/prankstar/soundCatalog.source.json as the source of truth.
 * - Strips GitHub upload " (N)" duplicate-suffix to recover the canonical
 *   basename for each loose file.
 * - Maps each loose file to the catalog-expected
 *   public/prankstar/sounds/<folder>/<filename> path, distributing duplicates
 *   across multi-destination basenames (voice/Female, voice/Male,
 *   voices_fighter) by size descending → voices_fighter, voice/Female,
 *   voice/Male.
 * - Performs the move with `fs.renameSync`. Idempotent: re-running is a no-op
 *   once the root is clean.
 *
 * Mapping log is written to docs/PRANKSTAR_ROOT_AUDIO_MAPPING.json so the
 * follow-up validation/report step has a machine-readable record.
 */
const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "..")
const ASSETS_ROOT = path.join(ROOT, "public/prankstar/sounds")
const CATALOG_PATH = path.join(ROOT, "lib/prankstar/soundCatalog.source.json")
const QUARANTINE_DIR = path.join(ROOT, "public/prankstar/sounds/_unmatched")
const LOG_PATH = path.join(ROOT, "docs/PRANKSTAR_ROOT_AUDIO_MAPPING.json")

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"))

// Build basename -> [{path,id}] map. Path is relative ("sounds/<folder>/<file>").
const byBasename = new Map()
for (const entry of catalog) {
  const basename = entry.assetPath.split("/").pop()
  if (!byBasename.has(basename)) byBasename.set(basename, [])
  byBasename.get(basename).push({
    assetPath: entry.assetPath,
    id: entry.id,
  })
}

function canonicalBasename(filename) {
  // 'foo (2).ogg' -> 'foo.ogg'; 'foo (10).mp3' -> 'foo.mp3'
  // Leaves the catalog-quoted 'shrek_30-cartoon-hammer-answer-341914 (1).mp3'
  // alone because the (1) IS part of the canonical filename — we detect this
  // by only stripping ' (N)' when the resulting bare basename ALSO appears in
  // the catalog. Falls back to original if stripped form is unknown.
  const m = filename.match(/^(.+) \((\d+)\)(\.[^.]+)$/)
  if (!m) return filename
  const stripped = m[1] + m[3]
  if (byBasename.has(stripped)) return stripped
  if (byBasename.has(filename)) return filename
  return stripped
}

const looseFiles = fs
  .readdirSync(ROOT)
  .filter((f) =>
    /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(f) &&
      fs.statSync(path.join(ROOT, f)).isFile(),
  )

// Group loose files by canonical basename
const groups = new Map()
for (const f of looseFiles) {
  const base = canonicalBasename(f)
  if (!groups.has(base)) groups.set(base, [])
  groups.get(base).push(f)
}

// Destination ordering helper. For multi-destination basenames, we want
// voices_fighter first (larger/dramatic clips tend to be there), then
// voice/Female, then voice/Male. This is heuristic; documented as such.
function destSortKey(p) {
  if (p.startsWith("sounds/voices_fighter/")) return 0
  if (p.startsWith("sounds/voice/Female/")) return 1
  if (p.startsWith("sounds/voice/Male/")) return 2
  return 3
}

const moves = [] // {from, to, confidence, basename, sizeBytes}
const unresolved = []
const missingDestinations = []
const conflicts = []

for (const [base, files] of groups.entries()) {
  const dests = byBasename.get(base)
  if (!dests) {
    unresolved.push({ basename: base, files })
    continue
  }
  const sortedFiles = [...files].sort((a, b) => {
    return (
      fs.statSync(path.join(ROOT, b)).size -
      fs.statSync(path.join(ROOT, a)).size
    )
  })
  const sortedDests = [...dests].sort(
    (a, b) => destSortKey(a.assetPath) - destSortKey(b.assetPath),
  )
  const n = Math.min(sortedFiles.length, sortedDests.length)
  for (let i = 0; i < n; i++) {
    const f = sortedFiles[i]
    const d = sortedDests[i]
    const sizeBytes = fs.statSync(path.join(ROOT, f)).size
    moves.push({
      from: f,
      to: d.assetPath,
      id: d.id,
      confidence:
        files.length === 1 && dests.length === 1
          ? "exact"
          : files.length === dests.length
            ? "strong"
            : "best_effort",
      basename: base,
      sizeBytes,
    })
  }
  // Extra files we couldn't place (duplicates beyond destination count)
  for (let i = dests.length; i < sortedFiles.length; i++) {
    unresolved.push({
      basename: base,
      files: [sortedFiles[i]],
      reason: "more file copies than catalog destinations",
    })
  }
  // Catalog destinations we couldn't fill
  for (let i = sortedFiles.length; i < sortedDests.length; i++) {
    missingDestinations.push({
      basename: base,
      destination: sortedDests[i].assetPath,
      id: sortedDests[i].id,
      reason: "fewer loose file copies than catalog destinations",
    })
  }
}

// Execute moves
fs.mkdirSync(ASSETS_ROOT, { recursive: true })
let movedCount = 0
let skippedAlreadyExists = 0
for (const m of moves) {
  const fromAbs = path.join(ROOT, m.from)
  const relDest = m.to.replace(/^sounds\//, "")
  const toAbs = path.join(ASSETS_ROOT, relDest)
  fs.mkdirSync(path.dirname(toAbs), { recursive: true })
  if (fs.existsSync(toAbs)) {
    const exSize = fs.statSync(toAbs).size
    if (exSize === m.sizeBytes) {
      // Same content (very likely) → discard the loose copy
      fs.unlinkSync(fromAbs)
      skippedAlreadyExists++
      continue
    }
    conflicts.push({
      from: m.from,
      to: m.to,
      existingSize: exSize,
      incomingSize: m.sizeBytes,
    })
    continue
  }
  fs.renameSync(fromAbs, toAbs)
  movedCount++
}

// Move unresolved files (genuinely duplicate or uncataloged) into quarantine
fs.mkdirSync(QUARANTINE_DIR, { recursive: true })
let quarantinedCount = 0
for (const u of unresolved) {
  for (const f of u.files) {
    const fromAbs = path.join(ROOT, f)
    if (!fs.existsSync(fromAbs)) continue
    const toAbs = path.join(QUARANTINE_DIR, f)
    if (fs.existsSync(toAbs)) {
      fs.unlinkSync(fromAbs)
      continue
    }
    fs.renameSync(fromAbs, toAbs)
    quarantinedCount++
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  totalLooseFilesProcessed: looseFiles.length,
  moved: movedCount,
  skippedAlreadyExists,
  quarantined: quarantinedCount,
  movesPlan: moves,
  unresolved,
  missingDestinations,
  conflicts,
}
fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true })
fs.writeFileSync(LOG_PATH, JSON.stringify(report, null, 2))

console.log("Prankstar root audio organization complete")
console.log("  Total loose audio files seen :", looseFiles.length)
console.log("  Moved into canonical paths   :", movedCount)
console.log("  Skipped (already present)    :", skippedAlreadyExists)
console.log("  Quarantined (unresolved)     :", quarantinedCount)
console.log("  Missing destinations         :", missingDestinations.length)
console.log("  Conflicts (size mismatch)    :", conflicts.length)
console.log("  Mapping log                  :", path.relative(ROOT, LOG_PATH))
