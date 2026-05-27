# Phase 2 — Product-Truth Unification

**Captured:** 2026-05-27

This pass standardizes major feature-state labels around the shared truth vocabulary:

`LIVE`, `LOCAL`, `PROVIDER ACTIVE`, `PROVIDER REQUIRED`, `CONNECTOR REQUIRED`, `READ ONLY`, `ESTIMATED`, `PARTIAL`, `NOT CONFIGURED`, `UNAVAILABLE`, `DEMO`, `FALLBACK`, `FOREGROUND ONLY`, `COMING SOON`.

## Scope

This was a copy/state-label correction pass only. It did not implement router connectors, closed-app background monitoring, OmniVoice engines, upload endpoints, or new game modes.

## Applied Surfaces

- Onboarding now says foreground monitoring and estimated/demo network map behavior instead of implying closed-app background service or verified live topology in every runtime.
- Chat/provider status uses `PROVIDER ACTIVE`, `FALLBACK`, `NOT CONFIGURED`, and `UNAVAILABLE`.
- Settings and Controls rows consume the same backend runtime labels.
- Voice cards and the Voices screen use `PROVIDER ACTIVE`, `FALLBACK`, `PARTIAL`, and `UNAVAILABLE` for runtime truth while preserving authored profile details.
- Network discovery, topology, router status, and settings use `LIVE`, `DEMO`, `ESTIMATED`, `READ ONLY`, `CONNECTOR REQUIRED`, `PARTIAL`, and `FOREGROUND ONLY`.
- Speed Test continues to label missing upload measurement as `NOT CONFIGURED` / `PARTIAL`.
- Game cards and Knxt 4 mode surfaces distinguish `LIVE`, `PARTIAL`, and `COMING SOON`.

## Shared Helpers

- `lib/truth-labels.ts`
- `components/truth-badge.tsx`

These provide the canonical label set and a neon/HUD-compatible badge for repeated surfaces.

## Validation

Required checks for this phase:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
