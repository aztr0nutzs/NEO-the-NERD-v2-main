"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Download, Pause, Play, RotateCcw, Search, Share2, Star, Wand2, X } from "lucide-react"
import { useApp } from "@/lib/store"
import { NeonPanel } from "../neon-panel"
import { VoiceCard } from "../voice-card"
import { ControlSlider } from "../control-slider"
import {
  downloadAudio,
  shareOrSaveAudio,
} from "@/lib/voice/ttsClient"
import { getProviderVoiceCapabilities } from "@/lib/voice/ttsProviderAdapter"
import {
  generateProviderAudio,
  getActiveProviderAudio,
  getCachedVoiceRuntimeCapabilities,
  getProfileTruthLabel,
  getVoiceRuntimeCapabilities,
  pauseVoicePreview,
  playProviderAudio,
  previewVoice,
  resumeVoicePreview,
  stopVoicePreview,
  type VoiceRuntimeCapabilities,
} from "@/lib/voice/voice-runtime"
import { DEFAULT_VOICE_FILTERS, categoryBreakdown, filterVoiceProfiles } from "@/lib/voice/voiceFilters"
import { VOICE_CATEGORIES, VOICE_PROFILES, VOICE_TONE_TAGS, getVoiceProfile } from "@/lib/voice/voiceProfiles"
import { availabilityLabel, voiceProfileToParams } from "@/lib/voice/voicePresets"
import { getPreviewTextSeed } from "@/lib/voice/personalityPreviewCorpus"
import { inferSpeechIntent } from "@/lib/voice/speechIntent"
import {
  getUniquenessSummary,
  getVoiceAvailabilityExplanation,
  getVoiceUniquenessCategory,
  runtimeTimbreLabel,
} from "@/lib/voice/voiceUniqueness"
import { bannerToneColor, getVoiceRuntimeMode } from "@/lib/voice/voiceRuntimeMode"
import type { VoiceFilterState, VoiceProfile } from "@/lib/voice/types"
import { IDLE_PLAYBACK_SNAPSHOT, type VoicePlaybackSnapshot } from "@/lib/voice/voicePlayback"
import type { VoiceRuntimeBanner } from "@/lib/voice/voiceRuntimeMode"
import { getRecommendedPersonalityNamesForVoice, getRecommendedVoiceProfiles } from "@/lib/assistant/assistantIntegrations"

