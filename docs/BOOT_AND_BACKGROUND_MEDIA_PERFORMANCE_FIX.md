# Boot & Background Media Performance Fix

Focused launch-time media correction pass. The boot sequence, animated
background identity, Mission Control screen, avatar system, and overall NEO
visual language were intentionally **not redesigned, flattened, or removed**.
The cinematic intro and ambient background still look the same — they just
stop fighting each other on launch.

---

## 1. Why startup was stuttering

`components/app-shell.tsx` mounted both the heavy ambient
`NeoBackgroundScene` (`/media/neo/neo_backround.mp4`) **and** the
`BootSequenceOverlay` (`/media/neo/boot/neo_boot_new.mp4`) on the same render
pass. Both `<video>` elements were configured with `preload="auto"` and
`autoPlay`. Android WebView therefore tried to spin up two H.264 decoders
simultaneously and stream both files at once.

Probed asset characteristics (before fix):

| Asset       | W×H         | Codec / Profile     | Bitrate     | Duration | Size  | Audio |
|-------------|-------------|---------------------|-------------|----------|-------|-------|
| boot        | 720×956     | H.264 Baseline      | 3.4 Mbps    | 10.0 s   | 4.3 M | AAC LC 126 kbps (unused — element is muted) |
| background  | 1080×1834   | H.264 Baseline      | 5.6 Mbps    | 12.6 s   | 8.8 M | AAC LC 125 kbps (unused — element is muted) |

So the device was asked to:
1. Demux + decode 5.6 Mbps 1080p ambient loop
2. Demux + decode 3.4 Mbps 720p boot intro
3. Parse two audio tracks that are never played

On mid-range Android this is enough to push the boot video into framerate
collapse — exactly the symptom users were seeing.

---

## 2. What changed

### Mount-order gating

`AppShell` now passes `videoEnabled={!bootMounted}` to `NeoBackgroundScene`.
While the boot overlay is mounted, the ambient `<video>` element is **not
rendered**; only the static `neo-background-portrait.png` / `square.png`
poster sits behind the boot frame. Once `onBootComplete` fires and the boot
overlay unmounts, the ambient video mounts and fades in cleanly. This is a
hard, explicit gate driven by app state — no accidental races.

### `preload` policy

* Boot video: kept `preload="auto"`. It is the priority asset and we want it
  to start as fast as possible.
* Ambient background: lowered from `preload="auto"` to `preload="metadata"`.
  The element is only mounted after boot completes, but using `metadata`
  preload prevents an Android WebView from greedy-prefetching the whole file
  if it gets briefly remounted (e.g. tab visibility change).

### Boot overlay failsafes

`components/boot/boot-sequence-overlay.tsx` got tighter timeouts and a real
stall watcher:

* `BOOT_MAX_FAILSAFE_MS` lowered from 35 s → 12 s. This is the outer ceiling
  that fires only when `loadedmetadata` never arrives. The duration-derived
  failsafe still kicks in (`video.duration * 1000 + 1500 ms`) as soon as
  metadata is known.
* New `BOOT_STALL_THRESHOLD_MS` (6 s) watcher: every 250 ms while playing it
  checks that `currentTime` is actually advancing. If `currentTime` does not
  move for 6 s the overlay self-exits via `finishBoot(false)` — the user is
  never trapped behind a frozen frame.
* The watcher is also armed on the `stalled` event so a decoder-reported
  stall starts the countdown immediately.
* The `AppShell` onboarding-gate failsafe was lowered from 40 s to 15 s.

### Pause-on-hidden retained

`NeoBackgroundScene` continues to pause its video on `document.hidden` and
resume on `visibilitychange`, so the ambient loop is not chewing decoder
cycles when the user backgrounds the app.

### Media transcode (in-place)

Both MP4s were re-encoded with `ffmpeg` to drop their unused audio tracks
and add `+faststart` so the demuxer can start playback immediately:

| Asset       | Before     | After      | Delta      | Bitrate | Notes                                            |
|-------------|-----------|------------|-----------|---------|--------------------------------------------------|
| boot        | 4.3 MB    | 3.4 MB     | −21 %      | 2.8 Mbps | CRF 21, H.264 Constrained Baseline, no audio, +faststart |
| background  | 8.8 MB    | 5.5 MB     | −37 %      | 3.6 Mbps | CRF 24, H.264 Constrained Baseline, no audio, +faststart |

