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
   - Host records include `discoverySources`, `confidence`, `dataLimited`, and `lastScanSource`

3. `getGatewayInfo()`
   - `gatewayIp`
   - `hostname` (reverse lookup when available)
   - `reachable`
   - `dataLimited`

## Scan modes (bounded behavior)
- `quick`: local context + gateway + shallow bounded TCP host probe (`48` default hosts, `80/443`, short timeout). ARP/MAC extraction and SSDP are intentionally off.
- `balanced`: quick behavior with broader host cap (`128` default), hostname lookup, ARP/MAC cache read, bounded TCP ports (`80/443/53/22/445/8080`), and bounded SSDP M-SEARCH.
- `deep`: balanced behavior with larger host cap (`220` default), longer timeout, bounded SSDP, and expanded bounded TCP ports (`80/443/53/22/445/8080/8443/139`).

Current Android native implementation does **not** run mDNS, SNMP, router admin APIs,
or a full unbounded port scan. SSDP is implemented as local-subnet-filtered UDP
M-SEARCH only; responses are treated as provenance, not as proof of controllability.

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
- SSDP responders on the local subnet when they answer M-SEARCH

May be unavailable:
- SSID/network name
- MAC addresses for some hosts
- vendor mapping
- mDNS/Bonjour names/services
- router model/firmware/uptime

No fake values are generated for unavailable fields.

## Discovery confidence
- `high`: multiple independent observations such as gateway + ARP + TCP/SSDP, or a strong combination with hostname/MAC.
- `medium`: at least one solid discovery source plus supporting data, for example ARP + hostname or SSDP + MAC.
- `low`: a single weak/local observation with limited supporting metadata.

Sources are merged per IP. `lastScanSource` reports the highest-priority source
seen for that host: `gateway`, `ssdp`, `tcp-probe`, `arp`, then `hostname`.

## Demo fallback behavior
- Adapter attempts Android native bridge first.
- If native path unavailable/fails, adapter uses existing demo adapter.
- UI state labels distinguish live discovery vs demo/fallback.

## Limitations
- ARP cache visibility varies by device/OEM/Android version.
- Reverse DNS is best-effort.
- SSDP depends on devices responding to UDP multicast and may be blocked by AP isolation or OEM networking policy.
- mDNS is not implemented in this native plugin path because reliable Android multicast DNS parsing requires a larger responder/parser layer and permissions/runtime testing not present in this build.
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
