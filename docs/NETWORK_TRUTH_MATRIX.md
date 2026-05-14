# Network Discovery Truth Matrix

| Runtime | Native plugin available | Demo mode | Adapter label | Data source | Scan behavior |
|---|---:|---:|---|---|---|
| Android | yes | OFF | LIVE_ANDROID_DISCOVERY | NeoNetwork plugin (`getLocalNetworkContext`, `scanLocalSubnet`, `getGatewayInfo`) | Real native bounded subnet scan; progress/state from native path |
| Android | yes | ON | SIMULATED NETWORK DATA / DEMO ADAPTER | Mock/demo adapter only | Simulated scan explicitly labeled demo |
| Android | no | OFF | SIMULATED NETWORK DATA (fallback reason shown) | None live; no silent live simulation | Live attempt fails to fallback state; UI shows limited/unavailable |
| Web/browser | no | ON or fallback | SIMULATED NETWORK DATA / DEMO ADAPTER | Mock/demo adapter | Simulated scan explicitly labeled demo |

Notes:
- Demo mode is now user-controlled and no longer auto-disabled when native is available.
- When demo is OFF and native fails, adapter throws and UI marks fallback/unavailable instead of silently switching to fake-live demo path.
