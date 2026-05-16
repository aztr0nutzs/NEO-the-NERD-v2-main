# Codex Browser Defect Ledger

Companion to `docs/CODEX_BROWSER_FULL_FUNCTIONALITY_TEST_REPORT.md`. Records
the only issues observed during the live end-to-end test pass, plus a few
test-tooling observations that future runs should know about.

There were no critical, high, or genuine medium-severity app defects. Items
below are all low-severity or limitations of the Codex browser environment
itself.

---

## D-001 — `@vercel/analytics` 404 + page error on non-Vercel hosts

- **Severity:** Low (cosmetic / console noise)
- **Screen:** Global (mounts in `components/AppAnalytics.tsx` at app root)
- **Reproduction:**
  1. `PORT=3000 npm run start`
  2. Open `http://localhost:3000/` in any browser.
  3. Open devtools → Console.
- **Expected:** Clean console.
- **Actual:** Two `Failed to load resource: 404` entries plus one
  `Failed to fetch` page error, all originating from
  `http://localhost:3000/_vercel/insights/script.js`, which only exists when
  the app is served by Vercel.
- **Evidence:** `qa-screenshots/codex-browser-full-functionality-pass/run-ledger.json`
  `consoleErrors` and `pageErrors` fields; reproduced via a request-failure
  capture script.
- **Suspected file:** `components/AppAnalytics.tsx`
- **Browser-environment-limited or genuine defect?** **Genuine but
  third-party-driven.** The runtime correctly degrades, but the error noise
  is visible to anyone running outside Vercel (e.g. the Codex container, an
  on-device webview, or a local prod build).
- **Suggested fix:** Conditionally mount `<Analytics />` only when
  `process.env.NEXT_PUBLIC_VERCEL_ENV` is set, or when
  `window.location.hostname.endsWith('.vercel.app')`.

---

## D-002 — Boot autoplay blocked in headless / sandboxed browsers

- **Severity:** Low (mitigated by existing failsafe)
- **Screen:** `BootSequenceOverlay`
- **Reproduction:** Load the app in any browser context with autoplay
  policies that block muted-video autoplay (headless Chromium, certain
  embedded webviews).
- **Expected:** Boot video plays for ~5-10 s and the shell appears.
- **Actual:** The video element is mounted but `paused`. The 40-second
  failsafe in `components/app-shell.tsx:53` is what tears it down.
- **Evidence:** `bgInfo` field in `run-ledger.json` showed
  `readyState: 0, paused: true` even after a couple of seconds; the shell
  still rendered after the failsafe expired.
- **Browser-environment-limited or genuine defect?** **Environment-limited.**
  Real Android Capacitor webviews will autoplay the muted boot video; the
  failsafe correctly covers the edge case.
- **Action:** No app change required. Note for future automated tests:
  dispatch `new Event("ended")` on the boot `<video>` to skip the 40 s wait,
  as the validation scripts do.

---

## D-003 — Network 3D Map canvas reports zero size when navigating tabs too quickly

- **Severity:** Low (measurement artifact, not user-visible)
- **Screen:** Network → MAP tab
- **Reproduction:**
  1. Open the Network screen.
  2. Programmatically click another tab (e.g. SCAN) and immediately click
     MAP again.
  3. Read `document.querySelector("canvas")` dimensions in the next tick.
- **Expected:** Canvas always reports non-zero `clientWidth/Height`.
- **Actual:** First read after tab-switch sometimes returns
  `clientWidth/Height = 0` (canvas exists but layout hasn't settled). A
  waited screenshot a moment later shows the canvas correctly at 352 × 428
  px (mobile) or 616 × 749 px (desktop).
- **Evidence:** Compare `phase10 :: 3D Map canvas dimensions {"found":false}`
  in `focused-ledger.json` against
  `network :: Network 3D Map canvas re-check {"w":352,"h":428,"found":true}`
  in `final-ledger.json`.
- **Browser-environment-limited or genuine defect?** **Test-timing
  artifact** that may, on real low-end devices, manifest as a one-frame
  jank during fast tab switches. Not currently user-visible.
- **Suggested fix (if pursued):** Confirm `NetworkMap3D` reads container
  size inside a `ResizeObserver` (or wraps the Canvas in a fixed-height
  parent) so initial layout always resolves at non-zero.

---

## D-004 — Personality cards expose no `aria-pressed` on the card itself

- **Severity:** Very low (a11y / test affordance)
- **Screen:** Personalities
- **Reproduction:** Inspect a personality card's DOM (see
  `components/personality-card.tsx`). The container is a styled `<div>`;
  selection state lives on the embedded `SELECT`/`ACTIVE` button only.
