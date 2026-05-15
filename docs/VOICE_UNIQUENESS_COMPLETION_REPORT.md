# Voice Uniqueness Completion Report

This report describes what the v2.4 Voice Uniqueness implementation actually
delivers. It deliberately avoids overclaiming distinctness: a profile is only
called "provider-distinct" when it is the canonical owner of a given provider
voice id, and "native-distinct" only when the Android device genuinely exposes
a separate voice.

## Final voice inventory

- Total voice profiles: **40**.
- Availability distribution: provider-ready 30, browser-preview 5,
  future-provider-target 4, profile-only 1.

## Final taxonomy counts (authored, first-class on `VoiceProfile`)

- `provider-distinct`: **10**
- `native-distinct`: **0** (no profile is authored against a specific Android
  device voice; native-distinct is only achievable opportunistically at
  runtime when the device exposes >1 selectable voice and the bridge selects
  a distinct one — see Runtime section).
- `styled-variant`: **20**
- `profile-only`: **10**

## Provider voice reuse table

The 30 provider-ready profiles map to 10 OpenAI base voices. Only the canonical
owner of each base voice is `provider-distinct`; siblings are `styled-variant`.

| Provider voice | Canonical (provider-distinct) | Styled variants                                                              |
|----------------|-------------------------------|------------------------------------------------------------------------------|
| alloy          | neo                           | byte, droid, friendly-tech-support, holo-host                                |
| nova           | nova                          | —                                                                            |
| echo           | glitch                        | arcade                                                                       |
| coral          | sparky                        | hyper, hyperdrive-host, overclock-coach, circuit-cheerleader                 |
| onyx           | commander                     | deepcore, midnight-narrator, tactical-guide                                  |
| shimmer        | prankster                     | tiny, velvet-circuit, solar-diplomat                                         |
| sage           | neon-mentor                   | cyberkid, chill-byte, synth-sage                                             |
| fable          | retro                         | —                                                                            |
| ash            | snark                         | smooth-operator                                                              |
| ballad         | villain                       | cosmic-commentator                                                           |

Canonical assignments are encoded in `lib/voice/voiceProfiles.ts` under
`CANONICAL_PROVIDER_DISTINCT`. Changing this map is the only way to re-assign
the canonical owner of a base voice.

## Profile-only profiles (no realized engine timbre)

These 10 carry uniqueness only via styling, since no provider voice is mapped:

- arcade-announcer (future-provider-target)
- analog-ghost (browser-preview)
- glitch-sprite (browser-preview)
- little-lab-assistant (future-provider-target)
- riff-reactor (browser-preview)
- drama-module (future-provider-target)
- low-battery-philosopher (browser-preview)
- packet-punk (browser-preview)
- void-oracle (future-provider-target)
- dry-humor-unit (profile-only)

They play via Android native TTS (if available) or browser SpeechSynthesis,
styled with profile pitch, rate, cadence, and provider-style metadata that is
*not* sent anywhere because the provider path is not used.

## Type-model additions (`lib/voice/types.ts`)

`VoiceProfile` now has first-class uniqueness metadata:

- `timbreSource: "provider-distinct" | "native-distinct" | "styled-variant" | "profile-only"`
- `uniquenessScore: number` (0–100)
- `uniquenessExplanation: string`
- `fallbackBehavior: string`
- `stylePrompt?: string`
- `emotionalInstructions?: string`
- `cadenceProfile?: VoiceCadenceProfile`
- `authorityLevel?: 1..5`
- `nativeVoiceId?: string` (reserved; not used yet)

## Runtime truth-label logic — before vs after

**Before.** `getProfileTruthLabel` collapsed every `provider-ready` profile to
`"Provider Distinct Voice"` whenever the backend was reachable, regardless of
whether several profiles shared the same underlying provider voice id.

**After.** The label is computed in `lib/voice/voiceUniqueness.ts` and shared
by both the runtime label, the Voice screen detail, and the card badge:

