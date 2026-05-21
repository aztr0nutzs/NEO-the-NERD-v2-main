# NEO the N.E.R.D. — Session Truth-Pass Reports

Consolidated final reports for the last 7 prompt runs in this Claude Code session.
Each pass tightens the in-product truth between the UI and the underlying runtime.
The dates, commit hashes, branches, and PR URLs below are the canonical record.

> Per-PR URLs follow the standard `https://github.com/aztr0nutzs/NEO-the-NERD-v2-main/pull/new/<branch>` pattern (the `gh` CLI is not installed locally, so PRs are opened via the URL printed by `git push`).

---

## 1. Product Reality Audit (read-only)

**Type:** Read-only inspection · No commit produced
**Scope:** Whole-app product-truth audit covering boot, avatar/video lifecycle, voices, chat, network discovery + topology, router controls, speed test, games, controls, settings, notifications, response library, onboarding, docs.

### Findings

- **REAL:** Boot/startup, avatar reactions, response library, onboarding, all 10 games (each has a real component).
- **DEPENDENCY-GATED:** Chat (real LLM when configured, honest local fallback otherwise), Voice provider TTS, Android native discovery.
- **PARTIAL / FALLBACK-ONLY:** Voice library on Android without backend (collapses to one or few timbres), speed-test upload (requires user-configured endpoint), network monitoring (foreground only).
- **MISLEADING SURFACES (pre-fix):**
  - Voices screen showing 40+ cards as if all were distinct in any runtime.
  - Router panel framed as `ROUTER_CONTROL` even when every action returns `requires-connector`.
  - `Memory enabled` toggle marked `planned` despite being wired.
  - Topology map subtitle reading as if relationships were probed.
  - Speed Test `UL: N/A` rendered with the same pink/yellow treatment as a measured metric.
- **DOCS:** Unusually honest — `FINAL_ANDROID_FUNCTIONALITY_TEST_REPORT.md` self-scores 8/100 and admits no device access; `NETWORK_MONITORING_ALERTS.md` explicitly states "this build does not run closed-app WorkManager scans."

### Scorecard (0–10)

| Dimension | Score |
|---|---|
| Feature honesty | 7 |
| Android runtime readiness | 4 |
| Voice system reality | 4 |
| Network system reality | 7 |
| Startup/media performance | 8 |
| Router/control completeness | 3 |
| Speed-test completeness | 7 |
| UI ↔ runtime alignment | 6 |
| Documentation reliability | 9 |
| Overall product trustworthiness | 6 |

### Exact File Changes
None — read-only.

### Verification Results
N/A — inspection only.

### Commit Hash
N/A.

### PR
N/A.

---

## 2. Voices Screen — One-Voice Collapsed Mode + 5-Category Card Truth

**Branch:** `claude/voice-runtime-truth-pass`
**Commit:** `295582c` (sits on top of `a97abf1` "Make voice runtime truth dominant on Voices screen")

### Findings

The previous pass added a runtime-truth banner, diagnostics panel, exact-voice preview status (`PLAYING PROVIDER VOICE: <id>` / `PLAYING ANDROID TTS VOICE: <name>` / `PLAYING SHARED FALLBACK DEVICE VOICE`), a `Distinct-only` filter, and emotion-slider fallback labeling. The remaining gap was that the deck still rendered all 40+ profile cards in `android-collapsed` mode, and each card lacked an explicit 5-category runtime classification.

### Exact File Changes

- `components/screens/voices-screen.tsx`
  - New `oneVoiceModeExpanded` state.
  - Rails (FEATURED, PERSONALITY_MATCHES, RECENTLY_USED) and the 2-column grid are now gated behind `banner.mode === "android-collapsed"`.
  - New `OneVoiceModeCard` component: full-bleed cyber panel naming the engine voice, distinct-realizable count, mode, with `SHOW ALL PROFILE PRESETS ANYWAY` CTA.
  - New `OneVoiceModeAcknowledgement` strip: pinned above the deck when expanded, with a `COLLAPSE` button to return.
  - New `DiagPill` helper for the condensed pill grid.

- `components/voice-card.tsx`
  - New `classifyRuntimeTruth()` returning one of five categories: `PROVIDER DISTINCT VOICE`, `PROVIDER STYLED VARIANT`, `NATIVE DISTINCT DEVICE VOICE`, `SHARED FALLBACK DEVICE VOICE`, `BROWSER SPEECH FALLBACK`, or `UNAVAILABLE IN CURRENT RUNTIME`.
  - Each card prints `RUNTIME: <category>` colored per category, above the existing collapsed subtext.

