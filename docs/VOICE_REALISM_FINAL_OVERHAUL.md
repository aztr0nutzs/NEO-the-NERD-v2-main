# Voice Realism Final Overhaul

Final speech-experience pass for NEO the N.E.R.D. Builds on the earlier
`VOICE_REALISM_AND_PERSONALITY_TRUTH_PASS.md` work and closes the
remaining gap: previously, the rich personality + voice metadata only
reached the *voice profile* shaping layer, leaving chat replies and
vault playback to fall through with no personality cadence and no
provider-side persona instruction. The Voice Library, Personality
screen, Chat screen, Response Vault, bottom dock, Mission Control
dashboard, Network module, and animated background were intentionally
**not redesigned, simplified, or restyled** — this is a deep functional
upgrade to the speech path only.

---

## 1. What caused the fake / translator-like experience

| Cause | Why it sounded fake |
|-------|---------------------|
| Chat reply playback and Response Vault playback only passed the raw text + voice profile through, with no personality context. | Two personalities speaking the same line through the same voice came out identical on the device fallback engine. |
| Voice Library previews seeded the textarea with a single bland boot string (`"Boot sequence complete. NEO online and ready to play."`). | Every voice card preview read the same words, so timbre differences were the only thing the user heard — and on Android TTS the timbre is essentially fixed. |
| Personality preview played one generic generated line, with no category control (greeting vs alert vs joke). | Calm Companion sounded similar to Helpful Genius because the response engine output for "help me with my next task" reads identically through the same Android voice. |
| Provider TTS `instructions` only carried voice-profile metadata. The active personality was never named to the neural model. | Even when the high-quality path was live, the model did not know it was being asked to deliver as Sarcastic Sidekick vs Calm Companion. |
| The `shapeSpeechTextForProfile` cadence shaping only reacted to voice tone — never to active personality. | The Snark voice + Calm personality sounded the same as Snark voice + Hype personality. |

The fix was to insert a **personality-aware speech preparation layer**
between the response engine and every speech surface, and to thread an
explicit `personalityId` + `intent` through the whole speech pipeline
(provider TTS, Android native, browser SpeechSynthesis, and the
provider instruction builder).

---

## 2. Provider vs native vs browser speech — the truth

| Path | What it actually is | When it runs | UI label |
|------|---------------------|--------------|----------|
| **Provider TTS** | Neural HTTP TTS through the backend (`/api/tts` → OpenAI `gpt-4o-mini-tts` by default). The realistic premium path. | When `NEXT_PUBLIC_NEO_BACKEND_BASE_URL` is configured AND `OPENAI_API_KEY` is set on the server AND the user's `voiceQualityPreference` is `prefer-high-quality`. | `HIGH-QUALITY PROVIDER VOICE` |
| **Native Android TTS** | Device `TextToSpeech` via the Capacitor `NeoTts` plugin. Realism is bounded by what voices the device's installed TTS engine ships with. | Capacitor Android runtime when provider is unavailable or the user has chosen `FALLBACK ONLY`. | `STYLED ANDROID FALLBACK` |
| **Browser SpeechSynthesis** | Web Speech API in the WebView. Weakest of the three; voice inventory varies wildly. | Non-Android web runtimes when provider is unavailable. | `BROWSER SPEECH FALLBACK` |

The Voice Library and Personality screens both surface the active path
verbatim in their `HEARING:` / `HEARD VIA` lines, and Settings → Voice
Settings now shows an `ACTIVE MODE` row in addition to the existing
`TTS ENGINE` row so the user can see at a glance whether they are on
the realism path or the styled fallback.

We do **not** create fake provider availability anywhere. If the
backend is not configured the Voice Library button reads
`NEURAL VOICE UNAVAILABLE · CONFIGURE BACKEND` and Settings shows
`STYLED FALLBACK` in warm orange.

---

## 3. What changed in speech preparation

A new unified preparation pipeline replaces the ad hoc `buildStyledVoiceSpeech`
calls scattered across the engine adapters:

