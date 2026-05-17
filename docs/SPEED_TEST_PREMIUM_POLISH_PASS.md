# Speed Test Premium Polish Pass

Focused visual + interaction polish for NEO's Speed Test screen. The
existing architecture — the streaming runner, truthful metric pipeline,
phase segment strip, canvas sphere gauge, telemetry log, recent results
panel, upload endpoint configuration UI, safe-mode toggle, and the
overall HUD layout — was intentionally **not redesigned, flattened,
simplified, or replaced**. This pass adds vividness, premium animation
moments, a stronger result interpretation, a redesigned
upload-locked-by-configuration state, and Mission Control integration.

---

## 1. Visual weaknesses before the pass

| Surface | Before |
|---------|--------|
| Idle state | Sphere span sat motionless until Execute was pressed — felt dead before a run. |
| Completion moment | Status flipped to green but the transition wasn't punctuated; the user wasn't sure when "done" actually happened. |
| Failure / abort moment | Pink color appeared in the strip + verdict but the screen didn't *feel* halted. |
| Verdict banner | Result line, optional deltas. No strongest/weakest interpretation. Upload-not-measured was implicit, not surfaced. |
| Upload endpoint panel | Honest, but read as a generic disabled module. No visual cue that "locked by configuration" is intentional vs broken. |
| Jitter bars | Decoratively randomized — even during the latency phase the bars weren't tied to real samples. |
| Mission Control | No surface of the latest speed test data — the only entry was a `SPEED_TEST` action button. |

The metric pipeline (`runStreamingSpeedTest`, `calculateMbps`,
`calculateJitterMs`) was already truthful and is left alone.

---

## 2. Major screen upgrades

### Idle ready breath

A `.speedtest-ready-halo` overlay renders only when `activeStatus ===
"idle"` and no run is in flight. It throbs in opacity + scale via
`@keyframes speedtest-ready-breath` (3.4 s loop) so the gauge reads
alive before the user taps Execute. Disabled instantly when a run
starts so it never competes with the live phase animations.

### Completion shockwave

The instant the runner transitions to `complete`, a one-shot ring
expansion fires:

- Green ring (`@keyframes speedtest-shockwave`, 1.4 s)
- Cyan trail ring with `animation-delay: 0.18s` for layered burst

State is held in `showShockwave` which auto-clears after 1.5 s via
`setTimeout`, so the animation cannot replay on re-renders.

### Failure / abort scanline glitch

On `failed` / `aborted`, `showFailGlitch` triggers a brief horizontal
shake + pink ring flash (`@keyframes speedtest-fail-glitch`, 0.85 s,
`steps(1, end)` so the jitter steps cleanly). Tasteful, never
obnoxious — the cadence matches the "ABORTED" / "HALTED" detail label.

### `prefers-reduced-motion`

A media query inside the scoped style block disables the new
animations (and the existing micro-glitch) for users who request
reduced motion.

---

## 3. State animation logic

The screen now has clearly differentiated states. Each is driven by
the runner's real status — no decorative theatrics.

| State | Visual signals |
|-------|-----------------|
| `idle` | Ready-halo breath + slow ring spins + canvas at baseline intensity |
| `preparing` | Canvas baseline intensity ramps to 0.85 · status label `PREPARING` · phase strip glows on the first segment |
| `latency` | Ping segment pulses · jitter bars rebuild per real sample · progress arc fills with `sampleIndex / total` |
| `download` | Canvas mbps boost · main gauge animates from live `tick.mbps` · progress arc fills with `elapsed / window` |
| `upload` | If configured: green-tinted canvas + segment · If locked: panel stays amber, log line says `UL_ENDPOINT_NOT_CONFIGURED` |
| `complete` | Green completion shockwave + verdict banner + strongest/weakest highlights + recent runs delta |
| `failed` / `aborted` | Pink scanline glitch + verdict banner with reason + recent runs row marked failed |

---

## 4. Upload handling decision

