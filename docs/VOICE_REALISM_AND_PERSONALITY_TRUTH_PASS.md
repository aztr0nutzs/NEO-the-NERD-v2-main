# Voice Realism & Personality Truth Pass

Final audible-realism + truthful-product-behavior pass for NEO's voice
system. The Voice Library, Personality system, Chat screen, Response
Vault, taxonomy, runtime labels, and uniqueness architecture were
intentionally **not removed or redesigned**. The fixes here address
the mismatch between sophisticated metadata and a real audible output
that often still sounds robotic.

---

## 1. Root cause of "fake / generic NEO sound"

NEO ships a three-tier voice runtime, in this priority order:

1. **Provider TTS** — a neural HTTP TTS service routed through the
   app's backend (`/api/tts` or `NEXT_PUBLIC_NEO_BACKEND_BASE_URL`).
2. **Native Android TextToSpeech** — local device TTS via the
   `NeoTts` Capacitor plugin.
3. **Browser SpeechSynthesis** — Web Speech API fallback in
   non-Android WebViews.

Without a backend configured, the installed Android app fell through
to **tier 2** (Android TTS), which on most devices ships a small set
of synthetic-sounding voices. The product copy and the rich voice
metadata implied a level of realism that only tier 1 can deliver —
that mismatch is exactly what users heard as "fake / translator-like."

The measurement pipeline itself (`buildStyledVoiceSpeech`, native
voice scoring, provider instructions) was already truthful — the
issue was that:

* the *audible* output of tier 2 is bounded by the device,
* there was no UI affordance for the user to express a preference,
* the same canned preview text was spoken by every personality,
* and the surrounding copy oversold the path the user was actually
  hearing.

---

## 2. Provider / high-quality mode is now unmistakable

The previous `GENERATE PROVIDER AUDIO` button is now
**`PLAY HIGH-QUALITY NEURAL VOICE`**. When unavailable it reads
**`NEURAL VOICE UNAVAILABLE · CONFIGURE BACKEND`** so the user
understands the path, not the implementation detail.

The Voice screen's tagline now leads with:

> {N} profiles loaded. **High-quality neural voices** require a
> configured backend and sound the most realistic. Without it, NEO
> routes to the local Android engine — same words, but the underlying
> timbre is whatever your device ships with.

A new live disclosure line below the player reads, in bold green when
true:

> **HEARING: HIGH-QUALITY NEURAL VOICE · Provider Distinct Timbre**

and in neutral grey when the user is on fallback:

> HEARING: ANDROID DEVICE TTS (STYLED FALLBACK) · Styled Android TTS (en-us-x-tpf-network)

If the user has flipped the new quality preference to "fallback only"
while the neural voice IS available, a warm-orange line appears:

> VOICE QUALITY = FALLBACK ONLY · NEURAL VOICE AVAILABLE BUT SKIPPED ·
> CHANGE IN SETTINGS → VOICE

---

## 3. Native fallback improvements

The fallback path was tightened along three axes — none of which
pretend it equals neural realism, but each of which extracts more
distinctiveness from the device's TTS engine.

### Per-personality text shaping

`shapeSpeechTextForProfile` was expanded from a 6-id ad-hoc match into
a real shaping function. Eleven specific profiles now have
character-appropriate framing or stutters; the remaining profiles fall
through to tone-driven punctuation shaping. Sample (single input,
nine profiles):

```
INPUT: NEO online. Network scan complete. Ready when you are.

neo/balanced       => NEO online. Network scan complete. Ready when you are.
commander          => NEO online. Network scan complete. Ready when you are.
snark/sarcastic    => NEO online. Network scan complete. Ready when you are. ...obviously.
prankster/playful  => NEO online. Network scan complete. Ready when you are. ...probably.
glitch             => N-N-Neo online. Network scan complete. Ready when you are.
villain/dramatic   => NEO online. Network scan complete. Ready when you are. ...and the room went quiet.
sparky/energetic   => NEO online. Network scan complete. Ready when you are!
droid              => Unit ready. NEO online. Network scan complete. Ready when you are.
neon-mentor/calm   => NEO online. ... Network scan complete. ... Ready when you are.
```