```
prepareSpeechForDelivery({ voice, text, params, personalityId, intent })
  ├─ applyPersonalitySpeechShaping(text, personalityId, intent)   // new
  │     └─ per-tone cadence + opener/tag rules
  │        (calm breath / sarcastic beat / arcade burst / detective
  │         hesitation / strategist enumeration / etc.)
  └─ buildStyledVoiceSpeech(voice, shapedText, params)            // existing
        └─ shapeSpeechTextForProfile (per-voice flavor)
        └─ slider → engine rate/pitch/volume normalization
```

Every speech surface calls `prepareSpeechForDelivery` now:

- **Native Android TTS** (`speakWithAndroidNativeTts`)
- **Browser SpeechSynthesis** (`speakWithBrowserSpeech`)
- **Provider TTS** (`generateOpenAITts` via `ttsClient.ts`)

The provider path *also* receives a personality-aware `instructions`
string through `describePersonalityForProvider(personalityId, intent)`,
which composes:

1. `Persona: <DisplayName> — <coreIdentity>`
2. Tone delivery hint (one sentence keyed off `PersonalityTone`).
3. Intent delivery hint (one sentence keyed off `SpeechIntent`).

These are prepended to the existing voice tone / style / cadence
sentences so the neural model gets the persona context first.

### Source of truth

The wiring lives in:

- `lib/voice/speechPreparation.ts` — unified `prepareSpeechForDelivery`.
- `lib/voice/personalitySpeechShaping.ts` — per-tone shapers + provider description builder.
- `lib/voice/speechIntent.ts` — `SpeechIntent` union + inference helpers (`inferSpeechIntent`, `intentForLibraryCategory`).
- `lib/voice/personalityPreviewCorpus.ts` — per-personality preview lines (greeting / alert / explanation / humorous-aside / scan-summary).
- `lib/voice/signaturePhrases.ts` — short authored presets for app-greeting, scan-complete, unknown-device-found, speed-test-complete, critical-alert, good-night, personality-switch.
- `lib/voice/voiceStyle.ts` — extended `buildProviderInstructions(profile, emotion, { personalityId, intent })`.

---

## 4. How personalities now affect audible delivery

Five required modes — and the cadence cue applied on the device fallback
engine — are listed below. The provider neural path also receives the
matching persona+intent instruction string so the same five modes are
audibly distinguishable on premium output as well.

| Personality | Tone family | Native-engine shaping | Provider-side persona hint |
|-------------|-------------|------------------------|----------------------------|
| Helpful Genius / Strategy Coach | `precise` / `strategic` | Crisp final stop, exclamations flattened, ellipses stripped on scan summaries. | "Speak with crisp, structured precision and a calm helper tone." |
| Sarcastic Sidekick | `sarcastic` | Deliberate beat (` … `) before the final sentence; exclamations flattened; payoff tag respected if present. | "Speak with dry, deadpan delivery; small beat before punchlines, never raise pitch on jabs." |
| Calm Companion | `calm` | `!` → `.`; ellipses inserted at clause breaks for breath markers. | "Speak slowly and quietly with long breaths between thoughts; no abrupt stops." |
| Game Master / Arcade | `competitive` | Mid-sentence periods → exclamation bursts; trailing period replaced with `!`. | "Speak with announcer punch — short bursts, scoreboard energy, controlled excitement." |
| Detective / Security | `analytical` | `Curious — ` opener on explanations; `Hmm. ` opener on alerts and scan summaries. | "Speak with thoughtful, investigative cadence; brief reflective pauses before conclusions." |

Cadence-only shaping is intentional. The shaper never invents factual
content, never deletes user sentences, and never adds more than one
short opener or one short tag.

### Provider instruction examples (from the live builder)

These are the exact `instructions` strings the OpenAI TTS request will
carry for an `intent: "explanation"` payload on each mode. Each one
stacks the persona+intent prefix above the existing voice tone/style
sentences.

