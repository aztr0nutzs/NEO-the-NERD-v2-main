# Prankstar Protocol — Prank Messages & Playable-Only Sound Library

## Phase summary

This phase ships the **NEO Mischief Messages** module and finalizes the Sound
Library around the audio assets that actually exist on disk today. Missing
catalog entries are explicitly deferred; the user-facing library no longer
exposes unplayable rows.

## Sound Library finalization

- Added a build-time playable manifest (`lib/prankstar/playableSoundIds.generated.json`)
  emitted by `scripts/validate-prankstar-assets.cjs`.
- `lib/prankstar/soundCatalog.ts` now exposes `PRANKSTAR_SOUNDS` as the playable
  subset (`PRANKSTAR_ALL_CATALOG` retains the full normalized catalog for
  diagnostics). `PRANKSTAR_CATALOG_DIAGNOSTICS` gained `totalPlayable` and
  `totalDeferred` counters.
- Category counts, search, favorites, recents, Random Safe Sound, and the
  landing-page featured preview all derive from the playable subset
  automatically.
- The store filters stale favorite/recent IDs through `isPlayableSoundId` at
  hydration, so persisted entries that no longer resolve to a file are dropped
  silently instead of producing tap-to-error rows.
- Validator no longer fails the build on missing assets — the asset gap is a
  known deferred state, not an error condition.
- Library and landing screens display the playable count up front and surface
  the deferred count as a quiet `+N DEFERRED` note rather than dominating the
  UI.

Current playable state (from the most recent validator run):

- 195 playable sounds across 5 categories (`animal`, `cartoon`, `funny`,
  `voice`, `voices_fighter`).
- 175 catalog entries deferred (assets pending) — kept in the source catalog
  for future asset drops.
- 4 quarantined files under `_unmatched/` remain deferred for a later
  classification pass.

## Prank Messages feature

- Screen: `components/screens/prank-messages-screen.tsx` (route `prankMessages`).
- Data + generator: `lib/prankstar/prankMessages.ts` — deterministic template
  engine, fully local, no provider/AI dependency.
- 6 categories: Absurd System Alert, Dramatic Announcement, Sarcastic
  Comeback, Motivational Nonsense, Fake Warning, Playful Roast.
- 5 tones: Mild / Goofy / Chaotic / Dramatic / Savage Lite, each with its own
  template set per category.
- Slot-based phrasing pools (`{noun}`, `{weirdNoun}`, `{verb}`, `{adj}`,
  `{number}`, `{duration}`) keep each tap fresh; the engine biases away from
  templates the user just saw in the same category.
- Personality seasoning toggle adds a short prefix/suffix nodding to the
  active NEO personality (e.g. Sarcastic Sidekick → `…obviously.`, Hype Bot →
  `LET'S GO — `, Detective → `Case file note: `). Disabled = clean output.
- Result actions: **Regenerate**, **Copy**, **Share** (Web Share API where
  available, clipboard fallback), **Save/Unsave favorite**, **Speak via NEO**.
- Speak path uses the existing NEO voice runtime (`previewVoice` with the
  current `voiceId`, `voiceProfileToParams`, and the user's
  `voiceQualityPreference`). Intent is fixed to `humorous-aside`. Tapping the
  speak button while speaking stops playback via `stopVoicePreview`.
- Persistence: `prankMessageHistory` (up to 50 entries) and
  `prankMessageFavorites` (up to 80) are stored alongside other NEO state in
  the existing persistence schema. Both survive reloads and are wiped by
  `resetApp` / restored by `importSettings`.
- History tab lists recently generated messages; tapping a row restores it
  into the result panel. Each row has its own favorite + remove action.
  Favorites tab lists pinned messages. Clear-history button resets history.

## Landing-page updates

- `components/screens/prank-screen.tsx`: the Prank Messages module card is now
  `LIVE` and navigates to `prankMessages`. Header copy and stats updated:
  `PLAYABLE` count replaces the old `CATALOG` figure, `MODULES` reads `02`,
  and a quiet `+N CATALOG ENTRIES DEFERRED` note appears when deferred entries
  exist. The full-library button label reads `OPEN_FULL_LIBRARY · N SOUNDS`
  using the playable count.

## Files touched

- `scripts/validate-prankstar-assets.cjs` — writes playable manifest, no
  longer exits non-zero on deferred entries.
- `lib/prankstar/soundCatalog.ts` — playable filtering, new diagnostics.
- `lib/prankstar/playableSoundIds.generated.json` — generated manifest (new).
- `lib/prankstar/prankMessages.ts` — Prank Messages domain + generator (new).
- `lib/types.ts` — adds `prankMessages` screen id, `PrankMessageRecord`,
  persistence fields.
- `lib/store.tsx` — playable-aware hydration of favorites/recents, full
  Prank Messages state + actions + persistence + reset/import wiring.
- `components/app-shell.tsx` — registers the new screen.
- `components/screens/prank-screen.tsx` — Prank Messages module card live,
  playable-aware counts, deferred-aware copy.
- `components/screens/prank-library-screen.tsx` — playable wording in header,
  removed "row errors" footer line.
- `components/screens/prank-messages-screen.tsx` — full Prank Messages UI (new).
- `docs/PRANKSTAR_PRANK_MESSAGES_COMPLETION_REPORT.md` — this report (new).

## Verification

- `npm run typecheck` ✓
- `npm run lint` ✓
- `npm run build` ✓ (Next 16.2.6, Capacitor web export prepared).
- Validator: `node scripts/validate-prankstar-assets.cjs` regenerates the
  playable manifest. Exit code 0 in deferred-asset state.
- Interactive runtime testing was not performed in this pass — Sound
  Library + Prank Messages should be exercised manually before release.

## Deferred (explicitly not in this phase)

- Timer Traps
- Sound Forge
- Full Randomizer / Chaos Mode
- Sourcing or recreating the 175 missing audio assets
- Classifying the 4 `_unmatched/` files
- Response Vault deep integration for Prank Messages (local favorites/history
  ship in this phase; a future pass can bridge favorites into the Vault if
  desired).