export function VoicesScreen() {
  const {
    voiceId,
    setVoiceId,
    voiceParams,
    setVoiceParams,
    voiceFavoriteIds,
    recentVoiceIds,
    toggleVoiceFavorite,
    personalityId,
    settings,
  } = useApp()
  const qualityPreference = settings.voiceQualityPreference
  const [filters, setFilters] = useState<VoiceFilterState>(DEFAULT_VOICE_FILTERS)
  const [detailVoice, setDetailVoice] = useState<VoiceProfile | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  // Seed the preview textarea with a personality-aware greeting line so the
  // initial preview demonstrates the active persona instead of a bland
  // boot string. User edits take precedence — we only seed once.
  const [previewText, setPreviewText] = useState(() => getPreviewTextSeed(personalityId))
  const [generating, setGenerating] = useState(false)
  const [playback, setPlayback] = useState<VoicePlaybackSnapshot>(IDLE_PLAYBACK_SNAPSHOT)
  const [capabilities, setCapabilities] = useState<VoiceRuntimeCapabilities>(() =>
    getCachedVoiceRuntimeCapabilities(),
  )
  const [audioPayload, setAudioPayload] = useState<{
    audioBase64: string
    fileName: string
    mimeType: string
  } | null>(null)
  const [voiceStatus, setVoiceStatus] = useState("VOICE PREVIEW READY")
  const [distinctOnly, setDistinctOnly] = useState(false)
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  const browserSpeechSupported = capabilities.browserSpeechSupported
  const providerTtsAvailable = capabilities.providerTtsAvailable
  const runtimeBanner = useMemo(() => getVoiceRuntimeMode(capabilities), [capabilities])

  useEffect(() => {
    let cancelled = false
    getVoiceRuntimeCapabilities(getVoiceProfile(voiceId)).then((caps) => {
      if (!cancelled) setCapabilities(caps)
    })
    return () => {
      cancelled = true
      stopVoicePreview()
    }
  }, [voiceId])

  const filteredVoices = useMemo(
    () => {
      const base = filterVoiceProfiles(VOICE_PROFILES, filters, voiceFavoriteIds).filter(
        (voice, index, list) => list.findIndex((item) => item.id === voice.id) === index,
      )
      if (!distinctOnly) return base
      // "Distinct only" surfaces just the profiles that can deliver a genuinely
      // different underlying timbre in the *current runtime*. Everything else
      // is hidden so the deck cannot pretend there are 40 unique voices when
      // the runtime can produce one or two.
      return base.filter((voice) => {
        const cat = getVoiceUniquenessCategory(voice, capabilities)
        return cat === "provider-distinct" || cat === "native-distinct"
      })
    },
    [filters, voiceFavoriteIds, distinctOnly, capabilities],
  )
  const featuredVoices = useMemo(() => VOICE_PROFILES.filter((voice) => voice.featured), [])
  const recentVoices = useMemo(
    () => recentVoiceIds.map(getVoiceProfile).filter((voice, index, list) => list.findIndex((v) => v.id === voice.id) === index),
    [recentVoiceIds],
  )
  const recommendedVoices = useMemo(() => getRecommendedVoiceProfiles(personalityId, 6), [personalityId])
  const breakdown = useMemo(() => categoryBreakdown(VOICE_PROFILES), [])
  const uniqueness = useMemo(() => getUniquenessSummary(getVoiceProfile(voiceId), capabilities), [voiceId, capabilities])

  const playPayload = (payload: { audioBase64: string; fileName: string; mimeType: string }) => {
    playProviderAudio({
      payload,
      volume: Math.min(1, Math.max(0, voiceParams.volume / 100)),
      voiceId,
      onStateChange: (snapshot) => {
        setPlayback(snapshot)
        setVoiceStatus(snapshot.message)
      },
    })
  }

  const applyVoice = (id: string) => {
    setVoiceId(id)
    setVoiceParams(voiceProfileToParams(id))
  }

  const handlePreview = async (id: string) => {
    const voice = getVoiceProfile(id)
    if (voice.availability === "unavailable") {
      setVoiceStatus("VOICE PREVIEW UNAVAILABLE")
      return
    }
    setPreviewId(id)
    setAudioPayload(null)
    const previewParams = id === voiceId ? voiceParams : voiceProfileToParams(id)
    const text = previewText.trim() || voice.sampleText
    const intent = inferSpeechIntent({ text })
    const result = await previewVoice({
      profile: voice,
      text,
      params: previewParams,
      mode: "auto",
      qualityPreference,
      personalityId,
      intent,
      onStateChange: (snapshot) => {
        setPlayback(snapshot)
        setVoiceStatus(snapshot.message)
      },
    })
    if (!result.ok && result.error) setVoiceStatus(result.error.toUpperCase())
    setTimeout(() => setPreviewId(null), 900)
  }

  const handleGenerate = async () => {
    const profile = getVoiceProfile(voiceId)
    const profileCaps = getProviderVoiceCapabilities(voiceId)
    if (!profileCaps.providerReady) {
      setVoiceStatus(`${availabilityLabel(profile.availability)} · PROVIDER AUDIO NOT AVAILABLE FOR THIS PROFILE`)
      return
    }
    if (!providerTtsAvailable) {
      setVoiceStatus(
        capabilities.remoteBackendConfigured
          ? "PROVIDER UNREACHABLE OR NOT CONFIGURED · CHECK BACKEND"
          : "REMOTE BACKEND NOT CONFIGURED · SET NEXT_PUBLIC_NEO_BACKEND_BASE_URL",
      )
      return
    }
    setGenerating(true)
    setVoiceStatus("GENERATING PREVIEW AUDIO")
    setPlayback({ state: "preparing", source: "provider", voiceId, message: "GENERATING PROVIDER AUDIO" })
    const generateText = previewText || profile.sampleText
    const result = await generateProviderAudio({
      voiceId,
      text: generateText,
      params: voiceParams,
      personalityId,
      intent: inferSpeechIntent({ text: generateText }),
    })
    if (result.payload) {
      setAudioPayload(result.payload)
      playPayload(result.payload)
      setVoiceStatus("GENERATED AUDIO READY")
    } else {
      setVoiceStatus((result.error ?? "TTS PROVIDER UNAVAILABLE").toUpperCase())
      setPlayback({
        state: "error",
        source: "provider",
        voiceId,
        message: (result.error ?? "TTS PROVIDER UNAVAILABLE").toUpperCase(),
      })
    }
    setGenerating(false)
  }

  return (
    <div className="space-y-3">
      <header className="px-1">
        <p className="ps-mono text-[10px] tracking-[0.4em] text-white/50">
          NEO · VOICE_DECK
        </p>
        <h2 className="ps-heading text-2xl">
          <span className="ps-text-pink">VOICE</span>{" "}
          <span className="text-white/80">LIBRARY</span>
        </h2>
        <p className="mt-1 text-[12px] text-white/55 text-pretty">
          {runtimeBanner.totalProfiles} profiles authored ·{" "}
          <span style={{ color: bannerToneColor(runtimeBanner.tone) }}>
            {runtimeBanner.distinctRealizableCount} can deliver a distinct timbre right now
          </span>
          . The rest are styled variants that adjust pitch, rate, and delivery on top of whichever underlying voice the active engine exposes.
        </p>
      </header>

      <RuntimeTruthBanner banner={runtimeBanner} />

      <RuntimeDiagnosticsPanel
        open={diagnosticsOpen}
        onToggle={() => setDiagnosticsOpen((current) => !current)}
        capabilities={capabilities}
        banner={runtimeBanner}
        activeVoiceId={voiceId}
        playback={playback}
      />

      <NeonPanel accent="cyan" glow="soft" className="p-3">
        <p className="ps-mono text-[10px] tracking-[0.3em] ps-text-cyan mb-2">
          VOICE_CONTROLS
        </p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <ControlSlider label="Speed" value={voiceParams.speed} onChange={(v) => setVoiceParams({ speed: v })} color="#00f0ff" />
          <ControlSlider label="Pitch" value={voiceParams.pitch} onChange={(v) => setVoiceParams({ pitch: v })} color="#b829ff" />
          <ControlSlider label="Volume (playback)" value={voiceParams.volume} onChange={(v) => setVoiceParams({ volume: v })} color="#ff2d9c" />
          <ControlSlider
            label={providerTtsAvailable ? "Emotion (style)" : "Emotion (provider-only)"}
            value={voiceParams.emotion}
            onChange={(v) => setVoiceParams({ emotion: v })}
            color={providerTtsAvailable ? "#ff7a00" : "rgba(255,122,0,0.55)"}
          />
        </div>
        <p className="mt-1 ps-mono text-[9px] uppercase tracking-[0.2em] text-white/45">
          {providerTtsAvailable
            ? "ALL FOUR SLIDERS ACTIVE · EMOTION IS SENT AS A PROVIDER STYLE INSTRUCTION."
            : capabilities.nativeAndroidTtsAvailable
              ? "SPEED · PITCH · VOLUME APPLIED BY ANDROID ENGINE. EMOTION HAS NO AUDIBLE EFFECT IN THE FALLBACK PATH."
              : capabilities.browserSpeechSupported
                ? "SPEED · PITCH · VOLUME APPLIED BY BROWSER SPEECH. EMOTION HAS NO AUDIBLE EFFECT IN THE FALLBACK PATH."
                : "NO ENGINE AVAILABLE — SLIDERS HAVE NO AUDIBLE EFFECT."}
        </p>

        <div className="mt-3">
          <p className="ps-mono text-[10px] tracking-[0.25em] text-white/55 mb-1.5">PREVIEW_TEXT</p>
          <textarea
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-md bg-black/60 px-3 py-2 text-[13px] text-white outline-none"
            style={{ boxShadow: "inset 0 0 0 1px rgba(0,240,255,0.35)" }}
          />
          <button
            type="button"
            onClick={() => handlePreview(voiceId)}
            disabled={playback.state === "preparing"}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 ps-mono text-[11px] tracking-[0.3em]"
            style={{
              color: "#000",
              background: playback.state === "preparing" ? "linear-gradient(180deg, #00f0ff, #2ea3ff)" : "linear-gradient(180deg, #00f0ff, #00b3c2)",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.4), 0 0 18px rgba(0,240,255,0.55)",
            }}
          >
            <Wand2 className="h-4 w-4" />
            {playback.state === "preparing" ? "PREPARING..." : "PLAY VOICE PREVIEW"}
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !providerTtsAvailable}
            title={
              providerTtsAvailable
                ? "Render this voice through the high-quality neural TTS provider"
                : "High-quality neural voice requires a configured backend"
            }
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-2 ps-mono text-[10px] tracking-[0.25em]"
            style={{
              color:
                generating || !providerTtsAvailable ? "rgba(255,255,255,0.5)" : "#b829ff",
              boxShadow: "inset 0 0 0 1px rgba(184,41,255,0.45)",
              background: "rgba(184,41,255,0.08)",
            }}
          >
            {generating
              ? "GENERATING NEURAL VOICE..."
              : providerTtsAvailable
                ? "PLAY HIGH-QUALITY NEURAL VOICE"
                : "NEURAL VOICE UNAVAILABLE · CONFIGURE BACKEND"}
          </button>

          <div className="mt-2 grid grid-cols-4 gap-2">
            <PlayerButton icon={Play} label="PLAY" onClick={() => {
              const active = getActiveProviderAudio()
              if (active) {
                active.play().catch(() => undefined)
                return
              }
              if (playback.state === "paused") {
                resumeVoicePreview()
                setPlayback((current) => ({ ...current, state: "playing", message: "BROWSER SPEECH RESUMED" }))
                setVoiceStatus("BROWSER SPEECH RESUMED")
                return
              }
              handlePreview(voiceId)
            }} disabled={playback.state === "preparing"} />
            <PlayerButton icon={Pause} label="PAUSE" onClick={() => {
              const active = getActiveProviderAudio()
              if (active && !active.paused) {
                active.pause()
                return
              }
              if (pauseVoicePreview()) {
                setPlayback((current) => ({ ...current, state: "paused", message: "BROWSER SPEECH PAUSED" }))
                setVoiceStatus("BROWSER SPEECH PAUSED")
              }
            }} disabled={playback.state !== "playing" && !audioPayload} />
            <PlayerButton icon={RotateCcw} label="REPLAY" onClick={() => {
              const active = getActiveProviderAudio()
              if (active) {
                active.currentTime = 0
                active.play().catch(() => undefined)
                return
              }
              if (audioPayload) {
                playPayload(audioPayload)
                return
              }
              stopVoicePreview()
              handlePreview(voiceId)
            }} disabled={playback.state === "preparing" && !audioPayload} />
            <PlayerButton icon={Download} label="SAVE" onClick={() => {
              if (!audioPayload) return
              downloadAudio(audioPayload.audioBase64, audioPayload.fileName, audioPayload.mimeType)
            }} disabled={!audioPayload} />
          </div>
          <button
            type="button"
            disabled={!audioPayload}
            onClick={() => {
              if (!audioPayload) return
              shareOrSaveAudio(audioPayload.audioBase64, audioPayload.fileName, audioPayload.mimeType).catch(() => {
                setVoiceStatus("SHARE FAILED")
              })
            }}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-2 ps-mono text-[10px] tracking-[0.25em]"
            style={{
              color: audioPayload ? "#39ff14" : "rgba(255,255,255,0.35)",
              boxShadow: "inset 0 0 0 1px rgba(57,255,20,0.45)",
              background: "rgba(57,255,20,0.08)",
            }}
          >
            <Share2 className="h-3.5 w-3.5" />
            SAVE / SHARE GENERATED AUDIO
          </button>
          <p className="mt-2 ps-mono text-[10px] tracking-[0.2em] text-white/50">{voiceStatus}</p>
          <p
            className="mt-1 ps-mono text-[9px] uppercase tracking-[0.18em]"
            style={{
              color: providerTtsAvailable && qualityPreference === "prefer-high-quality"
                ? "rgba(57,255,20,0.85)"
                : "rgba(255,255,255,0.55)",
            }}
          >
            HEARING:{" "}
            {providerTtsAvailable && qualityPreference === "prefer-high-quality"
              ? "HIGH-QUALITY PROVIDER VOICE"
              : capabilities.nativeAndroidTtsAvailable
                ? "STYLED ANDROID FALLBACK"
                : capabilities.browserSpeechSupported
                  ? "BROWSER SPEECH FALLBACK"
                  : "NO ENGINE AVAILABLE"}
            {" · "}
            {getProfileTruthLabel(getVoiceProfile(voiceId), capabilities)}
          </p>
          <p className="mt-1 ps-mono text-[9px] uppercase tracking-[0.18em] text-white/35">
            Speed, pitch, volume drive the active engine. Emotion is provider-style metadata
            {providerTtsAvailable ? " applied by the neural voice." : "; neural voice is not active right now."}
          </p>
          {qualityPreference === "fallback-only" && providerTtsAvailable && (
            <p className="mt-1 ps-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: "rgba(255,122,0,0.85)" }}>
              VOICE QUALITY = FALLBACK ONLY · NEURAL VOICE AVAILABLE BUT SKIPPED · CHANGE IN SETTINGS → VOICE
            </p>
          )}
          {capabilities.nativeAndroidTtsAvailable && (
            <p className="mt-1 ps-mono text-[9px] uppercase tracking-[0.18em] text-white/35">
              ANDROID ENGINE VOICES: {capabilities.nativeAndroidVoiceCount || "UNKNOWN"}
              {capabilities.selectedAndroidVoiceName ? ` · SELECTED: ${capabilities.selectedAndroidVoiceName}` : " · NO DISTINCT ENGINE VOICE SELECTED"}
            </p>
          )}
        </div>
      </NeonPanel>


      <NeonPanel accent="green" glow="soft" className="p-3">
        <p className="ps-mono text-[10px] tracking-[0.3em] text-[#39ff14] mb-2">VOICE UNIQUENESS MODEL</p>
        <p className="text-xs text-white/80">
          {runtimeTimbreLabel(uniqueness.runtimeSource)} · {uniqueness.whatChanges}
        </p>
        <p className="mt-2 ps-mono text-[10px] tracking-[0.22em] text-white/55">
          AUTHORED={uniqueness.authoredSource.toUpperCase()} · RUNTIME={uniqueness.runtimeSource.toUpperCase()} · SCORE={uniqueness.uniquenessScore}/100
        </p>
        <p className="mt-1 ps-mono text-[10px] tracking-[0.2em] text-white/55">
          DISTINCT={uniqueness.isDistinctTimbre ? "YES" : "NO"} · FULLY_REALIZED={uniqueness.isFullyRealized ? "YES" : "NO"} · ENGINE={uniqueness.resolvedEngine.toUpperCase()}
        </p>
        <p className="mt-2 text-[11px] text-white/70">{uniqueness.uniquenessExplanation}</p>
        <p className="mt-1 text-[11px] text-white/55">Fallback: {uniqueness.fallbackBehavior}</p>
        <p className="mt-1 text-[11px] text-white/55">{getVoiceAvailabilityExplanation(getVoiceProfile(voiceId), capabilities)}</p>
      </NeonPanel>

      <NeonPanel accent="purple" glow="soft" className="p-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-white/55" />
          <input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Search voices..."
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
          />
          <button
            type="button"
            onClick={() => setFilters((current) => ({ ...current, favoritesOnly: !current.favoritesOnly }))}
            className="grid h-9 w-9 place-items-center rounded-lg"
            style={{
              color: filters.favoritesOnly ? "#ff7a00" : "rgba(255,255,255,0.65)",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)",
            }}
            aria-label="Toggle favorite voices"
          >
            <Star className="h-4 w-4" fill={filters.favoritesOnly ? "#ff7a00" : "transparent"} />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDistinctOnly((current) => !current)}
            className="shrink-0 rounded-full px-3 py-1.5 ps-mono text-[10px] uppercase tracking-[0.2em]"
            style={{
              color: distinctOnly ? "#39ff14" : "rgba(255,255,255,0.7)",
              background: distinctOnly ? "rgba(57,255,20,0.12)" : "rgba(255,255,255,0.04)",
              boxShadow: distinctOnly
                ? "inset 0 0 0 1px #39ff14, 0 0 10px rgba(57,255,20,0.35)"
                : "inset 0 0 0 1px rgba(255,255,255,0.14)",
            }}
            title="Show only profiles that can deliver a genuinely distinct underlying timbre in the current runtime."
          >
            {distinctOnly ? "DISTINCT-ONLY · ON" : "DISTINCT-ONLY · OFF"}
          </button>
          <span className="ps-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
            REALIZABLE DISTINCT: {runtimeBanner.distinctRealizableCount}/{runtimeBanner.totalProfiles}
          </span>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto ps-no-scrollbar">
          {(["All", ...VOICE_CATEGORIES] as const).map((category) => (
            <FilterChip
              key={category}
              label={`${category}${category !== "All" ? ` (${breakdown[category] ?? 0})` : ""}`}
              active={filters.category === category}
              onClick={() => setFilters((current) => ({ ...current, category }))}
            />
          ))}
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto ps-no-scrollbar">
          {(["All", ...VOICE_TONE_TAGS] as const).map((tag) => (
            <FilterChip
              key={tag}
              label={tag}
              active={filters.toneTag === tag}
              onClick={() => setFilters((current) => ({ ...current, toneTag: tag }))}
            />
          ))}
        </div>
        <p className="mt-2 ps-mono text-[10px] uppercase tracking-[0.24em] text-white/45">
          {filteredVoices.length} MATCHING · {voiceFavoriteIds.length} FAVORITES · ACTIVE: {getVoiceProfile(voiceId).name}
        </p>
      </NeonPanel>

      <VoiceRail title="FEATURED_VOICES" voices={featuredVoices} voiceId={voiceId} favorites={voiceFavoriteIds} previewId={previewId} capabilities={capabilities} onSelect={applyVoice} onPreview={handlePreview} onDetails={setDetailVoice} onToggleFavorite={toggleVoiceFavorite} />
      <VoiceRail title="PERSONALITY_MATCHES" voices={recommendedVoices} voiceId={voiceId} favorites={voiceFavoriteIds} previewId={previewId} capabilities={capabilities} onSelect={applyVoice} onPreview={handlePreview} onDetails={setDetailVoice} onToggleFavorite={toggleVoiceFavorite} />
      {recentVoices.length > 0 && (
        <VoiceRail title="RECENTLY_USED" voices={recentVoices} voiceId={voiceId} favorites={voiceFavoriteIds} previewId={previewId} capabilities={capabilities} onSelect={applyVoice} onPreview={handlePreview} onDetails={setDetailVoice} onToggleFavorite={toggleVoiceFavorite} />
      )}

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {filteredVoices.map((voice) => (
          <div key={voice.id} className="relative">
            <VoiceCard
              voice={voice}
              selected={voice.id === voiceId}
              favorite={voiceFavoriteIds.includes(voice.id)}
              capabilities={capabilities}
              onSelect={applyVoice}
              onPreview={handlePreview}
              onDetails={setDetailVoice}
              onToggleFavorite={toggleVoiceFavorite}
            />
            {previewId === voice.id && (
              <div className="pointer-events-none absolute inset-0 rounded-xl" style={{ boxShadow: "0 0 0 2px #00f0ff, 0 0 32px #00f0ff" }} />
            )}
          </div>
        ))}
      </div>

      {detailVoice && (
        <VoiceDetailPanel
          voice={detailVoice}
          selected={detailVoice.id === voiceId}
          favorite={voiceFavoriteIds.includes(detailVoice.id)}
          onClose={() => setDetailVoice(null)}
          onPreview={handlePreview}
          onApply={() => applyVoice(detailVoice.id)}
          onToggleFavorite={() => toggleVoiceFavorite(detailVoice.id)}
        />
      )}
    </div>
  )
}