```
[neo / Helpful Genius / explanation]
  Persona: Helpful Genius — Structured, precise, and supportive problem-solver.
  Speak with crisp, structured precision and a calm helper tone.
  Frame this as a clear explanation; even pacing, emphasis on the key noun.
  Speak with a clear, polished robot-companion tone. Tone cues: core, calm, futuristic.
  Default NEO companion: clear, stable, lightly synthetic, futuristic confidence.
  Balanced, composed, mission-aware. No theatrics; precise diction.
  Maintain an even, predictable cadence with clear phrase boundaries.
  Read clearly with balanced emotion and a polished robot-companion tone.

[snark / Sarcastic Sidekick / explanation]
  Persona: Sarcastic Sidekick — Dry, witty commentary with usable answers underneath.
  Speak with dry, deadpan delivery; small beat before punchlines, never raise pitch on jabs.
  Frame this as a clear explanation; even pacing, emphasis on the key noun.
  Speak with dry, deadpan wit and understated delivery. Tone cues: dry, sarcastic, sharp.
  Dry, surgical sarcasm: deadpan robot wit, controlled bite.
  Long beat before punchlines, flat affect on setups, never raise pitch.
  Use deliberate pacing with weighted pauses on key words.
  Read clearly with balanced emotion and a polished robot-companion tone.

[velvet-circuit / Calm Companion / calm-reflection]
  Persona: Calm Companion — Gentle, low-pressure guide for stress reduction.
  Speak slowly and quietly with long breaths between thoughts; no abrupt stops.
  Frame this as a calm reflection; whisper-soft, gentle, no urgency.
  Speak calmly and smoothly with relaxed, low-pressure pacing. Tone cues: soft, reflective, synthetic.
  Soft synthetic lounge tone on the shimmer base voice.
  Whispered consonants, generous pauses, late-night calm.
  Use a slow, languid cadence with long pauses and trailing endings.
  Keep authority light and approachable, not commanding.
  Read calmly with low intensity and restrained expression.

[arcade-announcer / Game Master / celebration]
  Persona: Game Master — Challenge host with clear stakes and quick rules.
  Speak with announcer punch — short bursts, scoreboard energy, controlled excitement.
  Frame this as a celebration; brighter energy, lift on the final phrase.
  Speak with high energy, brisk pacing, and upbeat cyberpunk confidence. Tone cues: announcer, retro, score.
  Arcade Announcer: Cabinet announcer with big score energy. Tone: energetic; cues: announcer, retro, score.
  brisk, energetic delivery; playful, smiley phrasing.
  Use short snappy phrases with crisp consonants.
  Project confident authority with controlled delivery.
  Read with high energy, expressive timing, and playful cyberpunk confidence.

[midnight-narrator / Detective / diagnostics]
  Persona: Detective — Inquisitive investigator focused on clues and causality.
  Speak with thoughtful, investigative cadence; brief reflective pauses before conclusions.
  Frame this as a diagnostic readout; careful, hypothesis-first delivery.
  Speak with cinematic gravity, deliberate pacing, and theatrical weight. Tone cues: midnight, cinematic, low.
  Late-night storyteller atop the onyx base voice.
  Smooth, low, moody. Trail thoughts gently into silence.
  Use a slow, languid cadence with long pauses and trailing endings.
  Project confident authority with controlled delivery.
  Read with upbeat confidence and a friendly futuristic tone.
```

---

## 5. How preview text was improved

Previously every voice card preview seeded with the same boot line. Now:

- The Voice Library textarea seeds with `getPreviewTextSeed(personalityId)`, which returns the **active personality's greeting line** from the new corpus. The user can still edit it freely; the seed only applies on first mount.
- The Personality screen replaces the single generated preview with the new corpus, plus a chip strip (`GREETING / ALERT / EXPLAIN / ASIDE / SCAN`) so the user can audibly compare how the *same personality* delivers each intent. The sample-line panel updates live to show the currently selected category.
- The Voice Library previews now also pass the active `personalityId` + inferred `intent`, so even when the user previews a card they hear the persona shaping baked into the delivery.
- Chat speech infers intent from the assistant message category (Helpful → `explanation`, Funny → `joke`, etc.) and forwards both `personalityId` and `intent` to `previewVoice`.
- Response Vault speech maps the library category (`Jokes`, `Comebacks`, `Helpful answers`, `Tech help`, …) to an intent via `intentForLibraryCategory` and forwards the same context.

The corpus covers all twelve seeded personalities; new custom personalities
fall through to the NEO baseline so playback is never silent.

---

