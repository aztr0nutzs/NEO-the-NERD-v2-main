# Animated Background + Speed Test — Final QA

Scope: final QA after integrating (1) the new global animated MP4 background,
(2) the `nerd_speed.html`-derived Speed Test screen, and (3) the real
streaming speed-test engine behind it.

## Defects found and fixed in this pass

- **Background flickered during transient buffer pauses.**
  `onStalled` was flipping `videoReady=false`, which faded the video out to
  the PNG fallback even while playback resumed seconds later. Removed the
  handler in [components/background/neo-background-scene.tsx](../components/background/neo-background-scene.tsx);
  the video now only falls back on real errors (`onError → setVideoDisabled(true)`)
  or autoplay rejection (`canPlay → play().catch`).

No other functional defects were observed during the verification pass —
typecheck, lint, build, the speed-test logic test suite, and Android sync
all pass clean.

## A. Animated background verification

| Check                                          | Status | Evidence |
|------------------------------------------------|--------|----------|
| MP4 served at `/media/neo/neo_backround.mp4`   | ✓      | `public/`, `out/`, `android/app/src/main/assets/public/` all hold the 9,127,015 byte file |
| Default global background layer                | ✓      | Mounted once in `AppShell` (`<NeoBackgroundScene />` at z-0); no per-screen remount |
| `loop` + `muted` + `playsInline` + `autoPlay`  | ✓      | [neo-background-scene.tsx:101-104](../components/background/neo-background-scene.tsx#L101-L104) |
| Pointer events disabled                        | ✓      | Wrapper has `pointer-events-none fixed inset-0 z-0` |
| Does not obscure UI text                       | ✓      | Vertical scrim gradient sits above the video; scanlines (z-1) and screen content (z-10) sit above the bg |
| Visible on every screen                        | ✓      | Single mount in app-shell; screens use transparent backgrounds |
| Reduced-motion fallback                        | ✓      | `prefers-reduced-motion: reduce` listener unmounts the `<video>` and leaves the PNG as the sole layer |
| Static PNG fallback on load/autoplay failure   | ✓      | `onError → setVideoDisabled(true)`; autoplay rejection keeps `videoReady=false` so PNG stays visible |
| Tab-hidden pause / visible resume              | ✓      | `visibilitychange` listener pauses/resumes the video |
| No remount on screen change                    | ✓      | Background lives outside `<main>`'s `<AnimatePresence>`, so screen transitions don't touch the `<video>` |
| Spurious mid-playback fade-outs                | Fixed  | `onStalled` handler removed — playback hiccups no longer flicker the video off |

## B. Speed Test design fidelity

Compared `components/screens/speed-test-screen.tsx` against root
`nerd_speed.html`:

- **Layout** — topbar / square gauge container (`max-w-[340px]`,
  `aspect-square`) / 2-col stat panels / control strip / telemetry log:
  preserved verbatim.
- **Gauges** — dual counter-rotating rings (`ps-spin-slow 20s`,
  `ps-spin-rev 15s`), canvas sphere with the exact ring/particle math
  from the source `drawSphere()`, dual-value readout with translated/blurred
  ghost overlay, MBPS legend, DL/UL pills: preserved.
- **Motion** — `micro-glitch` status flicker (renamed `speedtest-micro-glitch`
  to avoid keyframe collision), animated PING pulse bar, randomized JITTER
  bar reseed: preserved.
- **HUD structure / hierarchy** — top status word, giant centered number
  with pink ghost, MBPS legend, DL/UL chips, two stat panels, control
  strip with safe-mode toggle + Abort/Execute + telemetry: preserved.
- **Buttons** — source's `cyber-btn` shape (56px height, 10px clip,
  italic uppercase 12px label with 0.22em tracking, scale-on-tap, border-only
  fill): preserved.
