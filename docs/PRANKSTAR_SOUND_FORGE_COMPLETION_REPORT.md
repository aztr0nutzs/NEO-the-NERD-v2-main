# Prankstar Protocol — Sound Forge

## Feature name

Shipping label: **Sound Forge**. Used consistently across the UI
(`SOUND_FORGE` header, landing-card label, screen route, engine module
name) and matches the long-standing Prankstar landing-screen
placeholder that this drop replaces.

## Scope implemented (v1)

- Pick from currently playable Prankstar sounds (search + category
  filter), with the same playable-only guarantee that the rest of the
  Prankstar subsystem already enforces.
- Build an ordered draft sequence of **2–8 steps**.
- Per-step preset-driven gap (`0s`, `0.3s`, `0.6s`, `1.0s`, `2.0s`,
  `4.0s`) inserted after each non-final step.
- Reorder steps with explicit up/down controls (no drag-and-drop —
  safer on touch, deterministic for keyboard / a11y).
- Remove individual steps.
- Live duration estimate built from real sound `durationMs` plus the
  configured inter-step gaps.
- Preview the draft sequence through `prankAudioRuntime` with active
  step highlighting and a STOP button that tears down audio and any
  pending gap timer.
- Name and save the draft as a `SoundForgeSequence` (cap: 40 saved
  sequences).
- Load a saved sequence back into the editor for further edits.
- Replay a saved sequence directly from the saved-sequences panel
  (records `lastPlayedAt`).
- Duplicate a saved sequence.
- Favorite / pin a saved sequence.
- Delete a saved sequence.
- Recoverable warning on saved sequences whose steps reference a sound
  that is no longer playable (e.g., asset file removed between
  sessions).

### Explicitly deferred

These are intentionally **not** implemented in this version, and the
UI is honest about that:

- Waveform editing.
- Clip trimming.
- Pitch / speed / volume envelopes.
- Microphone recording.
- AI-generated audio.
- Export / render-to-file. The runtime-truth banner on the screen
  states "Sound Forge composes existing playable Prankstar sounds…
  it does NOT generate new audio files or render to an exportable
  file."
- Using a saved sequence as a Timer Traps payload — Timer Traps'
  current runtime supports a single sound / random-safe-sound /
  spoken-message, so plumbing sequences through `prankTrapsManager`
  would require widening the trap kind / scheduler. Deferred to keep
  the surface area honest.
- Using a saved sequence as a Chaos Console payload — Chaos Sequence
  already generates its own randomized step list; reusing a Sound
  Forge sequence would conflict with that contract. Deferred.

## Files inspected

- `components/screens/prank-screen.tsx`
- `components/screens/prank-library-screen.tsx`
- `components/screens/prank-messages-screen.tsx`
- `components/screens/prank-traps-screen.tsx`
- `components/screens/prank-chaos-screen.tsx`
- `lib/prankstar/soundCatalog.ts`
- `lib/prankstar/prankAudioRuntime.ts`
- `lib/prankstar/prankMessages.ts`
- `lib/prankstar/prankTraps.ts`
- `lib/prankstar/chaosRandomizer.ts`
- `lib/prankstar/useChaosRandomizer.ts`
- `lib/store.tsx`
- `lib/types.ts`
- `components/app-shell.tsx`
- `components/neon-panel.tsx`
- `prankstar_source_kit/` (no pre-existing Sound Forge reference; the
  kit ships Home/Library screens only)

## Files created / changed

- A `lib/prankstar/soundForge.ts` — domain helpers, `SoundForgeManager`
  singleton, validation, normalization, and constants.
- A `lib/prankstar/useSoundForge.ts` — subscription hook.
- A `components/screens/prank-sound-forge-screen.tsx` — Sound Forge
  screen UI.
