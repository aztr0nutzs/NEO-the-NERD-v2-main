# Prankstar Protocol — Timer Traps

## Feature summary

Adds **Timer Traps**, the third Prankstar Protocol module after Sound Library
and Prank Messages. Lets the user arm a delayed prank trigger that fires
through the existing NEO audio + voice runtimes while the app remains open.
Three trap kinds ship in this phase: specific sound, random safe sound, and
spoken prank message. Active traps continue counting down across NEO screen
navigation; closed-app / background execution is not enabled and is called
out explicitly in the UI.

## Trap modes implemented

- **Sound** — fires a user-selected entry from the playable catalog through
  `prankAudioRuntime.play(sound)`.
- **Random Safe Sound** — selects a safe sound at arm time via
  `getSafeRandomSound`, displays the queued pick, supports reroll, fires
  through the same audio runtime.
- **Spoken Message** — speaks a chosen / pasted prank line through
  `previewVoice` with the user's current voice profile, quality preference,
  and personality. Picks from favorites + history; falls back to a manual
  textarea if no message history exists.

## Timer runtime architecture

- `lib/prankstar/prankTraps.ts` — module-level `PrankTrapsManager` singleton
  owns the Map of active traps and a `setTimeout` per trap id. Lives outside
  React state so traps survive screen navigation while the app session is
  alive. Emits snapshots `{ active, recent }` via a subscribe/listener API.
- `lib/prankstar/usePrankTraps.ts` — `usePrankTraps()` hook for snapshots
  and `useCountdownTick(200)` for smooth remaining-time labels.
- Delays clamped to `[1s, 6h]`. Custom-seconds input validated at 1s
  minimum, 1h soft cap from the UI.
- Re-render-safe: arming creates exactly one timer, cancel clears it,
  firing removes the trap from the active map before invoking the runtime.
  Cleanup on unmount is unnecessary because the manager is global.

## State transitions

```
arm() → counting-down ─────► triggering ─► fired
                  │                       └► failed (runtime error)
                  └──── cancel() ────────► cancelled
arm() (invalid) ─────────────────────────► failed
```

`fired`, `failed`, and `cancelled` traps flow into the recent-history slice
(cap 30) and out of the active map.

## Timer Traps screen UX

`components/screens/prank-traps-screen.tsx` (route `prankTraps`).

- Runtime-truth banner up top: "Timer Traps run while NEO remains open and
  active in this build. Closed-app / background prank execution is not
  enabled yet."
- Trap type tabs (Sound · Random Safe · Spoken Message) with vivid accents.
- Payload pickers:
  - Sound: search-as-you-type over the playable catalog with up to 40
    results, click-to-select.
  - Random Safe: shows the queued pick with a reroll button.
  - Spoken Message: textarea seeded from prank messages favorites + recent
    history. Includes a CTA to open Prank Messages if none exist.
- Delay row: 5s / 10s / 30s / 1m / 5m chips plus a custom seconds input
  (Enter or blur to apply). Live `COUNTDOWN · …` label shows the selected
  delay in human-readable form.
- Prominent **ARM_TRAP** button, disabled until the payload is valid.
- Active panel: per-trap row with kind icon, label, status, remaining
  countdown (cyan neon), animated progress bar, cancel button. Cancel-all
  link when any trap is active.
- Recent panel: status icon (CheckCircle for fired, X for cancelled, Alert
  for failed), kind/status label, error string when relevant. Clear-history
  action.

## Persistence & session behavior

- Active armed traps live in the manager only. **They are not persisted
  across full app reload** — closed-app firing isn't implemented, and
  silently resuming past-due timers at boot would fire stale traps. This
  limitation is surfaced in the UI banner.
- Recent trap history (fired / cancelled / failed) is mirrored into the
  store via a subscribe effect and persisted alongside other NEO state
  (`prankTrapsHistory` in `PersistedAppState`).
- Active traps survive screen navigation within the open app session, since
  the manager is module-level and screen-independent.
- `resetApp()` cancels all active traps and clears recent history.
- `importSettings()` round-trips recent trap history through the existing
  persistence pipeline.

## Sound Library integration

`components/screens/prank-library-screen.tsx`: each sound row now exposes a
small orange Timer icon button. Tapping it sets `trapIntent` and navigates
to `prankTraps`, which preselects the sound in the picker.

## Prank Messages integration

`components/screens/prank-messages-screen.tsx`: the result panel adds a
**USE_AS_TIMED_TRAP** button. It stops any in-progress speech, sets
`trapIntent` with the current message text, and navigates to `prankTraps`.

## Files changed / created

- A `lib/prankstar/prankTraps.ts` — manager + types + presets + format helper.
- A `lib/prankstar/usePrankTraps.ts` — snapshot + countdown-tick hooks.
- A `components/screens/prank-traps-screen.tsx` — Timer Traps screen.
- A `docs/PRANKSTAR_TIMER_TRAPS_COMPLETION_REPORT.md` — this report.
- M `lib/types.ts` — `PrankTrap`, `PrankTrapKind`, `PrankTrapStatus`,
  `TrapIntent`, `prankTrapsHistory` persistence field, `prankTraps` screen id.
- M `lib/store.tsx` — recent-trap mirror, `trapIntent` channel, reset/import
  wiring, manager subscription effect.
- M `components/app-shell.tsx` — registers the new screen.
- M `components/screens/prank-screen.tsx` — Timer Traps module card is LIVE,
  MODULES stat updated to `03`.
- M `components/screens/prank-library-screen.tsx` — Use-in-Trap row action.
- M `components/screens/prank-messages-screen.tsx` — Use-as-Timed-Trap action.

## Verification

- `npm run typecheck` ✓
- `npm run lint` ✓
- `npm run build` ✓ (Next 16.2.6 Turbopack, Capacitor `out/` prepared).
- Interactive runtime testing was not performed in this pass.

## Explicit limitations retained

- **Open-app / session-safe only.** Traps require the NEO app to remain
  active. Closed-app and background scheduling are not implemented in this
  phase and are not claimed.
- Active armed traps are intentionally not persisted across full reload.

## Recommended next Prankstar phase

- Chaos Randomizer / Randomizer Console — randomized prank sequences,
  variable delays, layered audio + spoken messages.
- Sound Forge — later phase, after Randomizer matures.
- Background/native scheduler integration for closed-app trap firing — would
  pair Capacitor `LocalNotifications` with a native audio trigger; out of
  scope here but enabled by the current domain model (`triggerAt`-based,
  serializable trap records).
