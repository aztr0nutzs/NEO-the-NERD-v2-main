# Network Discovery Runtime

## What Discovery Can Do

- Read Android local network context when available: SSID, local IP, gateway IP, prefix length, subnet, and connection type.
- Run bounded local subnet scans through the native Android `NeoNetwork` Capacitor plugin.
- Discover devices that respond through gateway reachability, ARP cache entries, bounded TCP probes, hostname lookup, and SSDP/UPnP responses.
- Store local-only user labels, trust/review state, room/owner labels, and notes in app state.
- Build an estimated topology map from discovered devices.

## What It Cannot Guarantee

- It cannot guarantee every device on the network is discovered.
- Sleeping devices, firewalled devices, client-isolated Wi-Fi, VPNs, guest networks, and privacy settings can hide devices.
- Generic discovery cannot block, pause, kick, reboot, or modify router settings.
- Vendor/manufacturer is unavailable unless a deterministic source supplies it.
- Topology links are estimated unless a future router connector proves physical associations or paths.

## Emulator Limitation

Android emulators usually expose a virtual network such as `10.0.2.x` and gateway `10.0.2.2`. That is not a real home LAN view. Emulator testing may validate UI and permission flow, but it is not a real LAN discovery PASS.

## Required Android Permissions

- `INTERNET`
- `ACCESS_NETWORK_STATE`
- `ACCESS_WIFI_STATE`
- `ACCESS_FINE_LOCATION`
- `ACCESS_COARSE_LOCATION`
- `NEARBY_WIFI_DEVICES` on Android 13+
- `CHANGE_WIFI_MULTICAST_STATE` for SSDP/UPnP multicast discovery

Location Services must also be enabled for SSID/Wi-Fi metadata on many Android builds.

## Scan Modes

- Quick Scan: up to 64 centered hosts, ARP cache, gateway, and TCP probes for 80/443. Expected around 5-20 seconds.
- Balanced Scan: recommended default, up to /24 or 254 hosts, ARP, hostname, SSDP/UPnP, and TCP probes for 80/443/22/8080. Expected around 25-60 seconds.
- Deep Scan: up to /24 or 254 hosts, wider TCP probes for 80/443/53/22/445/8080/8443/139 plus SSDP. Expected around 75-150 seconds.

All modes are bounded and may return partial coverage when the subnet is larger than the cap or the native time budget expires.

## Physical Device Test Checklist

- Install the Android app on a physical Android phone.
- Connect the phone to Wi-Fi, not cellular-only.
- Disable Demo Mode in Network Config.
- Grant Location permission.
- Grant Nearby Wi-Fi permission when Android asks.
- Enable Location Services.
- Keep the phone awake while scanning.
- Run Quick, then Balanced, then Deep if needed.
- Confirm discovered device names/IPs are real local devices and not mock data.
- Confirm map truth label remains Estimated Topology unless relationships are proven.
- Confirm empty/failure states explain the blocker and do not inject demo devices.

## Troubleshooting

- Permission needed: grant Location and Nearby Wi-Fi permissions, then retry.
- SSID unavailable: enable Location Services, connect to Wi-Fi, and refresh diagnostics.
- Gateway/local IP unavailable: disconnect VPN/cellular-only paths and use physical Wi-Fi.
- No devices responded: try Balanced/Deep, keep the phone awake, and remember some devices block scans.
- Emulator limited: use a physical Android device before claiming real LAN discovery pass.
- Router control wanted: add a connector-backed router integration; generic LAN discovery is read-only.

## Runtime Validation Commands

```bash
npm run typecheck
npm run lint
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb logcat | grep NeoNetworkPlugin
```

Expected native log line after a completed scan:

```text
scan_completed scannedHosts=... discoveredHosts=...
```

## Pass/Fail Criteria

- PASS: Live Android mode reports native runtime, permissions are visible, scan source is native Android, discovered devices come only from native scan results, and failures show exact next actions.
- PASS: Demo Mode is clearly labeled simulated and never masquerades as live discovery.
- PASS: Topology is labeled estimated and device links are presented as inferred.
- FAIL: Demo/mock devices appear while Live mode is selected and native discovery is unavailable.
- FAIL: UI claims all devices were discovered.
- FAIL: Permission denial appears only as a generic scan failure.
- FAIL: Emulator-only testing is reported as real LAN discovery success.
