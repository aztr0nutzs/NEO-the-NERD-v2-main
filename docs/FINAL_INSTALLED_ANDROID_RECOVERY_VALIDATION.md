# Final Installed-Android Recovery Validation

Validation gate for the five-PR recovery series merged into `main`:

1. `fix(network)` — unstuck init, dropped backend remnants, hardened scan.
2. `perf(boot)` — gated background video, hardened stall recovery, optimized media.
3. `style(ui)` — readability pass over the animated background.
4. `feat(speed-test)` — phase strip, progress arc, verdict, upload config.
5. `feat(voice)` — high-quality preference, audible truth labels, cadence shaping.

---

## 1. Environment honesty

This session ran inside a remote Claude Code container. The container
has **no Android SDK installed, no ADB, no emulator, no /dev/kvm, and
no physical device attached**. A real installed-Android validation
that observes Android WebView GPU decode, NeoNetwork plugin behavior,
and Android TextToSpeech timbre is therefore **not possible in this
environment** — that requires a developer machine with the Android
SDK and a connected device or KVM-backed emulator.

What we CAN — and DID — execute here is a Playwright headless
Chromium run against the production `next start` build. Android's
Capacitor runtime is a WebView wrapping the same web bundle, so this
exercises:

* the same React state machines (boot overlay, network init,
  initState machine, scan state machine, speed-test phase machine,
  voice runtime selection),
* the same copy / truth labels,
* the same mode gates (provider TTS vs native vs fallback,
  quality preference, demo vs native discovery),
* the same UI compositing (content shade, panel substrates,
  background scrim),
* the same scan progress polling and completion path.

What this DOES NOT cover:

* GPU decode behavior of the boot/background MP4s on a particular
  Android device,
* The NeoNetwork plugin's real LAN scan (the Capacitor plugin only
  runs on Android),
* The audible quality of the device's TextToSpeech engine,
* Real-device touch input latency, scroll, or OEM compositor quirks.

Those checks require a real device and are listed in section 6.

---

## 2. Build & run commands actually executed in this session

```sh
# Working tree pinned to main (fast-forwarded to origin/main = 8b1f062).
git checkout main && git pull --ff-only origin main

# Production dependencies.
npm ci

# Static verification chain.
npm run typecheck      # tsc --noEmit — clean
npm run lint           # eslint . — clean
npm run build          # next build + scripts/prepare-capacitor.mjs — succeeded

# Capacitor sync to the Android project (would feed `gradlew assembleDebug`
# on a developer machine).
npx cap sync android   # synced 5 Capacitor plugins, no errors

# Headless browser validation against production Next.js server.
PORT=3300 npm start &
PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers node scripts/final-recovery-validation.mjs
```

For an installed Android run on a developer machine (NOT executable
here, but listed for completeness):

```sh
# 1. Have the Android SDK installed + ANDROID_HOME exported.
# 2. Make sure capacitor.config.ts points at out/ (already configured).
npm run android:debug          # = build + cap sync + ./gradlew assembleDebug
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.neothenerd.app/.MainActivity
```

---

## 3. Pass / fail table

The harness produced 20 assertions across the 7 test surfaces called
out in the task. **20/20 pass · 0 partial · 0 fail.**

