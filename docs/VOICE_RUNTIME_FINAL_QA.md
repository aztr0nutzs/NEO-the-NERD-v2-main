# Voice Runtime — Final QA Report

Final audit of the Voice Uniqueness subsystem after the runtime-proofing polish
pass. Companion to `docs/VOICE_UNIQUENESS_COMPLETION_REPORT.md` (which covers
the taxonomy itself).

## 1. Final taxonomy counts

Authored on `VoiceProfile.timbreSource`:

| Category            | Count |
|---------------------|------:|
| `provider-distinct` | 10    |
| `native-distinct`   | 0     |
| `styled-variant`    | 20    |
| `profile-only`      | 10    |
| **Total profiles**  | 40    |

`native-distinct` is **not authored statically** — see §2. It is only ever
realized dynamically at runtime when a device satisfies the conditions.

## 2. Native voice strategy

The previous pass left `nativeVoiceId` half-defined. This pass finalizes it
honestly:

- **`nativeVoiceId?: string`** — reserved. May be set per profile only when a
  specific Android engine voice (e.g. `en-us-x-sfg-local`) is known to exist
  across the deployment fleet. No profile pins one today, because Android
  engine voice inventory varies per device/OEM/locale.
- **`nativeVoicePreference?: NativeVoicePreference`** — authored on every
  profile. Capability-driven hints the resolver uses to pick a real device
  voice:
  - `localePreference` (default `["en-US", "en-GB", "en"]`)
  - `preferOffline` (default true)
  - `preferHighQuality` (true for calm/dramatic/robotic)
  - `preferLowLatency` (default true)
  - `preferNameHints` / `avoidNameHints` (per-tone advisory substrings)
  - `distinctFromPoolKey` (groups siblings sharing a provider base voice so
    they spread across the top-K scored device voices)
- **`nativeVoiceResolution?: "explicit" | "heuristic" | "unavailable"`** —
  runtime-only output of `resolveBestNativeVoiceForProfile()`, never authored.

The full resolver is in [`lib/voice/native-tts-bridge.ts`](../lib/voice/native-tts-bridge.ts):

1. If a profile pins `nativeVoiceId` AND the device has it → use it
   (`resolution: "explicit"`).
2. Otherwise score every device voice with `scoreNativeVoiceCandidate`. Keep
   candidates with positive score, take the top 4.
3. Deterministically slot the profile among siblings sharing
   `distinctFromPoolKey` so styled variants of one provider base don't all
   collapse to the same device voice (`resolution: "heuristic"`).
4. If no voice scores positively → `resolution: "unavailable"`.

This is intentionally truthful: when only one practical voice exists on a
device, the runtime still labels playback as **Styled Android TTS**, not
**Android Device Voice**.

## 3. Provider voice behavior

10 canonical provider-distinct profiles claim the 10 OpenAI base voices:

| Provider voice | Canonical (provider-distinct) | Styled variants                                              |
|----------------|-------------------------------|--------------------------------------------------------------|
| alloy          | neo                           | byte, droid, friendly-tech-support, holo-host                |
| nova           | nova                          | —                                                            |
| echo           | glitch                        | arcade                                                       |
| coral          | sparky                        | hyper, hyperdrive-host, overclock-coach, circuit-cheerleader |
| onyx           | commander                     | deepcore, midnight-narrator, tactical-guide                  |
| shimmer        | prankster                     | tiny, velvet-circuit, solar-diplomat                         |
| sage           | neon-mentor                   | cyberkid, chill-byte, synth-sage                             |
| fable          | retro                         | —                                                            |
| ash            | snark                         | smooth-operator                                              |
| ballad         | villain                       | cosmic-commentator                                           |

Provider request instructions (`lib/voice/voiceStyle.ts` →
`buildProviderInstructions`) compose: tone + stylePrompt + emotionalInstructions
+ cadence + authority + emotion slider. Styled variants thus differentiate
audibly even when sharing a base voice id.

## 4. Card badge truth model

Card-level visual states (`components/voice-card.tsx`):

- **Authored badge** (always shown) — the profile's intent:
  - `UNIQUE TIMBRE` (provider-distinct)
  - `STYLED VARIANT` (styled-variant)
  - `DEVICE VOICE` (native-distinct — none authored)
  - `PROFILE ONLY` (profile-only)
  - `UNAVAILABLE` (availability === "unavailable")
