# NEO Voice Runtime

This document describes the canonical voice/TTS execution layer that the Voice
Library and Response Vault consume. The single entry point is
`lib/voice/voice-runtime.ts`. It handles browser SpeechSynthesis previews,
provider TTS generation through the Phase 1 backend transport, and managed
playback of generated audio payloads — with blob URL revocation on every exit
path.

## Goals

1. **Truthful capability reporting.** A user must be able to read the runtime
   status badge and the per-profile truth label and know exactly which path
   their next preview will take.
2. **Capacitor-correct.** Static Android builds must not call same-origin
   `/api/tts` when no `NEXT_PUBLIC_NEO_BACKEND_BASE_URL` is configured.
3. **Leak-free playback.** Every `URL.createObjectURL` is revoked on next
   play, `stopVoicePreview()`, or `<audio>` end/error.
4. **UI preservation.** No layout changes — only truthful labels and a button
   `disabled` state when the provider path is genuinely unavailable.

## Modules

```
lib/voice/
  voice-runtime.ts          Canonical surface — use this from new code.
  browserSpeechAdapter.ts   Web Speech API wrapper (internal).
  ttsClient.ts              Base64 ↔ Blob helpers, server-side OpenAI client.
  ttsProviderAdapter.ts     Compatibility shim re-exporting voice-runtime.
  voicePreviewAdapter.ts    Compatibility shim re-exporting voice-runtime.
  voicePlayback.ts          Shared playback snapshot types + param mappers.
  voiceProfiles.ts          The 41 voice profile catalog.
  voicePresets.ts           availabilityLabel + voiceProfileToParams.
```

## Capability model

```ts
type VoicePreviewMode = "browser-speech" | "provider-tts" | "unavailable"

interface VoiceRuntimeCapabilities {
  browserSpeechSupported: boolean    // SpeechSynthesis present in this WebView
  providerTtsAvailable: boolean      // backend reachable AND provider key set
  remoteBackendConfigured: boolean   // BackendMode === "remote" | "same-origin"
  currentPreviewMode: VoicePreviewMode  // best path for the active profile
}
```

