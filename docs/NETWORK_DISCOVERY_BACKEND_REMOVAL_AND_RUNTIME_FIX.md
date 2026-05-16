# Network Discovery — Backend Removal and Runtime Fix

This document describes the surgical recovery applied to the Network Discovery
runtime so that the installed Android app uses the native Capacitor plugin as
the true default live path, never gets stuck on `INITIALIZING_NETWORK_MODULE...`,
and never silently strands scan controls.

The Network screen visual identity, 3D map, dock, Mission Control dashboard,
avatar system, animated background, Speed/Voice screens and other unrelated
features were intentionally not modified.

---

## 1. Root cause — stuck initializing

`components/network/NetworkDiscoveryFeature.tsx` loaded nine adapter calls
through a single `Promise.all(...)`. Any one rejection collapsed the entire
load. The `catch` branch only set `adapterStatus`; `networkStatus`,
`routerStatus` and `settings` stayed `null`. The render guard
`if (!networkStatus || !routerStatus || !settings)` then trapped the UI
forever on the `INITIALIZING_NETWORK_MODULE...` spinner.

### Fix

The loader was rewritten to use `Promise.allSettled` with per-call safe
defaults:

* `networkStatus`        → `MOCK_NETWORK_STATUS`
* `routerStatus`         → `MOCK_ROUTER_STATUS`
* `securityInsights`     → `MOCK_SECURITY_INSIGHTS`
* `scanHistory`          → `MOCK_SCAN_HISTORY`
* `settings`             → `DEFAULT_NETWORK_SETTINGS`
* `adapterStatus`        → `resolveNetworkAdapterStatus({ demoMode: false, nativePluginAvailable: false, fallbackReason: <error> })`
* `routerCapabilities`   → `[]`
* `routerControlMode`    → `"read-only"`
* `discoveredDevices`    → `[]`

An explicit `initState` state machine drives termination:

| state           | meaning                                                  |
|-----------------|----------------------------------------------------------|
| `loading`       | initial load running                                     |
| `ready`         | every adapter call returned a value                      |
| `partial-ready` | some adapter call failed but the UI has usable defaults  |
| `failed`        | every critical call failed — explicit failure panel shown |

A `RETRY_LIVE_DISCOVERY` button re-runs initialization by bumping the
`initAttempt` dependency.

---

## 2. Root cause — dead scan controls

In `lib/network/networkDiscoveryAdapter.ts`, `NativeNetworkAdapter.startNetworkScan`
fired the native scan but only updated state when the promise resolved with a
truthy `nativeScan`. If the native bridge returned `null` (browser preview),
threw, or never resolved, the adapter was left with `isScanning = true` and
`scanProgress = 0`. The React-side scan-progress poller only completes when
`progress >= 100`, so the spinner never finished and the scan button stayed
disabled.

### Fix

`NativeNetworkAdapter` now uses an explicit scan state machine. Every
terminal path goes through `markScanFinished(success, reason)` which:

1. Clears the scan timeout.
2. Sets `isScanning = false`.
3. Pins `scanProgress = 100` (success **or** failure) so the React poller can
   observe termination on every path.
4. Sets `lastScanFailed` and `lastScanFailureReason`.
5. Records `lastScanFinishedAt`.

The four exit paths now all reach a terminal state:

* native scan resolves with a result      → `markScanFinished(true)`
* native scan resolves with `null`        → `markScanFinished(false, "Native scan returned no result …")`
* native scan rejects                     → `markScanFinished(false, <error message>)`
* native scan exceeds `NATIVE_SCAN_TIMEOUT_MS` → `markScanFinished(false, "Native scan did not complete within the expected window …")`

`NetworkDiscoveryFeature.tsx` detects `scanState === "failed"` after
completion, appends a `scan_failed` event, materializes a high-severity
network alert, plays the angry avatar reaction, and resets `scanProgress`.

---

## 3. Backend remnants removed from local discovery

`lib/network/networkDiscoveryAdapter.ts` previously contained:

* `BACKEND_BASE_URL` (`NEXT_PUBLIC_NEO_NETWORK_BACKEND_URL`)
* `BACKEND_TIMEOUT_MS`
* `BackendUnavailableError`
* `requestBackendJson(...)` helper
* `NativeNetworkDiscoveryBridge` web-bridge type and `window.NeoNetworkDiscovery`
* `getNativeBridge()` accessor
* Backend fallbacks for `stopNetworkScan`, `getDeviceDetails`, `getRouterStatus`

**All of the above have been deleted from the local discovery path.** The
`NativeNetworkAdapter` is now:

| method                | source                                              |
|-----------------------|-----------------------------------------------------|
| `getAdapterStatus`    | `isAndroidNativeNetworkPluginAvailable()`           |
| `getNetworkStatus`    | `getNativeLocalNetworkContext()`                    |
| `startNetworkScan`    | `runNativeSubnetScan({ scanMode })`                 |
| `stopNetworkScan`     | Local flags only — no remote stop endpoint          |
| `getDiscoveredDevices`| Cached `lastNativeScan` from the native plugin      |
| `getDeviceDetails`    | Cached `lastNativeScan` lookup — no backend probe   |
| `getRouterStatus`     | `getNativeGatewayInfo()` — throws if unavailable    |

Allowed backend usage elsewhere in the codebase (AI provider, TTS provider,
optional speed-test upload endpoint) is untouched and lives in
`lib/runtime/backend-*` and `lib/voice/*`. None of it is required for local
LAN discovery.

---

## 4. Final runtime mode matrix