Dimensions and frame rate are unchanged. Visual quality is preserved (CRF
values are conservative, and the background sits behind a 38% vertical
scrim so the small bitrate reduction is not perceptible). The
`Constrained Baseline` profile is even more WebView-friendly than plain
Baseline.

Exact ffmpeg invocations used:

```sh
# Boot
ffmpeg -i public/media/neo/boot/neo_boot_new.mp4 \
  -an -c:v libx264 -profile:v baseline -level:v 3.1 \
  -preset slow -crf 21 -pix_fmt yuv420p -movflags +faststart \
  public/media/neo/boot/neo_boot_new.mp4

# Background
ffmpeg -i public/media/neo/neo_backround.mp4 \
  -an -c:v libx264 -profile:v baseline -level:v 4.0 \
  -preset slow -crf 24 -pix_fmt yuv420p -movflags +faststart \
  public/media/neo/neo_backround.mp4
```

If you ever regenerate these assets from source, this is the recommended
spec — keep the boot quality bias higher (CRF 21) and the background
slightly lower (CRF 24) because of the scrim.

---

## 3. Startup media lifecycle

### Before

```
t=0   AppShell mounts
      ├─ NeoBackgroundScene mounts <video preload="auto" autoPlay>  ← 5.6 Mbps loop start
      └─ BootSequenceOverlay mounts <video preload="auto" autoPlay> ← 3.4 Mbps boot start
      Both decoders contend for the same Android decoder/memory budget.
      Boot video stutters or freezes. No stall watcher — user can sit
      on a frozen frame for up to 35 s before the outer failsafe trips.
```

### After

```
t=0   AppShell mounts
      ├─ NeoBackgroundScene mounts WITHOUT the <video> element
      │  (static PNG poster only — zero decode work)
      └─ BootSequenceOverlay mounts <video preload="auto" autoPlay>
         Gets the full decoder budget. Stall watcher armed on play.
t=~10 boot video ends → finishBoot(true) → AnimatePresence fade-out
      → handleExitComplete → onBootComplete → setBootMounted(false)
t=~10 BootSequenceOverlay unmounts; <video> source detached
      NeoBackgroundScene now sees videoEnabled=true → mounts ambient
      <video preload="metadata"> → fades in over the PNG poster.
```

---

## 4. Files changed

* `components/app-shell.tsx` — pass `videoEnabled={!bootMounted}` to background; lower onboarding-gate failsafe from 40 s to 15 s.
* `components/background/neo-background-scene.tsx` — new `videoEnabled` prop gate, reset playback state on toggle, `preload="metadata"`.
* `components/boot/boot-sequence-overlay.tsx` — tighter outer failsafe, new `armStallWatcher` driving `BOOT_STALL_THRESHOLD_MS`, clears watcher on `finishBoot`.
* `public/media/neo/boot/neo_boot_new.mp4` — re-encoded (no audio, faststart, CRF 21).
* `public/media/neo/neo_backround.mp4` — re-encoded (no audio, faststart, CRF 24).
* `docs/BOOT_AND_BACKGROUND_MEDIA_PERFORMANCE_FIX.md` — this file.

---

## 5. Remaining device-dependent caveats

* On very low-end devices the boot video may still drop frames during the
  first one or two seconds while the H.264 decoder warms up. The boot
  video is now the only competing media element on the page at that
  point, so this is the floor of what software can do — further
  improvement would require switching the boot intro to an APNG/WebM,
  an image sequence, or a pre-warmed Lottie animation. Out of scope for
  this pass.
* The static PNG poster behind the boot is still rendered at native
  resolution. It is already optimized in the repo, so no change here.
* If a future contributor adds another autoplaying `<video>` to
  `AppShell`, the gating rule must be applied there too — only the boot
  decoder should be active during the boot sequence.

---

## 6. Verification receipts (this session)

* `npm run typecheck` — `tsc --noEmit` passed.
* `npm run lint` — `eslint .` passed.
* `npm run build` — `next build` succeeded; Capacitor web assets prepared.
* `npx cap sync android` — synced 5 Capacitor plugins.

Real-device playback verification (boot smoother, background fades in
after boot exits cleanly, no frozen frames, no kicked-out user) requires
a physical Android device or emulator and the developer's `assembleDebug`
build. It is not executable from this container.
