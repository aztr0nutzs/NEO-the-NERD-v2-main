# Device Pass Capture Checklist

This file lists the exact device screenshots needed to convert
`DEVICE_ACCEPTANCE_REPORT.md` from a code-verified pass into a true
installed-Android acceptance pass.

> **This session did not run a device.** The list below is for the user
> (or any reviewer with a phone/emulator) to capture. Drop the captures
> into `qa-screenshots/device/` using the exact filenames so the diff in
> the next pass is unambiguous.

## How to build + install

```bash
npm ci
npm run build
npx cap sync android
cd android && ./gradlew.bat assembleDebug   # (or gradlew on Linux/macOS)
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## Filenames + what to show

Store under `qa-screenshots/device/`.

| Filename | What to show |
|---|---|
| `01-main.png` | Main screen after boot. Background art clearly visible behind every panel. Robot integrated into the reactor stage with no black-box edges. |
| `02-voice-library.png` | Voice Library mid-preview. Status pill at top showing the runtime label (e.g. `BROWSER SPEECH`, `PROVIDER`, `LOCAL FALLBACK`, `UNAVAILABLE`). |
| `03-personalities-active.png` | Personalities screen with the new ACTIVE_PERSONALITY summary panel at top: live name, traits, sample line, `TEST N.E.O.` button, `SAVED` pill (or `AUTO-SAVED` between selections). |
| `04-chat.png` | Chat with a real assistant reply visible. Suggestion chips at the bottom should reflect the active personality (e.g. `Roast this lightly` for `snark`, `Challenge me` for `gm`). Paperclip should be visibly disabled. |
| `05-main-network-access.png` | Main screen showing both Network entry points: the green `NEURAL_MAP // 3D NETWORK TOPOLOGY` shortcut card *and* the dock entry "NET" at position 3. |
| `06-network-screen.png` | Network screen with the green `NEURAL_MAP // 3D NETWORK TOPOLOGY` header banner directly above the `NetworkDiscoveryFeature` Tabs. `MAP` tab must be active. |
| `07-3d-map.png` | The 3D map rendered (animated nodes, links, glow). Truth badge visible: `DEMO TOPOLOGY VIEW` / `ESTIMATED LOGICAL TOPOLOGY` / `BACKEND CONFIRMED TOPOLOGY`. If the device cannot render WebGL, capture the deliberate orange-bordered fallback with the summary cells instead. |
| `08-library-vault.png` | Response Vault row with action chips visible (Use in Chat, Speak, Favorite, Pin, Edit, Duplicate, Archive). |
| `09-failure-or-fallback.png` | Any failure state encountered: chunk-load fallback with `RETRY 3D LOAD` pill, voice unavailability message, topology watchdog message, etc. Leave the file out if nothing failed. |

## Acceptance-step mapping

| Capture | Acceptance step (DEVICE_ACCEPTANCE_REPORT.md §G) |
|---|---|
| `01-main.png` | Steps 1, 2, 3 |
| `05-main-network-access.png` | Step 4 |
| `02-voice-library.png` | Step 5 |
| `03-personalities-active.png` | Step 6 |
| `04-chat.png` | Step 7 |
| `06-network-screen.png`, `07-3d-map.png` | Step 8 |
| `08-library-vault.png` | Step 9 |
| All of the above | Step 10 (visual confirmation of safe-area clearance) |

## When done

1. Drop the captures into `qa-screenshots/device/`.
2. Update `DEVICE_ACCEPTANCE_REPORT.md` section A status column with
   "Confirmed on `<device + Android version>`" for each row that passed.
3. If everything passes and native discovery is also verified per
   `docs/ANDROID_NATIVE_NETWORK_TEST_PLAN.md`, escalate the readiness
   score per the rules in section G of the report.
