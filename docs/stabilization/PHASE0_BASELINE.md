# Phase 0 — Evidence Lock + Runtime Matrix

**Captured:** 2026-05-27

This document is the canonical phase-0 baseline for the current workspace state. It records what was actually observed in this session and separates:

- **Browser/runtime evidence** — what loaded in `next dev`
- **Android evidence** — what was available on the emulator side and whether the app could actually be installed/tested
- **Code-truth evidence** — what the source currently says when runtime could not be reached

## Scope / non-goals

This phase is **documentation and validation only**.

It does **not**:
- fix code
- refactor features
- redesign UI
- continue OmniVoice implementation
- claim runtime success without execution proof

## Repository + toolchain receipts

Captured before any file edits in this session:

| Check | Result |
| --- | --- |
| `pwd` | `C:\Users\Aztr0nutZs\Desktop\NEO-the-NERD-v2-main` |
| `git status --short` | clean at receipt time |
| `git branch --show-current` | `main` |
| `git remote -v` | `origin https://github.com/aztr0nutzs/NEO-the-NERD-v2-main.git` (fetch/push) |
| `node -v` | `v25.6.0` |
| `npm -v` | `11.13.0` |
| `java -version` | `openjdk version "21.0.10" 2026-01-20 LTS` |

## Browser/runtime preview baseline

### What was run
- `npm run dev`
- Local preview launched successfully at `http://localhost:3000`

### What was observed
The browser runtime did **not** reach the app shell. The dev overlay reported a **runtime error** during module evaluation:

- **Error:** `Duplicate voice profile entries detected. ids=[], names=[NEO Clone, Glitch Design, Commander Clone, Prankster Design, Retro Arcade Design, Villain Design]`
- **Primary source:** `lib/voice/voiceProfiles.ts:662`
- **Import chain visible in overlay:** `lib/voice/voiceProfiles.ts` → `lib/data.ts` → `lib/store.tsx` → `app/page.tsx`

### Browser evidence artifacts
- `qa-stabilization/phase0-current/browser-runtime-error.png`

### Browser status
- **Runtime PASS:** no
- **Reason:** app fails before shell mount because the duplicate-voice guard throws during module evaluation
- **Severity for baseline:** blocks visible UI capture for all app areas

## Android/emulator baseline

### What was available
- Local Android SDK binaries exist at:
  - `C:\Users\Aztr0nutZs\AppData\Local\Android\Sdk\emulator\emulator.exe`
  - `C:\Users\Aztr0nutZs\AppData\Local\Android\Sdk\platform-tools\adb.exe`
- AVD discovered: `Medium_Phone_API_36.1`
- Emulator process launched and attached as `emulator-5554`
- `adb devices -l` eventually reported the device state as `device`

### What was attempted
- `npm run android:debug`

### What happened
Android packaging/build did **not** complete. The build failed during `next build` while collecting page data for the API route layer, with the same voice-profile duplicate error:

- **Build error:** `Failed to collect page data for /api/assistant/chat`
- **Root cause shown in log:** same duplicate voice profile exception from `lib/voice/voiceProfiles.ts:662`

### Android evidence artifacts
- `qa-stabilization/phase0-current/android-emulator-home.png`

### Android status
- **Device/emulator available:** yes
- **APK installed and tested:** no
- **Android runtime PASS:** no
- **Reason:** build failed before an APK could be produced and installed

## Code-truth matrix for major app areas

Because the app crashes before the shell mounts, the major areas below are documented as **code-truth only** for this baseline.

| Area | Code location | Current baseline state |
| --- | --- | --- |
| App shell / runtime gate | `components/app-shell.tsx` | Not runtime-reachable; boot and screen tree never mount because startup crashes earlier |
| Main screen | `components/screens/main-screen.tsx` | Code present; runtime not reached |
| Chat screen | `components/screens/chat-screen.tsx` | Code present; runtime not reached |
| Voices screen | `components/screens/voices-screen.tsx` | Code present; runtime not reached |
| Personalities screen | `components/screens/personalities-screen.tsx` | Code present; runtime not reached |
| Games screen | `components/screens/games-screen.tsx` | Code present; runtime not reached |
| Controls screen | `components/screens/controls-screen.tsx` | Code present; runtime not reached |
| Network screen | `components/screens/network-screen.tsx` | Code present; runtime not reached |
| Library screen | `components/screens/library-screen.tsx` | Code present; runtime not reached |
| Prank screen | `components/screens/prank-screen.tsx` | Code present; runtime not reached |
| Prank library screen | `components/screens/prank-library-screen.tsx` | Code present; runtime not reached |
| Prank messages screen | `components/screens/prank-messages-screen.tsx` | Code present; runtime not reached |
| Prank traps screen | `components/screens/prank-traps-screen.tsx` | Code present; runtime not reached |
| Prank chaos screen | `components/screens/prank-chaos-screen.tsx` | Code present; runtime not reached |
| Settings screen | `components/screens/settings-screen.tsx` | Code present; runtime not reached |
| Speed test screen | `components/screens/speed-test-screen.tsx` | Code present; runtime not reached |
| Background scene | `components/background/neo-background-scene.tsx` | Code present; runtime not reached |
| Boot overlay | `components/boot/boot-sequence-overlay.tsx` | Code present; runtime not reached |
| Persistent avatar orb | `components/avatar/persistent-avatar-orb.tsx` | Code present; runtime not reached |
| Onboarding wizard | `components/onboarding/onboarding-wizard.tsx` | Code present; runtime not reached |
| Bottom dock | `components/bottom-dock.tsx` | Code present; runtime not reached |
| Assistant status bar | `components/assistant-status-bar.tsx` | Code present; runtime not reached |

## Interpretation

The current baseline is **not healthy** for runtime validation. The same startup exception blocks:

1. browser preview visibility
2. Next.js production build collection
3. Android APK production/installation flow

That means this phase establishes a **locked failure baseline** rather than a pass state.

## Local artifact index

### Screenshots
- `qa-stabilization/phase0-current/browser-runtime-error.png`
- `qa-stabilization/phase0-current/android-emulator-home.png`

### Logs / notes
- `qa-stabilization/phase0-current/phase0-command-receipts.md`

## Next stabilization step

A future stabilization pass should resolve the duplicate voice-profile guard first, then re-run browser and Android validation from this exact baseline.
