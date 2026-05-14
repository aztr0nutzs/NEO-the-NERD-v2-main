# N.E.O. Network Native/Backend Adapter Contract

This contract is the boundary for real network discovery. Browser code must not perform LAN scans directly.

## Adapter Selection

- Demo Mode on: `demoNetworkAdapter`
- Demo Mode off: `nativeNetworkAdapter`
- Native/backend failure: `networkAdapter` falls back to demo data and reports `DEMO_FALLBACK`

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

## Backend Endpoints

If using a local/native backend, set:

```env
NEXT_PUBLIC_NEO_NETWORK_BACKEND_URL=http://127.0.0.1:PORT
```

Required read endpoints:

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

when the native/backend layer can prove relationships from real routing, ARP, AP association, router API, or another reliable source.

## Android QA Checklist

- Install on a physical Android device connected to Wi-Fi.
- Disable Demo Mode in Network settings.
- Confirm the header shows `NATIVE_DISCOVERY_CONNECTED` or `NATIVE_BACKEND_CONNECTED`.
- Run Quick scan and verify gateway IP/local IP match the device network.
- Verify discovered devices are real LAN entries, not mock names.
- Verify hostname/vendor hints appear only when available.
- Verify topology badge remains `ESTIMATED LOGICAL TOPOLOGY` unless relationships are proven.
- Disconnect or stop the native/backend service and verify the UI shows `DEMO_FALLBACK`.
- Confirm router/device control actions do not execute in native/backend mode.
