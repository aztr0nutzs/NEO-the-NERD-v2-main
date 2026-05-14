# Native Android Network Discovery (Capacitor)

## Supported runtime
- Android runtime inside Capacitor WebView.
- Uses Capacitor plugin name: `NeoNetwork`.
- Non-Android or unavailable-plugin runtime falls back to demo adapter.

## Android permissions
Required and used:
- `android.permission.INTERNET`
- `android.permission.ACCESS_NETWORK_STATE`
- `android.permission.ACCESS_WIFI_STATE`

Not added:
- Location permissions (not required for bounded subnet scan implementation)
- Any dangerous/root permissions

## Native plugin API
Methods:
1. `getLocalNetworkContext()`
   - `localIp`, `gatewayIp`, `prefixLength`, `subnet`
   - `networkName` (SSID where available)
   - `connectionType`
   - `adapterStatus`, `limitedData`

2. `scanLocalSubnet(options)`
   - Options: `scanMode`, `maxHosts`, `timeoutMs`, `commonPorts`
   - Bounded to detected local subnet only
   - Returns `hosts`, `scannedHosts`, `discoveredHosts`, `limitedData`, `message`

3. `getGatewayInfo()`
   - `gatewayIp`
   - `hostname` (reverse lookup when available)
   - `reachable`
   - `dataLimited`

## Scan modes (bounded behavior)
- `quick`: defaults around 64 hosts, short per-port timeout.
- `balanced`: defaults around 128 hosts, medium timeout.
- `deep`: defaults up to 254 hosts, longer timeout.

All modes:
- remain subnet-local only
- use bounded worker concurrency
- use bounded socket timeouts
- avoid external/public internet targets

## Data availability truthfulness
Truly available when obtainable:
- local IPv4/prefix/gateway
- discovered IP reachability via bounded port probes
- hostname (if reverse DNS resolves)
- MAC when present in ARP cache
- open ports only for probed ports that accepted connection

May be unavailable:
- SSID/network name
- MAC addresses for some hosts
- vendor mapping
- router model/firmware/uptime

No fake values are generated for unavailable fields.

## Demo fallback behavior
- Adapter attempts Android native bridge first.
- If native path unavailable/fails, adapter uses existing demo adapter.
- UI state labels distinguish live discovery vs demo/fallback.

## Limitations
- ARP cache visibility varies by device/OEM/Android version.
- Reverse DNS is best-effort.
- Open-port hints are limited to configured `commonPorts` probes.
- Topology relationships remain estimated unless independently confirmed.

## Real-device test steps
1. `npm run lint`
2. `npm run build`
3. `npx cap sync android`
4. `cd android && ./gradlew assembleDebug`
5. Install and run on Android device connected to local Wi-Fi.
6. In Network module:
   - disable demo mode
   - run scan in quick/balanced/deep
   - verify labels: LIVE ANDROID DISCOVERY / DEMO ADAPTER / LIMITED DATA as appropriate
