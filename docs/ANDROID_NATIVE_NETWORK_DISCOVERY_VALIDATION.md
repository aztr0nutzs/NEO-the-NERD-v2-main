# Android Native Network Discovery Validation

Date: 2026-05-16

## Target

- Target: Android emulator `emulator-5554`
- Model: `sdk_gphone64_x86_64`
- Android: 16
- Wi-Fi context from emulator: `AndroidWifi`, local IP `10.0.2.16/24`
- Gateway reported by Android Wi-Fi stack: `10.0.2.2`

No physical Android device was connected. `adb` was available at:

```powershell
C:\Users\Aztr0nutZs\AppData\Local\Android\Sdk\platform-tools\adb.exe
```

## Build And Install

Commands executed against current source:

```powershell
npm run typecheck
npm run lint
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
cd ..
adb -s emulator-5554 install -r android\app\build\outputs\apk\debug\app-debug.apk
adb -s emulator-5554 shell pm clear com.neothenerd.app
adb -s emulator-5554 shell monkey -p com.neothenerd.app -c android.intent.category.LAUNCHER 1
```

The emulator initially lacked enough installable app storage. The AVD was restarted with `-wipe-data`, leaving about 4.9 GB free on `/data`, then the current debug APK installed successfully.

## Runtime Mode On Launch

The installed app registered the native plugin:

```text
Registering plugin instance: NeoNetwork
```

The first-run Network step reported:

```text
LIVE SCAN AVAILABLE
Your build has the native plugin loaded. Run a real scan to discover devices currently on your Wi-Fi.
```

The Network screen reported:

```text
LIVE ANDROID DISCOVERY
REAL NETWORK DATA // COMPLETE
```

No backend/server/cloud configuration prompt appeared in the local discovery flow.

## Scan Result Behavior

Native scan was started from the installed Android app. Logcat recorded the native plugin result:

```text
NeoNetworkPlugin: scanLocalSubnet completed scanMode=balanced scannedHosts=128 discoveredHosts=0
```

The JavaScript bridge received the native result:

```json
{
  "scanMode": "balanced",
  "adapterStatus": "active",
  "limitedData": false,
  "hosts": [],
  "localContext": {
    "localIp": "10.0.2.16",
    "prefixLength": 24,
    "subnet": "10.0.2.16/24",
    "connectionType": "wifi",
    "adapterStatus": "active",
    "limitedData": false
  },
  "scannedHosts": 128,
  "discoveredHosts": 0,
  "message": "Bounded local subnet scan complete."
}
```

The emulator NAT network returned zero discovered hosts. This is an honest native result, not a demo fixture.

## Device List Behavior

The device list showed:

```text
DEVICE_INTEL 0 / 0
ALL 0
ONLINE 0
NEW 0
TRUSTED 0
WATCH 0
BLOCKED 0
UNKNOWN 0
NO_DEVICES_MATCH_FILTER
```

This matched the native plugin result `hosts: []` and `discoveredHosts: 0`. No static demo device set appeared.

## 3D Map Behavior

The 3D Network Map was opened after the native scan. It showed:

```text
3D NETWORK TOPOLOGY
ESTIMATED LOGICAL TOPOLOGY
```

The topology canvas rendered an empty grid with no device nodes, matching the native scan result of zero discovered hosts. No demo-only placeholder topology or hardcoded device nodes appeared in live Android mode.

## Demo Mode Behavior

No explicit demo-mode switch was exercised during this Android installed-app validation. The installed app defaulted to live Android discovery with the native plugin available.

## Browser Preview

Browser/dev preview messaging was not revalidated in this pass. This pass focused on the required installed Android runtime validation.

## Screenshots And Logs

Artifacts are in `qa-screenshots/android-network-validation/`:

- `03-after-boot-fix.png`
- `04-post-boot.png`
- `14-after-onboarding-more3.png`
- `17-network-screen-before-scan.png`
- `19-network-lower-sections.png`
- `22-3d-map-canvas.png`
- `23-devices-tab.png`
- `android-logcat-first-scan.txt`

## Notes

A concrete startup blocker was found before Network validation: the boot overlay only notified completion on successful video end, despite the code comment saying it should unmount when boot finishes or fails. On this emulator that left the app hidden when the boot video path used the fail/failsafe route. The minimal fix was to call the parent completion handler for any completed boot status, success or fail. No Network UI redesign or feature removal was performed.

## Verdict

PASS for emulator validation.

The installed Android app used the native `NeoNetwork` plugin directly, did not require a backend, completed a bounded local subnet scan, and rendered device/map state from the native zero-result scan rather than demo data.

Remaining real-device validation: run the same build on a physical LAN where discoverable peers exist to verify nonzero device cards and nonzero topology nodes.
