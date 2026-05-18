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

## Phase-1 status

The 369-entry catalog ported from Prankstar Lab v2 has been integrated, but
the actual binary `.mp3` / `.ogg` / `.wav` files are **not** bundled in this
repository. They must be sourced and dropped here in the layout expected by
the catalog before sounds will play.

The Sound Library preview panel in `Prankstar Protocol` honestly surfaces
"asset missing" state for any entry whose file is not present.

See `docs/PRANKSTAR_PROTOCOL_PHASE1_INTEGRATION_REPORT.md` for the full
asset validation report.
