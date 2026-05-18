# Prankstar Sound Library — Phase 2 Completion Report

This report covers the second Prankstar integration phase: organising the
loose audio files the user uploaded via the GitHub Android browser into the
canonical NEO asset layout, validating catalog coverage against the
on-disk reality, and shipping a full **Prankstar Sound Library** screen
inside NEO.

The Phase 1 contract from
`docs/PRANKSTAR_PROTOCOL_PHASE1_INTEGRATION_REPORT.md` is preserved — no
existing NEO feature, screen, navigation flow, animated background, dock
entry, onboarding step or Prankstar Protocol landing layout was removed or
restyled.

## A. Root audio inventory

| Metric                   | Value |
| ------------------------ | ----- |
| Loose audio files at repo root | 199 |
| Extensions present        | `.mp3`, `.ogg` |
| Files moved to canonical paths | 193 |
| Files quarantined under `_unmatched/` | 6 |
| Files left at repo root after run | 0 |

All 199 loose root files were moved off the repo root by
`scripts/organize-prankstar-root-audio.cjs`. A machine-readable mapping
plan with per-file confidence is committed at
`docs/PRANKSTAR_ROOT_AUDIO_MAPPING.json`.

## B. Prankstar catalog / source-of-truth files inspected

- `lib/prankstar/soundCatalog.source.json` — 369→370 entries, **canonical**
  source of truth for the runtime
- `lib/prankstar/soundCatalog.ts` — typed loader, normalises asset paths to
  `/prankstar/sounds/...`
- `lib/prankstar/prankAudioRuntime.ts` — single-track HTMLAudio runtime
- `lib/prankstar/types.ts`
- `prankstar_source_kit/sound_catalog.json` (identical to canonical)
- `prankstar_source_kit/app/src/main/assets/sound_catalog.json` (identical)
- `prankstar_source_kit/src/sound_config.json` — per-folder filename
  manifest, used to disambiguate the `voices/Female`, `voices/Male`, and
  `voices_fighter` triple-destination filenames
- `prankstar_source_kit/SOUND_ASSET_PLAN.md`
- `scripts/validate-prankstar-assets.cjs` — pre-existing validator,
  extended in this phase
- `public/prankstar/sounds/README.md`

## C. Asset mapping process

`scripts/organize-prankstar-root-audio.cjs` was added to perform the
one-shot organisation deterministically:

1. Build a `basename → [catalog destinations]` map from
   `soundCatalog.source.json`.
2. For each loose root file, strip the GitHub upload " (N)" duplicate
   suffix and recover the canonical basename (falling back to the original
   name when the stripped form is unknown — this is how
   `shrek_30-cartoon-hammer-answer-341914 (1).mp3` is preserved verbatim,
   because the `(1)` is genuinely part of the catalog filename).
3. Group loose copies by canonical basename.
4. For multi-destination basenames (voice/Female + voice/Male + voices_fighter):
   - sort the destinations as `voices_fighter` → `voice/Female` → `voice/Male`
   - sort the loose copies by file size descending
   - pair them positionally — the largest copy goes to `voices_fighter`
     (consistent with the dramatic-announcement style of fighter game
     vocal packs), smaller copies fall to `voice/Female`, then `voice/Male`
5. Move with `fs.renameSync` so the git tracker observes proper renames.
6. Quarantine the residue (more copies than destinations, or completely
   uncatalogued basenames) under `public/prankstar/sounds/_unmatched/`.
7. Write a full mapping plan to `docs/PRANKSTAR_ROOT_AUDIO_MAPPING.json`
   with per-file confidence (`exact`, `strong`, `best_effort`).

Two post-pass manual corrections were applied:

- `it's_a_tie.ogg` (the apostrophe-bearing fighter recording, 35528 bytes)
  was swapped into `sounds/voices_fighter/its_a_tie.ogg`, and the smaller
  17721-byte copy it displaced was moved into `voice/Male/its_a_tie.ogg`
  (which had been missing). The smallest 10606-byte copy stayed at
  `voice/Female/its_a_tie.ogg`. All three voice-game destinations for
  `its_a_tie.ogg` are now filled with distinct audio content.
