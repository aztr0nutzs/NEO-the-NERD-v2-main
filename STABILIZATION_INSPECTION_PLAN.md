# NEO v2 Stabilization Inspection + Phased Fix Plan (2026-05-27)

## Scope and method
This is an inspection-first pass (no broad feature edits), based on repository code/docs review and local environment checks.

### Baseline environment receipts
- `pwd` → `/workspace/NEO-the-NERD-v2-main`
- `git branch --show-current` → `work`
- `git remote -v` returned no remotes in this environment.
- `node -v` → `v20.20.2`, `npm -v` → `11.4.2`, `java -version` → OpenJDK 21.0.2.

## Current state classification (major areas)

### 1) UI quality + consistency
**Status: Partial, with known improvements but still fragmented.**
- Dock overlap and safe-area protection appears intentionally handled in AppShell/main padding, but requires live device revalidation across all screens. 
- Multiple screen families appear to be from different passes (core screens vs game shells vs network map overlays), indicating style drift risk.
- Several UX truth improvements exist, but “fake clickable” risk remains where planned/disabled actions are surfaced inconsistently.

### 2) Games system
**Status: Mixed completeness.**
- Games shell and multiple playable mini-games are present.
- KNXT4 is extensive, but fidelity-to-original cannot be guaranteed without original source package/art direction baseline.
- “Coming soon”/partial signaling may still be inconsistent at card-level vs in-game reality.

### 3) Network discovery
**Status: Real + partial + environment-limited.**
- Native Android network plugin exists and exposes discovery context/scan methods.
- Product docs and runtime reports repeatedly note device-runtime verification gaps (no active ADB/device receipts in-repo).
- Topology is explicitly marked estimated/demo unless backend-confirmed; this is truthful, but still easy to over-interpret visually.

### 4) Router control panel
**Status: Mostly truth-corrected to status/read-only framing.**
- Prior truth-pass reports indicate connector-required mode and read-only demotion are implemented.
- Need final visual QA pass to ensure no control affordance still “looks live” in read-only mode.

### 5) Speed test
**Status: Mostly truthful partial-measurement behavior.**
- Upload endpoint absence is called out and UI was corrected to avoid fake upload metrics.
- Need export/history wording consistency check so null upload is never interpreted as measured zero.

### 6) Voices / OmniVoice / OpenAI / Android fallback
**Status: Architecturally honest, availability-dependent.**
- Routing hierarchy and fallback honesty are documented.
- OmniVoice is optional and external; not bundled in APK.
- Android TTS voice collapse risk is explicitly acknowledged; must remain prominent in UI diagnostics.

### 7) Boot/startup/media performance
**Status: Risk-managed but still heavy.**
- AppShell and media components already include staged/preload/fallback commentary and guards.
- Concurrent decode pressure (boot video + avatar + background media) remains a likely perf bottleneck class on lower-end Android WebView.

### 8) Onboarding/product truth
**Status: improved but must be re-audited end-to-end.**
- Multiple reports indicate truth-label work already done.
- Risk remains from distributed copy surfaces (onboarding, cards, badges, tooltips, headers) drifting out-of-sync.

### 9) Android build/runtime readiness
**Status: Build scaffolding present; runtime proof incomplete.**
- Capacitor Android project exists with permissions and plugin classes.
- In-repo QA docs repeatedly acknowledge limited physical-device runtime verification.
- Remote sync rule could not be executed here due missing `origin` remote.

### 10) Repo hygiene
**Status: Needs consolidation.**
- Many QA/report markdowns and screenshot folders indicate history of iterative passes.
- High probability of stale or duplicate readiness artifacts causing operator confusion.

## Cross-cutting high-risk defects to prioritize
1. **Truth drift across UI surfaces** (copy says one thing, behavior does another).
2. **Android-only runtime uncertainty** for network scan + 3D map + media concurrency.
3. **Visual cohesion drift** between screen families and game panels.
4. **Action affordance honesty** (disabled/read-only actions still looking “live”).
5. **Documentation sprawl** reducing confidence in actual current state.

## Phased implementation plan (execution-ready prompts)

