# Phase 1 — UI Integrity + Layout Safety Hardening

**Captured:** 2026-05-27

This phase focused on UI stability and physical usability, not feature redesign. The goal was to harden dock spacing, touch targets, layering, and truth labels while preserving the NEO look and feel.

## What changed

### Shared shell / layout
- Standardized screen bottom clearance in `components/app-shell.tsx` with a shared content-shell class and a larger dock-safe bottom pad.
- Lowered dock stacking in `components/bottom-dock.tsx` so content overlays can sit above it when appropriate.
- Raised the boot overlay stacking in `components/boot/boot-sequence-overlay.tsx` so boot remains topmost only during boot.
- Darkened the shared glass/content scrims in `app/globals.css` for better text readability over the animated background.

### Primary touch surfaces
- Enlarged dock buttons and labels in `components/bottom-dock.tsx`.
- Increased hit areas for:
  - quick command chips
  - settings toggles and segmented selectors
  - games filters and back buttons
  - voice-card action buttons
  - voice detail buttons and filters
  - controls screen permission actions and form fields
- Increased the size of the main game launch CTA and related featured-challenge controls.

### Fake-click / unavailable-action cleanup
- Disabled the non-playable game CTA in `components/game-card.tsx` so “COMING SOON” is no longer a live action.
- Preserved the visual label while making the control truthfully non-interactive.

### Startup blocker removal
- Removed duplicate OmniVoice display-name overrides in `lib/voice/voiceProfiles.ts` that were tripping the startup guard during module evaluation.
- This was necessary to restore runtime validation; it does not change route structure or remove features.

## Validation

### Required checks
- `npm run typecheck` ✅
- `npm run lint` ✅ with one pre-existing warning in `lib/store.tsx:426`
- `npm run build` ✅

### Android validation
- `npm run android:debug` initially failed on PowerShell because the script uses a Unix-style `./gradlew` invocation.
- Manual Windows Gradle build succeeded:
  - `cd android; .\gradlew.bat assembleDebug` ✅
- APK installed to the emulator:
  - package: `com.neothenerd.app`
- App launched and ran on the emulator process:
  - process id observed via `adb shell pidof com.neothenerd.app`
- Android logs showed Capacitor loading `https://localhost`, app start/resume, and asset requests, with no startup exception matching the earlier browser crash.

### Browser validation
- Local dev runtime now mounts the app shell.
- The onboarding / main UI is visible again in the browser runtime, confirming the startup blocker was cleared.

## Evidence artifacts

### Browser
- `qa-stabilization/phase0-current/browser-ui-baseline.png`

### Android
- `qa-stabilization/phase0-current/android-emulator-app.png`
- `qa-stabilization/phase0-current/android-emulator-app-live.png`

### Notes
- `qa-stabilization/phase1-current/phase1-validation-notes.md`

## Files changed

- `components/app-shell.tsx`
- `components/bottom-dock.tsx`
- `components/boot/boot-sequence-overlay.tsx`
- `app/globals.css`
- `components/settings-section.tsx`
- `components/quick-command-chips.tsx`
- `components/game-card.tsx`
- `components/screens/games-screen.tsx`
- `components/screens/controls-screen.tsx`
- `components/voice-card.tsx`
- `components/screens/voices-screen.tsx`
- `lib/voice/voiceProfiles.ts`

## Summary

This phase hardens the UI without redesigning it: the dock is safer, tap targets are larger, panel readability is improved, and unavailable actions are no longer presented as live CTAs. The app now builds, loads in the browser, and installs/runs on the Android emulator.
