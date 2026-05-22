#!/usr/bin/env node
/**
 * encode-avatar-media.mjs
 *
 * One-shot, USER-INVOKED ffmpeg helper that re-encodes the chunky avatar +
 * boot + background MP4s in `public/media/neo/` to mobile-friendly bitrates.
 * This script is NOT wired into CI or `npm run build`. It is intentionally
 * idle until the developer runs:
 *
 *     node scripts/encode-avatar-media.mjs           # dry-run, prints plan
 *     node scripts/encode-avatar-media.mjs --apply   # actually overwrites
 *
 * Without `--apply`, the script writes `*.encoded` siblings next to each
 * source so the developer can A/B-test the result before clobbering. The
 * existing originals are NEVER overwritten without `--apply`.
 *
 * Hard requirement: ffmpeg in PATH. The script will print a friendly
 * "ffmpeg not found" message and exit 1 if it can't find the binary.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * Re-encode arguments (per spec):
 *
 *   ffmpeg -y -i public/media/neo/avatar/idle.mp4 \
 *     -vf "scale='min(640,iw)':-2,fps=24" \
 *     -c:v libx264 -profile:v baseline -level 3.1 \
 *     -crf 26 -preset slow -pix_fmt yuv420p -an \
 *     -movflags +faststart \
 *     public/media/neo/avatar/idle.mp4.encoded
 *
 * Same flags are applied to every other MP4. The `idle.mp4` clip alone
 * goes from ~18 MB → ~2 MB target (it is the worst offender). The other
 * clips, already in the 1–3 MB range, shrink ~30–50% as a side benefit.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * Poster image companion command (one-shot, run by hand):
 *
 *   ffmpeg -y -ss 00:00:00.5 -i public/media/neo/avatar/idle.mp4 \
 *     -frames:v 1 -vf "scale='min(512,iw)':-2" -q:v 80 \
 *     public/media/neo/avatar/idle-poster.webp
 *
 * The resulting `idle-poster.webp` is what `<NeoAvatarVideo poster=...>` reads.
 */

import { spawnSync } from "node:child_process"
import { existsSync, renameSync, statSync, unlinkSync } from "node:fs"
import { resolve, dirname, join, basename } from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = resolve(__dirname, "..")

const args = new Set(process.argv.slice(2))
const APPLY = args.has("--apply")
const QUIET = args.has("--quiet")

const AVATAR_DIR = join(repoRoot, "public", "media", "neo", "avatar")
const NEO_MEDIA_DIR = join(repoRoot, "public", "media", "neo")
const BOOT_DIR = join(repoRoot, "public", "media", "neo", "boot")

/** All MP4 sources we are willing to re-encode. */
const TARGETS = [
  join(AVATAR_DIR, "idle.mp4"),
  join(AVATAR_DIR, "wakeup.mp4"),
  join(AVATAR_DIR, "thinking.mp4"),
  join(AVATAR_DIR, "happy.mp4"),
  join(AVATAR_DIR, "ecstatic.mp4"),
  join(AVATAR_DIR, "surprised.mp4"),
  join(AVATAR_DIR, "angry.mp4"),
  join(AVATAR_DIR, "shutdown.mp4"),
  join(BOOT_DIR, "neo_boot_new.mp4"),
  join(NEO_MEDIA_DIR, "neo_backround.mp4"),
]

function ensureFfmpeg() {
  const probe = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" })
  if (probe.status !== 0) {
    console.error("ffmpeg not found in PATH. Install ffmpeg and re-run.")
    process.exit(1)
  }
}

function fmtBytes(n) {
  if (!Number.isFinite(n)) return "—"
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

function encodeOne(src) {
  if (!existsSync(src)) {
    return { src, missing: true }
  }
  const before = statSync(src).size
  const dst = `${src}.encoded`
  if (existsSync(dst)) unlinkSync(dst)

  const ffArgs = [
    "-y",
    "-i", src,
    "-vf", "scale='min(640,iw)':-2,fps=24",
    "-c:v", "libx264",
    "-profile:v", "baseline",
    "-level", "3.1",
    "-crf", "26",
    "-preset", "slow",
    "-pix_fmt", "yuv420p",
    "-an",
    "-movflags", "+faststart",
    dst,
  ]

  if (!QUIET) console.log(`▶ ffmpeg ${basename(src)}`)
  const run = spawnSync("ffmpeg", ffArgs, {
    stdio: QUIET ? "ignore" : ["ignore", "inherit", "inherit"],
  })
  if (run.status !== 0) {
    return { src, error: `ffmpeg failed (exit ${run.status})` }
  }

  const after = statSync(dst).size
  return { src, before, after, dst }
}

function applyOne(result) {
  if (!result || !result.dst) return
  renameSync(result.dst, result.src)
}

function main() {
  ensureFfmpeg()

  const mode = APPLY ? "APPLY" : "DRY-RUN (writes *.encoded siblings, no overwrite)"
  console.log(`encode-avatar-media — mode: ${mode}`)
  console.log("Targets:")
  for (const t of TARGETS) console.log("  ", t)
  console.log()

  const rows = []
  for (const src of TARGETS) {
    const res = encodeOne(src)
    if (res.missing) {
      rows.push({ name: basename(src), before: "—", after: "—", note: "MISSING" })
      continue
    }
    if (res.error) {
      rows.push({ name: basename(src), before: "—", after: "—", note: res.error })
      continue
    }
    const delta = res.after - res.before
    const pct = res.before ? ((1 - res.after / res.before) * 100).toFixed(1) : "0.0"
    rows.push({
      name: basename(src),
      before: fmtBytes(res.before),
      after: fmtBytes(res.after),
      note: `${pct}% smaller (${delta < 0 ? "saves" : "+"}${fmtBytes(Math.abs(delta))})`,
    })
    if (APPLY) applyOne(res)
  }

  const pad = (s, n) => s.padEnd(n, " ")
  console.log()
  console.log(pad("FILE", 28), pad("BEFORE", 12), pad("AFTER", 12), "NOTE")
  console.log("─".repeat(72))
  for (const r of rows) {
    console.log(pad(r.name, 28), pad(r.before, 12), pad(r.after, 12), r.note)
  }
  console.log()
  if (!APPLY) {
    console.log("Dry run complete. Inspect the *.encoded siblings. To clobber the originals re-run with --apply.")
  } else {
    console.log("Apply complete — originals replaced. Run `npm run build` to refresh the Capacitor out/ mirror.")
  }
}

main()