- A `docs/PRANKSTAR_SOUND_FORGE_COMPLETION_REPORT.md` — this report.
- M `lib/types.ts` — `SoundForgeStep`, `SoundForgeSequence`,
  `SoundForgePlaybackStatus`, `SoundForgeIntent`,
  `prankSoundForgeSequences` persistence field, `prankSoundForge`
  screen id.
- M `lib/store.tsx` — saved-sequence state, save / delete / duplicate
  / favorite / mark-played callbacks, intent state, hydrate / reset /
  import wiring.
- M `components/app-shell.tsx` — registers `prankSoundForge` in
  `SCREEN_MAP`.
- M `components/screens/prank-screen.tsx` — Sound Forge module card
  flipped to `LIVE`, `MODULES` stat bumped from `04` to `05`,
  briefing and footer copy updated to reflect all five Prankstar
  modules being live.
- M `components/screens/prank-library-screen.tsx` — adds an "Add to
  Sound Forge" shortcut button per sound row, alongside the existing
  Timer-Trap shortcut.

## Domain model

```ts
interface SoundForgeStep {
  id: string
  soundId: string
  soundName: string
  category: string
  delayAfterMs: number // gap inserted AFTER this step (ignored on last)
  note?: string
}

interface SoundForgeSequence {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  steps: SoundForgeStep[]
  estimatedDurationMs?: number
  favorite?: boolean
  lastPlayedAt?: number
}

type SoundForgePlaybackStatus =
  | "idle"
  | "previewing"
  | "stopped"
  | "complete"
  | "failed"

interface SoundForgeIntent {
  soundId?: string         // pre-add a sound to the draft
  loadSequenceId?: string  // open the editor on a saved sequence
}
```

Constants exported from `soundForge.ts`:

- `SOUND_FORGE_MIN_STEPS = 2`
- `SOUND_FORGE_MAX_STEPS = 8`
- `SOUND_FORGE_MIN_GAP_MS = 0`
- `SOUND_FORGE_MAX_GAP_MS = 10_000`
- `SOUND_FORGE_DEFAULT_GAP_MS = 600`
- `SOUND_FORGE_SEQUENCES_CAP = 40`
- `SOUND_FORGE_NAME_MAX_LENGTH = 60`
- `SOUND_FORGE_GAP_PRESETS = [0, 300, 600, 1000, 2000, 4000]`

## Playback manager

`SoundForgeManager` is a module-level singleton (mirrors the
`prankTrapsManager` / `chaosManager` pattern) with this contract:

- `getState()` / `subscribe(listener)` — `SoundForgePreviewState`
  snapshots: `{ status, sequenceId, activeStepIndex, activeStepId,
  totalSteps, startedAt, error }`.
- `preview(sequence)` — runs steps sequentially through
  `prankAudioRuntime.play` and waits for each sound to settle via
  `prankAudioRuntime.subscribe(state)` (resolves when `currentSoundId`
  moves off the target, or status flips to `idle` / `error`). After
  each non-final step it waits for the configured gap, observing the
  cancel flag at every boundary so a STOP exits promptly. Concurrent
  `preview` calls while one is already running are rejected (caller
  must `stop()` first).
- `stop()` — flips `cancelRequested`, clears the pending gap timer,
  drops the active-sequence id, and calls `prankAudioRuntime.stop()`
  so any audio currently playing is torn down. The preview loop then
  settles itself as `stopped` at its next boundary check.
- `reset()` — calls `stop()` and resets the public state back to the
  idle snapshot.
- `validateSequenceSteps(steps)` — exported helper that enforces step
  count bounds and reports `missingStepIds` for steps whose
  `soundId` is not in the playable catalog. Used both by the screen
  (to gate Preview / Save / per-row warnings) and by the manager
  itself (to short-circuit a preview that would fail mid-run).
- `normalizeStoredSequences(raw)` — sanitises persisted sequences on
  hydrate: drops malformed entries, defaults missing fields, clamps
  gaps, recomputes `estimatedDurationMs`, and applies the
  `SOUND_FORGE_SEQUENCES_CAP`.

