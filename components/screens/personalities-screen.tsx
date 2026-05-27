"use client"

import { useEffect, useRef, useState } from "react"
import {
  CheckCircle2,
  Loader2,
  MessageSquareText,
  Shield,
  Volume2,
} from "lucide-react"
import { useApp } from "@/lib/store"
import { PERSONALITIES } from "@/lib/data"
import { NeonPanel } from "../neon-panel"
import { PersonalityCard } from "../personality-card"
import { ControlSlider } from "../control-slider"
import { getRecommendedVoiceProfiles } from "@/lib/assistant/assistantIntegrations"
import { generatePersonalityPreviewResponse } from "@/lib/assistant/assistantResponseEngine"
import { getPersonalityProfile } from "@/lib/personality/personalityProfiles"
import { getCachedVoiceRuntimeCapabilities, getProfileTruthLabel, previewVoice } from "@/lib/voice/voice-runtime"
import { voiceProfileToParams } from "@/lib/voice/voicePresets"
import { getVoiceProfile } from "@/lib/voice/voiceProfiles"
import { getPersonalityPreviewLine, type PreviewCategory } from "@/lib/voice/personalityPreviewCorpus"

type PreviewState = "idle" | "speaking" | "done" | "error"

const PREVIEW_RESET_MS = 2400
const SAVED_BADGE_MS = 1800

const PREVIEW_CATEGORIES: { id: PreviewCategory; label: string; intent: "greeting" | "alert" | "explanation" | "humorous-aside" | "scan-summary" }[] = [
  { id: "greeting", label: "GREETING", intent: "greeting" },
  { id: "alert", label: "ALERT", intent: "alert" },
  { id: "explanation", label: "EXPLAIN", intent: "explanation" },
  { id: "humorous-aside", label: "ASIDE", intent: "humorous-aside" },
  { id: "scan-summary", label: "SCAN", intent: "scan-summary" },
]