- Authored `provider-distinct` + provider available → **Provider Distinct Timbre**
- Authored `styled-variant` + provider available → **Styled Provider Variant**
- Engine = native Android, native-distinct selected → **Android Device Voice (…)**
- Engine = native Android, no distinct voice → **Styled Android TTS (…)**
- Engine = browser speech → **Browser Speech Variant**
- No engine → **Profile Only / Preview unavailable**

## `voiceUniqueness.ts` improvements

The module no longer infers uniqueness from `availability`. It now:

- Reads authored `timbreSource` + `uniquenessScore` + `uniquenessExplanation` + `fallbackBehavior` from the profile.
- Combines that with live `VoiceRuntimeCapabilities` (provider, native Android, browser).
- Exposes `getVoiceUniquenessCategory`, `getVoiceTruthLabel`, `getVoiceAvailabilityExplanation`, `isDistinctTimbre`, `isStyledVariant`, `getVoiceCardBadge`, `getUniquenessSummary`, plus `getProviderReuseSummary` and `getCanonicalProviderDistinctProfiles` re-exports.

## Provider TTS instruction improvements

`lib/voice/voiceStyle.ts` adds `buildProviderInstructions(profile, emotionInstruction)`
which composes:

1. Tone instruction (from `toneProfile`).
2. `profile.stylePrompt`.
3. `profile.emotionalInstructions`.
4. `profile.cadenceProfile` → cadence sentence.
5. `profile.authorityLevel` → authority sentence.
6. Emotion slider sentence.

`lib/voice/ttsClient.ts` now calls `buildProviderInstructions` in place of the
old tone-only path, so styled variants sharing a base voice are materially
differentiated in the request.

### Example instructions

These are concatenated and passed as `instructions` to OpenAI TTS along with
the chosen `voice` (the provider voice id) and `speed`.

**Provider-distinct (neo / alloy):**

> Speak with a clear, polished robot-companion tone. Tone cues: core, calm,
> futuristic. Default NEO companion: clear, stable, lightly synthetic,
> futuristic confidence. Balanced, composed, mission-aware. No theatrics;
> precise diction. Maintain an even, predictable cadence with clear phrase
> boundaries. Read clearly with balanced emotion and a polished
> robot-companion tone.

**Styled variant on same base voice (holo-host / alloy):**

> Speak with a clear, polished robot-companion tone. Tone cues: host,
> polished, clear. Polished holographic presenter using the alloy base voice
> with showcase polish. Crisp consonants, presentational rhythm, mild
> theatrical lift. Use a brisk, forward-leaning pace without rushing endings.
> Project confident authority with controlled delivery. Read clearly with
> balanced emotion and a polished robot-companion tone.

**Dramatic / robotic variant (villain / ballad):**

> Speak with sharp, forceful intensity while staying controlled. Tone cues:
> dramatic, villain, theatrical. Cartoon-evil monologue: theatrical menace,
> harmless drama. Slow vowels, rolled emphasis, smug laugh-ready cadence.
> Never sincere. Use a slow, languid cadence with long pauses and trailing
> endings. Project confident authority with controlled delivery. Read with
> upbeat confidence and a friendly futuristic tone.

## Voice card / detail UI changes

- `components/voice-card.tsx` now renders a card-level badge:
  `UNIQUE TIMBRE` / `STYLED VARIANT` / `DEVICE VOICE` / `PROFILE ONLY` /
  `UNAVAILABLE`. The badge uses the authored `timbreSource` (no async fetch
  per card) and shows the explanation on hover.
- `components/screens/voices-screen.tsx` "VOICE UNIQUENESS MODEL" panel now
  shows: authored timbre source, runtime timbre source, uniqueness score,
  distinct flag, fully-realized flag, resolved engine, the explanation, the
  fallback behavior, and a live availability explanation.
- `lib/voice/voicePresets.ts` no longer labels every provider-ready profile
  as "PROVIDER DISTINCT VOICE" — the static badge is now "PROVIDER MAPPED".

