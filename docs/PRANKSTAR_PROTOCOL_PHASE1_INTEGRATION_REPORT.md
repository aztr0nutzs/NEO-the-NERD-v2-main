# Prankstar Protocol — Phase 1 Integration Report

## Overview

Phase 1 introduces the **Prankstar Protocol** module to NEO the N.E.R.D. as
a clean, modular subsystem. The standalone Prankstar Lab v2 shell
(`App.tsx`, `Navigation`, `TopBar`, `BootScreen`, `SettingsDrawer`, global
CSS) was deliberately **not** merged — only reusable feature logic and
catalog data were extracted into NEO-owned modules.

## A. Source files inspected

From `prankstar_source_kit/`:

- `sound_catalog.json` (369 entries — canonical)
- `app/src/main/assets/sound_catalog.json` (same 369 entries)
- `src/data/sounds.ts` (294 entries — divergent legacy variant; **not** used as
  the source of truth)
- `src/sound_config.json` (folder/filename manifest)
- `src/utils/audio.ts` (HTMLAudio + WebAudio fallback + TTS)
- `src/screens/Home.tsx`, `src/screens/Library.tsx` (reference only — not
  imported)
- `SOUND_ASSET_PLAN.md` (sourcing/format guidance)
- `tools/validate_sound_assets.cjs`, `tools/validate_sound_catalog.py`,
  `tools/validator_v3.cjs`

## B. NEO files created / changed

Created:

- `lib/prankstar/types.ts`
- `lib/prankstar/soundCatalog.source.json` (copy of 369-entry canonical
  catalog)
- `lib/prankstar/soundCatalog.ts` (typed catalog, normalization, selectors)
- `lib/prankstar/prankAudioRuntime.ts` (HTMLAudio runtime + state machine)
- `lib/prankstar/usePrankAudio.ts` (React subscription hook)
- `components/screens/prank-screen.tsx` (Prankstar Protocol landing screen)
- `public/prankstar/sounds/README.md` (asset drop-zone docs)
- `scripts/validate-prankstar-assets.cjs` (asset validator)
- `docs/PRANKSTAR_PROTOCOL_PHASE1_INTEGRATION_REPORT.md` (this file)

Modified:

- `lib/types.ts` — added `"prank"` to `ScreenId`
- `components/app-shell.tsx` — registered `prank: PrankScreen` in `SCREEN_MAP`
- `components/bottom-dock.tsx` — added Prank dock entry + grid bump
  (`sm:grid-cols-10` → `sm:grid-cols-11`)
- `components/screens/main-screen.tsx` — added Mission Control shortcut card
  routing to the Prank Lab
- `tsconfig.json` — excluded `prankstar_source_kit/` from TS
- `eslint.config.mjs` — excluded `prankstar_source_kit/**` from lint

## C. Entry point integration

The Prankstar Protocol screen is reachable two ways without disrupting
existing nav:

1. **Mission Control shortcut card** — a pink `PartyPopper` button card on
   the main screen, placed adjacent to the existing Network shortcut. This
   guarantees discoverability even on narrow phones where the dock
   horizontally scrolls.
2. **Bottom dock entry** — new `Prank` icon slotted between `Library` and
   `Settings`. Dock grid widened from 10 to 11 columns so existing dock
   discoverability behavior is preserved.

No existing dock items were reordered or removed.

## D. Sound catalog port

- Source: `prankstar_source_kit/sound_catalog.json` (369 entries).
- Normalization performed at import (`lib/prankstar/soundCatalog.ts`):
  - `assetPath` rewritten from `sounds/<cat>/<file>` to
    `/prankstar/sounds/<cat>/<file>` (Next.js public route).
  - Original path preserved on each entry as `sourcePath`.
  - Duplicate IDs dropped (none present).
  - Malformed entries skipped (none present).
- Helpers exposed: `getAllSounds`, `getSoundById`, `getCategories`,
  `getSoundsByCategory`, `searchSounds`, `getFeaturedPreviewSounds`.
