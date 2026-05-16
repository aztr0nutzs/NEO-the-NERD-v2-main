# N.E.O. Network Native Adapter Contract

This contract is the boundary for real network discovery. Browser code must not perform LAN scans directly.

## Adapter Selection

- Demo Mode on: `demoNetworkAdapter`
- Demo Mode off: `nativeNetworkAdapter`
- Browser preview: simulated network data with explicit browser-preview messaging.
- Installed Android with `NeoNetwork` plugin available: live local LAN discovery through the native plugin.
- Installed Android native failure: truthful native-unavailable/failure state, with optional labeled demo fallback.

## Native Bridge

An Android Capacitor/WebView implementation may expose:

```ts
window.NeoNetworkDiscovery = {
  getAdapterStatus,
  getNetworkStatus,
  startNetworkScan,
  stopNetworkScan,
  getDiscoveredDevices,
  getDeviceDetails,
  getRouterStatus,
  getScanHistory,
  getSecurityInsights,
  getNetworkTopology,
}
```

The bridge is read-only in this phase. Do not expose router reboot, block, wake, QoS, guest network, or trust/write actions yet.

## Optional Connector Endpoints

Basic Android LAN discovery does not require any backend, server, or configured remote endpoint.
If a separate local connector is added for router-control or provider extras, it may use:

```env
NEXT_PUBLIC_NEO_NETWORK_BACKEND_URL=http://127.0.0.1:PORT
```

Possible read endpoints for that optional connector:

- `GET /health`
- `GET /status`
- `POST /scan` with `{ "mode": "quick" | "balanced" | "deep" }`
- `POST /scan/stop`
- `GET /devices`
- `GET /devices/:deviceId`
- `GET /router`
- `GET /history`
- `GET /insights`
- `GET /topology`

Expected real data:

- Network status, including gateway IP, local IP, subnet, connection type, and scan state.
- Device discovery results, including IP address, MAC address when available, hostname, vendor hint, type hint, status, trust level, open ports/services when available.
- Router/gateway status as read-only facts.

Browser preview must remain simulated and must say so. The installed Android app should use the `NeoNetwork` native plugin for local scan data.

## Topology Truth Rule

Generated topology from scan results must use:

```ts
topologyMode: "estimated"
relationshipsConfirmed: false
```

Only use:

```ts
topologyMode: "backend-confirmed"
relationshipsConfirmed: true
```

when the native plugin or a dedicated connector can prove relationships from real routing, ARP, AP association, router API, or another reliable source.

## Android QA Checklist

- Install on a physical Android device connected to Wi-Fi.
- Disable Demo Mode in Network settings.
- Confirm the header shows live Android discovery status.
- Run Quick scan and verify gateway IP/local IP match the device network.
- Verify discovered devices are real LAN entries, not mock names.
- Verify hostname/vendor hints appear only when available.
- Verify topology badge remains `ESTIMATED LOGICAL TOPOLOGY` unless relationships are proven.
- Disable or break the native plugin path and verify the UI reports native discovery unavailable or labeled demo fallback.
- Confirm router/device control actions do not execute from the discovery-only native mode.


## Current Android Native Plugin Truth Notes

- Scan modes now map to bounded native profiles (quick/balanced/deep) with explicit host caps, timeout, and bounded port sets.
- Discovery provenance includes `discoverySources`, `confidence`, `dataLimited`, and `lastScanSource`.
- MAC addresses are only reported from ARP when present; vendor is `Unavailable` unless a deterministic source is added.
- Service hints are conservative `Possible service: ...` labels derived from open TCP ports.
- SSDP/UPnP discovery is implemented for Balanced and Deep as local-subnet-filtered UDP M-SEARCH.
- mDNS/Bonjour discovery is currently not implemented in this native plugin path.
