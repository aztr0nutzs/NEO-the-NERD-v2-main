# Prankstar Protocol — Chaos Console

## Feature name

Shipping label: **Chaos Console** (used consistently across the UI, store
state, runtime engine, and persistence schema). Internally the engine
module is `chaosRandomizer.ts` because "randomizer" is the technically
accurate term for the generator; "Chaos Console" is the user-facing
surface where users roll, stage, and execute the randomized actions.

## Feature summary

Adds the fourth Prankstar Protocol module after Sound Library, Prank
Messages, and Timer Traps. Lets the user roll randomized prank actions
that compose the existing NEO subsystems — the playable-only Sound
Library, the local Prank Messages template engine, and NEO's voice
runtime — into single-press chaos moments. Six modes, four intensities,
two pool filters, controlled sequences, real stop/cancel behavior, and
a persisted recent-history slice. All execution is open-app only.

## Modes implemented

- **Random Sound** — one random playable Prankstar sound. Respects the
  pool filter (Playable All / Safe Only).
- **Safe Random** — one curated safe-mode sound (forced to the safe pool
  regardless of pool filter, mirrors Timer Traps' contract).
- **Random Message** — one generated mischief line from the existing
  `generatePrankMessage` template engine. **Text only**: the engine
  stages a `text-message` step that is never routed through the voice
  runtime, and the Chaos Console exposes Copy / Send-to-Prank-Messages
  controls instead of an EXECUTE_NOW playback button.
- **Spoken Message** — random line piped through NEO's voice runtime via
  the same `previewVoice` path that Prank Messages and Timer Traps use.
  This is the distinct audible mode.
- **Sound + Message** — sound first, then NEO speaks the punchline (setup
  → payoff pattern, documented and consistent).
- **Chaos Sequence** — 2–4 alternating sound / spoken-message steps with
  short randomized delays. Length bounded by intensity; sound steps
  wait for actual playback to settle before the next step runs.

## Intensity logic

Intensity gates both the pool of sounds and the tone of generated
messages, and decides whether combos / sequences are allowed at all.

| Intensity | Sound pool       | Message tones                       | Sequence length |
|-----------|------------------|-------------------------------------|-----------------|
| Mild      | Safe-only (forced) | `mild`                            | 2 (clamped up if combo/sequence picked) |
| Goofy     | Pool filter      | `mild`, `goofy`                     | 2               |
| Chaotic   | Pool filter      | `mild`, `goofy`, `chaotic`          | 2–3             |
| Maximum   | Pool filter      | `mild`, `goofy`, `chaotic`, `dramatic`, `savage_lite` | 3–4 |

When a user is on **Mild** but picks a combo or sequence, the engine
silently promotes the recorded intensity to **Goofy** (the action would
otherwise produce a single safe sound, which is identical to picking
"Safe Random" at Mild). The promotion is recorded on the action itself
so history reflects what actually played, not what the picker showed
before the click.

Sequence inter-step delays scale inversely with intensity (Mild ~900–
1500ms gaps, Maximum ~350–800ms gaps) so higher intensities feel more
manic without ever becoming an uncontrolled spammer.

## Randomization engine behavior

`lib/prankstar/chaosRandomizer.ts` is a module-level `ChaosManager`
singleton with:

- `generate(input)` — builds a planned action with status `"ready"` and
  stages it as `current` without executing. Caller can re-roll by
  calling `generate` again.
- `execute({ voiceId, voiceQualityPreference, personalityId })` —
  walks `current.steps` sequentially, transitioning status to
  `"playing"` / `"speaking"` / `"running-sequence"` as appropriate,
  resolving each step before starting the next, and finally calling
  `settle("complete" | "cancelled" | "failed")`.
- `cancel()` — tears down the active sound runtime and voice runtime,
  flips an internal cancel flag, and the execute loop calls
  `settle("cancelled")` itself.
- `subscribe(listener)` — emits `{ current, history }` snapshots.
- `hydrateHistory()` / `clearHistory()` — pipeline hooks for the store.

Random selection uses the existing soundCatalog helpers (`getSoundById`,
`getSafeRandomSound`, and a local intensity-aware filter built on top
of `PRANKSTAR_SOUNDS`). Random messages call `generatePrankMessage` with
a randomly picked category and an intensity-gated tone. No deferred /
missing catalog entries can be selected, because the local filter is
seeded from `PRANKSTAR_SOUNDS` (playable subset) only.

## Available sound pool rules

- `pool: "playable-all"` — any playable sound from the catalog.
- `pool: "safe-only"` — only sounds with `isSafeForRandomMode === true`.
- Intensity `mild` forces safe-only regardless of pool selection.
- The "Safe Random" mode kind forces safe-only regardless of pool
  selection, matching Timer Traps' Random Safe Sound contract.

## Spoken message integration

`spoken-message` and `sound-plus-message` modes (and any speech step
inside a sequence) call `previewVoice` from
`@/lib/voice/voice-runtime` with the active NEO voice profile, the
user's `voiceQualityPreference` (high-quality vs fallback-only), and
the active personality id, with `intent: "humorous-aside"`. This is the
same path Prank Messages and Timer Traps use — no parallel TTS
implementation was created.

`stopVoicePreview()` is wired to `cancel()` so the speech runtime is
torn down even mid-sentence.

## Random Message (text-only) integration

`random-message` is the deliberately text-only counterpart to Spoken
Message. The engine stages a step with `kind: "text-message"`, which is
a first-class member of the `ChaosStep` union. The execute pipeline
short-circuits any action whose steps are all `text-message`: it calls
`settle("complete")` immediately without invoking `previewVoice`,
`prankAudioRuntime`, or any other playback path. A defensive
`text-message` skip is also placed inside the step loop so the voice
runtime can never be reached even if a future change generates a
`text-message` step inside a sequence.

The Chaos Console screen detects text-only actions via
`isChaosActionTextOnly(action)` and renders Random-Message-appropriate
controls — `COPY_MESSAGE` (clipboard) and `SEND_TO_MESSAGES` (commits
the generated line into `prankMessageHistory` via
`addPrankMessageToHistory` and settles the chaos action as `complete`).
The misleading `EXECUTE_NOW` playback button is hidden for this mode.

## Combo / sequence execution rules

- **Combo**: sound first, then spoken message. The sound step waits for
  actual playback to settle (or hits a 12s safety timeout) before the
  speech step starts, so the user hears a real setup → payoff beat
  rather than overlapping audio.
- **Sequence**: 2–4 steps, each independently weighted 60% sound / 40%
  speech (with safe fallbacks). Steps run sequentially with an
  intensity-scaled inter-step delay. Each sound step uses a different
  sound from the pool when possible. The sequence never overlaps audio
  with speech.

## Stop / cancel behavior

A single `STOP_CHAOS` button on the screen calls `chaosManager.cancel()`.
Behavior:

- If a sound is playing, `prankAudioRuntime.stop()` is invoked.
- If a speech step is running, `stopVoicePreview()` is invoked.
- If a sequence is mid-flight, both runtimes are torn down.
- The execute loop observes the cancel flag at each step boundary and
  on resumption from the inter-step delay, then settles the action as
  `"cancelled"` and records the history entry.
- A staged-but-not-executed action (`status: "ready"`) is dropped
  immediately when cancel is pressed.

Navigating back to the Prankstar Protocol landing screen also calls
`cancel()` to avoid an orphaned in-flight action.

## History / persistence behavior

- Per-action `ChaosHistoryEntry { id, kind, intensity, summary, status,
  createdAt, completedAt, error }`. Cap: 25 entries.
- Pushed when an action settles (`complete` / `cancelled` / `failed`).
- Mirrored from the manager into store state via a subscribe effect,
  alongside Timer Traps history, then persisted as
  `prankChaosHistory` inside `PersistedAppState`.
- On hydrate, the store re-seeds the manager via
  `chaosManager.hydrateHistory(stored.prankChaosHistory)` so the
  history list is consistent immediately on load.
- `resetApp()` cancels any in-flight chaos action, clears the manager
  history, and clears the store mirror.
- `importSettings()` round-trips `prankChaosHistory` through the
  existing persistence pipeline.

The currently-staged or in-flight `ChaosAction` is **not** persisted —
closed-app firing is not supported in this build and silently resuming
past actions at boot would replay stale chaos.

## Chaos Console screen UX

`components/screens/prank-chaos-screen.tsx` (route `prankChaos`).

- Header + back-to-Prankstar control.
- Runtime-truth banner explicitly states open-app only; delayed
  execution belongs to Timer Traps.
- **Chaos Mode** grid: 6 cards (icon + label + blurb), pressable.
- **Intensity** pills (Mild / Goofy / Chaotic / Maximum).
- **Sound Pool** pills (Playable All / Safe Only).
- **GENERATE_CHAOS** primary action.
- **STAGED** result panel: shows the chosen kind, intensity, summary,
  and an ordered step list (icon + step kind + payload preview).
- **EXECUTE_NOW** + **STOP_CHAOS** buttons for playback modes (Random
  Sound / Safe Random / Spoken Message / Sound + Message / Chaos
  Sequence). Execute is disabled until a staged action exists with
  `status: "ready"`; Stop is disabled unless a step is actually running.
- **COPY_MESSAGE** + **SEND_TO_MESSAGES** buttons replace the playback
  row when the staged action is text-only (Random Message). A small
  helper banner — *"RANDOM MESSAGE IS TEXT ONLY — NEO WILL NOT SPEAK
  THIS LINE."* — sits under the row so the contract is visible to the
  user. `SEND_TO_MESSAGES` adds the generated line to
  `prankMessageHistory` and settles the chaos action as `complete`.
- **RECENT** panel: capped at 12 visible rows, status icon (check /
  X / alert), short summary, error string when relevant. Clear-history
  control.
- Visual identity reuses existing NEO neon styling (`NeonPanel`, `ps-`
  CSS classes, framer-motion-free static layout — no animations
  introduced that could conflict with the global background scene).

## Landing screen / navigation updates

`components/screens/prank-screen.tsx`:

- New **Chaos Console** module card, status `LIVE`, accent `#ff2d9c`
  (pink) using the `Dices` icon from lucide.
- `MODULES` stat bumped from `03` to `04`.
- Footer hint trimmed to **"NEXT PHASE: SOUND FORGE"** to reflect that
  Chaos Console is now live.

`components/app-shell.tsx`: registered `prankChaos` in `SCREEN_MAP`.
`lib/types.ts`: added `prankChaos` to `ScreenId`.

## Optional cross-module integrations

This phase intentionally ships the Chaos Console as a standalone
module. Send-to-Chaos shortcuts from Sound Library / Prank Messages
are deferred to keep this drop surgical — the engine already accepts
optional `seedSoundId` / `seedMessageText` inputs in
`ChaosGenerateInput`, so a future small commit can wire those entry
points without engine changes.

## Domain model summary

```ts
type ChaosActionKind =
  | "random-sound"
  | "safe-random-sound"
  | "random-message"
  | "spoken-message"
  | "sound-plus-message"
  | "sequence"

type ChaosIntensity = "mild" | "goofy" | "chaotic" | "maximum"

type ChaosPoolFilter = "playable-all" | "safe-only"

type ChaosExecutionStatus =
  | "idle"
  | "ready"
  | "playing"
  | "speaking"
  | "running-sequence"
  | "complete"
  | "cancelled"
  | "failed"

interface ChaosStep {
  // `text-message` is intentionally distinct from `spoken-message` so
  // Random Message mode can stage a real action that never reaches the
  // NEO voice runtime.
  kind: "sound" | "spoken-message" | "text-message"
  soundId?: string
  soundName?: string
  messageText?: string
  messageCategoryId?: string
  messageToneId?: PrankMessageToneId
}

interface ChaosAction {
  id: string
  kind: ChaosActionKind
  createdAt: number
  intensity: ChaosIntensity
  pool: ChaosPoolFilter
  steps: ChaosStep[]
  status: ChaosExecutionStatus
  error?: string
  completedAt?: number
  summary: string
}

interface ChaosHistoryEntry {
  id: string
  kind: ChaosActionKind
  intensity: ChaosIntensity
  summary: string
  status: "complete" | "cancelled" | "failed"
  createdAt: number
  completedAt?: number
  error?: string
}
```

## Explicit limitations retained

- **Open-app / session-safe only.** Chaos actions require NEO to remain
  active. Background / closed-app chaos is not implemented and is not
  claimed.
- Currently-staged and in-flight actions are intentionally not
  persisted across full app reload.
- Category-locked sound randomness is intentionally out of scope for
  this phase — pool filter is Playable-All vs Safe-Only only. The
  engine accepts a future `categoryConstraint` extension without
  re-architecture.

## Files created / changed

- A `lib/prankstar/chaosRandomizer.ts` — domain types, engine, generators,
  manager singleton, history bookkeeping, public constants.
- A `lib/prankstar/useChaosRandomizer.ts` — snapshot hook.
- A `components/screens/prank-chaos-screen.tsx` — Chaos Console screen.
- A `docs/PRANKSTAR_CHAOS_RANDOMIZER_COMPLETION_REPORT.md` — this report.
- M `lib/types.ts` — `ChaosActionKind`, `ChaosIntensity`,
  `ChaosPoolFilter`, `ChaosExecutionStatus`, `ChaosHistoryEntry`,
  `ChaosIntent` (forward-compat), `prankChaosHistory` persistence
  field, `prankChaos` screen id.
- M `lib/store.tsx` — `prankChaosHistory` state, hydrate / reset /
  import wiring, chaos manager subscription effect.
- M `components/app-shell.tsx` — registers the new screen.
- M `components/screens/prank-screen.tsx` — Chaos Console module card is
  LIVE, MODULES stat bumped to `04`, next-phase hint updated.

## Verification

- `npm ci` ✓
- `npm run typecheck` ✓
- `npm run lint` ✓
- `npm run build` ✓ (Next 16.2.6 Turbopack, Capacitor `out/` prepared).
- `npx cap sync android` ✓
- Interactive runtime testing was not performed in this pass — the
  remote execution environment has no UI surface; build / type / lint
  receipts above are the verification.

### Random Message / Spoken Message split — corrective pass

A targeted follow-up corrected a behavior inconsistency where the
`random-message` mode was building a `spoken-message` step under the
hood and therefore triggering `previewVoice` on execute. After the fix:

- `random-message` builds a `text-message` step and never reaches any
  audio / voice runtime.
- `spoken-message` continues to use the existing `previewVoice` flow.
- The Chaos Console swaps in `COPY_MESSAGE` / `SEND_TO_MESSAGES` for the
  Random Message mode so the action row matches the actual behavior.
- History entries for Random Message report a `Message · …` summary so
  the distinction is visible in the recent-history list.

## Recommended next Prankstar phase

- **Sound Forge / Audio Lab** — user-recorded or layered sound assets,
  pitch / speed transforms, save-back into the playable catalog. With
  Sound Library / Prank Messages / Timer Traps / Chaos Console all
  live, Sound Forge is the natural next module and the only one still
  listed as `NEXT_PHASE` on the Prankstar Protocol landing screen.
- Optional smaller follow-ups: Send-to-Chaos shortcuts from Sound
  Library and Prank Messages, category-locked Chaos pool filter.