## Personality / Chat / Response Vault integration

Already wired in the prior pass and unchanged:

- Personality preview speaks through `previewVoice` → `voice-runtime.ts`.
- Chat assistant message bubble speaks via the same runtime.
- Response Vault speak path is also runtime-driven.

## Native voice strategy (finalized)

`nativeVoiceId` is no longer a vague half-used field. The final shape is:

- **`nativeVoiceId?: string`** — reserved. Pin only when a specific Android
  engine voice (e.g. `en-us-x-sfg-local`) is known to exist across the fleet.
  No profile pins one today (device inventory varies).
- **`nativeVoicePreference?: NativeVoicePreference`** — authored on every
  profile. Capability-driven hints (`localePreference`, `preferOffline`,
  `preferHighQuality`, `preferLowLatency`, `preferNameHints`, `avoidNameHints`,
  `distinctFromPoolKey`).
- **`nativeVoiceResolution`** — runtime-only output of
  `resolveBestNativeVoiceForProfile()`, never authored.

The resolver in [`lib/voice/native-tts-bridge.ts`](../lib/voice/native-tts-bridge.ts)
scores every device voice with `scoreNativeVoiceCandidate`, keeps the top-K,
and deterministically slots sibling profiles (those sharing a
`distinctFromPoolKey`) across the pool. When only one practical voice exists
on a device, the runtime still labels playback as Styled Android TTS — never
"Android Device Voice" — so the UI never overclaims distinct timbre.

See `docs/VOICE_RUNTIME_FINAL_QA.md` for the full strategy, fallback matrix,
and Android listening test plan.

## Card badge truth model (finalized)

- **Authored badge** (always shown): `UNIQUE TIMBRE` / `STYLED VARIANT` /
  `DEVICE VOICE` / `PROFILE ONLY` / `UNAVAILABLE`.
- **Runtime indicator** (shown when card receives `capabilities` prop):
  `LIVE` / `LIMITED` / `FALLBACK` / `OFFLINE`. Powered by the same
  `getVoiceUniquenessCategory()` used by the detail panel — card and detail
  never disagree.

The voice-rail strips (recently used, recommended, featured) intentionally
omit the runtime indicator to stay compact.

## Runtime / device-dependent limitations

- **Provider distinctness** requires `OPENAI_API_KEY` server-side and a
  reachable `/api/tts` (or remote backend). Without it, every provider-ready
  profile, including canonical ones, falls back to Android TTS or browser
  speech and is labeled accordingly. Provider-distinct is *authored intent*,
  not a runtime promise.
- **Native-distinct** is opportunistic. The bridge can only select a separate
  Android voice when the engine exposes >1 selectable voice. On devices with
  one engine voice (or zero), every profile reduces to "Styled Android TTS".
- **Browser fallback** depends on the WebView shipping SpeechSynthesis.
  Some Android WebViews do not.
- `nativeVoiceId` is intentionally not authored on any profile yet; the
  portable, capability-driven `nativeVoicePreference` path is preferred.

## Related docs

- `docs/VOICE_RUNTIME_FINAL_QA.md` — final QA report, fallback matrix, and
  Android listening test plan.

## Verification command receipts

- `npm run typecheck` ✅ (clean — no diagnostics)
- `npm run lint` ✅ (clean — no warnings, no errors)
- `npm run build` ✅ (Next.js compiled successfully; static + dynamic routes
  generated; Capacitor web assets prepared in `out/`)
- `npx cap sync android` ✅ (web assets copied; 5 Capacitor plugins synced)
- Android debug build (`./gradlew assembleDebug`) was **not run** in this
  pass — out of scope for a non-Android dev host. Run it from `/android` on
  a JDK 17 + Android SDK machine when needed.

The lint warning about a missing `appendEvents` dependency in
`components/network/NetworkDiscoveryFeature.tsx` `handleRunDiagnostics`
`useCallback` is fixed.