### Verification Results

- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run build` ✅ (Next 16.2.6, all routes, Capacitor web assets prepared)
- Android device validation: not run — no Android hardware in this environment.

### Commit Hash
`295582c`

### PR Title / Body

**Title:** Collapse Voices deck when only one device voice is available

**Body:**
```
## Summary
- When provider TTS is unavailable AND Android exposes ≤1 usable engine voice, the Voices screen no longer renders 40 cards as if they were distinct timbres. The rails and grid are replaced by a single OneVoiceModeCard that names the active engine voice, explains the limitation, and offers an explicit "SHOW ALL PROFILE PRESETS ANYWAY" expansion. Expanded view keeps a sticky acknowledgement strip above the deck so the truth is never lost while browsing.
- Voice cards now print one of five truthful runtime categories — PROVIDER DISTINCT VOICE, PROVIDER STYLED VARIANT, NATIVE DISTINCT DEVICE VOICE, SHARED FALLBACK DEVICE VOICE, BROWSER SPEECH FALLBACK, or UNAVAILABLE — color-coded so the active runtime classification is visible per card without opening details.
- Builds on the prior runtime-truth banner, diagnostics, exact-voice preview status, distinct-only filter, and emotion-slider fallback labeling shipped in the same branch.

## Test plan
- [x] npm run typecheck
- [x] npm run lint
- [x] npm run build
- [ ] Android device validation — code-truth changes only; no Android hardware was available in this environment.
```

**URL:** https://github.com/aztr0nutzs/NEO-the-NERD-v2-main/pull/new/claude/voice-runtime-truth-pass

---

## 3. Router Panel — Status-Only Framing When No Connector

**Branch:** `claude/router-panel-truth-pass`
**Commit:** `e37ef77`

### Findings

The native adapter returns `requires-connector` for every router action except `refresh-status` (`lib/network/networkDiscoveryAdapter.ts:900-924`) and reports `readOnlyMode: true`. The UI nevertheless titled the panel `ROUTER_CONTROL`, rendered live Guest/QoS Switches gated only by capability checks, and offered the REBOOT button at the same visual priority as REFRESH. The framing — not the data — was the oversell.

### Exact File Changes

- `components/network/RouterControlPanel.tsx`
  - Derived flag `isControlMode = routerControlMode === "connector-backed" && !readOnlyMode`.
  - Header title now dynamic: `ROUTER_STATUS` (cyan) outside control mode, `ROUTER_CONTROL` (emerald) only when a real connector is wired.
  - Added subtitle line: `READ ONLY · CONNECTOR REQUIRED FOR CONTROL` or `DEMO ADAPTER · SIMULATED CONTROL`.
  - Container border color shifts emerald → cyan in status-only mode.
  - Guest/QoS Switches drop to read-only badges outside control mode.
  - REBOOT button hidden outside control mode.
  - REFRESH labeled `REFRESH STATUS`.
  - Old generic read-only footer replaced by an explicit `ROUTER CONTROL REQUIRES CONNECTOR` notice and a collapsible `ADVANCED ROUTER CONTROLS · CONNECTOR REQUIRED` block.
  - New `DisabledControl` helper renders REBOOT / GUEST_NETWORK / QOS rows badged `REQUIRES_CONNECTOR`.

### Verification Results

- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run build` ✅

### Commit Hash
`e37ef77`

### PR Title / Body

**Title:** Reframe router panel as status-only when no connector is wired