The manager owns its inter-step timer rather than relying on the
screen's `useEffect` lifecycle, so the preview is not torn down by a
re-render and STOP is responsive even if React is mid-transition.

## Sound Forge screen UX

`components/screens/prank-sound-forge-screen.tsx` (route
`prankSoundForge`).

- **Header + back-to-Prankstar control** that also calls
  `soundForgeManager.stop()` + `prankAudioRuntime.stop()` so leaving
  the screen never leaves audio playing.
- **Runtime-truth banner** explicitly states Sound Forge composes
  existing sounds and does not generate or export audio.
- **Sound picker** panel — search input, horizontally scrolling
  category chips, scrollable result list of playable sounds with a
  per-row PREVIEW button (one-shot via `prankAudioRuntime`) and an
  ADD button that pushes a draft step. ADD is disabled when the
  draft has hit `SOUND_FORGE_MAX_STEPS`. Long lists are capped at 60
  visible rows with a hint to refine the search.
- **Sequence builder** panel — ordered step list. Each row shows step
  number, category badge, sound name, per-step gap preset row, and
  three controls (up arrow, down arrow, remove). The active step
  during preview gets a green accent and `ACTIVE` badge. Steps whose
  sound is no longer playable get an orange accent, `MISSING` badge,
  and an alert icon.
- **Preview / Stop controls.** PREVIEW is disabled until the draft
  satisfies `validateSequenceSteps` and there is no preview running.
  STOP is disabled unless a preview is running. A status strip below
  the buttons reads e.g. `STATUS · PREVIEWING · STEP 2/4`, and
  surfaces preview errors when `status === "failed"`.
- **Name input + SAVE / UPDATE + NEW_DRAFT.** Save validates name
  presence, name length, sequence step count, and refuses
  case-insensitive duplicate names against other saved sequences. If
  the draft was loaded from a saved sequence, the button reads
  `UPDATE` and writes back to that sequence id.
- **Saved sequences** panel — per-row name, favorite star, step count
  + duration + missing-step count + last-played date, PLAY / LOAD /
  COPY / DELETE actions, missing-sound warning banner where relevant.
  PLAY is disabled when the sequence has missing steps. Pin/favorite
  is a one-click toggle.
- Visual identity reuses existing NEO neon styling (`NeonPanel` with
  `green` accent for the sequence panel, `cyan` for the sound picker,
  `purple` for saved sequences, `orange` for the truth banner) so
  the screen sits inside the existing Prankstar visual language
  without redesigning anything.

## Sequence validation / save / replay behavior

- **Validate**: `validateSequenceSteps` returns `{ ok, reason,
  missingStepIds }` and is consulted by the editor to gate Preview /
  Save, by saved-sequence rows to gate PLAY, and by the manager to
  short-circuit invalid preview calls. The same helper guards both
  the editor and the saved-sequences panel so the rules can never
  drift.
- **Save**:
  - Trimmed name required, max length `SOUND_FORGE_NAME_MAX_LENGTH`.
  - Step count must be inside `[SOUND_FORGE_MIN_STEPS,
    SOUND_FORGE_MAX_STEPS]`.
  - No duplicate-name conflict against other saved sequences
    (case-insensitive).
  - Saving an in-edit sequence preserves its id, `createdAt`, and
    `favorite` flag; bumps `updatedAt`; refreshes
    `estimatedDurationMs`.
  - Save action surfaces a success notice and switches the button
    from `SAVE` to `UPDATE` on subsequent edits.
- **Replay**: PLAY on a saved row calls `markSoundForgeSequencePlayed`
  (stamps `lastPlayedAt`) then `soundForgeManager.preview(sequence)`.
  PLAY is disabled when the sequence has any missing steps so we
  never start a preview that would fail.

## Persistence behavior

- New persisted field `prankSoundForgeSequences: SoundForgeSequence[]`
  on `PersistedAppState`.
- Saved on every state change through the existing `buildPersistedState`
  + `writeStoredState` pipeline.
