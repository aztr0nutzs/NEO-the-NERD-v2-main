# Prankstar Sound Asset Drop Zone

This directory is the **canonical** runtime location for ported Prankstar
audio assets in the NEO app.

The sound catalog (`lib/prankstar/soundCatalog.ts`) expects every entry to
resolve to a file under this path:

```
public/prankstar/sounds/<category_folder>/<filename>
```

served at runtime as:

```
/prankstar/sounds/<category_folder>/<filename>
```

## Current asset coverage

Run the validator at any time:

```
node scripts/validate-prankstar-assets.cjs
```

It reports: total catalog entries, files matched on disk, files missing,
extra uncataloged files, and a per-category breakdown.

Latest snapshot (Phase 2):

| Category         | Catalog entries | Files on disk |
| ---------------- | --------------- | ------------- |
| ambience         | 73              | 0             |
| animal           | 38              | 20            |
| cartoon          | 15              | 15            |
| creepy           | 3               | 0             |
| funny            | 17              | 7             |
| misc             | 56              | 0             |
| voice            | 122             | 107           |
| voices_fighter   | 46              | 46            |

The remaining missing assets (ambience, creepy, misc, partial animal/funny,
plus the `voice/Male/` numeric set) were not part of the GitHub Android
upload batches and need a follow-up sourcing pass.

## Quarantined files

`_unmatched/` holds loose-root audio files that arrived with the asset
drop but did not correspond to a single catalog destination (e.g. the
secondary copy of single-destination files like `hold.ogg`). They are kept
out of the active library to avoid false positives in validation but
preserved on disk in case they are needed later.
