# Voice Uniqueness Completion Report

## Final voice inventory
- Total voice profiles: **40**.
- Availability distribution: provider-ready 30, browser-preview 5, future-provider-target 4, profile-only 1.

## Voice taxonomy count (runtime-resolved)
- provider-distinct: any provider-ready profile when provider runtime is reachable.
- native-distinct: profiles on Android when multiple native voices are available and selected.
- styled-variant: browser/native styled fallbacks.
- profile-only: no voice engine available.

## Provider voice reuse table
- Provider reuse remains in `lib/voice/voiceProfiles.ts` through shared `providerVoiceId` values (styled variants share base provider voices with profile style differences).

## Native voice strategy
- Native Android voice selection is handled in `lib/voice/native-tts-bridge.ts` and runtime-selected via scoring + deterministic rotation.

## Runtime/device dependent areas
- Provider distinctness depends on backend health + provider key.
- Android distinctness depends on installed native voice inventory.
- Browser fallback depends on SpeechSynthesis support.

## Integration status
- Voice preview: integrated through `previewVoice` + uniqueness labels.
- Personality preview: linked voice preview path shown and spoken through runtime.
- Chat speech: per-message assistant speak now wired via message bubble play button.
- Response Vault speech: speaks using active profile runtime.

## Remaining limitations
- Capacitor sync blocked in this environment due Node version requirement (`>=22` required by Capacitor CLI).

## Verification command receipts
- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run build` ✅
- `npx cap sync android` ⚠️ Node version limitation in environment