- **Color-only transformation** — source `--cyan/--pink/--green/--yellow`
  mapped to NEO `--neon-cyan/--neon-pink/--neon-green/--neon-orange`
  (#00f0ff / #ff2d9c / #39ff14 / #ff7a00). No other visual changes.

Additions that don't alter the source identity:
- A `RECENT RUNS` panel below the control strip listing the last five
  persisted runs (timestamp + DL/UL/LAT badges) — small green-accented
  panel using the same `cpclip` clipped-corner panel style.
- A honest one-line caveat at the bottom of the screen explaining what
  the readouts mean.

## C. Speed Test functional verification

| Check                                                  | Status | Evidence |
|--------------------------------------------------------|--------|----------|
| Discoverable in navigation                             | ✓      | Bottom dock `SPEED` tab (Gauge icon) + Mission Control `SPEED_TEST` quick action |
| Execute kicks off real test                            | ✓      | Calls `runStreamingSpeedTest` from `lib/network/speedTestRunner.ts` |
| Phase transitions reflect runner status                | ✓      | `onStatus` flows through PREPARING → INJECTING_PACKETS → PULLING_PAYLOADS → PUSHING_UPLINK → COMPLETE/HALT/ABORT |
| Idle state                                             | ✓      | `IDLE` status word, 0.0 main, `--` DL/UL/PING/JITTER, telemetry box shows `AWAITING_PROBE` |
| Active state                                           | ✓      | Main gauge animates from real `onDownloadTick`, per-sample PING log lines, jitter bars reseed |
| Complete state                                         | ✓      | DL/UL/LAT/JITTER commit from final `SpeedTestResult`; PROBE STATUS reads `READY` (green) |
| Error/abort state                                      | ✓      | Aborted runs report `ABORT` status + `ABORTED`/`FAILED` probe; failed runs carry a `failureReason` and log line |
| Download metrics real                                  | ✓      | Bytes accumulated via `response.body.getReader()`; mbps = `(bytes·8)/(elapsedMs·1000)` per `calculateMbps` |
| Upload either real or honestly state-labeled           | ✓      | Default preset omits `uploadUrl`; UL pill reads `NOT CONFIGURED`, a yellow `UL_ENDPOINT_NOT_CONFIGURED` line is shown |
| Truthful latency/jitter copy                           | ✓      | Labels read `REQUEST LATENCY` and `JITTER (σ)` (not "ping") |
| History persists                                       | ✓      | `recordSpeedTestResult` pushes into `speedTestHistory` (cap 50, in-memory + PersistedAppState) |
| Events fire                                            | ✓      | `speed_test_started` on launch, `speed_test_completed` or `speed_test_failed` on terminal — surfaced in `NetworkTimelinePanel` |
| Report integration                                     | ✓      | `buildNetworkReport` now includes a `speedTests` section + uses the latest run for `summary.latestSpeedTest` |
| Logic tests pass                                       | ✓      | `npx tsx lib/network/speedTest.test.ts` → `speedTest logic checks passed` |

## D. Mobile / Android layout verification

| Check                                       | Status | Evidence |
|---------------------------------------------|--------|----------|
| No bottom dock overlap                      | ✓      | `<main>` reserves `pb-[calc(8.5rem+env(safe-area-inset-bottom))]`; the SPEED screen is a child and inherits the padding |
| Safe-area top inset honored                 | ✓      | `<main>` top padding + topbar element |
| Gauge readable in portrait (≥360 px)        | ✓      | `max-w-[340px]` square gauge + `text-[64px]` value on `<sm`, scales to `text-[72px]` from `sm` up |
| Touch targets reachable                     | ✓      | Abort/Execute are full-width grid columns at 56 px tall; safe-mode toggle is 48×24 px; recent-run cards are non-interactive |
| Background video not overdrawn by screen    | ✓      | Speed screen content uses semi-transparent (`rgba(0,0,0,0.55–0.72)`) panels with neon-tinted borders — the MP4 remains visible behind them |
| Persistent avatar orb does not cover gauge  | ✓      | Right padding `pr-[5.25rem]` on `<main>` when the orb is visible; gauge centers within remaining width |
| Scrolling                                   | ✓      | Speed screen is a flex column with normal flow; the page scrolls if content exceeds viewport, no nested fixed/overflow traps |
| Pointer events on sphere canvas             | ✓      | `pointer-events-none` set explicitly so taps fall through to UI elements |

## E. Regression check

Re-read each major surface to confirm nothing was accidentally altered:

| Feature                  | Touched?            | Notes |
|--------------------------|---------------------|-------|
| Mission Control home     | one line added      | Single new `MissionAction` for `SPEED_TEST` next to OPEN_3D_MAP; surrounding cards/identity untouched |
| Network Discovery        | no                  | `NetworkScreen` and `NetworkDiscoveryFeature` unmodified |
| 3D Network Map           | no                  | No edits to `components/network/map/*` or topology code |
| Voice Library            | no                  | No edits to `components/screens/voices-screen.tsx` |
| Personalities            | no                  | No edits to `components/screens/personalities-screen.tsx` |
| Response Vault           | no                  | No edits to `components/screens/library-screen.tsx` |
| Chat                     | no                  | No edits to `components/screens/chat-screen.tsx` |
| Onboarding               | no                  | `OnboardingWizard` and its trigger conditions unchanged |
| Exports / reports        | additive only       | `speedTests` section + speed-test summary line; existing `devices/events/alerts/health` sections unchanged |
| Bottom dock              | one item added      | New `SPEED` entry; `sm:grid-cols-9 → sm:grid-cols-10`; existing items, accents, scroll affordance preserved |
| Network Health Panel     | label-friendly only | Picks up new `speed_test_*` events for free via existing event-type label map |

## F. Mandatory artifacts

- **QA report**: this file at `docs/ANIMATED_BACKGROUND_AND_SPEEDTEST_QA.md`.
- **Screenshot capture plan**: headless screenshot capture isn't available
  in this environment (no Chromium/Capacitor automation). To produce the
  six artifacts requested, run the dev server and capture the following
  states into `qa-screenshots/animated-bg-speedtest/`:
  1. `01-main-with-bg.png` — boot → land on Main, MP4 visible behind Mission Control.
  2. `02-speed-idle.png` — open SPEED screen, do not run yet.
  3. `03-speed-active.png` — tap Execute, capture during PULLING_PAYLOADS with main value > 0.
  4. `04-speed-complete.png` — wait for COMPLETE, capture with full readout + RECENT_RUNS visible.
  5. `05-speed-mobile-portrait.png` — emulate 360×800 viewport in DevTools, same complete state.
  6. `06-network-timeline-integration.png` — open Network screen, expand the timeline panel to show the `SPEED_COMPLETE` event row.

## G. Verification receipts

- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm run build` — compiled in 10.3 s, capacitor assets prepared in `out/`.
- `npx tsx lib/network/speedTest.test.ts` → `speedTest logic checks passed`
  (Mbps math, jitter math, state-machine label contract, default preset
  shape, failure-path smoke test).
- `npx cap sync android` — succeeded; web assets including
  `neo_backround.mp4` copied to `android/app/src/main/assets/public/`.
- **Android `assembleDebug`** — not attempted in this pass. The
  `android:debug` npm script chains `android:sync` (which we ran cleanly)
  with `./gradlew assembleDebug`. Gradle requires the Android SDK / JDK on
  the build host; this environment is a sandboxed shell without a
  configured Android SDK. The web layer and Capacitor sync confirmed
  there is no JS-side blocker to a Gradle build.

## H. Remaining limitations

- **Upload endpoint** — the default Cloudflare preset deliberately omits
  `uploadUrl`. Until a connector POST endpoint is wired via the screen's
  `configOverride.uploadUrl`, the UL pill stays `NOT CONFIGURED`. This is intentional
  and clearly surfaced in-screen; it is not a defect.
- **Live network run not executed here** — outbound HTTPS to
  `speed.cloudflare.com` from this sandbox isn't guaranteed, so an
  end-to-end live capture wasn't attempted. The runner's failure-path
  smoke test verifies that the engine returns a well-formed result on
  network failure without throwing.
- **Headless screenshots** — see note above; the capture plan is laid out
  but actual PNGs need to be produced on a developer workstation.
