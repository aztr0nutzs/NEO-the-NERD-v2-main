# NEO the N.E.R.D. — Runtime Architecture

This document describes the transport layer that makes NEO usable in three distinct
runtimes without forking the UI.

## The problem this solves

The app ships two ways:

1. **Hosted Next.js** — `next dev` / `next start` / Vercel. The Next.js app router
   exposes server route handlers under `app/api/...` (`/api/assistant/chat`,
   `/api/tts`). Every page can `fetch("/api/...")` because the same origin owns
   both the page and the route.
2. **Capacitor / Android** — `next build && node scripts/prepare-capacitor.mjs`
   produces `out/`, which is then synced into the Android project by Capacitor.
   **Inside the Android APK there is no Next.js server.** The route handlers
   under `app/api/...` are not bundled into `out/`. A `fetch("/api/...")` call
   from the WebView will fail with a network/404 error.

A direct same-origin fetch in `lib/store.tsx` and `lib/voice/ttsProviderAdapter.ts`
made the chat and provider-TTS features dead-on-arrival in Android packaged
builds. The runtime transport layer fixes that without changing any UI.

## Modules

```
lib/runtime/
  runtime-environment.ts   Runtime classification (web | native | static | server)
  backend-config.ts        Picks transport mode from env + runtime
  backend-health.ts        Cached health probe of the backend
  backend-client.ts        Typed helpers: postAssistantChat, postTtsPreview
lib/assistant/
  assistantLocalRuntime.ts Runs the local response engine in the browser
hooks/
  use-backend-runtime.ts   React hook surfacing engine label + fallback flag
```

## Endpoint strategy truth table

| Runtime                          | `NEXT_PUBLIC_NEO_BACKEND_BASE_URL` | `BackendMode`     | Behavior                                                                                                  |
|----------------------------------|------------------------------------|-------------------|-----------------------------------------------------------------------------------------------------------|
| Next.js dev / hosted             | unset                              | `same-origin`     | Calls `/api/assistant/chat`, `/api/tts` on the same origin (existing behavior, unchanged).                |
| Next.js hosted on different host | set                                | `remote`          | Calls `${BASE}/api/assistant/chat`, `${BASE}/api/tts`. Operator override.                                 |
| Capacitor Android, no URL        | unset                              | `unavailable`     | Never calls `/api/...`. Chat answers from in-browser local response engine. Provider TTS shows error.      |
| Capacitor Android, URL set       | set                                | `remote`          | Targets the configured hosted backend for live AI + provider TTS.                                          |
| Any runtime, backend unreachable | (any)                              | `remote-error`    | Returns a local fallback chat answer while the compact AI status UI reports the backend truth. |

## Build-time hint

`NEXT_PUBLIC_NEO_BUILD_TARGET=static` can be set when intentionally building a
static export (the Capacitor pipeline). The transport layer also auto-detects
Capacitor at runtime via `Capacitor.isNativePlatform()`, so this hint is
optional but makes the SSR snapshot honest before the async detect resolves.

## Server route files are preserved

`app/api/chat/route.ts`, `app/api/assistant/chat/route.ts`, and `app/api/tts/route.ts`
are still in the repo and still execute under `next dev` and `next start`. The
runtime layer is the *client* of those routes; the routes themselves are
untouched.

## How the helpers behave

### `postAssistantChat(request)`
- `same-origin` / `remote` + reachable: POSTs and returns the server payload.
- `unavailable`: runs `assistantLocalRuntime.runAssistantLocally(request)` and
  returns it with `outcome: "local-fallback"`.
- `remote-error` (HTTP non-2xx or network failure): runs the local engine,
  attaches the error message, and returns `outcome: "remote-error"`.

The chat store keeps assistant message bodies natural and product-ready. Fallback
truth is surfaced through the compact AI status UI and its tooltip; detailed
fallback reasons are logged only outside production.

### `postTtsPreview(request)`
- `same-origin` / `remote`: POSTs to `/api/tts`, returns audio payload on success
  or a `remote-error` outcome with the server error message on failure.
- `unavailable`: returns `outcome: "local-fallback"` with `payload: null`. The
  Voice Library and Response Vault already have a `getProviderVoiceCapabilities`
  truth-label path; the thrown error becomes the badge in the existing UI.

### `checkBackendAvailability(force?)`
Probes `GET ${base}/api/assistant/chat`, which the server route exposes as the
provider status endpoint (`{ provider, providerConfigured, model, message }`).
Result is cached for 30 seconds. Returns one of:
`unknown` | `available` | `available-no-provider` | `unreachable` | `unavailable-by-config`.

## Configuring a hosted backend later

For a future Capacitor build that needs live AI + provider TTS:

1. Deploy the Next.js app to any HTTPS-capable host (Vercel, Fly, Render, etc.).
2. Set `OPENAI_API_KEY` (and optional model overrides) on the server.
3. In `.env` for the *Android* build, set
   `NEXT_PUBLIC_NEO_BACKEND_BASE_URL=https://your-host.example.com`.
4. Rebuild the static export: `npm run build`. The compiled JS bakes in the
   public env var, so `out/` will now target the remote backend.
5. Sync into Android: `npx cap sync android`.

The hosted backend must respond on:

- `GET /api/assistant/chat` — provider status JSON (used as health probe).
- `POST /api/assistant/chat` — chat completion (or local-engine fallback).
- `POST /api/tts` — base64 audio response.

CORS must allow the Capacitor origin (`capacitor://localhost` for Android,
`ionic://localhost` for iOS) and the dev origin if used.

## Truth rules

- The app **never** silently pretends a backend is configured when it is not.
  The Settings → Engine row and Controls → VOICE ENGINE row both read from
  `useBackendRuntime()` and surface one of:
  - `PROVIDER READY` — backend reachable and `providerConfigured: true`.
  - `REMOTE PROVIDER` — same as above, native runtime targeting a remote URL.
  - `BROWSER + LOCAL ENGINE` — backend reachable but no live provider key.
  - `LOCAL ENGINE ONLY` — Capacitor without a backend URL configured.
  - `BACKEND UNREACHABLE` — probe failed.
- Chat answers from the local engine are not suffixed with raw diagnostics.
  The response source remains truthful via the AI status pill and Settings /
  Controls runtime rows.
- Provider TTS error messages bubble up to the existing voice-status line; the
  voice profile truth labels (`PROVIDER READY // BROWSER PREVIEW`,
  `PROFILE ONLY`, `FUTURE PROVIDER TARGET`) remain authoritative.

## What this layer does not do

- It does not implement the Network Module's native bridge or backend (see
  `docs/network-native-adapter.md`).
- It does not introduce a service worker or offline cache for the app shell.
- It does not change the OpenAI provider model selection or the TTS model.
- It does not modify the UI design system, component layout, neon styling, boot
  sequence, avatar video pipeline, 3D map, bottom dock, or any screen layout.
