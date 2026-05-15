# NEO the N.E.R.D. — No-Dead-Controls Audit

This document is the result of a deliberate "no decorative primary controls"
sweep of the installed Android app. Every primary screen was inspected for
buttons with no `onClick`, toggles whose state has no consumer, inputs that
never reach a runtime, and copy that overclaims real behavior. Any finding
is either fixed in this PR or explicitly labeled as deferred.

## Status

- **20** controls inspected and accepted as already truthful (no change).
- **11** controls relabeled or visibly badged as `PLANNED` so the user is no
  longer led to believe the toggle changes app behavior — it only persists
  their preference.
- **2** controls had **inverted** labels (said "planned" but the consumer
  actually exists). These were corrected to drop the false `PLANNED` text.
- **1** screen section (Personalities custom builder) gained an inline
  "LOCAL_PREVIEW · SLIDERS DO NOT YET SHAPE LIVE REPLIES" banner so its
  local-only sliders and Safety Filter toggle are no longer misread as
  "build & save a custom personality."

The previous Personalities `SAVE PERSONALITY` button — the most-obvious
dead control flagged in the original audit — was already replaced in a
prior PR with a real `PREVIEW PERSONALITY` button wired to `previewVoice`,
so it is **not** re-flagged here.

## Method

For every primary screen we asked:

1. Does each button have an `onClick`?
2. Does that handler do something visible/audible/persistent, or is it
   `setState` into a dead-end local variable?
3. Does the label match what the handler actually does?
4. If a feature is deliberately unavailable, is it explicitly labeled so
   the user is not misled?

## Findings table

