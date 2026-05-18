# QA Android Runtime Report — Current Cycle

**App under audit:** NEO the Nerd (`com.neothenerd.app`)
**Cycle date (UTC):** 2026-05-18
**Branch:** `claude/android-runtime-evidence-qqpiY`
**Author:** Claude Code on the web (managed remote execution environment)

> **Note on app naming.** The audit task referenced "the Darts app". No
> "darts" reference exists anywhere in this repository
> (`grep -ril 'darts' .` → empty). The application bundle, capacitor
> config, namespace, gradle module, and launchable activity all identify
> the app as **NEO the Nerd** (`com.neothenerd.app`,
> `com.neothenerd.app.MainActivity`). This report covers that
> application. If a different repository was intended, the audit needs
> to be re-pointed at it; nothing this cycle changes that answer.

---

## A. Host Android capability summary

| Capability                       | State                | Evidence                                                                                  |
| -------------------------------- | -------------------- | ----------------------------------------------------------------------------------------- |
| JDK 21                           | Present              | `/usr/lib/jvm/java-21-openjdk-amd64`, `java -version` → `openjdk 21.0.10 2026-01-20`.     |
| Gradle 8.14.3 (system)           | Present              | `/opt/gradle/bin/gradle`.                                                                 |
| Gradle wrapper (project)         | Present              | `android/gradlew` (executable).                                                            |
| Node 22 / npm 10                 | Present              | `/opt/node22/bin/node`, `/opt/node22/bin/npm`.                                            |
| Android SDK (installed this run) | Present              | Installed at `/opt/android-sdk` (`cmdline-tools/latest`, `platforms/android-36`, `build-tools/36.0.0`, `platform-tools`). |
| `adb` (platform-tools)           | Present, no devices  | `adb version` → `1.0.41 / 37.0.0-14910828`. `adb devices` → empty list.                  |
| `emulator` binary                | **Not installed**    | `/opt/android-sdk/emulator/` does not exist. Could be installed via `sdkmanager`, but…  |
| **`/dev/kvm`**                   | **Missing**          | `ls -la /dev/kvm` → `No such file or directory`.                                          |
| CPU virtualization extensions    | **Not exposed**      | `egrep -c '(vmx\|svm)' /proc/cpuinfo` → `0`. Container kernel is `Linux 6.18.5`.          |
| Physical device                  | **Not connected**    | No USB passthrough in the remote execution environment; `adb devices` is empty.           |

**Net result:** the host can lint, build, package, and statically inspect
the APK. It **cannot** boot an Android runtime, install the APK, launch
the Activity, capture screenshots, or collect logcat.

## B. Commands run

```bash
# 1. Probe host
which adb java gradle node npm sdkmanager emulator
ls -la /dev/kvm; egrep -c '(vmx|svm)' /proc/cpuinfo

# 2. Install Android SDK (host had none)
curl -sSL -o /tmp/cmdline-tools.zip \
  https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip -q /tmp/cmdline-tools.zip -d /opt/android-sdk/cmdline-tools/
mv /opt/android-sdk/cmdline-tools/cmdline-tools /opt/android-sdk/cmdline-tools/latest
export ANDROID_HOME=/opt/android-sdk
export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH
yes | sdkmanager --licenses >/dev/null 2>&1
sdkmanager --install "platform-tools" "platforms;android-36" "build-tools;36.0.0"

# 3. Web build
npm ci
npm run lint
npm run build         # next build && node scripts/prepare-capacitor.mjs

# 4. Capacitor sync
npx cap sync android

# 5. APK build
( cd android && ./gradlew assembleDebug --no-daemon )

# 6. APK static inspection
APK=android/app/build/outputs/apk/debug/app-debug.apk
ls -la "$APK"
sha256sum "$APK"
$ANDROID_HOME/build-tools/36.0.0/aapt2 dump badging "$APK"
unzip -l "$APK" | grep -E "assets/public/(index\.html|cordova\.js)|capacitor\.config\.json"

# 7. Confirm runtime gap
adb version
adb devices     # → empty
ls /dev/kvm     # → No such file or directory
```

## C. APK build result — SUCCESS

* Path: `android/app/build/outputs/apk/debug/app-debug.apk`
* Size: 65,070,923 bytes (~62 MiB)
* SHA-256: `09783ca09679e638b169cc7aaafb4260ac489868a126f8d106d8715216f9d6fa`
* `package:` `com.neothenerd.app`, versionCode 1 / versionName 1.0
* `minSdkVersion`: 24 • `targetSdkVersion`: 36 • `compileSdkVersion`: 36
* `launchable-activity`: `com.neothenerd.app.MainActivity` (label "NEO the Nerd")
* Permissions declared:
  `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`,
  `RECORD_AUDIO`, `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`,
  `WAKE_LOCK`, `FOREGROUND_SERVICE`,
  `com.neothenerd.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`.
* Web payload present:
  `assets/capacitor.config.json` (125 B),
  `assets/public/index.html` (77,407 B),
  `assets/public/cordova.js` (0 B; expected — Capacitor stub),
  57 entries directly under `assets/public/`, 24 of them
  `_next/static/chunks/*`.
