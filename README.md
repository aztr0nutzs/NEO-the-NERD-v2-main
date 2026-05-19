<div align="center">
  <img src="./top_marquee.png" alt= width="100%" />
</div>

<div align="center">

# N.E.O the N.E.R.D

<p>
  <strong>• Responsive Interactive AI Assistant</strong>
</p>

<p>
  <img src="https://img.shields.io/badge/Platform-Android-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Platform Android" />
  <img src="https://img.shields.io/badge/Stack-Next.js%20%7C%20Compose-7F52FF?style=for-the-badge&logo=kotlin&logoColor=white" alt="Kotlin Compose" />
  <img src="https://img.shields.io/badge/Audio-Offline%20Playback-FF6B6B?style=for-the-badge" alt="Offline Playback" />
  <img src="https://img.shields.io/badge/Status-In%20Progress-F7B731?style=for-the-badge" alt="In Progress" />
</p>

</div>

<div align="center">
  <img src="./public/images/neo/info/nerd-info-1.png" alt= width="100%" />
</div>

<div align="center">
  <img src="./public/images/neo/info/nerd-info-2.png" alt= width="100%" />
</div>

<div align="center">
  <img src="./public/images/neo/info/nerd-info-3.png" alt= width="100%" />
</div>

## Development

This repo uses **npm** as the canonical package manager. The lockfile of record is `package-lock.json`. Alternative lockfiles (`pnpm-lock.yaml`, `yarn.lock`) are gitignored to prevent drift.

### Prerequisites
- Node.js 22+ (Capacitor 8 CLI requirement)
- npm 10+
- For Android builds: Android Studio with the Capacitor toolchain (Java 17+, Android SDK platform-tools/`adb`, Android SDK Build-Tools 35.0.0, and Android SDK Platform 36). Accept SDK licenses via `sdkmanager --licenses` before running Gradle builds.

### Install
```bash
npm install
```

### Web (Next.js)
```bash
npm run dev          # local dev server
npm run typecheck    # tsc --noEmit
npm run lint         # eslint .
npm run build        # next build + prepare Capacitor web assets in out/
npm run start        # serve the production build
```

### Android (Capacitor)
```bash
npm run build                 # produces out/ and copies assets into android/app/src/main/assets/public
npx cap sync android          # sync native plugins
npx cap open android          # open the Android project in Android Studio
```

### Environment
Copy `.env.example` to `.env.local` and populate any keys you need (TTS provider, etc.). Without those, the app runs against the in-browser local response engine.

### Project layout
- `app/` — Next.js App Router entry
- `components/` — UI, avatar, boot, network, screens
- `lib/` — store, runtime, voice + response data, capabilities
- `android/` — Capacitor-wrapped Android project
- `public/media/neo/` — boot + avatar MP4 assets
- `scripts/prepare-capacitor.mjs` — post-build asset hand-off for Capacitor