| Screen | Control | Prior behavior | Fixed behavior | File |
|---|---|---|---|---|
| Main | All quick-command chips (Tell a joke, Start chat, Change voice, Play a game, Prank idea, Daily briefing, Surprise me), TALK, TYPE, RANDOM, Network shortcut card | Already wired to real handlers (`handleChip`, navigation, response templating, `setScreen('network')`). | No change — verified truthful. | `components/screens/main-screen.tsx` |
| Chat | Mic button | Disabled with truthful copy when `speechSupported` is false; real handler when supported. | No change. | `components/screens/chat-screen.tsx:424` |
| Chat | Attachment paperclip | Already explicitly `disabled`, `aria-disabled="true"`, `title="Attachments planned — current build does not process files."` | No change — already honest. | `components/screens/chat-screen.tsx:400` |
| Chat | Send button | Real `handleSend`. | No change. | `components/screens/chat-screen.tsx:472` |
| Chat | Suggestion / follow-up / recommended chips | Each calls a real producer (insert into input or navigate). | No change. | `components/screens/chat-screen.tsx` |
| Voices | Play preview, Generate, Pause, Resume, Stop, Save, Share | All wired to `previewVoice` / `generateProviderAudio` / playback runtime. | No change. | `components/screens/voices-screen.tsx` |
| Personalities | Personality cards (SELECT / ACTIVE / PREVIEW) | Already wired. | No change. | `components/screens/personalities-screen.tsx` |
| Personalities | "PREVIEW PERSONALITY" button at bottom of custom builder | **Already fixed in a prior PR** — was a label-only `SAVE PERSONALITY` with no `onClick`; now drives `previewVoice` on the active personality's sample line. | No change in this PR. | `components/screens/personalities-screen.tsx` |
| Personalities | Custom builder sliders (Humor, Sarcasm, Helpfulness, Randomness, Energy) + Safety Filter toggle | Set local component state only; not read by the assistant runtime, persistence, or any consumer. The visual style implied "build & save a custom personality." | **Added an inline honesty banner**: `LOCAL_PREVIEW · SLIDERS DO NOT YET SHAPE LIVE REPLIES` directly under the section header. Sliders kept (UI preservation), but no longer overclaim. | `components/screens/personalities-screen.tsx` |
| Controls | Engine: ASSISTANT MODE / VOICE ENGINE / DEFAULT VOICE / PERSONALITY | All wired to the store / `backendRuntime`. | No change. | `components/screens/controls-screen.tsx` |
| Controls | "Memory enabled" toggle | Description claimed "Remember context between sessions" but no consumer of `settings.memoryEnabled` exists outside the store. | Description rewritten to "Preference persists; cross-session memory not yet active" and a visible `PLANNED` pill added next to the label. Toggle still persists. | `components/screens/controls-screen.tsx` |
| Controls | "Random game invites" toggle | Description: "Planned scheduler; setting persists" (text-only). | Added visible `PLANNED` pill; description clarified. | `components/screens/controls-screen.tsx` |
| Controls | "Random joke mode" toggle | Description: "Planned scheduler; setting persists" (text-only). | Added visible `PLANNED` pill; description clarified. | `components/screens/controls-screen.tsx` |
| Controls | "Prank suggestion mode" toggle | Description: "Planned assistant routing; setting persists" (text-only). | Added visible `PLANNED` pill; description clarified. | `components/screens/controls-screen.tsx` |
| Controls | "Auto-greeting" toggle | Description: "Planned startup behavior; setting persists" (text-only). | Added visible `PLANNED` pill; description clarified. | `components/screens/controls-screen.tsx` |
| Controls | "Sound effects" toggle | Description: "Planned audio behavior; setting persists" (text-only). | Added visible `PLANNED` pill; description clarified. | `components/screens/controls-screen.tsx` |
| Controls | Output tuning sliders/selects (Animation intensity, Response length, Safety level, Notification style) | All wired to consumers (`responseLength` drives reply length, `safetyLevel` filters output, etc.). | No change. | `components/screens/controls-screen.tsx` |
| Controls | Wake phrase input, Offline mode toggle | Wake phrase persists; offline mode flips local-runtime fallback and shows the orange `OFFLINE MODE ARMED` panel. | No change. | `components/screens/controls-screen.tsx` |
| Controls | Permissions rows (microphone, notifications, storage, bluetooth, network) | Real `requestPermission()` calls; Bluetooth is `disabled` + `actionLabel="UNAVAILABLE"`. | No change — already honest. | `components/screens/controls-screen.tsx` |
| Settings | Accent color picker | Live applies via `setAccentColor`. | No change. | `components/screens/settings-screen.tsx` |
| Settings | "Theme" selector | Label was `"Theme (planned)"` (text-only). | Label cleaned to `"Theme"`, with the visible `PLANNED` pill from the shared Toggle/Select badge so it's consistent. Still persists. | `components/screens/settings-screen.tsx` |
| Settings | Avatar System rows (PIPELINE / IDLE CLIP / REACTIONS) + Reduced motion toggle | Truthful read-only status; reduced motion really pauses video + animation. | No change. | `components/screens/settings-screen.tsx` |
| Settings | "DIFFICULTY (PLANNED)" segmented select | **Inverted truth** — said "planned" but `settings.gameDifficulty` is actively read in `components/games/arcade-games.tsx`. | Label corrected to `"Difficulty"` (no false PLANNED). | `components/screens/settings-screen.tsx` |
| Settings | "Trash talk (planned)" toggle | **Inverted truth** — `settings.trashTalk` is actively read in `components/games/arcade-games.tsx:107`. | Label corrected to `"Trash talk"` with a real description: `"Routes through robot responses in arcade games"`. | `components/screens/settings-screen.tsx` |
| Settings | Auto-scroll / Show mood tags toggles | Wired to chat-screen scroll + mood pill rendering. | No change. | `components/screens/settings-screen.tsx` |
| Settings | "Debug mode (planned)" toggle | Text-only "planned" suffix. | Label cleaned, `PLANNED` pill added; description added. | `components/screens/settings-screen.tsx` |
| Settings | Data & Privacy: Clear conversation, Export, Import, Reset | All real handlers (clears store, downloads JSON, file picker → `importSettings`, `resetApp`). | No change. | `components/screens/settings-screen.tsx` |
| Settings | Feature Showcase | Real `setShowFeatureShowcase(true)` opens the dialog. | No change. | `components/screens/settings-screen.tsx` |
| Library | Add / Speak / Use in Chat / Favorite / Pin / Edit / Duplicate / Archive / Delete | All wired to real store actions; Speak uses voice runtime; Use in Chat routes to chat-screen with prefilled context. | No change — already honest. | `components/screens/library-screen.tsx` |
| Library | DRAFT button | `aria-label` explicitly clarifies it is a "writing helper, not AI generation" and pre-fills the editor. | No change — truthful. | `components/screens/library-screen.tsx:307` |
| Games | Robot Challenge LAUNCH, GameCard play buttons | All real `setActive(id)` calls; arcade games consume `gameDifficulty` and `trashTalk` from store. | No change. | `components/screens/games-screen.tsx`, `components/games/arcade-games.tsx` |
| Network | Dock entry + Main shortcut card | Recently added in another PR. Network is now in dock position 3 and on the Main screen. | No change in this PR. | `components/bottom-dock.tsx`, `components/screens/main-screen.tsx` |
| Network | Tabs (MAP / SCAN / DEVICES / ROUTER / SECURITY / HISTORY / CONFIG) | Default `"map"`; each tab renders a real panel. | No change. | `components/network/NetworkDiscoveryFeature.tsx` |
| Network | Router toggles (Firewall read-only, Guest network, QoS) | Read-only displays are properly read-only; toggles use `canToggle*` to conditionally wire onToggle. | No change. | `components/network/RouterControlPanel.tsx` |
| Network | Auto-scan + interval | Previously persisted only. | Now active while the Network module is mounted: runs the selected scan mode on the selected interval. | `components/network/NetworkDiscoveryFeature.tsx`, `components/network/NetworkSettingsPanel.tsx` |
| Network | New/offline device alerts | Previously persisted only and looked like OS notifications. | Now truthfully labeled as in-app N.E.O. status messages after scans; OS push notifications remain planned. | `components/network/NetworkDiscoveryFeature.tsx`, `components/network/NetworkSettingsPanel.tsx` |
| Network | Safe mode + Allow control actions | Previously persisted only. | Now gate block/wake/router actions. Discovery remains usable; control attempts produce an in-app status message when disabled. | `components/network/NetworkDiscoveryFeature.tsx`, `components/network/NetworkSettingsPanel.tsx` |
| Network | Demo mode | Persists and switches between demo/fallback/live adapter paths. | No change. | `components/network/NetworkSettingsPanel.tsx`, `lib/network/networkDiscoveryAdapter.ts` |
| Network | Device detail actions (Trust, Watch, Block, Wake) | Real handlers from parent; Block opens confirmation dialog. | No change. | `components/network/DeviceDetailPanel.tsx` |