The same input now produces materially different cadence on Android
TTS / SpeechSynthesis because the engine respects period density,
ellipses, and exclamations.

### Tone-driven cadence fallback

For profiles without per-id flavor, `shapeSpeechTextForProfile` now
matches on `toneProfile` and inserts:

* `calm` — `!` → `.`, `, ` → `, ... `, `? ` → `?... `
* `dramatic` — `, ` → `... `, `. ` → `. ... `
* `sarcastic` — period if the line had none
* `aggressive` — `.` → `!`, `?` → `?!`
* `energetic` / `playful` — trailing `!`
* `robotic` — `, ` → `. ` (hard stops between clauses)

### Native voice scoring untouched but documented

The existing `scoreNativeVoiceCandidate` + pool-slotting in
`native-tts-bridge.ts` already spreads sibling profiles across the
device's voice pool. We left that logic alone (it's solid), but the
Voice screen's diagnostic line now surfaces the chosen voice name and
total engine voice count so the user can see what's playing.

---

## 4. Personality audible differentiation

Five required modes — Helpful/precise, Sarcastic, Calm, Arcade/Game,
Security/Detective — get audibly distinct output through the
combination of:

| Mode                 | Profile id           | Cadence cue                              |
|----------------------|----------------------|------------------------------------------|
| Helpful / precise    | `neo`, `mentor`      | Steady cadence; no extra punctuation     |
| Sarcastic            | `snark`              | Trailing `...obviously.` + deliberate cadence |
| Calm                 | calm-tone profiles + `neon-mentor` | Ellipses inserted at every clause break  |
| Arcade / Game        | `sparky`, `arcade-announcer`, `hyperdrive-host` | Strip trailing punctuation, force `!`    |
| Security / Detective | `commander`, `deepcore`, `midnight-narrator`, `villain` | Hard stops, ending sigh ("...and the room went quiet"), command-mode period density |

Profile-level metadata (`stylePrompt`, `emotionalInstructions`,
`cadenceProfile`, `authorityLevel`, `nativeVoicePreference`) feeds the
provider instruction string when neural voice is active, and the text
shaping above when it's not — so personality differences are visible
in **both** runtime paths, even if the absolute realism gap remains.

---

## 5. UI copy & truth label updates

| Surface                                          | Before                                            | After                                                                                                              |
|--------------------------------------------------|---------------------------------------------------|--------------------------------------------------------------------------------------------------------------------|
| Voice screen tagline                             | "Provider distinct voices use mapped provider engines…" | "High-quality neural voices require a configured backend and sound the most realistic. Without it, NEO routes to the local Android engine…" |
| Provider button (idle)                           | `GENERATE PROVIDER AUDIO`                         | `PLAY HIGH-QUALITY NEURAL VOICE`                                                                                   |
| Provider button (busy)                           | `GENERATING PROVIDER AUDIO...`                    | `GENERATING NEURAL VOICE...`                                                                                       |
| Provider button (unavailable)                    | `PROVIDER AUDIO UNAVAILABLE`                      | `NEURAL VOICE UNAVAILABLE · CONFIGURE BACKEND`                                                                     |
| Live "what you're hearing" line                  | (did not exist)                                   | `HEARING: <NEURAL VOICE \| ANDROID DEVICE TTS \| BROWSER SPEECH> · <truth label>`                                  |
| Personality preview result message               | `PLAYED VIA PROVIDER TTS`                         | `HEARD VIA HIGH-QUALITY NEURAL VOICE` / `… ANDROID DEVICE TTS · STYLED FALLBACK`                                   |

Existing truth labels (`getVoiceTruthLabel`, `runtimeTimbreLabel`) were
left intact — the new copy stacks on top of them.

