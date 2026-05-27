# Phase 7 — Android Runtime Validation + Repo Hygiene

**Captured:** 2026-05-27  
**Host:** Windows, PowerShell  
**Package:** `com.neothenerd.app`

## Scope

Final stabilization verification pass after Phases 0-6. This pass validates the Android build/install/launch path on a real emulator runtime and cleans repo truth surfaces that were making old QA artifacts look current.

No product feature behavior was changed. Two validation hygiene fixes were made:

- `npm run android:debug` now uses a small Node wrapper so it works on Windows and Unix-like hosts.
- Vercel Analytics is suppressed inside native Capacitor runtime so the static APK no longer logs missing `/_vercel/insights/script.js` asset errors.

## Repo Hygiene

Commands run:

```text
git status --short
Get-ChildItem -Recurse -File -Depth 3 | Sort-Object FullName
```

Findings:

- Initial `git status --short` was clean.
- Local generated folders are present but ignored as expected: `.next/`, `out/`, `node_modules/`, Android Gradle caches.
- Tracked historical QA folders exist with old "current" naming:
  - `qa-android-screenshots-current/`
  - `qa-screenshots/`
  - `qa-stabilization/`
- These artifacts were not deleted because they may still be useful historical evidence.

Hygiene applied:

- Added archive notes to `qa-screenshots/README.md` and `qa-stabilization/README.md`.
- Marked `qa-android-screenshots-current/README.md` as historical despite the folder name.
- Current truth source is now explicit: use `docs/stabilization/` and the latest phase report.

## Toolchain

```text
node -v  -> v25.6.0
npm -v   -> 11.13.0
java     -> OpenJDK 21.0.10
ADB      -> 1.0.41, version 37.0.0-14910828
SDK dir  -> C:\Users\Aztr0nutZs\AppData\Local\Android\Sdk
```

`adb` and `emulator` were installed but not on `PATH`; validation used explicit SDK paths.

## Android Device / Emulator

Physical device:

- `adb devices -l` initially returned no attached physical devices.

Emulator discovery/start:

- AVD discovered: `Medium_Phone_API_36.1`
- Emulator started with:

```text
emulator -avd Medium_Phone_API_36.1 -no-snapshot -no-boot-anim
```

- Boot completed as `emulator-5554 device`, `sys.boot_completed=1`.

Network discovery note:

- This emulator validates install/launch/WebView/runtime wiring only.
- True LAN discovery remains physical-Android-only because emulator networking is NAT/virtualized.

## Build Receipts

First `npm run android:debug` exposed a Windows script blocker:

```text
'.' is not recognized as an internal or external command
```

Root cause: npm on Windows ran `cd android && ./gradlew assembleDebug` through `cmd`.

Fix:

- Added `scripts/assemble-android-debug.mjs`.
- Updated `android:debug` to:

```text
npm run android:sync && node scripts/assemble-android-debug.mjs
```

Fresh run after fix:

```text
npm run android:debug
```

Result:

```text
Next.js build: PASS
Capacitor sync: PASS
Gradle assembleDebug: BUILD SUCCESSFUL
244 actionable tasks: 27 executed, 217 up-to-date
```

APK:

```text
Path: android/app/build/outputs/apk/debug/app-debug.apk
Size: 118,278,093 bytes
SHA-256: 356B347D766001386B2954D794D6D95C49A00D93FE4DDD3C784905B0535D0016
```

`aapt2 dump badging`:

```text
package: name='com.neothenerd.app' versionCode='1' versionName='1.0'
minSdkVersion:'24'
targetSdkVersion:'36'
launchable-activity: name='com.neothenerd.app.MainActivity' label='NEO the Nerd'
```

## Install + Launch Receipts

Install:

```text
adb -s emulator-5554 install -r android/app/build/outputs/apk/debug/app-debug.apk
Performing Streamed Install
Success
```

Cold launch:

```text
adb -s emulator-5554 shell am start -W -n com.neothenerd.app/.MainActivity
Status: ok
LaunchState: COLD
Activity: com.neothenerd.app/.MainActivity
TotalTime: 6268
WaitTime: 6360
Complete
```

Focused app/window:

```text
mCurrentFocus=Window{... com.neothenerd.app/com.neothenerd.app.MainActivity}
mFocusedApp=ActivityRecord{... com.neothenerd.app/.MainActivity ...}
```

Visual inspection:

- A temporary screenshot was captured to `%TEMP%\neo-phase7-android-launch.png` and was not committed.
- The screenshot showed the post-boot NEO main screen with status bar, reactor/avatar stage, network summary card, and bottom dock rendered.

## Runtime Log Receipts

Capacitor startup:

```text
Registering plugin instance: NeoNetwork
Registering plugin instance: NeoTts
Registering plugin instance: Filesystem
Registering plugin instance: LocalNotifications
Registering plugin instance: Network
Registering plugin instance: Preferences
Registering plugin instance: Share
App started
```

Boot/media lifecycle:

```text
[NEO_BOOT] BootSeq mounted
[NEO_BOOT] canplay
[NEO_BOOT] play attempt
[NEO_BOOT] play success
[NEO_BOOT] canplaythrough
[NEO_BOOT] ended
[NEO_BOOT] boot_finish
[NEO_BOOT] boot_overlay_dismissed
[NEO_BOOT] first interactive paint
[NEO_BOOT] post_boot_media_ready
```

Runtime error check after the analytics fix:

- No `AndroidRuntime` fatal crash found.
- No `FATAL EXCEPTION` found.
- No `TypeError`, `ReferenceError`, or `SyntaxError` found.
- No `_vercel` or `Unable to open asset URL: https://localhost/_vercel/insights/script.js` error found after rebuild/reinstall/relaunch.

## Result

Android emulator runtime: **PASS for build, install, launch, WebView startup, Capacitor plugin registration, and boot/media handoff.**

Physical LAN discovery: **NOT CLAIMED.** Requires a real Android device connected to Wi-Fi.

No screenshots, logcat dumps, APKs, or build outputs were committed in this pass.