### Phase 0 — Evidence lock + runtime matrix (no feature changes)
**Goal:** Establish one authoritative baseline before touching behavior.
- Build a screen-by-screen audit matrix (screen, action, expected truth label, observed state in browser, observed state on Android device/emulator).
- Capture deterministic screenshots for every primary route and every failure/fallback state.
- Create one canonical runtime truth table for: Chat, Voice, Network scan, Router panel, Topology, Speed test, Games.
- Output: `docs/stabilization/PHASE0_BASELINE.md` + screenshot index.

### Phase 1 — UI integrity + layout safety hardening
**Goal:** Eliminate visible breakage and interaction hazards first.
- Verify and patch bottom-dock clearance and safe-area spacing on all primary screens.
- Standardize heading/section spacing and minimum touch target sizes.
- Fix fake-clickable controls: if action unavailable, convert to non-button badge/row or explicit disabled control with reason.
- Resolve obvious contrast/readability failures while preserving NEO neon-on-black identity.
- Output: focused UI integrity PR with before/after screenshots.

### Phase 2 — Product-truth unification
**Goal:** Ensure every surfaced claim matches runtime capability.
- Unify truth-badge vocabulary (e.g., LIVE / ESTIMATED / DEMO / CONNECTOR REQUIRED / PARTIAL / UNAVAILABLE).
- Audit onboarding, tooltips, card subtitles, empty states, diagnostics text.
- Remove overpromising phrasing for router control, persistent monitoring, topology certainty, voice uniqueness, speed test completeness.
- Output: copy/label-only PR; no logic changes unless required for truthful state binding.

### Phase 3 — Network + router operational honesty
**Goal:** Make network panel behavior operationally explicit.
- Validate permission handling + denied-state UX on Android.
- Confirm scan mode descriptions precisely map to actual adapter behavior.
- Ensure router panel stays status-first unless connector-backed control truly active.
- Add structured diagnostics surface for scan source, mode, permission, gateway confidence, and fallback reason.
- Output: network truth/diagnostics PR with Android receipts.

### Phase 4 — Speed test completeness + data semantics
**Goal:** Prevent metric misinterpretation.
- Enforce upload semantics across HUD/history/export: `NOT MEASURED` vs `FAILED` vs measured value.
- Ensure partial test verdict propagates everywhere results are displayed/exported.
- Validate no path maps null upload to zero.
- Output: speed-test semantics PR + export fixture checks.

### Phase 5 — Games reliability + KNXT4 fidelity checkpoint
**Goal:** Align game hub promises with actual completeness.
- Audit every registered game card for truthful status and routing integrity.
- Tag unfinished titles explicitly as preview/coming soon.
- KNXT4: run fidelity checklist (layout proportions, controls, effects, progression states, mobile responsiveness).
- If exact-screen restoration is requested, require original KNXT4 source asset/package as explicit dependency.
- Output: games truth/routing PR + KNXT4 fidelity report.

### Phase 6 — Boot/media performance stabilization
**Goal:** Reduce startup lag without flattening visual identity.
- Profile first paint and time-to-interaction in browser and Android WebView.
- Stage/defer concurrent media decode (boot/video/avatar/background) with poster-first and progressive activation.
- Add reduced-motion/media-lite runtime mode for lower-end devices.
- Output: perf-focused PR with timings before/after.

### Phase 7 — Android release-readiness + repo hygiene
**Goal:** Make builds reproducible and documentation trustworthy.
- Normalize README Android run/build instructions (SDK/JDK/Gradle assumptions, emulator vs physical device steps).
- Add runtime test receipts section with required evidence checklist.
- Clean stale QA artifacts, duplicate reports, accidental generated/log files.
- Validate `.gitignore` coverage and remove unresolved TODO/FIXME/conflict markers that are stale.
- Output: docs/hygiene PR (separate from feature behavior PRs).

## Priority order rationale
1. **User-visible trust + breakage first** (Phases 1–2) before deeper behavior edits.
2. **Core product reliability surfaces** next (network/router/speed/games, Phases 3–5).
3. **Performance and release confidence** last (Phases 6–7), once UI/truth semantics stabilize.

## Known unknowns / assumptions
- No `origin` remote exists in this environment, so upstream rebase prerequisite could not be completed locally.
- Physical Android runtime evidence is not newly generated in this pass; current classification relies on in-repo reports and code inspection.
- KNXT4 exact visual parity cannot be certified without original reference package/assets and acceptance captures.
