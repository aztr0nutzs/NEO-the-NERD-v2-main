# Boot & Background Media Performance Fix

Launch-time media correction. The boot sequence, animated background
identity, Mission Control screen, avatar system, and overall NEO visual
language were intentionally **not redesigned, flattened, or removed**.
The cinematic intro and ambient background still look the same — they
just stop fighting each other (and the avatar) for the Android WebView's
decoder budget on launch.

This document supersedes the previous pass. The first round of fixes
gated only the ambient background `<video>` on `bootMounted`, but the
active screen (default: `main`) was still mounted **under** the boot
overlay. `MainScreen` mounts `RobotStage`, which mounts `NeoAvatarVideo`,
which immediately starts demuxing the **18 MB** `idle.mp4` avatar clip
with `preload="auto"` — concurrent with the boot intro decoder. That was
the residual stutter root cause; this pass closes it honestly.

---

## 1. Why startup was still stuttering after pass #1

Even with the ambient background `<video>` gated off, three media-heavy
things were still being asked to wake up in the same boot frame:

1. The boot intro `<video>` (priority — should own the decoder).
2. The `idle.mp4` base avatar clip (~18 MB, `preload="auto"`) — mounted
   by `MainScreen → RobotStage → NeoAvatarVideo` behind the opaque boot
   overlay.
3. The full `MainScreen` React tree, including framer-motion entry
   animations, three concentric reactor rings with infinite rotation
   animations, network mission-control panels with `useMemo` chains, etc.

So while the boot intro was visible, the WebView was:

* demuxing + decoding the boot H.264 stream,
* parsing the 18 MB idle avatar MP4 header **and aggressively pulling it
  across the wire** because of `preload="auto"`,
* running the React reconciler on the heaviest screen in the app.

On mid-range Android this caused the boot video to drop frames or visibly
stall for ~0.5–1 s after start, even after pass #1 cleared the ambient
background video out of the way.

---

## 2. What changed (this pass)

### Boot-first rendering isolation

`components/app-shell.tsx` now **does not mount the active screen tree
at all while the boot overlay is mounted**. The previous
`<AnimatePresence>...<Active /></AnimatePresence>` block is wrapped in
`{!bootMounted && (...)}`. The `PersistentAvatarOrb`, which also mounts a
`<video>` element, gets the same gate. The render tree behind the boot
overlay is now only:

* the static PNG background poster (`NeoBackgroundScene` with
  `videoEnabled=false`, so its `<video>` is not in the DOM),
* the lightweight `AssistantStatusBar` and `BottomDock` chrome,
* the boot overlay itself (the only `<video>` element on the page).

### Staged post-boot media hydration

After `onBootComplete`, AppShell does not flip every media element to
"ready" on the same frame. It now uses two states:

1. `bootMounted=false` (set by `handleBootComplete`) — the active screen
   mounts and the avatar `<video>` element mounts. The avatar plays
   `wakeup.mp4` first (2.4 MB) because AppShell calls
   `playAvatarReaction("wakeup")` in the same callback, so the wakeup
   reaction is already queued when the avatar mounts.
2. `mediaReady=true` (set 700 ms later via `setTimeout`) — only now is
   `NeoBackgroundScene` allowed to mount its ambient background
   `<video>`. The 700 ms window is long enough for the avatar's wakeup
   pipeline to negotiate with the WebView's media stack and for the
   screen's framer-motion entry animations to settle, but short enough
   that the ambient background is back on screen before the user has
   stopped looking at the avatar.

The handoff order is therefore deterministic:
**boot decoder released → active screen mounts → avatar video mounts and
plays the small wakeup clip → ambient background video mounts**.
No "decoder stampede" on the handoff frame.

### Seeded initial avatar clip

`NeoAvatarVideo` previously initialized its internal `currentKey` to the
base idle key, then flipped to the queued reaction in an effect tick.
This caused React to mount `<video src=/media/neo/avatar/idle.mp4>`
**first**, which the browser immediately starts demuxing, only to throw
it away one tick later when the reaction takes over. With an 18 MB base
clip, that wasted preload was significant.

The component now inspects `reactionKey` / `reactionId` at first render
and, if a reaction is already queued, initializes `currentKey` to the
reaction directly. `lastReactionRef` is seeded with the same `reactionId`
so the reaction-dispatch effect does not re-fire. On the common post-boot
path the avatar therefore mounts straight onto `wakeup.mp4` (2.4 MB) —
the heavy idle base clip is requested only after wakeup ends, well past
the launch frame.

