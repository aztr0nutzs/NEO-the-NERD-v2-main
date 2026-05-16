# Animated Background Readability Pass

Focused contrast/legibility repair pass. The animated background, NEO visual
language, cyberpunk colorway, Mission Control screen, 3D Network Map, avatar
system, dock, and Speed/Voice/Network screens were intentionally **not
redesigned, flattened, or restyled**. The fixes here raise the readability
floor of the UI on top of the existing background — the background remains
vivid and present.

---

## 1. Problem summary

The animated background MP4 (1080×1834, vivid alley/neon imagery) was
visually strong, but the compositing stack above it was too thin to keep
the UI separate. Specifically:

* The global vertical scrim in `NeoBackgroundScene` dipped to
  `rgba(0,0,0,0.04)` at the 22–60 % vertical band — exactly where most
  HUD content sits. The brightest portions of the background bled
  straight through headings, telemetry labels, and helper text.
* `ps-glass` panels used `rgba(8,8,14,0.7)` as their substrate, which
  still let bright background pixels show through behind body copy.
* Several screens (Speed Test top bar, telemetry cards) had local
  backgrounds in the `0.55–0.72` alpha range that washed out on bright
  frames.
* A handful of helper-text strings used `text-gray-500/600` outside the
  glass panels and disappeared into the brightest part of the
  background.

The combined effect was the "washed out / not premium / hard to read"
symptom called out in the task.

---

## 2. Global background compositing changes

`components/background/neo-background-scene.tsx` now layers **two**
compositing fields above the video / PNG poster:

1. **Vertical scrim**, raised across every stop. The previous stops
   `0.34 → 0.08 → 0.04 → 0.38` left a 36-percentage-point gap of
   readability between the top and the middle of the canvas. The new
   stops `0.62 → 0.42 → 0.40 → 0.66` keep the same shape — slightly
   heavier at the top/bottom for status bar and dock legibility — but
   raise the middle band to a usable contrast floor.
2. **Radial center vignette** (`radial-gradient(120% 90% at 50% 45%, …)`)
   adds a soft additional dim of `~0.32` near the centerline that fades
   to transparent by 75 %. The brightest pixel of the background is
   typically dead-center, and this gradient dims that hotspot without
   touching the edges, so the art is still recognizable in the gutters.

Net effect: the animated background remains visible (`opacity ~0.55`
on the brightest pass) but the canvas under HUD content is dark enough
to function as a real substrate.

---

## 3. Card and panel contrast changes

`app/globals.css`:

* `.ps-glass` substrate raised from `rgba(8,8,14,0.7)` →
  `rgba(6,6,12,0.84)`; blur from `14px` to `16px`; saturation backed
  off from `140%` to `130%` (the higher saturation amplified the
  background bleed under transparent panels). Top highlight is
  preserved so panels still catch the neon glow.
* New `.ps-glass-strong` variant at `rgba(4,4,10,0.92)` — used by
  data-dense panels that carry critical numerals (Speed Test rings,
  Mission Control summary cards).
* New `.ps-content-shade` utility, applied by `AppShell` behind the
  `<main>` viewport. Width-bounded to `max-w-2xl` so the background
  stays visible on the left and right gutters but content sits on a
  ~25 % darker substrate.

`components/neon-panel.tsx`:

* `NeonPanel` accepts a new `density="data" | "heavy"` prop selecting
  between `ps-glass` and `ps-glass-strong`.
* Inset stroke alpha raised slightly (`0.32 → 0.38` for soft, `0.55 →
  0.6` for strong) and a restrained outer drop shadow
  (`0 6-8px 22-28px rgba(0,0,0,0.4-0.45)`) added so panels separate
  from the background without dimming the NEO glow.

`components/screens/speed-test-screen.tsx`:

* Speed Test top bar substrate `0.55 → 0.78`, blur `10 → 12`, border
  alpha `0.08 → 0.12`.
* Speed Test telemetry card substrate `0.72 → 0.86`, accent border
  alpha `0.28 → 0.36`, blur `8 → 10`.

The 9× `rgba(0,0,0,0.85–0.92)` panels inside the Speed Test screen
were already opaque enough — left untouched.

---

## 4. Text hierarchy changes

Only the spots that sit *outside* `ps-glass` (and therefore over the
animated background directly) were touched. Most of the 103
`text-gray-500/600` occurrences in the codebase live *inside* panels
and now sit on the darker `ps-glass` substrate, so they read cleanly
without per-string edits.

Touched directly:

* `NetworkDiscoveryFeature.tsx` hero subtitle `text-gray-500 → text-gray-300/90`.
* `NetworkDiscoveryFeature.tsx` `N.E.O. // NETWORK_MODULE` label `text-gray-500 → text-cyan-300/80`.
* `NetworkDiscoveryFeature.tsx` footer copy `text-gray-600 → text-gray-400`;
  divider `border-gray-800 → border-gray-700/70`.

No NEO accent colors (cyan/purple/pink/green/orange) were retuned —
they already carry text-shadow glows that read well over the new
substrate.

---

## 5. Screens touched

* **Main / Mission Control** — inherits `ps-glass` upgrade and content
  shade. NeonPanel cards on Mission Control now sit on the heavier
  substrate via the upgraded class. Visual identity unchanged.
* **Network Discovery / 3D Map** — header subtitle, label, and footer
  copy retuned. NeonPanel header banner (green strong-glow) inherits
  the stronger inset stroke. Content shade behind the main column.
* **Speed Test** — top bar + telemetry cards explicitly bumped. Inner
  metric pills were already opaque.
* **Voice Library** — inherits `ps-glass` upgrade and content shade.
* **Chat** — inherits `ps-glass` upgrade and content shade.
* **Settings** — inherits `ps-glass` upgrade and content shade.
* **Bottom Dock** — `ps-glass` substrate raised; dock chips' accent
  borders remain unchanged so the cyberpunk colorway leads.

The 3D Network Map, avatar, RobotStage, animated background MP4, and
boot overlay assets were not touched.

---

## 6. Files changed

* `components/background/neo-background-scene.tsx`
* `components/app-shell.tsx`
* `components/neon-panel.tsx`
* `components/screens/speed-test-screen.tsx`
* `components/network/NetworkDiscoveryFeature.tsx`
* `app/globals.css`
* `docs/ANIMATED_BACKGROUND_READABILITY_PASS.md` (this file)

---

## 7. Verification receipts (this session)

* `npm run typecheck` — `tsc --noEmit` passed.
* `npm run lint` — `eslint .` passed.
* `npm run build` — `next build` succeeded; Capacitor web assets prepared.
* `npx cap sync android` — synced 5 Capacitor plugins.

Real-device screenshots (Main, Network, Speed Test, Voice Library)
require a developer machine running the Android app, which is not
executable from this container. The composited substrate changes are
deterministic — once the app is launched the background remains
visible while the UI now sits on a noticeably darker, more premium
substrate.
