# Phase 3 — Network + Router Operational Diagnostics

**Captured:** 2026-05-27

This pass makes the Network Discovery and Router surfaces explicitly diagnosable at runtime. It does not implement router control, closed-app monitoring, fake discovery data, or new connector behavior.

## Inspected Paths

- Native Android plugin: `NeoNetworkPlugin` registration, permissions, Wi-Fi context, gateway lookup, subnet scan bounds, ARP parsing, TCP probes, SSDP discovery, and completion logging.
- Android manifest: network, Wi-Fi, location, nearby Wi-Fi, multicast, notification, and audio declarations.
- Plugin registration: `MainActivity` registers `NeoNetworkPlugin`.
- UI scan path: native Android, browser/demo, native-unavailable, permission-denied, scan-failed, and empty-result states.
- Router path: gateway-derived read-only status, connector-required actions, and unsupported action handling.

## Runtime Diagnostics Added

The Network screen now includes a `NETWORK TRUTH PANEL` that reports:

- Runtime platform.
- Scan source: native, browser, demo, or unavailable.
- Location and nearby Wi-Fi permission state.
- Location Services requirement for SSID access.
- SSID with unavailable reason framing.
- Gateway IP with unavailable reason framing.
- Local IP/subnet.
- Current scan mode.
- Scanned host count and discovered host count.
- Last scan duration and last scan error.
- Topology confidence: `LIVE`, `ESTIMATED`, or `DEMO`.
- Demo/fallback status.
- Router mode, gateway, and per-action truth labels.

## Native Logging

The Android plugin now emits a logcat completion line for both limited-data and normal scan completions:

```text
scan_completed scannedHosts=... discoveredHosts=...
```

The line also includes duration and scan detail fields so physical-device validation can verify whether the plugin scanned hosts, discovered hosts, or stopped because context was limited.

## Truth Constraints

- Real scan mode does not inject demo devices.
- Browser/runtime preview remains demo or unavailable, not true LAN discovery.
- Router controls remain `READ ONLY` / `CONNECTOR REQUIRED` unless a real connector-backed mode exists.
- Missing SSID, gateway, IP, or subnet data is framed with likely causes: denied location permission, missing nearby Wi-Fi permission, Location Services off, emulator networking, non-Wi-Fi connection, VPN/routing limits, or Android privacy restrictions.

## Validation Notes

Code validation:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `android/gradlew.bat assembleDebug`

Physical Android validation is still required for true LAN discovery. Emulator validation can verify UI state and plugin availability, but it cannot prove real LAN host discovery.