function VoiceRail({
  title,
  voices,
  voiceId,
  favorites,
  previewId,
  capabilities,
  onSelect,
  onPreview,
  onDetails,
  onToggleFavorite,
}: {
  title: string
  voices: VoiceProfile[]
  voiceId: string
  favorites: string[]
  previewId: string | null
  capabilities?: VoiceRuntimeCapabilities | null
  onSelect: (id: string) => void
  onPreview: (id: string) => void
  onDetails: (voice: VoiceProfile) => void
  onToggleFavorite: (id: string) => void
}) {
  return (
    <div>
      <p className="mb-2 px-1 ps-mono text-[10px] uppercase tracking-[0.3em] text-white/50">{title}</p>
      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 ps-no-scrollbar">
        {voices.map((voice) => (
          <div key={voice.id} className="relative w-[280px] shrink-0">
            <VoiceCard
              voice={voice}
              selected={voice.id === voiceId}
              favorite={favorites.includes(voice.id)}
              capabilities={capabilities}
              onSelect={onSelect}
              onPreview={onPreview}
              onDetails={onDetails}
              onToggleFavorite={onToggleFavorite}
            />
            {previewId === voice.id && (
              <div className="pointer-events-none absolute inset-0 rounded-xl" style={{ boxShadow: "0 0 0 2px #00f0ff, 0 0 32px #00f0ff" }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function VoiceDetailPanel({
  voice,
  selected,
  favorite,
  onClose,
  onPreview,
  onApply,
  onToggleFavorite,
}: {
  voice: VoiceProfile
  selected: boolean
  favorite: boolean
  onClose: () => void
  onPreview: (id: string) => void
  onApply: () => void
  onToggleFavorite: () => void
}) {
  const provider = getProviderVoiceCapabilities(voice.id)
  const previewDisabled = voice.availability === "unavailable"
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
      <NeonPanel accent={voice.accent} glow="strong" className="max-h-[88vh] w-full overflow-y-auto p-4 sm:max-w-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="ps-mono text-[10px] uppercase tracking-[0.3em] text-white/50">{voice.category}</p>
            <h3 className="ps-heading text-2xl text-white">{voice.name}</h3>
            <p className="mt-1 text-sm text-white/70">{voice.longDescription}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close voice details" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/70" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)" }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {voice.toneTags.map((tag) => (
            <span key={tag} className="rounded-full px-2 py-0.5 ps-mono text-[9px] uppercase tracking-[0.2em] text-white/70" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)" }}>{tag}</span>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Meter label="Energy" value={voice.energyLevel} />
          <Meter label="Warmth" value={voice.warmthLevel} />
          <Meter label="Humor" value={voice.humorLevel} />
          <Meter label="Robot" value={voice.roboticnessLevel} />
          <Meter label="Clarity" value={voice.clarityLevel} />
          <div className="rounded-lg bg-black/40 p-3" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
            <p className="ps-mono text-[9px] uppercase tracking-[0.22em] text-white/45">Availability</p>
            <p className="mt-1 ps-mono text-[11px] uppercase tracking-[0.18em] text-white/75">
              {provider.providerReady ? `PROVIDER ${provider.providerVoiceId}` : availabilityLabel(voice.availability)}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-black/40 p-3" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
          <p className="ps-mono text-[9px] uppercase tracking-[0.24em] text-white/45">Uniqueness model</p>
          <p className="mt-1 text-xs text-white/70">
            {provider.providerReady
              ? "Provider Distinct Voice: this profile maps to a provider voice ID when backend TTS is configured."
              : voice.availability === "profile-only"
                ? "Profile-only / no unique engine timbre: style metadata changes phrasing, pitch, rate, and cadence only."
                : "Styled Android TTS / browser preview: local engines may style pitch and rate; provider timbre is not active for this profile."}
          </p>
        </div>

        <div className="mt-4 rounded-lg bg-black/40 p-3" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
          <p className="ps-mono text-[9px] uppercase tracking-[0.24em] text-white/45">Sample line</p>
          <p className="mt-1 text-sm text-white/85">&quot;{voice.sampleLine}&quot;</p>
          <p className="mt-3 ps-mono text-[9px] uppercase tracking-[0.24em] text-white/45">Compatible personalities</p>
          <p className="mt-1 text-xs text-white/70">{voice.compatiblePersonalities.join(", ")}</p>
          <p className="mt-3 ps-mono text-[9px] uppercase tracking-[0.24em] text-white/45">Works especially well with</p>
          <p className="mt-1 text-xs text-white/70">{getRecommendedPersonalityNamesForVoice(voice.id).join(", ")}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onPreview(voice.id)} disabled={previewDisabled} className="rounded-lg py-2.5 ps-mono text-[11px] uppercase tracking-[0.25em]" style={{ color: previewDisabled ? "rgba(255,255,255,0.35)" : "#00f0ff", boxShadow: "inset 0 0 0 1px rgba(0,240,255,0.45)", background: "rgba(0,240,255,0.08)" }}>
            Preview
          </button>
          <button type="button" onClick={onToggleFavorite} className="rounded-lg py-2.5 ps-mono text-[11px] uppercase tracking-[0.25em]" style={{ color: favorite ? "#ff7a00" : "#fff", boxShadow: "inset 0 0 0 1px rgba(255,122,0,0.45)", background: "rgba(255,122,0,0.08)" }}>
            {favorite ? "Favorited" : "Favorite"}
          </button>
          <button type="button" onClick={onApply} className="col-span-2 rounded-lg py-2.5 ps-mono text-[11px] uppercase tracking-[0.25em]" style={{ color: selected ? "#000" : "#39ff14", background: selected ? "linear-gradient(180deg, #39ff14, #00f0ff)" : "rgba(57,255,20,0.08)", boxShadow: "inset 0 0 0 1px rgba(57,255,20,0.65), 0 0 14px rgba(57,255,20,0.25)" }}>
            {selected ? "Active Voice" : "Apply Voice"}
          </button>
        </div>
      </NeonPanel>
    </div>
  )
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-black/40 p-3" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
      <div className="flex items-center justify-between">
        <p className="ps-mono text-[9px] uppercase tracking-[0.22em] text-white/45">{label}</p>
        <p className="ps-mono text-[9px] text-white/65">{value}/5</p>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <span key={index} className="h-1.5 rounded-full" style={{ background: index < value ? "#00f0ff" : "rgba(255,255,255,0.08)", boxShadow: index < value ? "0 0 8px #00f0ff" : "none" }} />
        ))}
      </div>
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="shrink-0 rounded-full px-3 py-1.5 ps-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: active ? "#00f0ff" : "rgba(255,255,255,0.64)", background: active ? "rgba(0,240,255,0.12)" : "rgba(255,255,255,0.04)", boxShadow: active ? "inset 0 0 0 1px #00f0ff, 0 0 10px rgba(0,240,255,0.35)" : "inset 0 0 0 1px rgba(255,255,255,0.1)" }}>
      {label}
    </button>
  )
}