`getVoiceRuntimeCapabilities(profile?)` returns the async snapshot (probes
backend health via the Phase 1 transport's 30 s cache).
`getCachedVoiceRuntimeCapabilities(profile?)` is a cheap synchronous read for
first paint.

## Decision tree

`previewVoice({ profile, text, params, mode = "auto", onStateChange })`:

```
1. If profile.availability === "unavailable"
       → onStateChange("error"); return { mode:"unavailable", ok:false }
2. If mode === "provider-tts", OR (mode === "auto" AND currentPreviewMode === "provider-tts"):
       a. If !providerTtsAvailable
              → return { mode:"unavailable", ok:false, error:"…not configured." }
       b. Stop any browser speech utterance, signal "preparing",
          POST /api/tts via Phase 1 transport.
              - On payload         → playProviderAudio() (manages blob URL),
                                      return { mode:"provider-tts", ok:true, payload }
              - On error           → return { mode:"provider-tts", ok:false, error }
3. If mode === "browser-speech", OR (mode === "auto" AND currentPreviewMode === "browser-speech"):
       a. If !browserSpeechSupported
              → return { mode:"unavailable", ok:false, error:"…not supported." }
       b. teardownProviderAudio() (revoke any active blob URL)
       c. speakWithBrowserSpeech(...); return { mode:"browser-speech", ok }
4. Otherwise return { mode:"unavailable", ok:false, error:"Neither path available." }
```

`stopVoicePreview()` cancels both the browser speech utterance and the managed
provider audio element, and revokes the active blob URL.

`pauseVoicePreview()` / `resumeVoicePreview()` operate on whichever path is
currently active.

`generateProviderAudio({ voiceId, text, params })` produces a payload without
playing it (used by the "GENERATE PROVIDER AUDIO" / save-share workflow).

`playProviderAudio({ payload, volume, voiceId, onStateChange })` plays a
payload via a managed `<audio>` element. The blob URL it creates is owned by
the runtime and revoked on `ended`, `error`, the next play, or
`stopVoicePreview()`.

## Provider vs browser-speech truth table

| Runtime | `NEXT_PUBLIC_NEO_BACKEND_BASE_URL` | Server `OPENAI_API_KEY` | Profile availability | `currentPreviewMode` | "GENERATE PROVIDER AUDIO" button |
|---|---|---|---|---|---|
| `next dev` | unset | set | `provider-ready` | `provider-tts` | enabled |
| `next dev` | unset | unset | `provider-ready` | `browser-speech` | disabled ("PROVIDER AUDIO UNAVAILABLE") |
| `next dev` | unset | any | `browser-preview` | `browser-speech` | disabled |
| `next dev` | unset | any | `profile-only` | `browser-speech` | disabled |
| `next dev` | unset | any | `future-provider-target` | `browser-speech` | disabled |
| `next dev` | unset | any | `unavailable` | `unavailable` | disabled |
| Capacitor Android | unset | n/a | `provider-ready` | `browser-speech` (if WebView supports) else `unavailable` | disabled |
| Capacitor Android | valid hosted URL | set | `provider-ready` | `provider-tts` | enabled |
| Capacitor Android | invalid URL | any | any | `browser-speech` (if supported) else `unavailable` | disabled, status shows "BACKEND UNREACHABLE" |
| Capacitor Android | any | any | any | falls through to browser path / unavailable | depends on browser support |
| Any | any | any | unsupported WebView (no SpeechSynthesis) + non-provider profile | `unavailable` | disabled |

## User-facing label corrections

| Surface | Before | After |
|---|---|---|
| Settings → TTS ENGINE | `LOCAL MOCK` (Phase 1) | `PROVIDER READY` / `BROWSER + LOCAL ENGINE` / `LOCAL ENGINE ONLY` / `BACKEND UNREACHABLE` / `DETECTING` from `useBackendRuntime()` |
| Controls → VOICE ENGINE | `LOCAL MOCK` (Phase 1) | Same as above |
| Voice Library → "GENERATE PROVIDER AUDIO" button | Always enabled, errored at click time | Disabled with label `PROVIDER AUDIO UNAVAILABLE` when `providerTtsAvailable === false`. Tooltip explains. |
| Voice Library → status footer | "Emotion is provider/style metadata." | "Emotion is provider-style metadata applied by provider TTS." / "Emotion is provider-style metadata; provider TTS not active." — toggles on `providerTtsAvailable`. |
| Voice Library → per-profile truth label (`getProfileTruthLabel`) | Always emitted `PROVIDER READY // BROWSER PREVIEW` even when provider unreachable | Now emits `PROVIDER ACTIVE` only when truly active; otherwise `PROVIDER READY // BROWSER PREVIEW` for fallback or `PROVIDER READY // NO LOCAL FALLBACK` when even browser speech is unavailable. |
| Response Vault → "Generate audio" affordance | Errored at click when provider unconfigured | Disabled / status shows truthful reason BEFORE the click. |
| Voice Library initial status | `TTS READY WHEN SERVER PROVIDER IS CONFIGURED` (always misleading on Android) | `VOICE PREVIEW READY` — neutral; specific status appears after first preview. |

## Emotion truth

- The `emotion` slider is provider-side style metadata. It is passed to
  OpenAI TTS as `instructions` (already wired in `ttsClient.ts`).
- It does **not** modulate browser SpeechSynthesis (which only supports rate,
  pitch, volume).
- The Voice Library footer states this directly. The slider is still useful
  metadata for the response vault and provider-active sessions.

## Audio cleanup

`voice-runtime.ts` keeps two module-level refs: `currentAudio` and
`currentBlobUrl`. Every state transition revokes the blob URL:

| Trigger | Action |
|---|---|
| `playProviderAudio()` called | `teardownProviderAudio()` revokes the prior blob URL before creating a new one. |
| `<audio>` `onended` | `revokeCurrentBlobUrl()` |
| `<audio>` `onerror` / play rejection | `revokeCurrentBlobUrl()` |
| `stopVoicePreview()` | `teardownProviderAudio()` |
| Component unmount (`useEffect` cleanup) in Voice Library / Response Vault | `stopVoicePreview()` |
| `previewVoice({ mode: "browser-speech" })` called | `teardownProviderAudio()` first (avoid overlapping audio sources). |

`downloadAudio()` in `lib/voice/ttsClient.ts` already revokes its temporary
blob URL after the synthetic click. `shareOrSaveAudio()` on Capacitor writes
via the Filesystem plugin and does not create a blob URL.

## Failure state handling

| State | Surface |
|---|---|
| No browser speech support | `BROWSER PREVIEW UNAVAILABLE` truth label; status "BROWSER SPEECH UNAVAILABLE IN THIS WEBVIEW"; preview button still clickable for provider profiles when provider is available. |
| Provider unavailable (no backend URL on Capacitor) | `GENERATE PROVIDER AUDIO` button **disabled** with label `PROVIDER AUDIO UNAVAILABLE`; status: "REMOTE BACKEND NOT CONFIGURED // SET NEXT_PUBLIC_NEO_BACKEND_BASE_URL". |
| Provider configured but unreachable (network error / 5xx) | Status: error message from transport (uppercased). Playback state is `error`. |
| Profile.availability === "unavailable" | Status: "VOICE PREVIEW UNAVAILABLE". Preview no-ops. |
| Stop preview successful | `stopVoicePreview()` cancels browser utterance + provider audio, revokes URL. No status text is needed — the player buttons reflect the idle state. |

## Conversation with the assistant runtime

The voice runtime is independent of the assistant runtime (Phase 2). They both
consume the Phase 1 backend transport but have separate health/capability
caches. The chat-screen "AI: …" pill and Settings/Controls engine row are
driven by `useBackendRuntime`; the Voice Library truth label is driven by
`getVoiceRuntimeCapabilities`. They will report consistent state because both
read from the same `BackendHealthSnapshot`.

## Configuring provider audio on Capacitor

1. Deploy the Next.js app with `OPENAI_API_KEY` set.
2. For the Android build, set
   `NEXT_PUBLIC_NEO_BACKEND_BASE_URL=https://your-backend.example.com`.
3. `npm run build && npx cap sync android` — the env var is baked into the
   client JS.
4. CORS on the backend must allow the Capacitor origin (`capacitor://localhost`).

After install, the Voice Library button will read `GENERATE PROVIDER AUDIO`
and the per-profile truth label will read `PROVIDER ACTIVE` for
provider-ready voices.
