# qa-android-screenshots-current/

> Historical artifact: despite the folder name, this is not the current validation source. Use `docs/stabilization/` and the latest phase report for current Android runtime status.

**App under audit:** `com.neothenerd.app` ("NEO the Nerd") — debug APK built this cycle.

**Cycle date (UTC):** 2026-05-18
**Branch:** `claude/android-runtime-evidence-qqpiY`

## Why this folder does not contain device PNGs

The runtime steps **install → launch → screenshot → logcat** were not performed
this cycle because the execution host cannot run an Android device or emulator.

This folder contains the artifacts that **were** produced this cycle:

| File                          | What it proves                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| `00_apk_build_evidence.txt`   | The actual debug APK exists this cycle: file size, SHA-256, `aapt2 dump badging`, web payload listing, SDK versions used. |
| `00_build_log_summary.txt`    | Lint, web build, Capacitor sync, and `./gradlew assembleDebug` all completed cleanly this cycle. |
| `README.md` (this file)       | Honest scope note + reproducible local runbook.                                             |

The six (or seven) device PNGs required by the audit (`01_android_launch.png`
… `07_android_boss_hud.png`) are **deliberately absent**. Per the audit's
strict rules:

> Do NOT claim Android success unless the APK is actually built, installed,
> and launched. Do NOT reuse stale screenshots.

Stale Android screenshots from prior cycles already live under
`qa-screenshots/android-network-validation/` and
`qa-screenshots/final-recovery-validation/`. None of them are republished
here.

## Why the host cannot run Android runtime

Single root cause: **no hardware virtualization is exposed to this container.**

```text
$ ls -la /dev/kvm
ls: cannot access '/dev/kvm': No such file or directory

$ egrep -c '(vmx|svm)' /proc/cpuinfo
0
```

Consequences:

1. The Android Emulator (`emulator`) requires KVM on Linux for any
   x86/x86_64 system image. Without KVM the emulator either refuses to
   start (`-no-accel` is unsupported on modern AVDs) or falls back to TCG,
   where boot exceeds the watchdog timeout and the AVD never reaches the
   home screen — there is no path to a usable WebView.
2. No physical device can be connected: the execution sandbox has no USB
   passthrough and no `adb`-reachable device on the network.
3. `adb devices` returns an empty list (verified — adb itself works after
   SDK install, but has nothing to talk to).

Therefore install (`adb install -r …`), launch (`adb shell am start …`),
screen capture (`adb exec-out screencap …`) and `adb logcat` are all
unavailable this cycle.

## What did succeed this cycle (static toolchain proof)

* `npm ci` — 636 packages, 0 vulnerabilities.
* `npm run lint` — clean (empty `eslint .` output).
* `npm run build` — Next.js 16.2.6 / Turbopack: compiled in 7.3s,
  TypeScript pass, 6 static pages emitted, `prepare-capacitor.mjs` wrote
  `out/`.
* `npx cap sync android` — copied web assets to
  `android/app/src/main/assets/public`, regenerated
  `capacitor.config.json`, detected 5 plugins.
* `./gradlew assembleDebug` — **BUILD SUCCESSFUL in 1m 54s**, 244/244
  tasks executed.
* `app-debug.apk` — 62 MiB, 510 entries, launchable activity
  `com.neothenerd.app.MainActivity`, `assets/public/index.html` present,
  `capacitor.config.json` present, launcher icons present. SHA-256 in
  `00_apk_build_evidence.txt`.

## Local runbook — run this on any host with `/dev/kvm` or a USB device

The numbered targets below produce the six/seven PNGs and the matching
logcat artifact. Each section is copy-pasteable.

### 0. Prerequisites

```bash
# JDK 21, Node 22+, Android SDK with platform-tools, build-tools;36.0.0,
# platforms;android-36, and a runnable system image (emulator) OR a
# USB-connected device with developer mode + USB debugging.
export ANDROID_HOME=$HOME/Android/Sdk          # adjust to your install
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

# Emulator path (skip if using a physical device):
sdkmanager --install "emulator" "system-images;android-34;google_apis;x86_64"
echo no | avdmanager create avd -n neo_qa -k "system-images;android-34;google_apis;x86_64"
emulator -avd neo_qa -no-snapshot -no-boot-anim -gpu swiftshader_indirect &
adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = "1" ]; do sleep 2; done
```

### 1. Rebuild from a clean tree (matches this cycle exactly)

```bash
git checkout claude/android-runtime-evidence-qqpiY
npm ci
npm run lint
npm run build
npx cap sync android
( cd android && ./gradlew assembleDebug --no-daemon )
APK=android/app/build/outputs/apk/debug/app-debug.apk
sha256sum "$APK"   # expect 09783ca09679e638b169cc7aaafb4260ac489868a126f8d106d8715216f9d6fa
```

### 2. Install + launch

```bash
adb install -r "$APK"
adb logcat -c                       # clear logcat before launch
adb shell am start -n com.neothenerd.app/.MainActivity
sleep 6                             # let the WebView render the first frame
```

### 3. Screenshot capture script

```bash
SHOTS=qa-android-screenshots-current
mkdir -p "$SHOTS"
shot() { adb exec-out screencap -p > "$SHOTS/$1"; }

# 01 — launch / splash → first paint
shot 01_android_launch.png

# 02 — main menu (after intro / Mission Control entry)
#    (drive UI manually or via input taps before each shot)
shot 02_android_main_menu.png

# 03 — loadout panel
shot 03_android_loadout.png

# 04 — gameplay HUD
shot 04_android_gameplay_hud.png

# 05 — settings
shot 05_android_settings.png

# 06 — multiplayer lobby OR explicit unavailable banner
shot 06_android_multiplayer_lobby_or_unavailable.png

# 07 — boss HUD (only if the boss QA path is reachable)
shot 07_android_boss_hud.png
```

### 4. Logcat capture (startup + WebView console + JS errors)

```bash
adb logcat -d -v threadtime \
  '*:W' \
  'chromium:V' 'Capacitor:V' 'CapacitorPlugin:V' \
  'AndroidRuntime:E' 'System.err:W' \
  > "$SHOTS/android-logcat.txt"

# Highlight WebView console + JS errors:
grep -E 'chromium|Capacitor|Uncaught|TypeError|ReferenceError|net::ERR|404|NetworkError' \
  "$SHOTS/android-logcat.txt" > "$SHOTS/android-logcat-jsweb.txt"
```

### 5. Fill in `QA_ANDROID_RUNTIME_REPORT.md`

Answer each of the eight required questions in
`QA_ANDROID_RUNTIME_REPORT.md` **from the artifacts you just captured**,
not from inference. Commit the PNGs + the two `*.txt` logcat files
alongside the answers.