- Hydrated on app boot via `applyPersistedState`, which runs the raw
  array through `normalizeStoredSequences` so malformed or stale data
  cannot crash the editor.
- `importSettings` round-trips `prankSoundForgeSequences` through the
  existing import path, falling back to the in-memory value if the
  imported payload omits the field.
- `resetApp` calls `soundForgeManager.reset()` and clears the saved
  sequences + intent.
- The in-flight preview state on `SoundForgeManager` is **not**
  persisted — closed-app sequence playback is not supported in this
  build and silently resuming a stale preview at boot would be
  dishonest.
- When a saved sequence references a sound that later becomes
  unavailable (e.g., asset removal between releases), the sequence
  itself is preserved on hydrate; the screen surfaces a recoverable
  warning and disables PLAY until the user loads it and fixes the
  step list.

## Error handling

- Empty draft → empty-state copy in the sequence panel ("ADD AT LEAST
  2 SOUNDS FROM THE PICKER ABOVE.").
- Too few steps to save / preview → `validateSequenceSteps` returns
  `Add at least 2 steps.`, surfaced under the action buttons; PREVIEW
  and SAVE remain disabled until the draft is valid.
- Cap hit (8 steps) → ADD button on picker rows disables and a notice
  explains the cap.
- Empty / no-result picker filter → dedicated empty state with a
  `RESET_FILTERS` shortcut.
- Preview failure → manager settles as `failed` and the screen surfaces
  the error string in the status strip.
- Missing sound assets on a saved sequence → orange warning banner on
  the row, PLAY disabled, MISSING badge on the relevant step when the
  sequence is loaded into the editor.
- Duplicate save name → save is blocked with an explanatory notice;
  draft remains in editor for user to rename.
- Navigation away from the screen → cleanup effect calls
  `soundForgeManager.stop()` and `prankAudioRuntime.stop()` so no
  audio leaks into the next screen.

## Cross-module integrations

- **Sound Library → Sound Forge** (implemented). Each sound row in
  `prank-library-screen.tsx` now exposes a green hammer button that
  sets a `SoundForgeIntent { soundId }` and navigates to
  `prankSoundForge`. The Sound Forge screen consumes the intent on
  mount and appends the sound to the current draft (respecting the
  step cap), then clears the intent.
- **Sound Forge → Timer Traps** (deferred). Timer Traps' current
  runtime fires a single sound / random-safe-sound / spoken-message;
  it does not yet support sequence payloads. Plumbing this through
  would require widening `PrankTrapKind`, `CreatePrankTrapInput`, and
  the trap firing path. Out of scope for this drop.
- **Sound Forge → Chaos Console** (deferred). Chaos Sequence already
  generates its own randomized step list; reusing a saved Sound Forge
  sequence would conflict with the Chaos engine's intensity / pool
  contract. Deferred.

## Verification

- `npm ci` ✓
- `npm run typecheck` ✓
- `npm run lint` ✓
- `npm run build` ✓ (Next 16.2.6 Turbopack, Capacitor `out/`
  prepared)
- `npx cap sync android` ✓
- Interactive runtime testing was not performed in this pass — the
  remote execution environment has no UI surface; build / type / lint
  receipts above are the verification.

## Recommended next Prankstar refinement phase

- **Timer Traps sequence payloads** — extend `PrankTrapKind` with a
  `sound-sequence` variant that takes a `SoundForgeSequence` id (or
  inline copy) so a user can schedule a built sequence to fire after a
  delay. Natural follow-up to this drop and the only remaining
  cross-module gap.
- **Sound Forge step notes** — the data model already reserves an
  optional `note` field; a small editor refinement could surface it
  in the UI for users to label setup vs payoff steps in long
  sequences.
- **Optional drag-and-drop reorder** — the current up/down arrows are
  accessible and reliable; drag-and-drop is a polish add for desktop
  usage and could ship behind the existing pointer-aware patterns.
