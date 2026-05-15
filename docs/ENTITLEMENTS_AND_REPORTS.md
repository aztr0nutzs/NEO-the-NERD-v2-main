# NEO entitlements + reports architecture

This document is the single source of truth for what the "Free" and "Plus"
tiers mean in NEO the NERD, and for the exportable reports the app produces.

The intent is to build the **architecture** for future monetization without
**paywalling** anything that currently ships. Today, everything is part of
Free.

## Files

| Path | Purpose |
|------|---------|
| `lib/entitlements/tiers.ts` | Tier + feature registry; `canUseFeature` gate |
| `lib/exports/network-report.ts` | Pure builder for the `NetworkReport` data model |
| `lib/exports/formatters.ts` | JSON / CSV / printable text serializers |
| `lib/exports/ai-summary.ts` | Provider-backed summary with deterministic fallback |
| `lib/exports/download.ts` | Browser blob download + Capacitor Filesystem/Share |
| `components/exports/network-export-panel.tsx` | UI surfacing inside Settings + Network → History |
| `lib/store.tsx` / `lib/types.ts` | Persisted `EntitlementState` on `AssistantSettings` |

## Free core (ships today)

| Feature ID | Label |
|------------|-------|
| `network.scan.basic` | Network discovery scans (quick / balanced / deep) |
| `network.export.json` | JSON report export |
| `network.export.csv` | CSV report export |
| `network.export.text` | Printable text report |
| `device.inventory.export` | Trusted device inventory export |
| `ai.summary.deterministic` | On-device deterministic summary |

Every existing screen — onboarding, voices, personalities, network map, chat,
games — remains in the Free tier.

## Plus candidates (architecture only)

These features are tagged `tier: "plus"` in the registry but currently flip
`freeInCurrentBuild: true`, which keeps them usable in this build. They show
a `PLUS` badge so users can see the future direction.

| Feature ID | Headline | Status today |
|------------|----------|--------------|
| `network.export.pdf` | Polished, shareable PDF reports | Not implemented — tagged as Plus-only when added |
| `network.history.long-term` | Months of history at your fingertips | Bundled in Free |
| `monitoring.scheduled-deep` | Always-on deep network watch | Bundled in Free |
| `voice-pack.premium` | Cinematic neural voices | Bundled in Free |
| `reports.advanced` | Drill-down analytics across every scan | Bundled in Free |
| `multi-network-profiles` | One NEO, every network you visit | Bundled in Free |
| `ai.summary.provider` | AI-written executive summary | Bundled in Free |

To paywall a Plus candidate later, flip its `freeInCurrentBuild` to `false`
in `tiers.ts`. No UI changes required — the `canUseFeature` gate and the
`Lock`/`PLUS` chips in the export panel already handle the rendering.

## Reports

### `NetworkReport` data model

Built by `buildNetworkReport()` and tagged with `schema: "neo.network-report/v1"`.

Sections:

1. **summary** — adapter label, demo flag, SSID, gateway / local IP, last
   scan timestamp, device counts, latest health snapshot.
2. **devices** — every device currently in the discovery set; includes
   trust level, owner label, room, ports, notes, plus `newSinceLastScan`
   and `offlineSinceLastScan` flags derived from the latest scan delta.
3. **flaggedDevices** — devices marked new / unknown / blocked.
4. **events** — up to 100 most recent network events.
5. **alerts** — all captured monitoring alerts.
6. **health** — up to 30 most recent health snapshots.

### Formats

| Format | Bundle | Output |
|--------|--------|--------|
| JSON | network-report, device-inventory | `application/json` with full sections |
| CSV | network-report, device-inventory | Multi-section CSV (sections separated by `## name` headers) |
| Text | network-report, device-inventory | Printable mission report |
| PDF | future Plus | Not implemented; gated behind `network.export.pdf` |

### AI summary

`buildExportAiSummary` is called when "AI EXECUTIVE SUMMARY" is enabled in
the export panel. It attempts `generateAssistantReply` with a tech-helper
persona and the live network context. If the provider returns a `provider`
mode reply, that text is used; otherwise the function returns a
deterministic local paragraph built from the report itself. The export
always succeeds — the AI step never blocks the download.

### Delivery

`downloadReport` resolves to the platform-appropriate handler:

- **Web**: builds a `Blob`, clicks an anchor, revokes the URL.
- **Android / iOS (Capacitor)**: writes to `Documents` via `@capacitor/filesystem`
  and offers a Share sheet via `@capacitor/share`. If Share is dismissed,
  the file is still saved.
- **Clipboard fallback**: every export panel includes a "Copy to clipboard"
  button so users on locked-down browsers can still capture the report.

## Free-core guarantees

- No previously shipping feature has been removed, hidden, or restricted.
- No new UI requires a Plus tier to function.
- All Plus markers are informational. The export panel still produces a
  working report regardless of tier.