- **Runtime indicator** (shown when `capabilities` prop is provided):
  - `LIVE` — runtime is delivering the authored category
  - `LIMITED` — provider is reachable but the profile can only be a styled
    variant of a shared base (provider-distinct authored but not canonical
    here, OR runtime can't reach the authored category)
  - `FALLBACK` — runtime had to swap engine (e.g. provider unreachable,
    Android TTS in use)
  - `OFFLINE` — no engine path

The Voice screen detail panel always shows the longer explanation; the card
and detail never contradict because both call the same
`getVoiceUniquenessCategory()` from `lib/voice/voiceUniqueness.ts`.

The voice-rail strips (recently used, recommended, featured) intentionally
omit the runtime indicator to keep them compact.

## 5. Runtime fallback matrix

| Provider reachable | Android TTS available | Android voices > 1 | Browser SpeechSynthesis | Result for a `provider-distinct` profile | Result for a `styled-variant` (same base) | Result for `profile-only`            |
|--------------------|-----------------------|--------------------|--------------------------|-------------------------------------------|--------------------------------------------|--------------------------------------|
| ✅                  | any                   | any                | any                      | Provider Distinct Timbre, LIVE            | Styled Provider Variant, LIVE              | Profile Only (no engine swap) †      |
| ❌                  | ✅                     | ✅                  | any                      | Styled Android TTS (selected voice), FALLBACK | Styled Android TTS, FALLBACK              | Styled Android TTS, LIVE             |
| ❌                  | ✅                     | ❌ (single voice)   | any                      | Styled Android TTS, FALLBACK              | Styled Android TTS, FALLBACK               | Styled Android TTS, LIVE             |
| ❌                  | ❌                     | n/a                | ✅                        | Browser Speech Variant, FALLBACK          | Browser Speech Variant, FALLBACK           | Browser Speech Variant, LIVE         |
| ❌                  | ❌                     | n/a                | ❌                        | Preview unavailable, OFFLINE              | Preview unavailable, OFFLINE               | Preview unavailable, OFFLINE         |

† Profile-only profiles never go to provider TTS; they always use the local
engine path, so their authored intent is realized whenever any local engine
exists.

## 6. Integration coverage

All four speech surfaces share the same `voice-runtime.ts` entry points:

- **Voice Library previews** — `previewVoice()` (Voice screen).
- **Personality previews** — Personality screen calls `previewVoice()` with
  the recommended voice profile.
- **Chat speech** — assistant message bubble play button calls
  `previewVoice()` with the active profile.
- **Response Vault speech** — vault "speak" route calls `previewVoice()` with
  the active profile.

The same uniqueness helpers (`getVoiceUniquenessCategory`,
`getVoiceTruthLabel`, `getVoiceAvailabilityExplanation`) feed every surface
that displays uniqueness information, so labels can't disagree.

## 7. Manual Android listening test plan

Run on an Android device with the app installed (`./gradlew assembleDebug` →
install → open Voice Library):

1. **Configure runtime** — pick one of three modes:
   - With backend reachable + `OPENAI_API_KEY` set (provider path)
   - Without backend (Android TTS path)
   - In a WebView with SpeechSynthesis disabled (forced browser path)
2. **Preview these 8 voices in order:**
   1. `neo` — provider-distinct on alloy
   2. `holo-host` — styled variant on alloy
   3. `commander` — provider-distinct on onyx
   4. `midnight-narrator` — styled variant on onyx
   5. `nova` — provider-distinct, sole user of nova
   6. `villain` — provider-distinct dramatic on ballad
   7. `void-oracle` — profile-only, future-provider-target
   8. `analog-ghost` — profile-only, browser-preview
3. **Verification checklist:**
   - [ ] Card badge matches detail-panel timbre source (no contradictions).
   - [ ] On provider mode: `neo` vs `holo-host` sound audibly different
         despite sharing alloy (style instructions land).
   - [ ] On Android-only mode: provider-distinct and styled-variant both show
         `FALLBACK` indicator. Detail says "Styled Android TTS".
   - [ ] On Android-only mode with multiple device voices installed: profiles
         in the same provider pool (e.g. neo / byte / droid / friendly-tech-support
         / holo-host) get spread across distinct device voices when possible.
   - [ ] On Android-only mode with one device voice: indicator stays
         `FALLBACK`; detail honestly says "no distinct native voice could be
         selected on this device."
   - [ ] Personality preview speech uses the same engine as the Voice screen
         preview (same label appears in playback status).
   - [ ] Chat play button on an assistant message speaks using the *active*
         voice profile.
   - [ ] Response Vault "speak" uses the *active* voice profile.
   - [ ] Profile-only voices never claim Provider Distinct Timbre.

## 8. Explicit note on perceptual uniqueness

True perceptual uniqueness depends on:

- whether a TTS provider backend is reachable AND configured;
- the Android engine + voice inventory installed on the user's device;
- the WebView's SpeechSynthesis support.

The Voice subsystem now labels every realized state truthfully and maximizes
differentiation within the available capability envelope. It deliberately
does not overclaim distinctness when only a styled fallback is possible.