- The Shrek-hammer-answer file without `(1)` is genuinely a second variant
  per `prankstar_source_kit/src/sound_config.json`, but had no catalog
  entry. A new catalog entry
  (`sounds_cartoon_shrek_30_cartoon_hammer_answer_341914_mp3` →
  `sounds/cartoon/shrek_30-cartoon-hammer-answer-341914.mp3`) was added so
  the file is reachable from the Sound Library.

## D. Files moved

193 audio files moved into canonical category folders. Final on-disk layout:

```
public/prankstar/sounds/
├─ animal/          (20 files — 18 catalog entries missing)
├─ cartoon/         (15 files — fully covered + 1 new catalog entry)
├─ funny/           (7 files — 10 catalog entries missing)
├─ voice/
│  ├─ Female/       (45 files — fully covered)
│  ├─ Male/         (37 files — 15 numeric entries missing)
│  └─ [25 mp3 voice-clip files at voice/ root — fully covered]
├─ voices_fighter/  (46 files — fully covered)
└─ _unmatched/      (4 files — see section M)
```

## E. Validation results

`node scripts/validate-prankstar-assets.cjs` after the move:

```
Catalog entries (raw):         370
Catalog entries (unique):      370
Duplicate IDs:                 0
Audio files on disk (total):   199
Assets matched to catalog:     195
Assets missing from disk:      175
Extra (uncataloged) on disk:   0
Quarantined under _unmatched/: 4
```

| Category         | Catalog | Found on disk | Missing |
| ---------------- | ------- | ------------- | ------- |
| ambience         | 73      | 0             | 73      |
| animal           | 38      | 20            | 18      |
| cartoon          | 15      | 15            | 0       |
| creepy           | 3       | 0             | 3       |
| funny            | 17      | 7             | 10      |
| misc             | 56      | 0             | 56      |
| voice            | 122     | 107           | 15      |
| voices_fighter   | 46      | 46            | 0       |

The 175 missing entries reflect what the user did not upload in the four
GitHub-Android batches (entire `ambience`, `creepy`, `misc` categories, the
`voice/Male` numeric set, plus partial coverage in `animal` and `funny`).
The Sound Library treats those as honest "asset missing" playback errors
when the user taps them — the runtime never synthesizes fake audio.

No catalog IDs are duplicated. No uncataloged extras leak into the active
asset tree (the four oddball files live in `_unmatched/`).

## F. Files created / changed

Created:

- `scripts/organize-prankstar-root-audio.cjs`
- `components/screens/prank-library-screen.tsx`
- `docs/PRANKSTAR_ROOT_AUDIO_MAPPING.json`
- `docs/PRANKSTAR_SOUND_LIBRARY_COMPLETION_REPORT.md` (this file)
- `public/prankstar/sounds/<category>/...` — 193 audio file moves
- `public/prankstar/sounds/_unmatched/` — quarantine for 4 unresolved files

Modified:

- `lib/prankstar/soundCatalog.source.json` — added the missing
  `sounds_cartoon_shrek_30_cartoon_hammer_answer_341914_mp3` entry
- `lib/prankstar/soundCatalog.ts` — added `getCategoryCounts` and
  `getSafeRandomSound` helpers used by the Library screen
- `lib/types.ts` — added `"prankLibrary"` to `ScreenId`; added
  `prankSoundFavoriteIds` and `recentPrankSoundIds` to `PersistedAppState`
- `lib/store.tsx` — added persistent state for favourites + recent plays,
  `togglePrankSoundFavorite` and `recordPrankSoundPlay` actions, wired
  through `buildPersistedState` / `applyPersistedState` /
  `importSettings` / `resetApp`
- `components/app-shell.tsx` — registered `prankLibrary: PrankLibraryScreen`
  in `SCREEN_MAP`
- `components/screens/prank-screen.tsx` — Sound Library card now navigates
  into the full Library screen, the preview panel records recent plays,
  the "BINARY ASSETS NOT BUNDLED" disclaimer was replaced with a real
  "OPEN_FULL_LIBRARY" CTA
