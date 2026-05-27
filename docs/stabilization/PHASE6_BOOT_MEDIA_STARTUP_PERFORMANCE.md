# Phase 6 — Boot + Media Startup Performance Pass

**Captured:** 2026-05-27

This pass reduces launch-time media contention while preserving the cinematic NEO identity. It does not remove boot video, avatar video, background art, or screen styling.

## Inspection Summary

| Surface | Finding | Phase 6 handling |
| --- | --- | --- |
| Boot overlay | Cinematic MP4 exists at `/media/neo/boot/neo_boot_new.mp4`; previous overlay used an active video path and failsafes. | Added explicit instrumentation, poster-first frame, `metadata` preload, reduced-motion short path, and logged bounded failsafes. |
| App shell | Active screen tree was already gated behind boot completion; background video had a post-boot delay. | Added a first-interactive-paint gate before screen/orb mounting and logged media handoff timing. |
| Background scene | Static PNG fallback exists and animated MP4 is gated by `videoEnabled`. | Shell now also disables background video when app reduced motion is enabled. |
| Avatar media | Avatar clips are MP4s and `NeoAvatarVideo` already uses `metadata` preload with visibility/intersection pause logic. | Persistent orb and active screen mount after boot dismissal plus first-interactive-paint gate; wakeup reaction is skipped in reduced-motion mode. |
| Settings | `settings.reducedMotion` already exists and is exposed in Settings > Avatar System. | Reused the existing toggle; no new settings architecture was added. |

## Changes Applied

- Added `lib/boot-instrumentation.ts` with `[NEO_BOOT]` timestamped console logging.
- Boot overlay now logs:
  - `BootSeq mounted`
  - `video loadstart`
  - `canplay`
  - `canplaythrough`
  - `play attempt`
  - `play success`
  - `play failure`
  - `ended`
  - `failsafe`
  - `boot_overlay_dismissed`
- App shell now logs:
  - `first interactive paint`
  - `post_boot_media_ready`
- Boot video no longer uses `preload="auto"`; it uses `metadata` and starts playback explicitly.
- Boot renders an immediate neon poster frame backed by the existing NEO background art before video readiness.
- Reduced-motion mode skips the boot video after a short styled frame instead of decoding the cinematic MP4.
- Reduced-motion mode prevents ambient background video activation and skips the post-boot wakeup avatar reaction.
- Persistent avatar orb and active screen tree wait for the boot overlay to exit and the first interactive paint gate.
- Existing video detach/failsafe/stall handling remains intact so Android/WebView users are not trapped behind a failed boot video.

## Runtime Notes

- Normal mode still shows the cinematic boot video, then stages the active app content, then allows the ambient background MP4 after the post-boot delay.
- Reduced-motion mode keeps the cyber look with static art and HUD effects, but avoids boot/background video decode and avoids the wakeup reaction clip.
- Physical Android validation is still the meaningful performance test for WebView decoder contention; desktop browser validation verifies compile/runtime wiring only.

## Validation

- `npm run typecheck`
- `npm run lint` — passes with the existing unrelated `lib/store.tsx:426` warning.
- `npm run build`
