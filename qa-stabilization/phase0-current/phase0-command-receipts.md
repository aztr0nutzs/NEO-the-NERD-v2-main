# Phase 0 command receipts

Captured in this session as supporting evidence for `docs/stabilization/PHASE0_BASELINE.md`.

## Repository / toolchain
- `pwd` → `C:\Users\Aztr0nutZs\Desktop\NEO-the-NERD-v2-main`
- `git status --short` → clean at receipt time
- `git branch --show-current` → `main`
- `git remote -v` → `origin https://github.com/aztr0nutzs/NEO-the-NERD-v2-main.git`
- `node -v` → `v25.6.0`
- `npm -v` → `11.13.0`
- `java -version` → `openjdk version "21.0.10" 2026-01-20 LTS`

## Browser runtime
- `npm run dev` started successfully and served `http://localhost:3000`
- Browser page immediately hit a runtime error:
  - `Duplicate voice profile entries detected. ids=[], names=[NEO Clone, Glitch Design, Commander Clone, Prankster Design, Retro Arcade Design, Villain Design]`
  - Source shown by overlay: `lib/voice/voiceProfiles.ts (662:9)`

## Android runtime
- Android SDK binaries were present at the local user SDK path
- AVD discovered: `Medium_Phone_API_36.1`
- Emulator launched and attached as `emulator-5554`
- `adb devices -l` eventually reported `emulator-5554 device`
- `npm run android:debug` failed during `next build`
  - error: `Failed to collect page data for /api/assistant/chat`
  - root cause shown in log: same duplicate voice-profile exception from `lib/voice/voiceProfiles.ts:662`

## Artifact paths
- `browser-runtime-error.png`
- `android-emulator-home.png`