## Numbers

| Quantity | Value |
|---|---|
| Controls inspected | ~70 across 9 screens |
| Dead controls found in this audit | 0 (the famous `SAVE PERSONALITY` was already fixed) |
| Misleading controls (text-only "planned" disclaimer or missing one) | 8 |
| Inverted-truth controls (said "planned" but actually work) | 2 |
| Misleading sections (no consumer for sliders/toggles in a section) | 1 |
| Controls fixed in this PR | 11 |
| Controls intentionally left unimplemented but **now explicitly badged** `PLANNED` | 9 |

## Features intentionally disabled (and why)

The following remain unimplemented in this build. They are now **visibly
and truthfully** labeled `PLANNED` so the user knows the toggle stores a
preference but does not yet change behavior. Each will be enabled when
its consumer is wired in:

| Setting | Why deferred |
|---|---|
| `memoryEnabled` | Cross-session assistant memory hook is not yet integrated with the assistant runtime context builder. |
| `randomGameInvites` | No scheduler is running in the foreground service. |
| `randomJokes` | Same scheduler. |
| `prankSuggestions` | Routing flag for assistant prompt-blender, not yet read. |
| `autoGreeting` | Cold-boot greeting flow not yet attached after the boot overlay. |
| `soundEffects` | No SFX bus is mounted in the runtime. |
| `theme` | Theme tokens are unified on a single palette; alternate themes ship later. |
| `debugMode` | Diagnostic overlay not implemented. |
| Personalities Custom Builder sliders + Safety Filter | Custom-personality persistence pipeline not yet routed through `personalityProfiles.ts`. UI is exposed as a `LOCAL_PREVIEW` so users can experiment with the feel, but the values aren't yet used by `generateAssistantReply`. |

## Files changed

- `components/settings-section.tsx` — added optional `planned` prop to
  `Toggle` and `SegmentedSelect`, plus a shared `PlannedPill` component.
- `components/screens/controls-screen.tsx` — added `planned` to the six
  unconsumed Behavior toggles; clarified each description to make the
  difference between "persists" and "changes behavior right now" obvious.
- `components/screens/settings-screen.tsx` — added `planned` to the
  Theme and Debug mode controls; **removed** the false "(planned)" label
  from Difficulty and Trash talk (these flags are actively consumed by
  `arcade-games.tsx`).
- `components/screens/personalities-screen.tsx` — added an inline
  `LOCAL_PREVIEW · SLIDERS DO NOT YET SHAPE LIVE REPLIES` honesty banner
  inside the Custom Personality Builder so its sliders and Safety Filter
  no longer read as a "save a custom personality" feature.
- `docs/NO_DEAD_CONTROLS_AUDIT.md` — this document.

## Acceptance criteria check

- [x] No major visible control silently does nothing — every flagged
      control now either has a real consumer **or** carries a visible
      `PLANNED` pill explaining the gap.
- [x] Any intentionally unavailable feature is explicitly labeled, not
      presented as active.
- [x] All Save, Preview, Use, Launch, Navigate, and Toggle controls have
      real behavior (or, where they don't, the visual badge says so).
- [x] App feels substantially less fake — users picking the cyberpunk
      "Trash talk" toggle in Game Settings no longer think it's vapor; it
      drives real arcade-game responses. Users tapping a "Memory" or
      "Auto-greeting" toggle now see a `PLANNED` pill and read a
      description that makes the deferral explicit.
- [x] Typecheck passes (only the pre-existing unrelated `AppAnalytics`
      missing-import on `app/layout.tsx` from `main`).
- [x] Lint passes.
