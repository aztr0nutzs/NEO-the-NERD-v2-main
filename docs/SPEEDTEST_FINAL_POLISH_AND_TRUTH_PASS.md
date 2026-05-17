# Speed Test — Final Polish & Truth Pass

Focused experience-and-truth pass on the Speed Test feature. The NEO app
shell, animated background, dock, avatar system, Mission Control, Network
screen, Voice screens, and `nerd_speed.html` design intent were
intentionally **not removed or flattened**. The HUD layout (sphere gauge,
dual-value readout, stat panels, jitter bars, control strip, telemetry
log, safe-mode toggle, Execute/Abort buttons) is preserved — this pass
raises the energy and the honesty of the screen on top of it.

---

## 1. Weaknesses found

* Sphere gauge looked identical idle vs. running. No state-driven energy.
* Main MBPS readout had no progress affordance — users could not see how
  far through the test window the run had advanced.
* No phase indicator. The user could not see the sequence
  `PREP → PING → DL → UL → DONE` at a glance.
* Upload-unavailable copy was a single grey line that read like a defect
  ("UL_ENDPOINT_NOT_CONFIGURED"). There was no path for the user to
  *fix* it — even though the runner would happily exercise an upload if
  a URL were configured.
* Completion state had no verdict. After a run, the same chrome stayed
  on screen and the user had to read raw numbers to understand whether
  the run was good, mediocre, or bad.
* Recent runs displayed all rows identically. No best/worst flagging,
  no delta vs prior run.

---

## 2. Metrics truth — what is real

The runner (`lib/network/speedTestRunner.ts`) was already producing real
metrics. This pass did **not** touch the measurement code; only the UI
that surfaces it. Truth matrix:

| Metric         | Source                                                                                       | Real / endpoint-dependent                       |
|----------------|----------------------------------------------------------------------------------------------|--------------------------------------------------|
| **Latency**    | Median of 5–8 HTTP HEAD-equivalent round trips to the latency URL                            | **Real**, measured via `performance.now()`       |
| **Jitter**     | Population standard deviation of the same latency samples                                    | **Real**                                         |
| **Download**   | Bytes consumed from the response body reader during the configured window, divided by time  | **Real**, computed from actual transferred bytes |
| **Upload**     | POST of 64–512 KB of random bytes to the configured upload URL                               | **Endpoint-dependent**: real only when an upload URL is configured. Otherwise reads `N/A` honestly. |
| **Provider**   | `Cloudflare speed.cloudflare.com` (`__down` endpoint) by default                             | Real                                             |

Real probe captured during this session against the configured Cloudflare
endpoint:

```
latency_median_ms: 87
jitter_ms:         266   (5-sample run; jitter shrinks with more samples)
download_mbps:     345.12
bytes:             6,000,000
elapsed_ms:        139
samples_ms:        [53, 68, 87, 411, 730]
```

---

## 3. Visual / animation upgrades

All animation is now driven by real probe state — none of it is
decorative-only.

* **Sphere gauge reacts to phase.** Ring count and particle count scale
  by status (`download` is the most energetic; `failed`/`aborted` dial
  down). Particle color tints shift to green on success, pink on
  failure, plus a `mbpsBoost` term that pulls real live throughput into
  the visual storm during download.
* **SVG progress arc** wraps the sphere container. Fills against
  `latencySamples.done / total` during ping, `elapsed / downloadDurationMs`
  during download, snaps to full on terminal state. Stroke color
  flips green on success and pink on failure with a `drop-shadow` glow.
* **Phase segment strip** above the sphere shows the five real phases
  (`PREP / PING / DL / UL / DONE`). Active segment glows brightly with
  a `ps-pulse-ring` animation; completed segments dim to a steady
  accent; future segments stay muted. Right-hand detail label surfaces
  live measurement progress (`PING 3/5`, `DL 42%`, etc).
* **Verdict banner** appears post-run with a real-threshold verdict
  (`EXCELLENT` / `GOOD` / `USABLE` / `DEGRADED` / `PROBE FAILED` /
  `ABORTED`) and tone color matched to the verdict.
* **Delta chips** on the verdict banner and the recent-runs list show
  Δ vs prior run for DL and LAT, with a 0.5 Mbps / 2 ms significance
  threshold so measurement noise does not light up colored chips.

