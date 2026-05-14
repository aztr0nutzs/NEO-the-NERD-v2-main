# Asset Hygiene Report (Media Dedupe / Stale Cleanup)

Date (UTC): 2026-05-13

## Scope
- Audited `public/`, `new_neo/`, and top-level media files.
- Deletion-only cleanup (no transcoding/recompression).
- Preserved all currently referenced production assets.

## Active canonical assets (verified by code references)
- Boot video: `/media/neo/boot/neo_boot_new.mp4`
- Avatar clips: `/media/neo/avatar/{idle,wakeup,thinking,happy,ecstatic,surprised,angry,shutdown}.mp4`
- Backgrounds: `/images/neo/backgrounds/neo-background-portrait.png`, `/images/neo/backgrounds/neo-background-square.png`
- Info posters: `/images/neo/info/nerd-info-{1,2,3}.png`
- Robot asset in use: `/robot.png`

## Deleted files (safe removal)
Deleted only files with no product-code references and no required build/runtime role:
- `public/neo_nerd_boot.mp4`
- `neo_nerd_boot.mp4`
- `new_neo/avatar/angry.mp4`
- `new_neo/avatar/ectastic.mp4`
- `new_neo/avatar/happy.mp4`
- `new_neo/avatar/idle.mp4`
- `new_neo/avatar/neo_boot_new.mp4`
- `new_neo/avatar/shutdown.mp4`
- `new_neo/avatar/surprised.mp4`
- `new_neo/avatar/thinking.mp4`
- `new_neo/avatar/wakeup.mp4`
- `new_neo/neo_backround1.png`
- `new_neo/neo_backround2.png`
- `new_neo/nerd_info1.png`
- `new_neo/nerd_info2.png`
- `new_neo/nerd_info3.png`
- `nerd_info1.png`
- `nerd_info2.png`
- `nerd_info3.png`
- `new_neo/network-discovery-module/`

## Intentionally retained
- `public/media/neo/**` active runtime media path.
- `public/images/neo/**` active background/info posters.
- `top_marquee.png` is retained because README uses it and no canonical duplicate exists under `public/`.
- `new_neo/network-discovery-module/` was removed after reference search confirmed no product-code usage. The integrated production Network feature now lives under root `components/network`, `lib/network`, and the Android Capacitor plugin.

## Size comparison
- Before cleanup (measured):
  - `public/neo_nerd_boot.mp4`: 3.3M
  - `neo_nerd_boot.mp4`: 3.3M
  - `new_neo/avatar`: 39M
  - `new_neo/neo_backround1.png`: 1.8M
  - `new_neo/neo_backround2.png`: 1.8M
  - `new_neo/nerd_info1.png`: 2.4M
  - `new_neo/nerd_info2.png`: 2.2M
  - `new_neo/nerd_info3.png`: 2.2M
  - top-level `nerd_info{1,2,3}.png`: 6.6M
  - `new_neo/network-discovery-module/`: legacy standalone workspace, removed from production tree
- Approximate removed total: **~62.6 MB plus the legacy nested workspace**.

## Validation result
- Lint: pass
- Typecheck: pass
- Build: pass