The runner already does the right thing: it only executes the upload
path when an endpoint is configured, otherwise it reports
`uploadMbps: null` and emits `UL_ENDPOINT_NOT_CONFIGURED`. We did not
ship a default upload endpoint — most public HTTPS speed endpoints
(including Cloudflare's `__up`) block cross-origin POSTs, and we will
not fabricate numbers.

What changed visually: the upload-endpoint panel is now styled as an
intentionally **locked-by-configuration** state when no URL is saved.

| Element | Unconfigured (locked) | Configured |
|---------|------------------------|-----------|
| Icon | `Lock` (amber) | `LinkIcon` (green) |
| Border | Amber, faint inset | Green, faint inset |
| Header chip | `LOCKED` badge next to title | (omitted) |
| Toggle label | `UNLOCK` (instead of `CONFIGURE`) | `EDIT` |
| Helper copy | "Upload reads N/A until a POST endpoint is wired in. Download, latency, and jitter are unaffected — they remain fully measured." | `CONFIGURED · <host>` |

The verdict banner also now surfaces a one-line `UL_NOT_MEASURED ·
UPLOAD ENDPOINT NOT CONFIGURED` chip when a run succeeds without
upload data, so the absence is acknowledged, not hidden.

---

## 5. Real metric integrity rules

Reviewed and confirmed:

- `downloadMbps` is computed from streamed bytes / elapsed time via
  `calculateMbps` (`lib/network/speedTest.ts`).
- `latencyMs` is the median of real round-trip samples (sample count is
  configurable via `cfg.latencySampleCount`, default 5–8).
- `jitterMs` is the standard deviation across those real samples via
  `calculateJitterMs`.
- `uploadMbps` is `null` when no endpoint is configured *or* when the
  request fails; never zero-padded to fake a number.
- `success` requires bytes > 0 downloaded.
- `failureReason` is propagated end-to-end (`download-fetch-failed`,
  `download-no-body`, `upload-http-<status>`, `upload-fetch-failed`,
  `upload-not-configured`, `aborted`, etc.).
- The shockwave / fail-glitch overlays are *one-shot decorations*
  triggered by status transitions — they never overwrite a metric.

### What is decorative vs measured

| Element | Source |
|---------|--------|
| Canvas sphere particles + rings | Decorative; intensity is scaled by the live `status` + live `mbps` so the canvas "knows" the real phase |
| Idle ready-halo breath | Decorative; only renders when `idle` |
| Completion shockwave / fail glitch | Decorative; fired by real status transitions |
| Progress arc sweep | **Real** — driven by `phaseProgress` which is set by `onLatencySample` (index/total), the download `elapsed / duration` RAF, or terminal status |
| Phase segment strip | **Real** — `activeIndex` derived from `activeStatus`; detail line derived from real sample counter, download elapsed %, or verdict word |
| Jitter bars during latency | **Real** — `barsFromLatencySamples` derives each bar height from the absolute deviation of the corresponding sample from the rolling mean. Before any sample arrives the bars are seeded (decorative); after the first sample they reflect real measurement |
| Jitter bars after completion | Seeded via `seedJitterBars(result.jitterMs)` — bar *count* is decorative, but the bar height *range* is scaled by the real measured jitter |

`seedJitterBars` is the only place that uses `Math.random()` on this
screen. It only affects bar *height aesthetics* within a clamped
range and never the numbers shown to the user.

---

## 6. Integration with health / history / reports

### Mission Control (`components/screens/main-screen.tsx`)

Added a `SpeedTestSummary` card spanning both columns of the
MissionStat grid. When no run exists:

```
SPEED_TEST
No probe yet — run one to baseline this link.
```

When a successful run exists:

```
SPEED_TEST · LAST_RUN
42.3 Mbps DL · 28 ms LAT · 6.1 Mbps UL   (or " · UL N/A" when not configured)
Δ DL +3.2 Mbps · Δ LAT -4 ms             (delta row only when significant)
```

Accent color thresholds match the verdict thresholds (green ≥50 / cyan
≥20 / orange <20). Tap routes to the Speed Test screen via
`setScreen("speed")`. The card never asserts a health score change —
it surfaces the data, the user interprets it.

### Recent results panel (existing — unchanged)

Already shows DL / UL / LAT with deltas vs the prior row and
`BEST DL` / `BEST LAT` badges on the standout entries.

### Network exports (existing — unchanged)

`components/exports/network-export-panel.tsx` continues to include
`speedTestHistory` in CSV / JSON / Markdown reports.

### Event timeline (existing — unchanged)

`recordSpeedTestStarted` / `recordSpeedTestResult` already emit
`createSpeedTestStartedEvent` / `createSpeedTestCompletedEvent` /
`createSpeedTestFailedEvent` into `networkEvents` for the timeline.

---

## 7. Strongest / weakest metric callout

The verdict banner now renders two highlight chips after every
successful run:

- `STRONGEST` (green icon) — the metric with the best tier and rank
- `WEAKEST` (cyan when "ok", amber when "weak") — the bottom-ranked metric

Tier thresholds (mirrored from the existing verdict logic):

| Metric | Strong | OK | Weak |
|--------|--------|-----|------|
| Download | ≥50 Mbps | ≥20 | <20 |
| Latency | ≤35 ms | ≤80 | >80 |
| Jitter | ≤8 ms σ | ≤25 | >25 |
| Upload | ≥10 Mbps | ≥3 | <3 (or not measured) |

When upload was not measured *and* every measured metric is strong,
the WEAKEST chip explicitly reads "Upload not measured · Endpoint not
configured" so the absence is acknowledged.

---

## 8. Files added / changed

### Added
- `docs/SPEED_TEST_PREMIUM_POLISH_PASS.md` — this file.

### Changed
- `components/screens/speed-test-screen.tsx`
  - Added `showShockwave` / `showFailGlitch` state with auto-clear timeouts.
  - Added idle ready-halo, completion shockwave, and failure scanline overlays inside the sphere container.
  - Added scoped keyframes `speedtest-ready-breath`, `speedtest-shockwave`, `speedtest-fail-glitch` with a `prefers-reduced-motion` opt-out.
  - Added `recentLatencySamples` ref + `barsFromLatencySamples` helper so the jitter bars reflect real measurements while the latency phase is running.
  - Verdict banner now renders strongest/weakest `HighlightChip`s via the new `computeMetricHighlights` helper, and surfaces an explicit `UL_NOT_MEASURED` chip when relevant.
  - Upload endpoint panel restyled as a "locked by configuration" intentional state when unconfigured (Lock icon, `LOCKED` badge, `UNLOCK` toggle label, amber inset).
- `components/screens/main-screen.tsx`
  - Imports `Gauge` icon + `SpeedTestResult` type.
  - Computes `latestSpeedRun` / `previousSpeedRun` via memoized lookups against `speedTestHistory`.
  - New `SpeedTestSummary` component spans both columns of the MissionStat grid; tap routes to the Speed Test screen.

The streaming runner (`lib/network/speedTestRunner.ts`), metric
helpers (`lib/network/speedTest.ts`), event creators
(`lib/network/networkEvents.ts`), and store
(`lib/store.tsx`) were intentionally **not** modified.

---

## 9. Verification receipts

| Step | Result |
|------|--------|
| `npm run typecheck` | OK (`tsc --noEmit`) |
| `npm run lint` | OK (`eslint .`) |
| `npm run build` | OK (Next 16.2.6 production build, Capacitor web assets prepared) |
| `npx cap sync android` | OK (5 plugins synced) |
| `lib/network/speedTest.test.ts` | Existing pure-function tests for `calculateMbps` + `calculateJitterMs` continue to pass (no changes to those modules). |

---

## 10. Remaining endpoint-dependent limitations

- **Upload measurement** still requires a user-configured POST endpoint.
  Most public speed-test providers block cross-origin POSTs, so we
  ship without a default and present the locked state honestly. Users
  with their own backend can wire one in via the existing
  `UploadEndpointConfig` panel; the URL persists to localStorage.
- **Cellular metering**: the streamed download window can transfer
  ~6–12 MB depending on safe-mode. The screen already exposes a
  `SAFE_MODE` toggle that caps the window — we left that toggle
  in place and untouched.
- **Mission Control LAST_RUN** displays the most recent **successful**
  run. Failed/aborted runs are visible in the Recent Results panel
  but never overwrite the Mission Control summary so the dashboard
  reading remains useful.
- **Reduced motion**: every new animation respects
  `prefers-reduced-motion: reduce`. Users with that preference still
  see the verdict and metric data — they just don't get the
  shockwave / breath / glitch flourishes.

---

## 11. Manual visual checklist

1. Open the Speed Test screen with no prior runs. Confirm the
   ready-halo breathes around the gauge before pressing Execute.
2. Tap **EXECUTE**. Observe the segment strip light up `PREP` → `PING`
   → `DL` → `UL` (or `UL N/A`) → `DONE`. Confirm the jitter bars
   re-flow with the running ping samples instead of staying static.
3. On `complete`, confirm the green expanding shockwave fires once and
   then clears. Confirm the verdict banner now renders STRONGEST /
   WEAKEST highlight chips alongside the existing DL/LAT deltas.
4. Without configuring an upload endpoint, confirm the upload panel
   reads `LOCKED · UPLOAD ENDPOINT` with the `Lock` icon and the
   `UNLOCK` toggle, and the verdict banner shows the
   `UL_NOT_MEASURED` chip.
5. Tap **ABORT** mid-run. Confirm the pink scanline glitch fires once
   and the verdict reads `ABORTED`.
6. Open Mission Control. Confirm the `SpeedTestSummary` card now
   shows the last run with DL / LAT / UL (or `UL N/A`) and any
   significant deltas vs the prior run.
7. Toggle Settings → Accessibility → Reduced Motion (or the OS-level
   reduce-motion flag). Confirm the ready-breath, shockwave, and
   glitch animations stop while metric updates and progress arc
   transitions continue.