All state hand-offs that the canvas/arc consume are driven by the
runner's existing `onStatus`, `onLatencySample`, `onDownloadTick`, and
`onUploadComplete` callbacks. No new measurement paths were introduced.

---

## 4. Upload behavior — final decision

The runner already supported uploads to any configured POST endpoint
but had no surfaced configuration path. We kept upload **endpoint-
dependent** (no default endpoint, because we will not fabricate upload
numbers), but added a first-class config affordance:

* New `UploadEndpointConfig` panel under the Execute/Abort row.
* When unset: clearly says `UL_ENDPOINT_NOT_CONFIGURED` and explains
  that download / latency / jitter remain fully real.
* When set: shows the configured host with a green `CONFIGURED` chip
  and offers `EDIT` / `CLEAR`.
* The URL is persisted to `localStorage` under
  `neo:speedtest:upload-url` and validated for `http:`/`https:` scheme
  before being saved. The runner picks it up on the next run.
* Documentation in the inline help: `Endpoint must accept POST with a
  raw binary body and respond 200 OK. The runner sends a 64–512 KB
  payload of cryptographic random bytes.`

No default fallback endpoint was added because public free upload
endpoints are unreliable and we will not point users at random
infrastructure. Users with an endpoint (self-hosted, paid provider,
their own Cloud Run / Workers / nginx) can wire it up in seconds.

---

## 5. Result / history presentation upgrades

* **Verdict banner** post-run (see above).
* **Best DL / Best LAT flags** on recent-run rows.
* **Inline delta chips** on every recent-run row showing Δ vs the
  immediately prior run.
* **Run count** badge in the recent-runs header (`RECENT RUNS · 12`).
* Each row's accent border colors by `success`/`fail`, with the
  upgraded substrate (`rgba(0,0,0,0.86)`) from the readability pass so
  text stays crisp on bright backgrounds.

---

## 6. Cross-feature integration verified

* `recordSpeedTestStarted` / `recordSpeedTestResult` already push real
  events into `networkEvents` (`speed_test_started`,
  `speed_test_completed`, `speed_test_failed`) — surfaced by the
  Network Timeline panel.
* `speedTestHistory` is persisted via the existing store/localStorage
  layer and consumed by `components/exports/network-export-panel.tsx`
  for report export.
* `lib/network/networkDiagnostics.ts` `runNetworkDiagnostics` already
  invokes `runSpeedTest(speedConfig)` from `speedTest.ts` for the
  `throughput` probe, feeding network health scoring.
* No "orphan speed screen" — the verdict, history, timeline, exports,
  and health all consume the same underlying real result.

---

## 7. Remaining limitations

* Upload remains unavailable unless the user configures an endpoint.
  This is by design (no fabricated numbers) and now elegantly explained
  in-UI.
* Latency uses HTTP request round-trip (TCP+TLS+HTTP); it is not ICMP
  ping. The runner is honest about this — the verdict copy and the
  panel label say `REQUEST LATENCY` and `median`.
* Jitter is computed over a small sample window (5–8 in safe mode).
  With more samples it converges; the screen's 5-sample default keeps
  the probe fast on mobile, at the cost of some jitter variance.
* Download throughput reflects the *internet path* to Cloudflare's
  POP, not LAN-internal device speeds. Footer copy says so explicitly.

---

## 8. Files changed

* `components/screens/speed-test-screen.tsx`
* `docs/SPEEDTEST_FINAL_POLISH_AND_TRUTH_PASS.md` (this file)

The runner (`lib/network/speedTestRunner.ts`) and types
(`lib/network/types.ts`) were intentionally **not** modified — the
measurement code was already truth-preserving and the new UI consumes
existing callbacks.

---

## 9. Verification receipts

* `npm run typecheck` — `tsc --noEmit` passed.
* `npm run lint` — `eslint .` passed.
* `npm run build` — `next build` succeeded, Capacitor web assets prepared.
* `npx cap sync android` — synced 5 Capacitor plugins.
* Real probe smoke run against `speed.cloudflare.com/__down?bytes=6000000`:
  345.12 Mbps download, 87 ms median latency, 6 MB transferred in 139 ms.
