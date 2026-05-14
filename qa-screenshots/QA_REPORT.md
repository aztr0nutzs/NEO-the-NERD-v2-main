# NEO the N.E.R.D. — Exact-Revision QA Verification Report

Date (UTC): 2026-05-13  
Scope: post-fix verification for runtime/AI/TTS/native-network/router-truth revisions.

## Current Addendum — 2026-05-13 Production Polish Pass

This report is retained as a historical exact-revision QA artifact. A later cleanup pass changed the current evidence baseline:

- Assistant chat messages no longer append raw local-fallback/provider-failure diagnostics to user-visible reply text. Runtime truth remains in compact AI status UI and development logging.
- `NeoNetworkPlugin` is registered in Android `MainActivity.java`, and the TS adapter truth logic prevents live-native labels while demo mode is forced.
- Android native network runtime calls are still **not** verified on an installed device in this environment. Use `docs/ANDROID_NATIVE_NETWORK_TEST_PLAN.md` for the required manual/device pass.
- `next/font/google` has been replaced by committed local WOFF2 assets under `app/fonts/`; production builds no longer require Google font fetches.
- `npm audit --json` currently reports 0 vulnerabilities after `next@16.2.6`, `eslint-config-next@16.2.6`, and patched `postcss@8.5.14`.
- Duplicate root `nerd_info{1,2,3}.png` files and the unreferenced legacy `new_neo/network-discovery-module/` workspace were removed.

Current readiness score is tracked in `PRODUCTION_READINESS_FINAL.md` as **88 / 100**, capped by missing installed-device network verification and release-signing QA. This report must not be read as a public-beta release certification.

## A) Revision Identifier
- Current commit at verification time: `9ace8b2`
- Working branch: `work`
- Upstream sync attempt status: blocked (no `origin` remote configured in this environment).

## B) Commands Executed (Receipts)
| Command | Result | Notes |
|---|---|---|
| `git fetch origin --prune && git checkout work && git rebase origin/main` | FAIL | `fatal: 'origin' does not appear to be a git repository` |
| `npm ci` | PASS with warnings | Installed deps; engine warnings for Capacitor CLI requiring Node >=22. |
| `npm run -s typecheck` | PASS | TypeScript no-emit check passed. |
| `npm run -s lint` | PASS | ESLint passed. |
| `npm run -s build` | PASS | Next.js build completed; Capacitor web assets prepared in `out/`. |
| `npx cap sync android` | FAIL | Blocked by runtime Node version (`NodeJS >=22.0.0` required by Capacitor CLI). |
| `cd android && bash ./gradlew assembleDebug` | FAIL | Missing generated file `android/capacitor-cordova-android-plugins/cordova.variables.gradle` (expected after failed `cap sync`). |

## C) Pass/Fail Summary
- **Web static quality gates**: PASS (`typecheck`, `lint`, `build`).
- **Capacitor sync**: FAIL (environment blocker: Node version mismatch).
- **Android assembleDebug**: FAIL (secondary blocker caused by failed sync artifact generation).

## D) Blockers (Precise)
1. **Node runtime blocker (primary)**  
   - Key log line: `The Capacitor CLI requires NodeJS >=22.0.0`.
   - Category: toolchain/runtime compatibility (Node vs Capacitor CLI engine requirement).
2. **Gradle blocker (secondary, derivative)**  
   - Key log line: `Could not read script .../cordova.variables.gradle as it does not exist.`
   - Category: build input generation missing because Capacitor sync could not run.

## E) Features Not Verifiable in This Environment
Because no Android sync/package could be completed and no interactive browser/device automation harness is present in this container session:
- Real Android native plugin runtime path execution.
- Android UI/manual flows for Network screen and router control interactions.
- Manual media/boot playback behavior verification on live runtime.
- Live provider availability behavior (AI/TTS provider uptime/network conditions).

## F) Android Build Result
- `assembleDebug`: **FAILED** in current environment.  
- Root cause chain:
  1) Node 20.20.2 < required Node 22 for `npx cap sync android`.
  2) Sync never generated `cordova.variables.gradle`.
  3) Gradle evaluate phase fails at `app/capacitor.build.gradle` line 10.

## G) Runtime Mode Matrix (Truthful)
| Area | Mode | Verification status | Evidence source |
|---|---|---|---|
| AI/chat provider-backed | Depends on env vars/provider reachability | Not verifiable in this non-interactive QA pass | Build + prior artifact review only |
| AI/chat fallback | Expected available by code path | Not verifiable live here | Build + prior artifact review only |
| TTS provider path | Depends on provider config | Not verifiable live here | Build + prior artifact review only |
| Browser speech path | Browser capability dependent | Not verifiable live here | Build + prior artifact review only |
| Network adapter (Android native) | Android runtime only | Blocked by Android build/sync failure | Toolchain logs |
| Network adapter (demo/fallback) | Web/runtime fallback path | Indirectly supported by build success | Build logs |
| Router control mode/capability truth | code-level updated previously | Not re-executed interactively in this pass | Build/typecheck/lint receipts |

## H) Production Readiness Score
- Previous documented score: **72 / 100**.
- Recalculated for this exact pass: **74 / 100**.
- Rationale:
  - +2 for current revision passing `typecheck + lint + build` on this run.
  - Android release confidence remains capped by hard environment blockers (Node/Cap sync/Gradle dependency chain).

## I) Remaining Issues / Next Actions
1. Upgrade Node to **>=22.x** (preferred: latest LTS for Capacitor 8.3.x).
2. Re-run:
   - `npx cap sync android`
   - `cd android && bash ./gradlew assembleDebug`
3. If Gradle still fails after successful sync:
   - verify `android/capacitor-cordova-android-plugins/cordova.variables.gradle` exists,
   - run `./gradlew --stacktrace assembleDebug` and inspect `android/build/reports/problems/problems-report.html`.
4. Perform interactive/manual QA capture for required screens and runtime truth labels on live runtime/device.

## Screen Artifact Coverage Status (Current Repository)
Existing screenshot artifacts remain present under `qa-screenshots/`, including historical captures for Main, Chat, Voice, Personalities, Games, Controls, Library/Response Vault, Settings, and Network views; however this pass did **not** regenerate them due environment limitations described above.