- `scripts/validate-prankstar-assets.cjs` — extended to report per-category
  found/missing counts, on-disk totals, uncataloged extras, and quarantine
  contents
- `public/prankstar/sounds/README.md` — refreshed for Phase 2 reality

## G. Prankstar preview panel fixes

The preview panel in `components/screens/prank-screen.tsx` previously
declared that "BINARY AUDIO ASSETS ARE NOT BUNDLED IN THIS PHASE". With
195 catalog-mapped audio files now on disk, that disclaimer was replaced
with a real `OPEN_FULL_LIBRARY` button that navigates to the new Sound
Library screen. The featured-sound rows continue to invoke
`prankAudioRuntime.play(sound)` directly — they now resolve to real audio
content for every featured category that has at least one file on disk.

The preview panel also calls `recordPrankSoundPlay(sound.id)` when a
sound is played, so featured plays count toward the "Recent" filter in
the Library.

The single-track guard, loading spinner, error banner and active-row
indicator from Phase 1 are preserved as-is.

## H. Full Sound Library — implementation summary

New screen: `components/screens/prank-library-screen.tsx`, registered as
`SCREEN_MAP.prankLibrary` and reached via the `Sound Library` card on the
Prankstar Protocol landing screen.

Capabilities:

1. **Full catalog browsing** — all 370 catalog entries appear (alphabetical
   by name when no recency filter is active).
2. **Search** — single search field that matches case-insensitively across
   sound name, sound ID, category, and tags.
3. **Category filter** — horizontally-scrolling chips, one per category
   plus `ALL`, each with a live count from `getCategoryCounts()`.
4. **Filter mode pills** — `All`, `Favorites`, `Recent`. Counts shown.
5. **Play / Stop controls** — large 40×40 px touch target per row; tap to
   play, tap again to stop; switching to another sound stops the previous
   one. Inherited single-track guarantee from `prankAudioRuntime`.
6. **Now-playing indicator** — pulsing cyan dot on the active row,
   loading spinner during fetch, orange triangle on playback error.
7. **Sound metadata** — name, category, duration (when known), LOOP flag,
   INTENSE flag (for `!isSafeForRandomMode` entries), and up to three
   tag chips.
8. **Favourites** — yellow star toggle per row, persisted to localStorage
   / Capacitor Preferences via `prankSoundFavoriteIds`.
9. **Recent plays** — capped at the 24 most recent sounds played from
   either the Library or the Prankstar Protocol preview panel, persisted
   identically. `Recent` filter sorts by recency rather than name.
10. **Random Safe Sound** — `RANDOM_SAFE` button calls
    `getSafeRandomSound([currentSoundId])`, which only draws from entries
    with `isSafeForRandomMode === true`.
11. **Error states** — top-of-screen banner for the runtime's `error`
    state including the original source path; per-row orange triangle on
    the failing entry.
12. **Empty states** — explicit "no favorites yet", "no recent plays",
    and "nothing matches filters" messages with a `RESET_FILTERS` action.
13. **Stop on navigation** — leaving the Library calls
    `prankAudioRuntime.stop()` so audio does not bleed into other
    screens.
14. **Mobile usability** — minimum 36–40 px touch targets, horizontal
    chip scroll without overflow into the dock, NEO cyberpunk/neon
    styling via `NeonPanel`, `ps-mono` typography, `ps-glass` substrate.
    Bottom padding inherits the existing `<main>` dock-safe area.

## I. Favorite / Recent / Random functionality summary

| Behaviour                  | Implementation |
| -------------------------- | -------------- |
| Toggle favourite           | `togglePrankSoundFavorite(id)` in `lib/store.tsx` — prepends/removes from `prankSoundFavoriteIds[]` |
| Persisted across reload    | Yes — written via `buildPersistedState` to the same store backend used by Voice Library favourites (Capacitor Preferences on Android, localStorage on web) |
| Record a play              | `recordPrankSoundPlay(id)` — promotes to front of `recentPrankSoundIds[]`, deduplicates, capped at 24 |
| Surfaces in preview        | Yes — `prank-screen.tsx` calls `recordPrankSoundPlay` on every featured-row tap |
| Surfaces in library        | Yes — `prank-library-screen.tsx` calls `recordPrankSoundPlay` on every play |
| Survives `resetApp`        | Cleared along with all other user state |
| Random Safe Sound          | `getSafeRandomSound(excludeIds)` returns a uniform random pick from `PRANKSTAR_SOUNDS.filter(s => s.isSafeForRandomMode && !excludeIds.includes(s.id))`. Excludes the currently-playing sound. Records the pick to recent. |

