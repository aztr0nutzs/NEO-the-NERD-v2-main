# Asset and Repo Cleanup Report

## Scope
- Audited active media references in app/runtime code and docs.
- Audited `public/`, root-level media, `screenshots/`, `qa-screenshots/`, and generated output folders.

## Active canonical asset paths (retained)
- Boot video: `public/media/neo/boot/neo_boot_new.mp4`
- Avatar clips: `public/media/neo/avatar/{idle,wakeup,thinking,happy,ecstatic,surprised,angry,shutdown}.mp4`
- Background artwork: `public/images/neo/backgrounds/*`
- Info posters: `public/images/neo/info/*`
- Robot still: `public/robot.png`
- README marquee: `top_marquee.png` (intentionally retained because `README.md` references it)

## Duplicate/stale categories found
1. Root-level and ad-hoc screenshot artifacts not referenced by product code.
2. Redundant root image artifact not referenced by app/runtime/docs.
3. Generated output folders (`out/`, `.next/`) present locally; left untouched in this pass.

## Files removed (safe, unreferenced)
- `icon.png` (root)
- `screenshots/neo-main.png`
- `screenshots/neo-settings.png`

## Files intentionally retained
- `public/media/neo/**` — active runtime media referenced by avatar/boot components.
- `public/images/neo/**` — active background/info assets.
- `public/robot.png` — active robot image source.
- `top_marquee.png` — README dependency.
- `qa-screenshots/**` — QA evidence artifact set retained intentionally.
- `out/` and `.next/` — local generated outputs retained (no build workflow changes in this cleanup pass).

## Size snapshot (approx)
- Before cleanup:
  - repo: `1.1G`
  - `qa-screenshots`: `21M`
  - `screenshots`: `444K`
  - `out`: `54M`
  - `.next`: `13M`
- After cleanup:
  - repo: `1.1G` (rounded by `du -sh`; small asset removals are below 0.1G granularity)
  - `qa-screenshots`: `21M`
  - `screenshots`: `0` (directory now empty)
  - `out`: `54M`
  - `.next`: `13M`

## Rationale
- Removed only files with zero code/runtime/docs references and redundant QA screenshot copies in `screenshots/`.
- Preserved every active app asset path and all canonical runtime media.
- Avoided deleting generated folders in this pass to keep workflow risk near zero.