- Diagnostics surfaced via `PRANKSTAR_CATALOG_DIAGNOSTICS`.

## E. Audio runtime port

`lib/prankstar/prankAudioRuntime.ts` is a clean rewrite of the relevant
parts of `src/utils/audio.ts`. Differences vs. source:

- **No TTS** — Prankstar's source mixed `SpeechSynthesisUtterance` into
  playback. Intentionally removed: this runtime plays asset files only and
  does **not** collide with NEO's voice/TTS subsystem.
- **No WebAudio synth fallback** — the source synthesized fake sounds when
  asset files were missing. That masks broken catalogs; the NEO runtime
  surfaces an honest `error` state instead.
- **Single-track guard** — starting a sound stops any currently-playing
  one; rapid tapping cannot stack overlapping clips.
- **Observable state machine** — `idle | loading | playing | error`, with
  per-state `currentSoundId` + `error` exposed via subscription /
  `usePrankAudio` hook.

## F. Canonical asset path

```
public/prankstar/sounds/<category_folder>/<filename>
```

Served at runtime as `/prankstar/sounds/...`. The directory exists with a
`README.md` documenting the expected layout. All 369 catalog entries
resolve to paths under this prefix.

## G. Preview panel behavior

The `Sound Library Preview` panel on the Prankstar Protocol screen renders
the curated 8-sound featured slice (one safe-for-random sound per category,
ordered as the catalog presents them). Per-row controls:

- **Tap to play** → toggles play/stop for that sound; loading shows spinner.
- **Tap while playing** → stops it.
- **STOP_ALL** button → halts current playback.
- Active row shows pulsing cyan indicator while playing.
- Asset errors are surfaced both in-row (orange triangle icon) and in the
  top-of-panel alert banner with the original `sourcePath` for debugging.

## H. Asset validation counts

Output of `node scripts/validate-prankstar-assets.cjs`:

```
Catalog entries (raw):       369
Catalog entries (unique):    369
Duplicate IDs:               0
Assets found on disk:        0
Assets missing:              369
```

**Found: 0 / Missing: 369** is the expected state for Phase 1 — the binary
audio files were never bundled in the source kit (only the catalog +
manifest). Drop sourced `.mp3`/`.ogg`/`.wav` files into
`public/prankstar/sounds/<category>/` and the counts shift accordingly with
no further code changes required.

## I. Documentation

- `docs/PRANKSTAR_PROTOCOL_PHASE1_INTEGRATION_REPORT.md` (this report)
- `public/prankstar/sounds/README.md` (asset drop-zone instructions)

## J. Verification receipts

| Step          | Result                                                      |
| ------------- | ----------------------------------------------------------- |
| `npm run typecheck` | ✓ no errors                                           |
| `npm run lint`      | ✓ no errors                                           |
| `npm run build`     | ✓ Compiled successfully · static pages 6/6 · Capacitor web assets prepared |
| Asset validator     | exits 1 (expected — 0/369 binaries bundled)           |

Browser/dev smoke test was **not** executed in this session; functional
verification of audio playback requires binary assets to be present on
disk. Catalog import, screen routing, runtime instantiation, build and
typecheck are all verified.

## K. Explicitly deferred to next phase

- **Full Sound Library browser screen** (Prankstar `Library.tsx` was not
  ported).
- **Prank Messages** module.
- **Traps** (timed/scheduled prank scheduler).
- **Sound Forge** synthesizer UI (`forgeSound` from `utils/audio.ts`).
- **Random / shuffle play mode**.
- **Per-pack favorites / packs UI**.
- **Catalog deduplication against the 294-entry `src/data/sounds.ts`
  variant** (whether to merge or pick a winner).
- **Bundling of binary audio assets** under `public/prankstar/sounds/`.
- **Android `assets/` mirror** (if native-asset playback is later desired
  via Capacitor Filesystem instead of web fetch).