function RuntimeTruthBanner({ banner }: { banner: VoiceRuntimeBanner }) {
  const color = bannerToneColor(banner.tone)
  return (
    <div
      role={banner.tone === "ok" ? "status" : "alert"}
      className="rounded-xl p-3"
      style={{
        background: `linear-gradient(135deg, ${color}22, ${color}05)`,
        boxShadow: `inset 0 0 0 1.5px ${color}, 0 0 22px ${color}55`,
      }}
    >
      <p className="ps-mono text-[10px] tracking-[0.3em]" style={{ color }}>
        RUNTIME TRUTH
      </p>
      <p
        className="mt-1 ps-heading text-[15px] sm:text-base leading-tight"
        style={{ color, textShadow: `0 0 8px ${color}` }}
      >
        {banner.headline}
      </p>
      <p className="mt-1.5 text-[12px] leading-snug text-white/80 text-pretty">{banner.detail}</p>
      <p className="mt-1.5 ps-mono text-[9px] uppercase tracking-[0.22em] text-white/55">
        ENGINE: {banner.engineLabel.toUpperCase()} · DISTINCT REALIZABLE: {banner.distinctRealizableCount}/{banner.totalProfiles}
      </p>
    </div>
  )
}

function RuntimeDiagnosticsPanel({
  open,
  onToggle,
  capabilities,
  banner,
  activeVoiceId,
  playback,
}: {
  open: boolean
  onToggle: () => void
  capabilities: VoiceRuntimeCapabilities
  banner: VoiceRuntimeBanner
  activeVoiceId: string
  playback: VoicePlaybackSnapshot
}) {
  return (
    <div className="rounded-xl ps-glass p-3" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)" }}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between"
        aria-expanded={open}
      >
        <span className="ps-mono text-[10px] uppercase tracking-[0.3em] text-white/65">
          VOICE RUNTIME DIAGNOSTICS
        </span>
        <span className="ps-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
          {open ? "HIDE" : "SHOW"}
        </span>
      </button>
      {open && (
        <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
          <DiagRow label="Runtime mode" value={banner.mode.toUpperCase()} />
          <DiagRow label="Active preview path" value={capabilities.currentPreviewMode.toUpperCase()} />
          <DiagRow label="Backend configured" value={capabilities.remoteBackendConfigured ? "YES" : "NO"} />
          <DiagRow label="Provider TTS reachable" value={capabilities.providerTtsAvailable ? "YES" : "NO"} />
          <DiagRow label="Native Android TTS" value={capabilities.nativeAndroidTtsAvailable ? "READY" : "OFF"} />
          <DiagRow label="Native voice count" value={String(capabilities.nativeAndroidVoiceCount)} />
          <DiagRow label="Selected Android voice" value={capabilities.selectedAndroidVoiceName ?? "—"} />
          <DiagRow label="Browser speech" value={capabilities.browserSpeechSupported ? "SUPPORTED" : "OFF"} />
          <DiagRow label="Selected profile ID" value={activeVoiceId} />
          <DiagRow label="Distinct realizable" value={`${banner.distinctRealizableCount} / ${banner.totalProfiles}`} />
          <DiagRow label="Last playback state" value={playback.state.toUpperCase()} />
          <DiagRow label="Last playback source" value={(playback.source ?? "—").toString().toUpperCase()} />
          <div className="sm:col-span-2">
            <DiagRow label="Last status message" value={playback.message || "—"} />
          </div>
        </div>
      )}
    </div>
  )
}

function DiagRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 rounded-md bg-black/30 px-2 py-1.5" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}>
      <span className="ps-mono text-[9px] uppercase tracking-[0.22em] text-white/45 shrink-0">{label}</span>
      <span className="ps-mono text-[10px] tracking-[0.18em] text-white/85 truncate">{value}</span>
    </div>
  )
}

function PlayerButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Play
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 items-center justify-center gap-1 rounded-lg ps-mono text-[9px] tracking-[0.18em]"
      style={{
        color: disabled ? "rgba(255,255,255,0.35)" : "#00f0ff",
        boxShadow: "inset 0 0 0 1px rgba(0,240,255,0.35)",
        background: "rgba(0,240,255,0.08)",
      }}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}
