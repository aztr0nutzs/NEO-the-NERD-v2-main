# Direct Repair Notes — Immediate Failure Corrections

This package contains direct code repairs for the defects verified from the latest source zip and the Android screenshot:

1. **Global background layer fixed**
   - Background art is now mounted at `z-0` inside an isolated app root, with foreground content promoted above it.
   - This removes the prior negative-z-index stacking failure that could hide `neo-background-portrait.png` / `neo-background-square.png`.

2. **Main avatar presentation hardened**
   - The avatar portal now masks/clips the presentation wrapper, not only the `<video>` element.
   - A stage-shaped presentation window and edge wash prevent the opaque black MP4 corners from reading as a square box, even where Android WebView is unreliable with video masks.

3. **Build blocker fixed**
   - Added the missing `components/AppAnalytics.tsx` file required by `app/layout.tsx`.

4. **Android-native voice preview added**
   - Added `NeoTtsPlugin.java` and registered it in `MainActivity.java`.
   - Added `lib/voice/native-tts-bridge.ts`.
   - Voice preview runtime now prefers:
     1. provider TTS when truly available,
     2. native Android TTS,
     3. browser speech fallback.
   - Voice Library and Response Vault preview actions now use `mode: \"auto\"` instead of hard-forcing browser speech.

5. **Android rebuild/sync scripts added**
   - `npm run android:sync`
   - `npm run android:open`
   - `npm run android:debug`

## Critical deployment note

The source zip does not contain generated Capacitor web assets under `android/app/src/main/assets/public`. After code changes, the Android project must be rebuilt and synced before installing. Otherwise Android Studio can run stale web assets and show an older UI that no longer matches the source.

Use:

```bash
npm install
npm run android:sync
```

Then open Android Studio or run the debug build script.