- **Expected (nice-to-have):** Either the card itself or the SELECT button
  uses `aria-pressed` so assistive tech and automation can read selection
  state directly.
- **Actual:** Selection is shown visually via gradient/glow + the button
  label flipping between `SELECT` and `ACTIVE`. No `aria-pressed` or
  `aria-current` on the card.
- **Browser-environment-limited or genuine defect?** **Genuine low-priority
  a11y nit.** Does not block any user flow.
- **Suggested fix:** Add `aria-pressed={selected}` to the SELECT/ACTIVE
  button in `personality-card.tsx`.

---

## D-005 — Native Android capabilities cannot be validated in this environment

- **Severity:** Not a defect — environment limitation
- **Screens:** Network (live mode), Voice (native TTS), Monitoring
  (background WorkManager), Settings (notification toggle),
  Exports (Capacitor Share)
- **Reproduction:** N/A — there is no emulator, ADB, or device in this Codex
  container.
- **Expected:** Real plugin execution.
- **Actual:** Each feature **correctly degrades** to its documented browser
  fallback and the UI **honestly labels** the state ("SIMULATED",
  "Demo mode", "Browser", "Health pending", "Voice input not supported in
  this browser/runtime").
- **Browser-environment-limited or genuine defect?** **Environment-limited.**
- **Action:** Re-run the report on a real device with
  `npm run android:debug`. See §9 of the main report for the explicit list of
  Capacitor plugins / native bridges that still need real-device verification.

---

## D-006 — `@vercel/analytics` script fetch failure surfaces as a JS `pageerror`

- **Severity:** Low (same root cause as D-001)
- **Reproduction:** Same as D-001.
- **Actual:** Beyond the visible 404, the failed fetch throws a
  `pageerror` (`Failed to fetch`). This is silent for users (no UI surface)
  but counts as an uncaught error in monitoring.
- **Fix:** Same as D-001 — gate the mount on Vercel hostnames.

---

## Test-tooling observations (not defects)

These are notes for whoever drives the next QA pass.

- **`role="dialog"` portals in Next.js dev mode** are layered above the
  Next.js dev-error overlay. Always run end-to-end clicks against the
  production server (`npm run start`), not `next dev`, or the
  `<nextjs-portal>` blocks pointer events on certain dock items.
- **The `<input>` on the Chat screen does not have an explicit `type="text"`
  attribute.** Use `input[placeholder*="Message NEO"]` (or `:not([type])`)
  as your selector — the simpler `input[type="text"]` will miss it.
- **Settings toggles are `<button aria-pressed>`, not `role="switch"`.**
  When test scripts sweep `[role="switch"]` they see zero. Use
  `button[aria-pressed]` and exclude the accent color picker (whose
  `aria-label` is a single colour name like `cyan` / `purple`).
- **Radix `TabsTrigger` requires a real pointer event** to flip state
  reliably. `element.click()` from page.evaluate() doesn't always fire
  Radix's keyboard/pointer handlers consistently; use
  `page.locator('[role="tab"]', { hasText: /…/ }).click()` instead.
- **Onboarding-state seeding via `localStorage`** must match the flat
  `PersistedAppState` shape (`{ version: 1, settings: {…} }`), not the
  earlier-mistaken `{ schemaVersion: 1, state: {…} }` wrapper. The wrong
  shape causes the wizard to re-show 40 s into the run.