* Launcher icons present across `mipmap-{m,h,xh,xxh,xxxh}dpi-v4`.
* Gradle: 244 actionable tasks, 244 executed. **BUILD SUCCESSFUL in 1m 54s.**

## D. Install / launch result — **NOT PERFORMED THIS CYCLE**

* `adb install -r app-debug.apk` — **not run.** No connected device, no
  emulator, no `/dev/kvm`.
* `adb shell am start -n com.neothenerd.app/.MainActivity` — **not run.**
* `adb exec-out screencap …` — **not run.**
* `adb logcat …` — **not run.**

This is the remaining release-confidence gap. It is identical to the gap
the audit named as "the biggest remaining release-confidence gap". It is
**not** resolved this cycle.

## E. Screenshots created

| File                                              | Status this cycle                                     |
| ------------------------------------------------- | ----------------------------------------------------- |
| `qa-android-screenshots-current/00_apk_build_evidence.txt` | **Created** (SHA-256, aapt2 dump, payload listing).  |
| `qa-android-screenshots-current/00_build_log_summary.txt`  | **Created** (lint, web build, sync, gradle summary). |
| `qa-android-screenshots-current/README.md`                 | **Created** (scope + local runbook).                 |
| `01_android_launch.png`                           | **Not captured.** No runtime on host.                 |
| `02_android_main_menu.png`                        | **Not captured.** No runtime on host.                 |
| `03_android_loadout.png`                          | **Not captured.** No runtime on host.                 |
| `04_android_gameplay_hud.png`                     | **Not captured.** No runtime on host.                 |
| `05_android_settings.png`                         | **Not captured.** No runtime on host.                 |
| `06_android_multiplayer_lobby_or_unavailable.png` | **Not captured.** No runtime on host.                 |
| `07_android_boss_hud.png`                         | **Not captured.** No runtime on host.                 |

No prior-cycle screenshots are reused, copied, or republished. Stale
Android shots remain in their original folders
(`qa-screenshots/android-network-validation/`,
`qa-screenshots/final-recovery-validation/`) and are **not** referenced
as current-cycle proof.

## F. Logcat findings — **NONE COLLECTED THIS CYCLE**

`adb logcat` was not run because no Android target exists. Specifically,
none of the following could be observed this cycle:

* startup logs from `MainActivity` / `BridgeActivity`
* `chromium`-tagged WebView console messages
* asset-loading failures (e.g. `net::ERR_FILE_NOT_FOUND` for any
  `file:///android_asset/public/_next/*`)
* JavaScript runtime exceptions (`Uncaught`, `TypeError`,
  `ReferenceError`)
* socket / backend errors (Capacitor Network plugin, `/api/*` fetches)

The static APK inspection confirms the assets that **would** be loaded
exist inside the package, but loading them is a runtime property and is
not asserted here.

## G. Required-question answers

| #   | Question                                                                 | Answer                                                                                                                                  |
| --- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Did the app install?                                                     | **Not verified this cycle.** No Android target available. `adb install` was not run.                                                    |
| 2   | Did it launch?                                                           | **Not verified this cycle.** No launch was attempted. The APK declares `com.neothenerd.app.MainActivity` as launchable (static evidence). |
| 3   | Was the blank white screen absent?                                       | **Cannot answer this cycle.** Requires a launched WebView.                                                                              |
| 4   | Did JS and CSS render?                                                   | **Cannot answer this cycle.** Static evidence: `assets/public/index.html` and `_next/static/chunks/*.{js,css}` are packaged.            |
| 5   | Did current black-first screens appear?                                  | **Cannot answer this cycle.** Visual property of a running WebView.                                                                     |
| 6   | Were assets visible?                                                     | **Cannot answer this cycle.** Static evidence: avatar `*.mp4`, background PNGs, manifest, icons all present inside the APK.             |
| 7   | Were any Android-only issues observed?                                   | **None observed (no runtime).** No false positives or negatives can be reported without a launched session.                             |
| 8   | Did the app install? (re-asked at top of original list)                  | See row 1 above.                                                                                                                        |

## H. Remaining Android blocker

**Blocker:** No KVM, no virt-capable CPU exposed, no USB-attached device,
no `emulator` system image runnable in software-only TCG within the
session lifetime.

* **Exact unavailable dependency:** `/dev/kvm` (and CPU `vmx`/`svm`
  flags) on the execution host — required for the Android emulator —
  and the absence of any physical Android device on `adb`.
* **Commands attempted but blocked:** `adb install -r`,
  `adb shell am start -n com.neothenerd.app/.MainActivity`,
  `adb exec-out screencap -p`, `adb logcat -d -v threadtime`. All were
  intentionally **not invoked** because `adb devices` returns an empty
  list.
* **What succeeded statically:** lint, web build, Capacitor sync, Gradle
  `assembleDebug`, APK signature/badging extraction, asset payload
  enumeration, SHA-256 hashing of the packaged APK.

The precise command sequence to close the gap on any KVM-capable Linux
box (or any macOS / Windows host with an AVD or a USB-connected Android
device) is in
[`qa-android-screenshots-current/README.md`](qa-android-screenshots-current/README.md),
sections 0 → 5. Following that runbook produces the seven PNGs and the
matching logcat files, after which questions 1–7 above can be answered
empirically and this report can be amended in place on the same branch.