## 6. UI truth + status changes

| Surface | Before | After |
|--------|--------|-------|
| Voices screen `HEARING:` line | `HIGH-QUALITY NEURAL VOICE` / `ANDROID DEVICE TTS (STYLED FALLBACK)` / `BROWSER SPEECH (STYLED FALLBACK)` | `HIGH-QUALITY PROVIDER VOICE` / `STYLED ANDROID FALLBACK` / `BROWSER SPEECH FALLBACK` (aligned with the new mode taxonomy) |
| Personality preview confirmation | `HEARD VIA HIGH-QUALITY NEURAL VOICE` | `HEARD VIA HIGH-QUALITY PROVIDER VOICE` (consistent label) |
| Personality SAMPLE_LINE panel | Static `activeBehavior.sampleResponseText` line | Live corpus line per selected preview category; includes truth label of the linked voice on the same row |
| Personality screen — preview category chips | (did not exist) | New chip strip lets the user compare how the same personality reads as greeting / alert / explanation / aside / scan summary |
| Settings → Voice Settings | `TTS ENGINE` row only | Added `ACTIVE MODE` row (`HIGH-QUALITY PROVIDER` vs `STYLED FALLBACK`) + compact educational sentence about the realism ceiling of native fallback |

The existing truth labels (`getVoiceTruthLabel`, `runtimeTimbreLabel`,
`getUniquenessSummary`) and the "Voice Uniqueness Model" panel on the
Voices screen were intentionally **not** modified — they continue to
expose the deeper provider-distinct / native-distinct / styled-variant
classification.

---

## 7. Optional: signature phrase presets

Added `lib/voice/signaturePhrases.ts` with seven authored moments:
`app-greeting`, `scan-complete`, `unknown-device-found`,
`speed-test-complete`, `critical-alert`, `good-night`,
`personality-switch`. Each preset is a `{ intent, text }` pair so when
a caller speaks one (e.g. on a Mission Control scan completion event)
the same wording + intent are used everywhere and feed naturally into
`prepareSpeechForDelivery` for personality-aware delivery.

**No pre-rendered audio is bundled.** The presets exist purely to
standardize text + intent across surfaces; the personality+voice layer
still handles the audible delivery in the active runtime.

---

## 8. Files added / changed

### Added
- `lib/voice/speechIntent.ts` — `SpeechIntent` union + `inferSpeechIntent` + `intentForLibraryCategory`.
- `lib/voice/personalitySpeechShaping.ts` — per-tone shapers + `describePersonalityForProvider`.
- `lib/voice/speechPreparation.ts` — unified `prepareSpeechForDelivery` pipeline.
- `lib/voice/personalityPreviewCorpus.ts` — per-personality preview lines + `getPreviewTextSeed`.
- `lib/voice/signaturePhrases.ts` — signature moment presets.
- `scripts/voice-smoke-runner.ts` — pure-function smoke runner (developer-only, opt-in via standalone tsconfig).
- `docs/VOICE_REALISM_FINAL_OVERHAUL.md` — this file.

### Changed
- `lib/voice/voiceStyle.ts` — `buildProviderInstructions` now takes a `ProviderInstructionContext` (`personalityId`, `intent`) and prepends persona+intent hints.
- `lib/voice/voice-runtime.ts` — `VoicePreviewRequest` gains optional `personalityId` + `intent`; passed through to the native, browser, and provider paths.
- `lib/voice/native-tts-bridge.ts` — `speakWithAndroidNativeTts` uses the unified preparation layer.
- `lib/voice/browserSpeechAdapter.ts` — `speakWithBrowserSpeech` uses the unified preparation layer.
- `lib/voice/ttsClient.ts` — `generateOpenAITts` / `TtsRequest` carry the personality + intent; provider instruction string includes the persona hint.
- `lib/runtime/backend-client.ts` — `TtsPreviewRequest` carries the personality + intent.
- `app/api/tts/route.ts` — accepts `personalityId` + `intent` in the request body.
- `components/screens/chat-screen.tsx` — `speakChatMessage` forwards active personality + inferred intent (from message category).
- `components/screens/library-screen.tsx` — Response Vault speech forwards active personality + intent mapped from library category; provider generation also carries the context.
- `components/screens/voices-screen.tsx` — preview seed uses personality-aware corpus; `handlePreview` / `handleGenerate` forward personality + inferred intent; `HEARING:` labels updated to the new taxonomy.
- `components/screens/personalities-screen.tsx` — preview category chips + corpus-driven sample line + new persona+intent context in `handleTestPersonality`; `HEARD VIA` labels updated.
- `components/screens/settings-screen.tsx` — added `ACTIVE MODE` row and educational helper copy.

