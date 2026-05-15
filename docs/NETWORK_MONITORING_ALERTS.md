# Network Monitoring and Alerts

NEO supports recurring network monitoring while the app is open and the Network module is mounted.

## Scheduler

The scheduler uses the existing Network settings:

- `autoScanEnabled`: enables or disables recurring in-app scans.
- `autoScanIntervalMinutes`: controls the next scan interval.
- `notifyNewDevices`: enables alerts for newly discovered devices.
- `notifyOfflineDevices`: enables alerts when trusted devices go offline.

The scheduler persists:

- `enabled`
- `nextRunAt`
- `lastRunAt`
- `lastCompletedAt`
- `lastIssue`
- `schedulerStatus`
- `notificationCapability`

## Android Background Truth

This build does not run closed-app WorkManager scans.

Reason: the project has a Capacitor JavaScript-driven Network UI and a native discovery plugin, but no WorkManager dependency or native background plugin bridge that can safely run the same scan pipeline, persist results, and notify the web layer while the app is closed. The truthful behavior is in-app recurring monitoring only.

Android local notifications are used when the app is open and notification permission is granted.

## Alert Rules

- New device: requires `notifyNewDevices`.
- Trusted device offline: requires `notifyOfflineDevices` and a trusted device state.
- Scan failed: always creates an in-app high-severity monitoring alert.
- Scan completed with notable changes: creates a summary alert when either notification toggle is enabled.
- If platform notifications are unavailable or permission is not granted, alerts remain in the in-app Alert Center and are marked `in-app-only`.

