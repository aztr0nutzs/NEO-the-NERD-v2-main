import rawCatalog from "./soundCatalog.playable.generated.json"
import playableManifest from "./playableSoundIds.generated.json"
import type { PrankCategory, PrankSound } from "./types"

/**
 * Canonical NEO-owned path prefix for ported Prankstar audio assets. The
 * original Prankstar standalone build read files relative to its Android
 * assets dir (`app/src/main/assets/sounds/...`). For the web/Next runtime
 * we serve them from `public/prankstar/sounds/...`.
 */
export const PRANKSTAR_ASSET_PREFIX = "/prankstar/"

interface RawEntry {
  id: string
  name: string
  category: string
  packId: string
  assetPath: string
  durationMs: number
  tags: string[]
  loopable: boolean
  intensityLevel: number
  isSafeForRandomMode: boolean
  description: string
  recommendedUse: string
  prankStyle: string
  previewLabel: string
}

function normalizePath(p: string): string {
  const stripped = p.replace(/^\.?\/+/, "")
  return PRANKSTAR_ASSET_PREFIX + stripped
}

const seenIds = new Set<string>()
const duplicateIds: string[] = []
const malformed: Array<{ index: number; reason: string }> = []

const NORMALIZED: PrankSound[] = (rawCatalog as RawEntry[])
  .map((entry, index): PrankSound | null => {
    if (!entry || typeof entry.id !== "string" || typeof entry.assetPath !== "string") {
      malformed.push({ index, reason: "missing id or assetPath" })
      return null
    }
    if (seenIds.has(entry.id)) {
      duplicateIds.push(entry.id)
      return null
    }
    seenIds.add(entry.id)
    return {
      id: entry.id,
      name: entry.name,
      category: entry.category as PrankCategory,
      packId: entry.packId,
      assetPath: normalizePath(entry.assetPath),
      sourcePath: entry.assetPath,
      durationMs: typeof entry.durationMs === "number" ? entry.durationMs : 0,
      tags: Array.isArray(entry.tags) ? entry.tags : [],
      loopable: !!entry.loopable,
      intensityLevel:
        typeof entry.intensityLevel === "number" ? entry.intensityLevel : 1,
      isSafeForRandomMode: entry.isSafeForRandomMode !== false,
      description: entry.description ?? "",
      recommendedUse: entry.recommendedUse ?? "",
      prankStyle: entry.prankStyle ?? "",
      previewLabel: entry.previewLabel ?? "Tap to preview",
    }
  })
  .filter((s): s is PrankSound => s !== null)

const PLAYABLE_ID_SET = new Set<string>(
  (playableManifest as { playableIds: string[] }).playableIds,
)

/**
 * Playable subset of the catalog — the canonical user-facing list. Entries
 * whose audio files are not present on disk are excluded by the generated
 * manifest (`playableSoundIds.generated.json`, refreshed by
 * `scripts/validate-prankstar-assets.cjs`). Future asset drops re-include
 * those entries automatically the next time the validator runs.
 */
const PLAYABLE: PrankSound[] = NORMALIZED.filter((s) => PLAYABLE_ID_SET.has(s.id))

export const PRANKSTAR_SOUNDS: readonly PrankSound[] = PLAYABLE
export const PRANKSTAR_ALL_CATALOG: readonly PrankSound[] = NORMALIZED

export const PRANKSTAR_CATALOG_DIAGNOSTICS = {
  totalRaw: (rawCatalog as RawEntry[]).length,
  totalNormalized: NORMALIZED.length,
  totalPlayable: PLAYABLE.length,
  totalDeferred: NORMALIZED.length - PLAYABLE.length,
  duplicateIds,
  malformed,
} as const

export function isPlayableSoundId(id: string): boolean {
  return PLAYABLE_ID_SET.has(id)
}

export function getAllSounds(): readonly PrankSound[] {
  return PRANKSTAR_SOUNDS
}

export function getSoundById(id: string): PrankSound | undefined {
  return PRANKSTAR_SOUNDS.find((s) => s.id === id)
}

export function getCategories(): PrankCategory[] {
  const set = new Set<PrankCategory>()
  for (const s of PRANKSTAR_SOUNDS) set.add(s.category)
  return Array.from(set).sort()
}

export function getSoundsByCategory(category: PrankCategory): PrankSound[] {
  return PRANKSTAR_SOUNDS.filter((s) => s.category === category)
}

export function searchSounds(query: string): PrankSound[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return PRANKSTAR_SOUNDS.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q)),
  )
}

export function getCategoryCounts(): Array<{
  category: PrankCategory
  count: number
}> {
  const map = new Map<PrankCategory, number>()
  for (const s of PRANKSTAR_SOUNDS) {
    map.set(s.category, (map.get(s.category) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => a.category.localeCompare(b.category))
}

export function getSafeRandomSound(
  excludeIds: readonly string[] = [],
): PrankSound | null {
  const pool = PRANKSTAR_SOUNDS.filter(
    (s) => s.isSafeForRandomMode && !excludeIds.includes(s.id),
  )
  if (pool.length === 0) {
    const fallback = PRANKSTAR_SOUNDS.filter((s) => s.isSafeForRandomMode)
    if (fallback.length === 0) return null
    return fallback[Math.floor(Math.random() * fallback.length)]
  }
  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * Curated preview slice — one representative sound per category, capped, so
 * the landing-screen preview panel renders a focused demo set rather than the
 * full catalog. Future phases will introduce the full library browser.
 */
export function getFeaturedPreviewSounds(limit = 8): PrankSound[] {
  const seen = new Set<string>()
  const picks: PrankSound[] = []
  for (const s of PRANKSTAR_SOUNDS) {
    if (seen.has(s.category)) continue
    if (!s.isSafeForRandomMode) continue
    seen.add(s.category)
    picks.push(s)
    if (picks.length >= limit) break
  }
  return picks
}