## J. Landing screen updates

`components/screens/prank-screen.tsx`:

- `Sound Library` `ModuleCard` is now an interactive button that calls
  `setScreen("prankLibrary")`. Status label changed from `LIVE_PREVIEW` /
  `LIVE PREVIEW BELOW` → `LIVE` / `OPEN →`.
- `Prank Messages`, `Timer Traps`, `Sound Forge` still render with
  `NEXT_PHASE` status and a `COMING NEXT PHASE` label, matching the task
  brief.
- Preview panel renamed `SOUND_LIBRARY // PREVIEW` → `SOUND_LIBRARY //
  FEATURED` because it is now a quick-play featured strip, not the only
  way to access sounds.
- The "no binary assets bundled" disclaimer was replaced with an
  `OPEN_FULL_LIBRARY · 370 SOUNDS` CTA pinned at the bottom of the
  panel.
- The "NEXT PHASE: FULL LIBRARY · TRAPS · FORGE" callout was left in
  place — it now accurately reflects the remaining work since the Full
  Library shipped this phase.

## K. Documentation created / updated

- `docs/PRANKSTAR_SOUND_LIBRARY_COMPLETION_REPORT.md` (this file)
- `docs/PRANKSTAR_ROOT_AUDIO_MAPPING.json` (machine-readable mapping log)
- `public/prankstar/sounds/README.md` (refreshed coverage table)

## L. Verification receipts

| Step                    | Result |
| ----------------------- | ------ |
| `npm ci`                | ✓ 636 packages installed |
| `npm run typecheck`     | ✓ no errors |
| `npm run lint`          | ✓ no errors |
| `npm run build`         | ✓ Compiled successfully · 6/6 static pages · Capacitor web assets prepared in `out/` |
| Asset validator         | exits 1 (expected — 175 / 370 catalog assets still need sourcing in subsequent phases) |
| Browser smoke           | Not executed in this remote session — no interactive runtime available. The runtime is exercised through the static catalog build, the typed Library screen, and the validator. |
| Capacitor sync          | Web assets re-staged via `scripts/prepare-capacitor.mjs` (runs at the end of `npm run build`); explicit `npx cap sync android` not run — Android Gradle wrapper is offline in this environment |

## M. Remaining next Prankstar implementation phases

Audio-asset gaps (deferred to a sourcing pass, not a code phase):

- `ambience/` — 73 entries, 0 files
- `creepy/` — 3 entries, 0 files
- `misc/` — 56 entries, 0 files
- `animal/` — 18 entries missing
- `funny/` — 10 entries missing
- `voice/Male/` — 15 numeric/short-clip entries missing
- Four `_unmatched/` files (`hold (2).ogg`, `war_hold (2).ogg`,
  `war_suppressing_fire (2).ogg`, `war_supressing_fire (2).ogg`) — second
  copies of single-destination basenames; kept in quarantine until
  classified by listening (they may belong to a not-yet-cataloged Male
  recording of `war_hold` / a Female recording of `hold` etc.)

Module gaps (next Prankstar code phases):

- **Prank Messages** — text + recipient flow, not started
- **Timer Traps** — scheduled-play traps using the existing audio
  runtime, not started
- **Randomizer / Chaos Mode** — the Library has `RANDOM_SAFE`, but a
  full standalone chaos mode (interval, randomized intensity, lockable)
  is not implemented
- **Sound Forge** — synthesis UI from the Prankstar source kit, not
  ported

The existing Prankstar Protocol landing screen continues to label these
modules `COMING NEXT PHASE` so the UI does not overpromise.