| Runtime context                                              | Adapter mode         | Default behavior                                                                                                                                       |
|--------------------------------------------------------------|----------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|
| Installed Android app + NeoNetwork plugin available + demoMode off | `native-android`     | LIVE LOCAL ANDROID DISCOVERY. Scan button triggers `runNativeSubnetScan` immediately. Devices, status, 3D map populated from `NativeScanResult`.        |
| Installed Android app + plugin unavailable / failed + demoMode off | `native-unavailable` | Native discovery falls back to labeled demo data so the screen remains usable. Banner reads `NATIVE_DISCOVERY_UNAVAILABLE` and offers retry from the Scan tab. No backend prompt. |
| Browser / web preview (Capacitor platform ≠ android)         | `demo-browser` (auto) or `native-unavailable` | Simulated data, clearly labeled `SIMULATED BROWSER PREVIEW`. Copy directs users to install the Android app — never to configure a backend.              |
| User toggles DEMO_MODE in Settings                            | `demo-browser`       | Explicit demo. Shown as `SIMULATED NETWORK DATA`.                                                                                                       |
| `scanState === "failed"` after a started scan                | adapter mode unchanged | Network status surfaces `scanState: "failed"`, NetworkAlertsPanel shows the failure, scan progress resets to 0 and the START_SCAN button re-enables.    |

The native plugin is the priority path whenever it is available.

---

## 5. UI copy changes

| Location                                          | Before                                                                 | After                                                                                                                              |
|---------------------------------------------------|------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
| `NetworkSettingsPanel` native-unavailable banner  | `DEMO_FALLBACK_ACTIVE` / "Native Android discovery did not answer …"   | `NATIVE_DISCOVERY_UNAVAILABLE` / "Native Android discovery failed to initialize. No backend is required …"                         |
| `NetworkDiscoveryFeature` footer                  | `… // SIMULATED BROWSER PREVIEW` for every non-unavailable mode        | Mode-specific: `LIVE LOCAL ANDROID DISCOVERY · NO BACKEND REQUIRED`, `NATIVE DISCOVERY UNAVAILABLE`, `LAST SCAN FAILED`, or `SIMULATED BROWSER PREVIEW` |
| `NetworkDiscoveryFeature` init-failure panel      | (did not exist — UI hung)                                              | `NETWORK_MODULE_INIT_FAILED` panel listing per-call issues + `RETRY_LIVE_DISCOVERY` button                                         |
| `networkDiscoveryAdapter` adapter messages        | "Optional network connector …" / `BackendUnavailableError`             | `NativeDiscoveryUnavailableError` with explicit "No backend is required for local LAN discovery" copy                              |

Existing accurate copy (`NetworkScanPanel`, `NetworkOverviewPanel`,
`NetworkSettingsPanel`, hero header chips) was preserved.

---

## 6. Files changed

* `lib/network/networkDiscoveryAdapter.ts`
* `components/network/NetworkDiscoveryFeature.tsx`
* `components/network/NetworkSettingsPanel.tsx`
* `docs/NETWORK_DISCOVERY_BACKEND_REMOVAL_AND_RUNTIME_FIX.md` (new — this file)

---

## 7. Real-device verification checklist

These checks require a physical Android device or emulator with the NeoNetwork
plugin running. They cannot be performed from a remote container.

1. Launch the installed Android app.
2. Open the Network screen.
3. Confirm it does **not** hang on `INITIALIZING_NETWORK_MODULE...`. Within
   a few seconds the screen must reach one of `ready`, `partial-ready`, or
   the explicit `NETWORK_MODULE_INIT_FAILED` panel.
4. With the plugin present and DEMO_MODE off:
   * Header chip reads `LIVE ANDROID DISCOVERY` (or `LIVE LOCAL ANDROID DISCOVERY`).
   * Footer reads `LIVE LOCAL ANDROID DISCOVERY · NO BACKEND REQUIRED`.
5. Press `START_SCAN`. Observe immediate transition to scanning state. On
   completion confirm:
   * Device list, network status counters, and 3D map populate from
     `NativeScanResult` rather than `MOCK_*` data.
   * `LAST: …` timestamp updates.
   * Scan history gains an entry.
6. Force the native scan to fail (e.g. disable Wi-Fi mid-scan or run on a
   build without the plugin). Confirm:
   * Scan terminates within `NATIVE_SCAN_TIMEOUT_MS` for the selected mode.
   * `scanState` becomes `failed`.
   * Network alerts panel surfaces "Native discovery failed".
   * `START_SCAN` is re-enabled.
7. Disable the plugin entirely. Confirm:
   * Native-unavailable banner appears in `NetworkSettingsPanel` with the
     updated copy.
   * The Network screen still renders, no backend configuration is suggested.
   * `RETRY_LIVE_DISCOVERY` button reattempts initialization.
8. Toggle `DEMO_MODE` on. Confirm the chip and footer switch to
   `SIMULATED NETWORK DATA` / `SIMULATED BROWSER PREVIEW`, and scan controls
   operate against the demo adapter.

---

## 8. Verification receipts (this session)

* `npm ci` — installed 636 packages.
* `npm run typecheck` — `tsc --noEmit` passed with no errors.
* `npm run lint` — `eslint .` passed with no errors.
* `npm run build` — `next build` succeeded, prepared Capacitor web assets.
* `npx cap sync android` — synced 5 Capacitor plugins, no errors.

Android debug build (`./gradlew assembleDebug`) and physical-device verification
require a developer machine with the Android SDK installed; they are listed
in section 7.