### `preload="metadata"` is now the policy for **all** avatar clips

The previous policy was `preload={state === "base" ? "auto" : "metadata"}`.
That meant the 18 MB idle clip was being aggressively pulled into the
WebView's memory the moment the element mounted. With the gating fixes
above the avatar no longer mounts during boot, but a subsequent route
into a screen that mounts the avatar (Network / persistent orb) would
re-trip the same problem.

`NeoAvatarVideo` now always uses `preload="metadata"`. The demuxer still
preps the file at mount, but the browser does not greedily fetch the
whole asset; it streams as playback progresses. The video is `autoPlay`,
muted, and `playsInline`, so visible playback start is still effectively
immediate.

### Duplicate root-level `neo_backround.mp4` removed

`neo_backround.mp4` (~9 MB, old pre-faststart encode with an unused
audio track) lived at the repository root and was not referenced by any
shipping code path — `NeoBackgroundScene` uses
`/media/neo/neo_backround.mp4`, served from `public/`. The root copy was
tracked by git but only appeared in QA scripts that scanned the page for
the bg video URL (`scripts/codex-full-validation.mjs`,
`scripts/final-recovery-validation.mjs`); those scripts match by URL
substring so they continue to work against the canonical asset under
`public/`. The duplicate has been deleted via `git rm` to remove ~9 MB
of dead weight from clones.

---

## 3. Startup media lifecycle

### Before this pass (pass #1 only)

```
t=0   AppShell mounts
      ├─ NeoBackgroundScene (video gated off — only PNG poster)
      ├─ BottomDock, AssistantStatusBar
      ├─ MainScreen (default screen)               ← STILL MOUNTED
      │   └─ RobotStage
      │       └─ NeoAvatarVideo (idle.mp4 18 MB, preload="auto")
      │                                              ← decoder fights boot
      └─ BootSequenceOverlay
          └─ <video src=neo_boot_new.mp4 preload="auto" autoPlay>

      Boot intro stutters or drops frames during the first ~0.5–1 s
      because the WebView is also demuxing and pulling idle.mp4.
```

### After this pass

```
t=0      AppShell mounts
         ├─ NeoBackgroundScene (videoEnabled=false → no <video> in DOM)
         ├─ BottomDock, AssistantStatusBar         (lightweight chrome)
         ├─ Active screen tree                     ← NOT MOUNTED
         ├─ PersistentAvatarOrb                    ← NOT MOUNTED
         └─ BootSequenceOverlay
             └─ <video src=neo_boot_new.mp4 preload="auto" autoPlay>
                ^ the only <video> element on the page

t=~10s   boot video ends → finishBoot(true) → detach src → setVisible(false)
         → AnimatePresence fade-out (0.5s)
t=~10.5s onExitComplete → handleBootComplete:
         1. playAvatarReaction("wakeup")
         2. setBootMounted(false)
         Active screen + PersistentAvatarOrb mount on next frame.
         NeoAvatarVideo seeds currentKey="wakeup", mounts directly onto
         <video src=wakeup.mp4 preload="metadata">.        ← 2.4 MB, small
         Background still has videoEnabled=false; PNG poster visible.

t=~11.2s POST_BOOT_BACKGROUND_DELAY_MS (700ms) elapses → setMediaReady(true)
         NeoBackgroundScene mounts <video src=neo_backround.mp4
         preload="metadata"> → fades in over the PNG poster.

t=~12s+  wakeup.mp4 ends → returnToIdle → currentKey="idle"
         <video src=idle.mp4 preload="metadata"> mounts. Streams on play()
         instead of greedy whole-file fetch. Looping idle starts.
```

The decoder is now never asked to handle two MP4 streams in the same
boot-time frame. Each handoff is staged.

---

## 4. Files changed (this pass)

* `components/app-shell.tsx`
  * Added `mediaReady` state with a 700 ms `setTimeout` after
    `bootMounted=false`.
  * Hard-gate the active screen `<AnimatePresence>` block on `!bootMounted`.
  * Hard-gate `<PersistentAvatarOrb>` on `!bootMounted`.
  * `NeoBackgroundScene` now receives `videoEnabled={mediaReady}` (was
    `!bootMounted`).
* `components/avatar/neo-avatar-video.tsx`
  * Seed `currentKey` (and `lastReactionRef`) with the queued reaction at
    first render so the heavy idle base clip is not requested briefly only
    to be discarded.
  * `<video preload>` is now always `"metadata"`, regardless of base /
    reaction state.