**Body:**
```
## Summary
- The Router panel now structurally distinguishes status-only mode from a real control mode. When `routerControlMode !== "connector-backed"` or the adapter reports `readOnlyMode`, the title switches to `ROUTER_STATUS` with a `READ ONLY · CONNECTOR REQUIRED FOR CONTROL` subtitle, the border shifts from emerald to cyan, the Guest/QoS Switches drop to read-only badges, and the REBOOT button is hidden.
- A prominent `ROUTER CONTROL REQUIRES CONNECTOR` notice replaces the prior generic read-only warning, plus a collapsible `ADVANCED ROUTER CONTROLS · CONNECTOR REQUIRED` block that surfaces the disabled reboot/guest/QoS rows with `REQUIRES_CONNECTOR` badges for transparency.
- Connector-backed mode (`routerControlMode === "connector-backed" && !readOnlyMode`) preserves the original control layout, so future connector integrations re-enable the existing controls without code changes.
- Refresh remains live in every mode — it only re-reads status — and is now labeled `REFRESH STATUS`.

## Test plan
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run build`
- [ ] Screenshot of read-only mode — not captured in this environment
```

**URL:** https://github.com/aztr0nutzs/NEO-the-NERD-v2-main/pull/new/claude/router-panel-truth-pass

---

## 4. Network Monitoring — FOREGROUND ONLY Labeling

**Branch:** `claude/network-monitoring-truth-pass`
**Commit:** `273b33d`

### Findings

`docs/NETWORK_MONITORING_ALERTS.md` already states the build does not run closed-app WorkManager scans, but the in-product UI buried that truth in a sub-line under a conditional reveal. AUTO_SCAN and NOTIFICATIONS read as if they implied persistent background surveillance.

### Exact File Changes

- `components/network/NetworkSettingsPanel.tsx`
  - AUTO_SCAN group title → `AUTO_SCAN · FOREGROUND ONLY`.
  - New orange banner above the toggle stating recurring scans run only while N.E.O. is open and that closed-app background scans are not enabled in this build.
  - `ENABLE_AUTO_SCAN` description rewritten to lead with "Foreground-only:" and explain the persistence semantics.
  - SCAN_INTERVAL sub-line strengthened: "Interval only elapses while N.E.O. is open — closed-app WorkManager scans are not active in this build."
  - NOTIFICATIONS group title → `NOTIFICATIONS · FOREGROUND ONLY` with matching banner.
  - `NEW_DEVICE_ALERTS` and `OFFLINE_DEVICE_ALERTS` descriptions updated to "Foreground-only…".

- `components/network/NetworkAlertsPanel.tsx`
  - MONITOR_STATUS card gains a `FOREGROUND ONLY` orange pill.
  - One-line footnote added: "Recurring scans run only while N.E.O. is open and this module is active. Closed-app background scans are not enabled in this build."

### Verification Results

- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run build` ✅

### Commit Hash
`273b33d`

### PR Title / Body

**Title:** Label network monitoring as FOREGROUND ONLY in-product

**Body:**
```
## Summary
- The auto-scan group on the Network settings panel is now titled `AUTO_SCAN · FOREGROUND ONLY` with an orange banner stating recurring scans run only while N.E.O. is open and that closed-app background scans are not enabled in this build.
- The notifications group becomes `NOTIFICATIONS · FOREGROUND ONLY` with a matching truth note; `NEW_DEVICE_ALERTS` and `OFFLINE_DEVICE_ALERTS` descriptions are tightened to lead with "Foreground-only" so users don't read them as persistent background surveillance.
- The `ENABLE_AUTO_SCAN` toggle description and the next-run footnote both call out that the scan interval only elapses while N.E.O. is open.
- The Monitor status card in `NetworkAlertsPanel` gets a `FOREGROUND ONLY` pill and a one-line truth footnote so the alerts surface tells the same story.
- No discovery, notification, or scheduler logic was touched — labels and copy only. The UI now matches `docs/NETWORK_MONITORING_ALERTS.md` ("This build does not run closed-app WorkManager scans").

## Test plan
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run build`
```

**URL:** https://github.com/aztr0nutzs/NEO-the-NERD-v2-main/pull/new/claude/network-monitoring-truth-pass

---

## 5. Speed Test — Truthful Upload Tile When Not Configured

**Branch:** `claude/speedtest-upload-truth-pass`
**Commit:** `8941ddf`

### Findings

The runner already labels partiality honestly: `lib/network/speedTest.ts:94-95` emits `uploadMeasured` and `completeness: "partial-no-upload"`; the runner reports `failureReason: "upload-not-configured"`; the VerdictBanner already appends `(PARTIAL)` to verdict labels. The remaining gap was the UL pill on the gauge HUD, which always rendered with the measured-metric treatment (pink/yellow), and a bare `N/A` in history rows.

### Exact File Changes

- `components/screens/speed-test-screen.tsx`
  - UL pill (gauge HUD): replaced the single static `<Pill>` with a render-state branch.
    - `!uploadConfigured && (ulValue === "N/A" || "--")` → yellow-bordered `<button>` reading `UL: NOT CONFIGURED` that opens the existing Upload Endpoint Config panel via `setUploadConfigOpen(true)`.
    - `ulValue === "FAIL"` → pink pill reading `UL: FAILED`.
    - Otherwise → original numeric pink/yellow pill unchanged.
  - History `MetricWithDelta` for UL: `run.uploadMbps === null` now renders `NOT MEASURED` in yellow (was bare `N/A` in pink).

### Verification Results

- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run build` ✅

