# TRUE SPEED TESTING

## What is measured
- **Request latency** — HTTPS request round-trip time to the configured latency
  endpoint, sampled N times. **Not** ICMP ping; the UI labels this
  `REQUEST LATENCY` to keep the meaning honest.
- **Jitter (σ)** — standard deviation across the same latency samples.
- **Download throughput** — bytes actually received from the configured
  download endpoint, divided by elapsed time. Computed continuously by the
  streaming reader so the gauge animation is driven by real bytes-in-flight,
  not a synthetic sweep.
- **Upload throughput** — bytes actually POSTed to the configured upload
  endpoint, divided by elapsed time. **Only runs when an upload endpoint is
  configured.** When no endpoint is configured, the UL pill reads
  `NOT CONFIGURED` and the runner returns `uploadMbps: null`,
  `uploadState: "NOT CONFIGURED"`, and
  `failureReason: "upload-not-configured"`. The screen also shows
  `UL_ENDPOINT_NOT_CONFIGURED` so the user knows nothing was fabricated.

## What is not measured
- Raw Layer-2 Wi-Fi PHY rate.
- ICMP ping.
- Per-device LAN transfer speeds (would need a local agent on each device).
- Cross-NAT peer throughput.

## Architecture

```
SpeedTestScreen (components/screens/speed-test-screen.tsx)
    │
    ▼  defaultCloudflarePreset(safeMode) merged with optional configOverride
runStreamingSpeedTest (lib/network/speedTestRunner.ts)
    │      ├─ measureLatency       ──► onLatencySample / onLatencySummary
    │      ├─ measureDownload      ──► onDownloadTick (real Mbps from reader)
    │      └─ measureUpload        ──► onUploadComplete (MEASURED / NOT CONFIGURED / FAILED)
    │      └─ onPhase / onStatus / onLog throughout
    ▼
SpeedTestResult  ──►  store.recordSpeedTestResult
                          ├─ speedTestHistory  (persisted, ring of 50)
                          └─ networkEvents     (speed_test_completed / _failed)
                                  │
                                  ▼
                          buildNetworkReport
                          ├─ summary.latestSpeedTest (real values)
                          └─ section "speedTests"    (last 30 runs)
```

Key files:
- `lib/network/types.ts` — `SpeedTestConfig`, `SpeedTestPhase`,
  `SpeedTestResult`, `ThroughputSample`, `SpeedTestPhaseName`.
- `lib/network/speedTest.ts` — pure math helpers (`calculateMbps`,
  `calculateJitterMs`) and the legacy batch `runSpeedTest` still used by
  network diagnostics.
- `lib/network/speedTestRunner.ts` — new streaming engine with phase
  callbacks, abort support, and a default preset.
- `lib/network/networkEvents.ts` — `createSpeedTestStartedEvent`,
  `createSpeedTestCompletedEvent`, `createSpeedTestFailedEvent`.
- `lib/store.tsx` — `speedTestHistory`, `recordSpeedTestStarted`,
  `recordSpeedTestResult`, `clearSpeedTestHistory`, persisted via
  `PersistedAppState`.
- `lib/exports/network-report.ts` — `speedTests` section + summary line.
- `components/screens/speed-test-screen.tsx` — bound to the runner; HUD
  identity preserved from `nerd_speed.html`, only colors remapped.

## State machine (UI <-> runner)

| Runner status | UI status label    | Drives                          |
|---------------|--------------------|---------------------------------|
| `preparing`   | `PREPARING`        | Resets readouts, opens telemetry|
| `latency`     | `INJECTING_PACKETS`| Live `PING_SAMPLE N/M=...ms` log|
| `download`    | `PULLING_PAYLOADS` | Main gauge animates from bytes  |
| `upload`      | `PUSHING_UPLINK`   | UL pill, `NOT CONFIGURED`, or `FAILED` |
| `complete`    | `COMPLETE`         | Probe status `READY` (green)    |
| `aborted`     | `ABORT`            | Probe status `ABORTED` (pink)   |
| `failed`      | `HALT`             | Probe status `FAILED` (pink)    |

Labels are exported from `statusLabel(status)` in the runner and asserted
by `lib/network/speedTest.test.ts` so the UI contract cannot silently drift.

## Endpoint configuration

The default preset uses Cloudflare:

```ts
defaultCloudflarePreset(safeMode) => {
  mode: "internet",
  provider: "Cloudflare speed.cloudflare.com",
  latencyUrl: "https://speed.cloudflare.com/__down?bytes=1",
  downloadUrl: "https://speed.cloudflare.com/__down?bytes=<6M|12M>",
  // uploadUrl intentionally omitted by default
}
```

A consumer can override any field via the screen's `configOverride` prop
(e.g. provide a `uploadUrl` pointing at a connector you operate). The screen
detects whether `uploadUrl` was set and either runs the upload phase or
reports the upload as `NOT CONFIGURED`.

To wire a custom endpoint set in the future, extend `NetworkSettings`
with `speedTestDownloadUrl` / `speedTestUploadUrl` and pass them in via
`configOverride`. The runner is intentionally stateless to make that swap
trivial.

## Persistence and history

- `speedTestHistory: SpeedTestResult[]` lives on `AppState` and persists
  in `PersistedAppState` (capped at 50 runs).
- The Speed Test screen renders a `RECENT RUNS` panel showing the latest
  five with completion time, DL/UL/LAT badges, and success colour.
- `clearSpeedTestHistory()` clears both the in-memory list and the
  persisted payload on the next save.

## Event timeline & reports

- Each run emits a `speed_test_started` event (info) when it begins and
  either `speed_test_completed` (info, with rounded DL/UL/LAT/JIT) or
  `speed_test_failed` (medium, with failure reason) on terminal state.
- `buildNetworkReport(...)` now accepts `speedTestHistory` and emits a
  `speedTests` section with up to 30 rows. The `summary.latestSpeedTest`
  field prefers the standalone run over the diagnostics-derived value.

## Accuracy caveats
- Browser fetch path, TLS setup, and endpoint geography influence results.
- Cloudflare's `__down` is a single-stream test; commercial apps using
  parallel sockets to provider-owned pools can report higher numbers.
- Android WebView background throttling can affect timing consistency —
  keep the screen foregrounded during a run.
- Upload numbers (when configured) depend on the endpoint accepting
  unauthenticated cross-origin POSTs; an HTTP non-2xx response sets
  `uploadState="FAILED"` and `failureReason="upload-http-<code>"` instead of synthesising a value.

## Failure modes
- Network unreachable → download phase fetch rejects → `failureReason`
  records `download-fetch-failed`; UL never runs; UI shows `HALT`/`FAILED`.
- Reader throws → handled, `failureReason="download-failed"`.
- User abort → `failureReason="aborted"`, status `ABORT`.
- Upload endpoint missing → result still `success` (download succeeded),
  `uploadMbps: null`, `uploadState="NOT CONFIGURED"`, `failureReason="upload-not-configured"`.

## Testing
`lib/network/speedTest.test.ts` covers:
- Mbps math edge cases (zero bytes, divide-by-zero guard).
- Jitter math (no-variance, variance present, single-sample guard).
- State-machine label contract (every status → expected UI label).
- Default preset shape & deliberate omission of `uploadUrl`.
- End-to-end runner against a non-routable endpoint to assert that a
  failed download still produces a well-formed `SpeedTestResult` with
  `success=false`, `uploadMbps=null`, and a `failureReason` string —
  i.e. no exceptions escape the runner.