* `neo_backround.mp4` — duplicate at repo root, deleted via `git rm`.
* `docs/BOOT_AND_BACKGROUND_MEDIA_PERFORMANCE_FIX.md` — this file.

Carried forward unchanged from pass #1:

* `components/background/neo-background-scene.tsx` — `videoEnabled` gate
  remains; just driven by `mediaReady` now.
* `components/boot/boot-sequence-overlay.tsx` — stall watcher, duration
  failsafe, src-detach on exit are all retained.
* `public/media/neo/boot/neo_boot_new.mp4` and
  `public/media/neo/neo_backround.mp4` — already re-encoded with
  `+faststart`, no audio, baseline H.264.

---

## 5. Asset size audit

| Asset                                    | Size    | Notes                          |
|------------------------------------------|---------|--------------------------------|
| `public/media/neo/avatar/idle.mp4`       | 17.3 MB | **Large outlier**, see below   |
| `public/media/neo/avatar/happy.mp4`      | 6.0 MB  | Reaction; below idle threshold |
| `public/media/neo/neo_backround.mp4`     | 5.5 MB  | Already re-encoded (pass #1)   |
| `public/media/neo/boot/neo_boot_new.mp4` | 3.4 MB  | Already re-encoded (pass #1)   |
| `public/media/neo/avatar/thinking.mp4`   | 2.5 MB  | OK                              |
| `public/media/neo/avatar/wakeup.mp4`     | 2.3 MB  | Plays first post-boot, OK       |
| `public/media/neo/avatar/surprised.mp4`  | 1.8 MB  | OK                              |
| `public/media/neo/avatar/ecstatic.mp4`   | 1.8 MB  | OK                              |
| `public/media/neo/avatar/angry.mp4`      | 1.5 MB  | OK                              |
| `public/media/neo/avatar/shutdown.mp4`   | 0.9 MB  | OK                              |

### idle.mp4 — recommended re-encode (not applied this pass)

`idle.mp4` is the only outlier. At 17.3 MB it is more than 5× the size of
the boot intro and ~3× the size of the next-largest reaction. The
playback policy is now `preload="metadata"` and the clip plays *after*
the wakeup reaction, so the file no longer competes with the boot
decoder — but on slow networks the loop start may still show a brief
buffering pause the first time it plays.

The recommended in-place re-encode (same dimensions, same FPS, no audio,
faststart, slow preset, CRF 24, Constrained Baseline H.264) is identical
in spirit to the boot/background recipe and should reduce idle.mp4 to
roughly 4–6 MB without perceptible quality loss against the masked
reactor stage and the persistent orb's circular clip:

```sh
ffmpeg -i public/media/neo/avatar/idle.mp4 \
  -an -c:v libx264 -profile:v baseline -level:v 4.0 \
  -preset slow -crf 24 -pix_fmt yuv420p -movflags +faststart \
  public/media/neo/avatar/idle.mp4
```

`ffmpeg` is not available in this CI container, so the re-encode is left
as a follow-up. The architectural fixes in this pass (no mount during
boot, no greedy preload, no seeded wasted preload of idle) close the
boot-stutter root cause regardless of whether the re-encode happens —
the recommendation is about loop-start smoothness on first idle, not
boot-time stutter.

---

## 6. Remaining device-dependent caveats

* On very low-end devices the boot video may still drop frames during
  the first one or two seconds while the H.264 decoder warms up. The
  boot video is now the **only** competing media element on the page at
  that point, so this is the floor of what the software can do —
  further improvement would require switching the boot intro to an
  APNG/WebM, an image sequence, or a pre-warmed Lottie animation. Out
  of scope.
* The recommended `idle.mp4` re-encode (see §5) would noticeably improve
  first-loop smoothness on slow networks. It is not required for the
  boot lag fix.
* If a future contributor adds another autoplaying `<video>` to the app,
  the boot gate must be applied there too — only the boot decoder
  should be active during the boot sequence.

---

## 7. Verification receipts (this pass)

* `npm run typecheck` — `tsc --noEmit` passed cleanly.
* `npm run lint` — `eslint .` passed cleanly.
* `npm run build` — `next build` succeeded; Capacitor `out/` prepared
  with the static export and `public/` mirrored.

Real-device playback verification (boot smoother, avatar handoff clean,
background fades in after the post-boot stagger, no frozen frames)
requires a physical Android device or emulator and the developer's
`assembleDebug` build. Neither is executable from this container — see
`DEVICE_ACCEPTANCE_REPORT.md` for the device-side QA protocol that the
operator should run against this branch before merging.