### Commit Hash
`8941ddf`

### PR Title / Body

**Title:** Make Speed Test upload tile truthful when no endpoint is configured

**Body:**
```
## Summary
- The UL pill on the gauge HUD no longer renders as a normal numeric metric when no upload endpoint is configured. Instead it becomes a yellow-tinted CTA button `UL: NOT CONFIGURED` that opens the existing Upload Endpoint Configuration panel on tap. The pill geometry is preserved so the cyber HUD silhouette is unchanged.
- A configured-but-failed upload now reads `UL: FAILED` in pink rather than the prior literal `FAIL` string in yellow.
- A successful, measured upload renders the original numeric pink/yellow pill unchanged.
- History rows print `UL · NOT MEASURED` in yellow for partial runs instead of bare `N/A` in pink, so the row's partiality is visually unmistakable — matching the existing `PARTIAL` chip on the same row.
- No changes to the runner, types, store, export, or summary logic. The VerdictBanner already appends `(PARTIAL)` to the verdict label and prints `PARTIAL TEST · DOWNLOAD/LATENCY/JITTER MEASURED · UPLOAD NOT MEASURED` when `uploadMeasured` is false.

## Test plan
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run build`
```

**URL:** https://github.com/aztr0nutzs/NEO-the-NERD-v2-main/pull/new/claude/speedtest-upload-truth-pass

---

## 6. Memory Enabled Toggle — Drop False `planned` Label

**Branch:** `claude/memory-toggle-truth-pass`
**Commit:** `182937f`

### Findings

The toggle was marked `planned` with copy stating "cross-session memory not yet active", but the runtime consumer already exists:

- `lib/store.tsx:398` — persistence writer sets `messages: nextSettings.memoryEnabled ? messages : []`.
- `lib/store.tsx:479` — restore path gated on `stored.settings?.memoryEnabled !== false`.
- `lib/store.tsx:1080` — import path applies the same gate.

Disabling the toggle therefore actually clears persisted messages on next write and suppresses message restore on launch.

### Exact File Changes

- `components/screens/controls-screen.tsx`
  - Removed the `planned` prop on the Memory enabled `<Toggle>`.
  - Description rewritten from `"Preference persists; cross-session memory not yet active"` to `"Active: when on, the chat conversation is persisted across app restarts and reloaded on launch. When off, persistence is suppressed — saved messages are cleared on the next write and not restored from storage."`.
  - No other toggles in the Behavior section touched.

### Verification Results

- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run build` ✅

### Commit Hash
`182937f`

### PR Title / Body

**Title:** Drop false 'planned' label on Memory enabled toggle