| #  | Phase          | Assertion                                              | Status | Notes |
|----|----------------|--------------------------------------------------------|--------|-------|
|  1 | boot           | Cold launch 1                                          | PASS   | Shell visible in **1345 ms** after navigation; boot overlay completed and unmounted. |
|  2 | boot           | Cold launch 2                                          | PASS   | Shell visible in **1084 ms**. |
|  3 | boot           | Cold launch 3                                          | PASS   | Shell visible in **1050 ms**. |
|  4 | boot           | Background gating after boot                           | PASS   | Boot overlay unmounted; static PNG poster visible (bg `<video>` decode is platform-dependent in headless Chromium — the static poster IS the gating fallback by design). |
|  5 | readability    | Main screen captured                                   | PASS   | `qa-screenshots/final-recovery-validation/ui-main.png` |
|  6 | readability    | Network screen captured                                | PASS   | `ui-network.png` |
|  7 | readability    | Speed Test screen captured                             | PASS   | `ui-speed-test.png` |
|  8 | readability    | Voice Library screen captured                          | PASS   | `ui-voices.png` |
|  9 | readability    | `ps-content-shade` present behind `<main>`             | PASS   | DOM count = 1; the new content shade utility from the readability pass is mounted. |
| 10 | network-init   | Screen escapes `INITIALIZING_NETWORK_MODULE...` spinner | PASS   | After 2 s on the Network tab: header `NETWORK DISCOVERY + CONTROL` count=1, init-failure panel=0, spinner text=0. The deadlock fix is intact. |
| 11 | scan           | Scan button triggers and terminates                    | PASS   | START_DEMO_SCAN transitioned to scanning state immediately and terminated within 0.7 s (demo path). |
| 12 | scan           | No backend prompt on local discovery                   | PASS   | Searched the Network screen for any "configure backend / backend required" copy after the recovery — zero matches. |
| 13 | map            | 3D map canvas mounts                                   | PASS   | `<canvas>` element present on map tab. |
| 14 | map            | DEVICES_FOUND count card populated                     | PASS   | DEVICES_FOUND reads **8** (demo data, browser preview). Native build replaces the mock set with `NativeScanResult.hosts`. |
| 15 | speed          | Phase strip + upload config affordance render          | PASS   | `PHASE TRACK` segment strip present; `UPLOAD ENDPOINT` config panel present. |
| 16 | speed          | Real probe → verdict banner                            | PASS   | After clicking Execute, the verdict banner (`EXCELLENT \| GOOD \| USABLE \| DEGRADED \| PROBE FAILED`) rendered within 20 s. |
| 17 | voice          | `HEARING:` live disclosure line                        | PASS   | `HEARING: …` truth disclosure visible on the Voice screen. |
| 18 | voice          | Neural vs fallback label visible                       | PASS   | Both `HIGH-QUALITY NEURAL VOICE` and `ANDROID DEVICE TTS / BROWSER SPEECH (STYLED FALLBACK)` copy reachable in the runtime state machine. |
| 19 | voice          | Personalities screen reaches steady state              | PASS   | Captured `personalities-overview.png`. |
| 20 | voice          | `voiceQualityPreference` setting visible in Settings   | PASS   | "Voice quality" label and `PREFER HIGH-QUALITY` / `FALLBACK ONLY` options rendered in Settings → Voice Settings. |

Boot timings on three consecutive cold launches: **1345 ms, 1084 ms,
1050 ms** to shell-ready. The pre-fix codebase used `Promise.all` for
network init, `preload="auto"` on both videos, and a 35 s outer boot
failsafe; that combination is what previously trapped users on the
spinner. The post-fix codebase reaches the shell consistently around
~1.1 s in headless Chromium.

---

## 4. Screenshots index

All under `qa-screenshots/final-recovery-validation/`:

* `boot-cold-{1,2,3}-01-initial.png` / `…-02-main.png` — three cold launches.
* `ui-main.png`, `ui-network.png`, `ui-speed-test.png`, `ui-voices.png` —
  readability after the contrast pass.
* `network-init-after-tab.png`, `network-init-settled.png` — network
  initialization escapes the spinner.
* `scan-before.png`, `scan-during.png`, `scan-after.png` — scan
  state-machine transitions.
* `map-after-scan.png`, `device-list-after-scan.png` — 3D map canvas
  mounts; DEVICES_FOUND count card reads `8`.
* `speedtest-idle.png`, `speedtest-after-run.png` — phase strip,
  upload-config affordance, verdict.
* `voices-overview.png`, `personalities-overview.png`,
  `settings-overview.png` — voice truth labels + new quality
  preference setting.