export function PersonalitiesScreen() {
  const { personalityId, setPersonalityId, voiceId, setVoiceId, setScreen, settings } = useApp()
  const qualityPreference = settings.voiceQualityPreference
  const [preview, setPreview] = useState<string | null>(null)
  const [custom, setCustom] = useState({
    humor: 60,
    sarcasm: 40,
    helpfulness: 70,
    randomness: 45,
    energy: 65,
    safety: true,
  })
  const [previewState, setPreviewState] = useState<PreviewState>("idle")
  const [previewMessage, setPreviewMessage] = useState<string | null>(null)
  const [previewCategory, setPreviewCategory] = useState<PreviewCategory>("greeting")
  // Brief "auto-saved" confirmation flashed when the user picks a personality.
  // Selection is persisted by the store immediately; this just makes the
  // invisible store write visible to the user.
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const previewing = preview
    ? PERSONALITIES.find((p) => p.id === preview)
    : null
  const voiceMatches = getRecommendedVoiceProfiles(previewing?.id ?? personalityId, 4)
  const active =
    PERSONALITIES.find((p) => p.id === personalityId) ?? PERSONALITIES[0]
  const activeBehavior = getPersonalityProfile(active.id)
  const activeLinkedVoice = getVoiceProfile(activeBehavior.voiceId)
  const activeUserVoice = getVoiceProfile(voiceId)
  const previewVoiceProfile = activeLinkedVoice
  const previewTruth = getProfileTruthLabel(previewVoiceProfile, getCachedVoiceRuntimeCapabilities(previewVoiceProfile))

  // Track whether selection actually changed (vs first mount) so the saved
  // badge only shows after a real user action.
  const prevPersonalityRef = useRef(personalityId)
  useEffect(() => {
    if (prevPersonalityRef.current !== personalityId) {
      prevPersonalityRef.current = personalityId
      setSavedAt(Date.now())
    }
  }, [personalityId])
  useEffect(() => {
    if (savedAt === null) return
    const timer = window.setTimeout(() => setSavedAt(null), SAVED_BADGE_MS)
    return () => window.clearTimeout(timer)
  }, [savedAt])

  // Auto-revert the inline preview status back to idle after a beat so the
  // button doesn't get stuck on "DONE" forever.
  useEffect(() => {
    if (previewState !== "done" && previewState !== "error") return
    const timer = window.setTimeout(() => {
      setPreviewState("idle")
      setPreviewMessage(null)
    }, PREVIEW_RESET_MS)
    return () => window.clearTimeout(timer)
  }, [previewState])

  const handleTestPersonality = async () => {
    if (previewState === "speaking") return
    const behavior = getPersonalityProfile(active.id)
    const voice = getVoiceProfile(behavior.voiceId)
    const intent = PREVIEW_CATEGORIES.find((cat) => cat.id === previewCategory)?.intent ?? "greeting"
    // Use the personality preview corpus when available so each personality
    // sounds distinct, falling back to the response-engine-generated sample
    // for any personality not yet authored in the corpus.
    const corpusLine = getPersonalityPreviewLine(active.id, previewCategory)
    const sampleResponse = corpusLine || generatePersonalityPreviewResponse(active.id)
    if (voice.availability === "unavailable") {
      setPreviewState("error")
      setPreviewMessage("VOICE PREVIEW UNAVAILABLE ON THIS DEVICE")
      return
    }
    setPreviewState("speaking")
    setPreviewMessage(`SPEAKING AS ${active.name.toUpperCase()} // ${voice.name.toUpperCase()} · ${previewCategory.toUpperCase()}`)
    try {
      const result = await previewVoice({
        profile: voice,
        text: sampleResponse,
        params: voiceProfileToParams(voice.id),
        mode: "auto",
        qualityPreference,
        personalityId: active.id,
        intent,
        onStateChange: (snapshot) => {
          if (snapshot.message) setPreviewMessage(snapshot.message)
        },
      })
      if (result.ok) {
        setPreviewState("done")
        const friendlyMode =
          result.mode === "provider-tts"
            ? "PROVIDER ACTIVE"
            : result.mode === "native-android"
              ? "FALLBACK"
              : result.mode === "browser-speech"
                ? "FALLBACK"
                : result.mode.replace("-", " ").toUpperCase()
        setPreviewMessage(`HEARD VIA ${friendlyMode}`)
      } else {
        setPreviewState("error")
        setPreviewMessage((result.error ?? "AUDIO UNAVAILABLE").toUpperCase())
      }
    } catch (err) {
      setPreviewState("error")
      setPreviewMessage((err instanceof Error ? err.message : "AUDIO UNAVAILABLE").toUpperCase())
    }
  }

  return (
    <div className="space-y-3">
      <header className="px-1">
        <p className="ps-mono text-[10px] tracking-[0.4em] text-white/50">
          NEO // PERSONALITY_MATRIX
        </p>
        <h2 className="ps-heading text-2xl">
          <span className="ps-text-green">PERSONALITY</span>{" "}
          <span className="text-white/80">LIBRARY</span>
        </h2>
        <p className="mt-1 text-[12px] text-white/55 text-pretty">
          Select a behavior matrix or build your own. Affects every reply, mood, and game taunt.
        </p>
      </header>

      {/*
        Active personality summary — the always-visible proof that
        selection actually does something. Shows the live name, traits,
        a sample line, the persistent auto-save state, and a real
        Preview button that speaks the sample through the active voice
        runtime.
      */}
      <NeonPanel accent={active.accent} glow="strong" scanlines className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="ps-mono text-[10px] tracking-[0.3em] text-white/55">
              ACTIVE_PERSONALITY
            </p>
            <h3
              className="ps-heading text-xl leading-none mt-0.5"
              style={{
                color: `var(--neon-${active.accent})`,
                textShadow: `0 0 8px var(--neon-${active.accent})`,
              }}
            >
              {active.name}
            </h3>
            <p className="mt-1 text-[12px] text-white/75 text-pretty">
              {active.description}
            </p>
          </div>
          {savedAt !== null ? (
            <span
              className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 ps-mono text-[9px] tracking-[0.25em]"
              style={{
                background: "rgba(57,255,20,0.12)",
                color: "#39ff14",
                boxShadow: "inset 0 0 0 1px rgba(57,255,20,0.55), 0 0 12px rgba(57,255,20,0.3)",
              }}
            >
              <CheckCircle2 className="h-3 w-3" />
              SAVED
            </span>
          ) : (
            <span
              className="shrink-0 rounded-full px-2.5 py-1 ps-mono text-[9px] tracking-[0.25em] text-white/55"
              style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)" }}
            >
              AUTO-SAVED
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {active.traits.map((trait) => (
            <span
              key={trait}
              className="rounded-full px-2 py-0.5 ps-mono text-[9px] tracking-[0.2em] text-white/75"
              style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)" }}
            >
              {trait.toUpperCase()}
            </span>
          ))}
        </div>
        <div className="mt-3 rounded-lg bg-black/40 px-3 py-2" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
          <p className="ps-mono text-[9px] tracking-[0.3em] text-white/45">BEHAVIOR_DELTA</p>
          <p className="mt-1 text-[12px] text-white/85">
            Tone: <span className="text-white">{activeBehavior.tone}</span> · Style: <span className="text-white">{activeBehavior.responseStyle}</span> · Verbosity: <span className="text-white">{activeBehavior.verbosity}</span>
          </p>
          <p className="mt-1 text-[12px] text-white/75">
            Warmth {Math.round(activeBehavior.warmth * 100)} · Directness {Math.round(activeBehavior.directness * 100)} · Snark {Math.round(activeBehavior.snark * 100)}
          </p>
          <p className="mt-1 text-[12px] text-white/75">Linked voice: {activeLinkedVoice.name} (preview uses linked voice; selection does not auto-switch active voice).</p>
        </div>

        <div
          className="mt-3 rounded-lg bg-black/40 px-3 py-2"
          style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="ps-mono text-[9px] tracking-[0.3em] text-white/45">
              SAMPLE_LINE · {previewCategory.toUpperCase()}
            </p>
            <p
              className="ps-mono text-[9px] uppercase tracking-[0.18em]"
              style={{ color: "rgba(255,255,255,0.55)" }}
              title="The live runtime label of the linked voice — Provider Distinct / Styled Android / Browser fallback."
            >
              {previewTruth}
            </p>
          </div>
          <p className="mt-1.5 text-[13px] text-white/90 text-pretty">
            &ldquo;{getPersonalityPreviewLine(active.id, previewCategory)}&rdquo;
          </p>
        </div>

        <div className="mt-3 -mx-1 ps-no-scrollbar overflow-x-auto px-1">
          <div className="flex w-max gap-1.5">
            {PREVIEW_CATEGORIES.map((cat) => {
              const isActiveCategory = cat.id === previewCategory
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setPreviewCategory(cat.id)}
                  className="shrink-0 rounded-full px-2.5 py-1 ps-mono text-[9px] tracking-[0.22em]"
                  style={{
                    color: isActiveCategory ? "#000" : "rgba(255,255,255,0.75)",
                    background: isActiveCategory
                      ? "linear-gradient(180deg, #00f0ff, #2ea3ff)"
                      : "rgba(255,255,255,0.04)",
                    boxShadow: isActiveCategory
                      ? "inset 0 0 0 1px rgba(255,255,255,0.4), 0 0 10px rgba(0,240,255,0.45)"
                      : "inset 0 0 0 1px rgba(255,255,255,0.14)",
                  }}
                  aria-pressed={isActiveCategory}
                >
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleTestPersonality}
            disabled={previewState === "speaking"}
            className="flex items-center justify-center gap-2 rounded-lg py-2.5 ps-mono text-[11px] tracking-[0.3em] disabled:opacity-80"
            style={{
              color: "#000",
              background: `linear-gradient(180deg, var(--neon-${active.accent}), var(--neon-${active.accent}) 80%)`,
              boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.4), 0 0 18px var(--neon-${active.accent})`,
            }}
          >
            {previewState === "speaking" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
            {previewState === "speaking" ? "SPEAKING…" : "TEST N.E.O."}
          </button>
          <button
            type="button"
            onClick={() => setScreen("chat")}
            className="flex items-center justify-center gap-2 rounded-lg py-2.5 ps-mono text-[11px] tracking-[0.3em] text-white/85"
            style={{
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <MessageSquareText className="h-4 w-4" />
            OPEN CHAT
          </button>
        </div>

        {previewMessage && (
          <p
            className="mt-2 ps-mono text-[10px] tracking-[0.25em]"
            style={{
              color:
                previewState === "error"
                  ? "#ff3b3b"
                  : previewState === "done"
                    ? "#39ff14"
                    : "rgba(255,255,255,0.7)",
            }}
          >
            {previewMessage}
          </p>
        )}
      </NeonPanel>

      {previewing && (
        <NeonPanel accent={previewing.accent} glow="strong" className="p-3">
          <p className="ps-mono text-[10px] tracking-[0.3em] text-white/55 mb-1">
            PREVIEW · {previewing.name.toUpperCase()}
          </p>
          <p className="text-[14px] text-white/95 text-pretty">&quot;{previewing.sample}&quot;</p>
          <p className="mt-2 text-[13px] text-white/75 text-pretty">&quot;{generatePersonalityPreviewResponse(previewing.id)}&quot;</p>
        </NeonPanel>
      )}

      <NeonPanel accent="cyan" glow="soft" className="p-3">
        <p className="mb-2 ps-mono text-[10px] uppercase tracking-[0.3em] text-white/50">
          RECOMMENDED VOICE PROFILES
        </p>
        <div className="flex gap-2 overflow-x-auto ps-no-scrollbar">
          {voiceMatches.map((voice) => (
            <button
              key={voice.id}
              type="button"
              onClick={() => {
                setVoiceId(voice.id)
                setScreen("voices")
              }}
              className="shrink-0 rounded-full px-3 py-1.5 ps-mono text-[10px] uppercase tracking-[0.18em] text-white/80"
              style={{ boxShadow: "inset 0 0 0 1px rgba(0,240,255,0.35)", background: "rgba(0,240,255,0.08)" }}
            >
              {voice.name}
            </button>
          ))}
        </div>
      </NeonPanel>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {PERSONALITIES.map((p) => (
          <PersonalityCard
            key={p.id}
            personality={p}
            selected={p.id === personalityId}
            onSelect={setPersonalityId}
            onPreview={(id) => setPreview(id)}
          />
        ))}
      </div>

      {/* Custom Builder */}
      <NeonPanel accent="purple" glow="strong" className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="ps-mono text-[10px] tracking-[0.3em] ps-text-purple">
              CUSTOM_PERSONALITY_BUILDER
            </p>
            <h3 className="ps-heading mt-0.5 text-lg text-white/90">
              Tune the matrix
            </h3>
          </div>
          <Shield className="h-5 w-5 ps-text-purple" />
        </div>

        {/*
          Honesty banner — the slider values and safety toggle below are
          local-only previews. They don't yet route into the assistant
          runtime or replace the active personality. We expose them so
          users can experiment with the feel, but we say so plainly
          instead of pretending they save a custom personality.
        */}
        <p className="ps-mono mt-2 text-[10px] tracking-[0.25em] text-white/55">
          LOCAL_PREVIEW · SLIDERS DO NOT YET SHAPE LIVE REPLIES
        </p>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ControlSlider label="Humor" value={custom.humor} onChange={(v) => setCustom({ ...custom, humor: v })} color="#ff2d9c" />
          <ControlSlider label="Sarcasm" value={custom.sarcasm} onChange={(v) => setCustom({ ...custom, sarcasm: v })} color="#b829ff" />
          <ControlSlider label="Helpfulness" value={custom.helpfulness} onChange={(v) => setCustom({ ...custom, helpfulness: v })} color="#00f0ff" />
          <ControlSlider label="Randomness" value={custom.randomness} onChange={(v) => setCustom({ ...custom, randomness: v })} color="#ff7a00" />
          <ControlSlider label="Energy" value={custom.energy} onChange={(v) => setCustom({ ...custom, energy: v })} color="#39ff14" />

          <div className="flex items-center justify-between rounded-lg bg-black/40 px-3 py-2"
            style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}
          >
            <div>
              <p className="ps-mono text-[10px] tracking-[0.25em] text-white/65">SAFETY FILTER</p>
              <p className="text-[11px] text-white/50">Keeps pranks harmless</p>
            </div>
            <button
              type="button"
              onClick={() => setCustom({ ...custom, safety: !custom.safety })}
              aria-pressed={custom.safety}
              className="relative h-6 w-11 rounded-full"
              style={{
                background: custom.safety ? "rgba(57,255,20,0.25)" : "rgba(255,255,255,0.08)",
                boxShadow: custom.safety
                  ? "inset 0 0 0 1px rgba(57,255,20,0.7), 0 0 10px rgba(57,255,20,0.5)"
                  : "inset 0 0 0 1px rgba(255,255,255,0.15)",
              }}
            >
              <span
                className="absolute top-0.5 h-5 w-5 rounded-full transition-all"
                style={{
                  left: custom.safety ? "22px" : "2px",
                  background: custom.safety ? "#39ff14" : "#888",
                  boxShadow: custom.safety ? "0 0 8px #39ff14" : "none",
                }}
              />
            </button>
          </div>
        </div>

        {/*
          The previous SAVE PERSONALITY button was inert — selection is
          already persisted by the store the moment a card is tapped, and
          the local custom-slider values were never wired anywhere. The
          button is now a real Preview/Test action that speaks the active
          personality's sample line through the voice runtime, replacing
          the dead control with the same visual gradient and a truthful
          function.
        */}
        <button
          type="button"
          onClick={handleTestPersonality}
          disabled={previewState === "speaking"}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 ps-mono text-[11px] tracking-[0.3em] disabled:opacity-80"
          style={{
            color: "#000",
            background: "linear-gradient(180deg, #b829ff, #ff2d9c)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.4), 0 0 18px rgba(184,41,255,0.55)",
          }}
        >
          {previewState === "speaking" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
          {previewState === "speaking" ? "SPEAKING…" : "PREVIEW PERSONALITY"}
        </button>

        {/*
          Mirror the preview status under the bottom button as well — the
          top ACTIVE_PERSONALITY panel may be scrolled out of view by the
          time the user reaches and taps this control, so without this
          line the bottom preview would feel silent.
        */}
        {previewMessage && (
          <p
            className="mt-2 ps-mono text-[10px] tracking-[0.25em]"
            style={{
              color:
                previewState === "error"
                  ? "#ff3b3b"
                  : previewState === "done"
                    ? "#39ff14"
                    : "rgba(255,255,255,0.7)",
            }}
          >
            {previewMessage}
          </p>
        )}
      </NeonPanel>
    </div>
  )
}