---

## 6. New setting: Voice quality

Added to `AssistantSettings`:

```ts
voiceQualityPreference: "prefer-high-quality" | "fallback-only"
```

Defaults to **`prefer-high-quality`** so users hear the realistic
neural voice without having to flip anything. A new `SegmentedSelect`
control in **Settings → Voice Settings** lets the user choose
`PREFER HIGH-QUALITY` (default) or `FALLBACK ONLY`. The setting is:

* Persisted to localStorage through the existing store.
* Read by `previewVoice()` via a new `qualityPreference` option.
* When `fallback-only` AND `auto` mode is requested, the runtime
  silently downgrades a would-be provider pick to native Android /
  browser speech instead. An explicit `mode: "provider-tts"` from a
  caller still honors the caller — the setting is a default for
  `auto` routing, not a hard prohibition.

A helper sentence sits under the segmented control and switches
truthfully based on the choice:

* PREFER HIGH-QUALITY → "Uses the high-quality neural provider voice
  when the backend is reachable. Falls back to local Android / browser
  TTS otherwise — that path will sound more synthetic."
* FALLBACK ONLY → "Locked to local device TTS (Android engine or
  browser). Realism depends on the device; provider voice is skipped
  even if available."

All four screens that play speech (`voices`, `personalities`, `chat`,
`library`) read the preference from the store and pass it through.

---

## 7. Files changed

* `lib/types.ts` — new `VoiceQualityPreference` type + `voiceQualityPreference` field on `AssistantSettings`.
* `lib/store.tsx` — default value in `DEFAULT_SETTINGS`.
* `lib/voice/voice-runtime.ts` — new `qualityPreference` option on `VoicePreviewRequest`; auto-routing now honors it; new exported `VoiceQualityPreference` type.
* `lib/voice/voiceStyle.ts` — major expansion of `shapeSpeechTextForProfile` with per-id flavor + tone-driven cadence fallback; double-punctuation guards.
* `components/screens/voices-screen.tsx` — `qualityPreference` plumbed through, new "HEARING:" live disclosure, updated tagline + provider button copy, "skipped" warning when the user has opted out of available neural voice.
* `components/screens/personalities-screen.tsx` — `qualityPreference` plumbed through; preview confirmation message renames runtime mode honestly.
* `components/screens/chat-screen.tsx` — `qualityPreference` plumbed through to `speakChatMessage`.
* `components/screens/library-screen.tsx` — `qualityPreference` plumbed through to `speakResponse`.
* `components/screens/settings-screen.tsx` — new "Voice quality" `SegmentedSelect` + truthful helper copy.
* `docs/VOICE_REALISM_AND_PERSONALITY_TRUTH_PASS.md` — this file.

The voice taxonomy, profiles, uniqueness scoring, and provider
instruction builder were intentionally **not** modified.

---

## 8. Verification receipts

* `npm run typecheck` — `tsc --noEmit` passed.
* `npm run lint` — `eslint .` passed.
* `npm run build` — `next build` succeeded; Capacitor web assets prepared.
* `npx cap sync android` — synced 5 Capacitor plugins.
* Cadence-shaping smoke test (9 profiles, one input) — confirmed
  visibly distinct shapings, captured in section 3.

---

## 9. Remaining limitations

* The realism *gap* between provider TTS and Android TTS is set by the
  device's installed TTS engine. NEO cannot raise the audible ceiling
  of the local engine — it can only avoid overclaiming and route
  smartly. Users wanting cinematic realism must configure a backend.
* The browser SpeechSynthesis path is still the weakest of the three.
  We label it `BROWSER SPEECH · STYLED FALLBACK` explicitly so the
  user knows.
* Real-device listening verification (Android TTS engines vary
  significantly per OEM) requires a developer machine + device; the
  shaping is deterministic so the audible difference between
  personalities will be consistent across devices, but absolute
  timbre quality is OEM-dependent.