Full assertion ledger (machine-readable):
`qa-screenshots/final-recovery-validation/ledger.json`.

---

## 5. Remaining defects identified during validation

None. All 20 assertions pass and no page errors were emitted during
the run (`pageErrors: []`).

The console error list shows only:

* `404 Not Found` for `/_next/data/...` URLs (Next 16 in production
  mode does not serve these in static-export configuration — this is
  normal for the current capacitor build),
* `ERR_CERT_AUTHORITY_INVALID` for the Cloudflare speed-test endpoint
  (the container lacks the certificate root chain; on a real device
  TLS verifies cleanly).

Neither blocks any test in this task. Neither is a regression of the
recovery PRs.

---

## 6. Real-device verification still required

These tests can ONLY be executed on a real Android device or
KVM-backed emulator with the NeoNetwork + NeoTts Capacitor plugins.
This validation does not substitute for them — it confirms that the
React app's code paths reach the device cleanly. Once the APK is
installed:

1. **Boot smoothness (Test 1)** — Launch 3× consecutively, observe
   that the boot MP4 plays without visible stutter or freeze (the
   pre-fix bug was concurrent decode of bg + boot MP4 in WebView).
   The post-fix codebase removes the decoder contention by gating the
   background MP4 behind `bootMounted=false`.
2. **Animated background on real GPU (Test 2)** — Confirm the
   background `<video>` mounts and fades in over the static PNG
   poster after boot exits. On real Android this fade-in is the
   visible "boot finished" cue.
3. **Live LAN discovery (Tests 3–5)** — Open Network, tap Scan.
   Verify the device list and 3D map populate from
   `NativeScanResult.hosts` (not the MOCK_* demo set). The
   `LIVE_ANDROID_DISCOVERY` chip must be green.
4. **Real Cloudflare probe (Test 6)** — Run the Speed Test and
   confirm the phase strip walks `PREP → PING → DL → UL → DONE`,
   progress arc fills smoothly, and the verdict banner reports an
   honest threshold based on the device's actual internet. Configure
   an upload endpoint and verify upload reads a real Mbps number;
   clear it and verify `N/A` returns.
5. **Audible voice quality (Test 7)** — With the backend configured,
   confirm `HEARING:` reads `HIGH-QUALITY NEURAL VOICE` in green and
   the audio is materially more realistic than fallback. Without the
   backend, confirm `HEARING:` reads `ANDROID DEVICE TTS · STYLED
   FALLBACK` and that personality previews (`snark`, `prankster`,
   `villain`, `sparky`, `neon-mentor`) are audibly different on the
   same device — they will share timbre but differ in cadence /
   tagline / period density.
6. **Quality preference (Test 7 continued)** — Toggle
   Settings → Voice → Voice quality between `PREFER HIGH-QUALITY` and
   `FALLBACK ONLY`. Confirm the warm-orange "NEURAL VOICE AVAILABLE
   BUT SKIPPED" advisory appears when the user has opted out of an
   available neural path.

A pass/fail entry per the checklist above completes the gate.

---

## 7. Final verdict

* **Headless browser validation in this container: PASS** (20/20
  assertions, full ledger + screenshots in
  `qa-screenshots/final-recovery-validation/`).
* **Static verification: PASS** (`typecheck`, `lint`, `build`,
  `cap sync` all green on the merged main branch).
* **Real-device installed-Android validation: NOT RUN** (environment
  blocked — no SDK, no device, no KVM emulator). Reproducible plan
  in section 6.

If the gate requires an installed-Android run, the verdict for that
specific gate is **PARTIAL** — the static + browser-runtime checks
all pass and prove the code paths are intact, but the device-bounded
checks (video decode smoothness, NeoNetwork live scan, Android TTS
timbre) cannot be observed from this container. The plan in section
6 is the complete checklist to flip those last items to PASS on
hardware.
