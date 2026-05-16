# Network Discovery Runtime Truth

- Local Android device discovery does **not** require any backend.
- Installed Android app uses the `NeoNetwork` native plugin directly (`getLocalNetworkContext`, `scanLocalSubnet`, `getGatewayInfo`).
- Browser/web preview uses clearly labeled simulated demo discovery data.
- If native plugin is unavailable/fails on Android, UI reports native-unavailable/scan-failed and offers retry; backend is not presented as the fix.

## Runtime Priority
1. Android + plugin available: live local scan via native plugin.
2. Android + plugin unavailable/failure: truthful native unavailable/failure state, optional demo preview.
3. Browser/web preview: simulated demo discovery with explicit label.

## Backend Scope (non-blocking for discovery)
Backends may still support optional AI interpretation, provider TTS, remote sync, or hosted tests, but **never gate local LAN discovery**.

## Manual Android Validation
1. Install Android build with Capacitor plugins registered.
2. Open Network screen; confirm live status labels.
3. Run scan in quick/balanced/deep.
4. Verify device list + topology reflect native scan outputs.
5. Toggle Demo Preview and confirm explicit simulated labels.
