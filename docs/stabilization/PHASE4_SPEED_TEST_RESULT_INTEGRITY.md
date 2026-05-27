# Phase 4 — Speed Test Semantics + Result Integrity

**Captured:** 2026-05-27

This pass keeps Speed Test results truthful across the live HUD, history, events, diagnostics, and exports. It does not implement an upload server or add a fake upload endpoint.

## Measurement Semantics

- Download is measured from streamed response bytes over elapsed time.
- Latency is measured from repeated request samples and reported as the median.
- Jitter is calculated from latency sample variance.
- Upload is measured only when a configured POST endpoint exists.
- Missing upload remains `uploadMbps: null`; it is never converted to `0 Mbps`.

## Upload State Machine

Speed test results now carry an explicit `uploadState`:

- `MEASURED`
- `NOT CONFIGURED`
- `NOT MEASURED`
- `FAILED`
- `SKIPPED`

The UI and export formatters use this state instead of guessing from `uploadMbps: null`.

## Applied Rules

- The upload pill shows `NOT CONFIGURED`, `FAILED`, `SKIPPED`, `NOT MEASURED`, or a measured Mbps value.
- Recent-run history preserves `uploadMbps: null` and labels the exact upload state.
- Verdict labels say `PARTIAL TEST` when upload is absent, failed, or skipped.
- Strongest/weakest highlights do not compare upload quality unless upload was measured.
- Network events and diagnostics display `Not configured`, `Not measured`, `Failed`, or `Skipped` instead of `n/a`.
- Network report CSV/JSON rows include `uploadState` and `uploadDisplay` so exports do not collapse missing upload into an empty or fake numeric value.

## Validation

- `npm run typecheck`
- `npx tsx lib/network/speedTest.test.ts`
- `npm run lint`
- `npm run build`