The voice profiles, voice uniqueness scoring, voice taxonomy, voice
cards, personality cards, response engine, mission control, network
module, and animated background were intentionally **not** modified.

---

## 9. Verification receipts

| Step | Result |
|------|--------|
| `npm ci` | OK |
| `npm run typecheck` | OK (`tsc --noEmit`) |
| `npm run lint` | OK (`eslint .`) |
| `npm run build` | OK (Next 16.2.6 production build, Capacitor web assets prepared) |
| `npx cap sync android` | OK (5 Capacitor plugins synced) |
| `scripts/voice-smoke-runner.ts` (compiled with a standalone tsconfig and run via Node with the `@/` path patch) | Confirmed materially distinct shaping across the 5 required modes for a single common input. Snippets in section 4. |

---

## 10. Remaining backend / device-dependent limitations

- **Provider TTS quality** is bounded by the configured provider (default
  is OpenAI `gpt-4o-mini-tts`). Swapping the model via
  `OPENAI_TTS_MODEL` is supported by `ttsClient.ts` and does not require
  an app rebuild.
- **Native Android TTS realism** is bounded by the installed engine on
  the device. NEO can pick the best installed voice and apply the
  shaping, but it cannot raise the audible ceiling of the underlying
  voice. We say so in Settings → Voice Settings.
- **Browser SpeechSynthesis** is still the weakest path. We label it
  explicitly so the user knows.
- **Custom personalities** (not yet authored in the preview corpus) fall
  through to the NEO baseline preview line. They still receive shaped
  delivery, but the corpus line will be generic until the personality
  authors a corpus entry.

---

## 11. Manual device listening checklist

Run on a real Android device with `NEXT_PUBLIC_NEO_BACKEND_BASE_URL`
unset (so the user lands on the styled Android fallback path):

1. Open **Voice Library**. Confirm the preview textarea is seeded with
   the active personality's greeting line, *not* a generic boot string.
2. Tap **PLAY VOICE PREVIEW** on five voices in a row, switching personality
   between each via the Personality screen.  Confirm the same voice
   sounds materially different across personalities (calm breath markers
   vs sarcastic beat vs arcade burst vs detective hesitation).
3. Open **Personality** screen. Cycle the GREETING / ALERT / EXPLAIN /
   ASIDE / SCAN chips on Calm Companion, Sarcastic Sidekick, Game
   Master, and Detective. Confirm the SAMPLE_LINE panel updates and the
   spoken delivery reflects both the personality and the intent.
4. Open **Chat**. Send a message that asks for help. Tap the speaker
   icon on the assistant reply. Switch personality to Sarcastic Sidekick
   in Settings → Personality Defaults. Replay the same reply. Confirm
   the cadence differs (the sarcastic delivery should have a deliberate
   beat before the final sentence even on the device fallback).
5. Open **Response Vault**. Speak one joke, one helpful answer, and one
   tech-help entry. Confirm the cadence reads as appropriate for the
   category, and confirm the active personality affects the spoken
   delivery on top.
6. Open **Settings → Voice Settings**. Confirm `ACTIVE MODE` reads
   `STYLED FALLBACK` (warm orange) when provider is unconfigured, and
   `HIGH-QUALITY PROVIDER` (green) once `NEXT_PUBLIC_NEO_BACKEND_BASE_URL`
   + `OPENAI_API_KEY` are in place.
7. Toggle `VOICE QUALITY` to `FALLBACK ONLY` while provider is live.
   Confirm the Voices screen surfaces the warm-orange `NEURAL VOICE
   AVAILABLE BUT SKIPPED` notice and that previews route to native /
   browser TTS.