**Body:**
```
## Summary
- The `Memory enabled` toggle in the controls screen was marked `planned` with copy stating "cross-session memory not yet active", but the runtime consumer already exists in `lib/store.tsx`: when off, the persistence writer drops messages from the snapshot (`lib/store.tsx:398`), the restore path skips reading them on launch (`lib/store.tsx:479`), and the import path applies the same gate (`lib/store.tsx:1080`).
- Removed the `planned` prop and rewrote the description as `Active: when on, the chat conversation is persisted across app restarts and reloaded on launch. When off, persistence is suppressed — saved messages are cleared on the next write and not restored from storage.`
- No other toggles in the Behavior section were touched. The remaining `planned` toggles (random invites/jokes, prank suggestions, auto-greeting, sound effects) are still genuinely without a runtime consumer.

## Test plan
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run build`
```

**URL:** https://github.com/aztr0nutzs/NEO-the-NERD-v2-main/pull/new/claude/memory-toggle-truth-pass

---

## 7. Topology Map — Surface CONFIDENCE State

**Branch:** `claude/topology-confidence-truth-pass`
**Commit:** `03bfeca`

### Findings

`lib/network/types.ts:515-520` exposes `topologyMode: "demo" | "estimated" | "backend-confirmed"` and `relationshipsConfirmed?: boolean` on `NetworkTopologyGraph`. The builder defaults `topologyMode` to `"estimated"` and constructs edges from the device list — no real probing. The map header pre-fix showed a single `ESTIMATED LOGICAL TOPOLOGY` pill and a subtitle that read as if the relationships were a real probe. The side HUD did not surface confidence at all; the 2D fallback didn't either.

### Exact File Changes

- `components/network/map/NetworkMap3D.tsx`
  - Derived locals from real graph state: `relationshipsConfirmed`, `confidenceLabel`, `confidenceClasses`, `confidenceTooltip`, `subtitleText`.
  - Header now renders a dedicated `CONFIDENCE: ESTIMATED | DEMO | CONFIRMED` chip alongside the existing topology-mode badge. Color shifts orange → emerald only when `topologyMode === "backend-confirmed" && relationshipsConfirmed`.
  - Subtitle rewritten to read "Logical map inferred from the current device list — gateway relationships are estimated, not probed." in estimated/demo modes; switches to the confirmed variant only when both signals indicate a real probe.
  - `title` tooltips on both chip and subtitle explain the inference.

- `components/network/map/NetworkMapHud.tsx`
  - Header row reflowed to `justify-between`: `MAP_HUD` left, small `ESTIMATED | DEMO | CONFIRMED` pill right.
  - One-line orange footnote added under the NODES/LINKS/FLAGS grid: "Relationships inferred from the current device list. Not a verified topology probe."

- `components/network/map/NetworkMapFallback.tsx`
  - Badge row flex-wrapped to host both the existing `TOPOLOGY SUMMARY FALLBACK` chip and a new `CONFIDENCE: ESTIMATED | DEMO | CONFIRMED` chip with matching color logic and tooltip.

No changes to `lib/network/topology.ts`, `lib/network/networkDiscoveryAdapter.ts`, or types.

### Verification Results

- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run build` ✅

### Commit Hash
`03bfeca`

### PR Title / Body

**Title:** Surface topology confidence on the map UI

**Body:**
```
## Summary
- The 3D topology header now carries a dedicated `CONFIDENCE: ESTIMATED | DEMO | CONFIRMED` chip alongside the existing topology-mode badge. The chip and a tightened subtitle ("Logical map inferred from the current device list — gateway relationships are estimated, not probed.") are both driven by the real `NetworkTopologyGraph.topologyMode` + `relationshipsConfirmed` fields, not hardcoded copy.
- The side `NetworkMapHud` panel gains a small confidence pill next to `MAP_HUD` and a one-line orange footnote restating that relationships are inferred and not a verified probe, so the right rail can no longer look authoritative on its own.
- `NetworkMapFallback` gains a matching `CONFIDENCE` chip next to its `TOPOLOGY SUMMARY FALLBACK` badge.
- Color shifts orange→emerald only when the graph reports `backend-confirmed` AND `relationshipsConfirmed`. No native adapter emits that combination today, so the confirmed-state branch is reachable in code but only fires when a real probe ships.
- No changes to the topology builder, the network adapter, or graph shape.

## Test plan
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run build`
```

**URL:** https://github.com/aztr0nutzs/NEO-the-NERD-v2-main/pull/new/claude/topology-confidence-truth-pass

---

## Session Summary Table

| # | Pass | Branch | Commit | PR-Ready |
|---|---|---|---|---|
| 1 | Product reality audit | n/a | n/a | n/a |
| 2 | Voices one-voice collapsed mode + card categories | `claude/voice-runtime-truth-pass` | `295582c` | ✅ |
| 3 | Router panel status-only framing | `claude/router-panel-truth-pass` | `e37ef77` | ✅ |
| 4 | Network monitoring FOREGROUND ONLY | `claude/network-monitoring-truth-pass` | `273b33d` | ✅ |
| 5 | Speed Test upload tile truth | `claude/speedtest-upload-truth-pass` | `8941ddf` | ✅ |
| 6 | Memory enabled toggle truth | `claude/memory-toggle-truth-pass` | `182937f` | ✅ |
| 7 | Topology confidence chip | `claude/topology-confidence-truth-pass` | `03bfeca` | ✅ |

All six implementation passes pass `npm run typecheck`, `npm run lint`, and `npm run build` on Next 16.2.6. None touched runtime logic — only UI labels, render-state branches, and structural framing — so each pass is independently reviewable and revertible.
