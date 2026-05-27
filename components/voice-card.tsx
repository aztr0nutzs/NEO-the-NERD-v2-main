"use client"

import { motion } from "framer-motion"
import { Check, Info, Play, Star } from "lucide-react"
import type { VoiceProfile } from "@/lib/voice/types"
import { availabilityLabel } from "@/lib/voice/voicePresets"
import type { VoiceRuntimeCapabilities } from "@/lib/voice/voice-runtime"
import { getVoiceUniquenessCategory } from "@/lib/voice/voiceUniqueness"

type AuthoredBadge = "UNIQUE TIMBRE" | "STYLED VARIANT" | "DEVICE VOICE" | "PROFILE ONLY" | "UNAVAILABLE"
type RuntimeIndicator = "LIVE" | "FALLBACK" | "LIMITED" | "OFFLINE"

function authoredBadge(voice: VoiceProfile): AuthoredBadge {
  if (voice.availability === "unavailable") return "UNAVAILABLE"
  switch (voice.timbreSource) {
    case "provider-distinct": return "UNIQUE TIMBRE"
    case "styled-variant": return "STYLED VARIANT"
    case "native-distinct": return "DEVICE VOICE"
    case "profile-only": return "PROFILE ONLY"
  }
}

const BADGE_COLOR: Record<AuthoredBadge, string> = {
  "UNIQUE TIMBRE": "#39ff14",
  "STYLED VARIANT": "#00f0ff",
  "DEVICE VOICE": "#b829ff",
  "PROFILE ONLY": "#ff7a00",
  UNAVAILABLE: "#ff2d9c",
}

const INDICATOR_COLOR: Record<RuntimeIndicator, string> = {
  LIVE: "#39ff14",
  FALLBACK: "#ff7a00",
  LIMITED: "#ffd700",
  OFFLINE: "#ff2d9c",
}

function runtimeIndicator(voice: VoiceProfile, capabilities?: VoiceRuntimeCapabilities | null): RuntimeIndicator | null {
  if (!capabilities) return null
  if (voice.availability === "unavailable") return "OFFLINE"
  const category = getVoiceUniquenessCategory(voice, capabilities)
  if (category === "unavailable") return "OFFLINE"
  // Special case: Android runtime collapsed to a single device voice — every
  // profile shares the same underlying timbre regardless of authored intent.
  if (
    !capabilities.providerTtsAvailable &&
    capabilities.nativeAndroidTtsAvailable &&
    capabilities.nativeAndroidVoiceCount <= 1
  ) {
    return "LIMITED"
  }
  // Authored intent realized → LIVE; otherwise the runtime is delivering a
  // lower category than authored → FALLBACK (engine swap) or LIMITED (engine
  // is correct but can't reach distinct timbre).
  if (voice.timbreSource === category) return "LIVE"
  if (voice.timbreSource === "provider-distinct" && category === "styled-variant" && capabilities.providerTtsAvailable) return "LIMITED"
  return "FALLBACK"
}

function collapsedSubtext(capabilities?: VoiceRuntimeCapabilities | null): string | null {
  if (!capabilities) return null
  if (capabilities.providerTtsAvailable) return null
  if (!capabilities.nativeAndroidTtsAvailable) return null
  if (capabilities.nativeAndroidVoiceCount > 1) return null
  return capabilities.selectedAndroidVoiceName
    ? `SHARED DEVICE VOICE · ${capabilities.selectedAndroidVoiceName}`
    : "SHARED DEVICE VOICE"
}

type RuntimeTruthCategory =
  | "provider-distinct"
  | "provider-styled"
  | "native-distinct"
  | "native-shared"
  | "browser-fallback"
  | "unavailable"

interface RuntimeTruthClassification {
  category: RuntimeTruthCategory
  label: string
  color: string
}

function classifyRuntimeTruth(
  voice: VoiceProfile,
  capabilities?: VoiceRuntimeCapabilities | null,
): RuntimeTruthClassification | null {
  if (!capabilities) return null
  if (voice.availability === "unavailable") {
    return { category: "unavailable", label: "UNAVAILABLE IN CURRENT RUNTIME", color: "#ff2d9c" }
  }
  const cat = getVoiceUniquenessCategory(voice, capabilities)
  if (cat === "unavailable") {
    return { category: "unavailable", label: "UNAVAILABLE IN CURRENT RUNTIME", color: "#ff2d9c" }
  }
  if (capabilities.providerTtsAvailable) {
    if (cat === "provider-distinct") {
      return { category: "provider-distinct", label: "PROVIDER DISTINCT VOICE", color: "#39ff14" }
    }
    return { category: "provider-styled", label: "PROVIDER STYLED VARIANT", color: "#00f0ff" }
  }
  if (capabilities.nativeAndroidTtsAvailable) {
    if (capabilities.nativeAndroidVoiceCount <= 1) {
      return { category: "native-shared", label: "SHARED FALLBACK DEVICE VOICE", color: "#ff7a00" }
    }
    if (cat === "native-distinct") {
      return { category: "native-distinct", label: "NATIVE DISTINCT DEVICE VOICE", color: "#b829ff" }
    }
    return { category: "native-shared", label: "SHARED FALLBACK DEVICE VOICE", color: "#ff7a00" }
  }
  if (capabilities.browserSpeechSupported) {
    return { category: "browser-fallback", label: "BROWSER SPEECH FALLBACK", color: "#ff7a00" }
  }
  return { category: "unavailable", label: "UNAVAILABLE IN CURRENT RUNTIME", color: "#ff2d9c" }
}

const ACCENT_HEX: Record<VoiceProfile["accent"], string> = {
  cyan: "#00f0ff",
  purple: "#b829ff",
  pink: "#ff2d9c",
  green: "#39ff14",
  orange: "#ff7a00",
}

interface Props {
  voice: VoiceProfile
  selected?: boolean
  favorite?: boolean
  capabilities?: VoiceRuntimeCapabilities | null
  onSelect?: (id: string) => void
  onPreview?: (id: string) => void
  onDetails?: (voice: VoiceProfile) => void
  onToggleFavorite?: (id: string) => void
}

export function VoiceCard({
  voice,
  selected,
  favorite,
  capabilities,
  onSelect,
  onPreview,
  onDetails,
  onToggleFavorite,
}: Props) {
  const accent = ACCENT_HEX[voice.accent]
  const previewDisabled = voice.availability === "unavailable"

  return (
    <motion.div
      whileTap={{ scale: 0.99 }}
      className="relative rounded-xl ps-glass p-3"
      style={{
        boxShadow: selected
          ? `inset 0 0 0 1px ${accent}, 0 0 22px ${accent}66, 0 0 60px ${accent}22`
          : `inset 0 0 0 1px ${accent}33`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className="ps-heading text-lg leading-none"
              style={{ color: accent, textShadow: `0 0 8px ${accent}` }}
            >
              {voice.name}
            </h3>
            {selected && (
              <span
                className="grid h-5 w-5 place-items-center rounded-full"
                style={{
                  background: `${accent}33`,
                  boxShadow: `inset 0 0 0 1px ${accent}`,
                }}
              >
                <Check className="h-3 w-3" style={{ color: accent }} />
              </span>
            )}
          </div>
          <p className="mt-0.5 ps-mono text-[9px] uppercase tracking-[0.22em] text-white/45">
            {voice.category}
          </p>
          <p className="mt-1 text-[12px] leading-snug text-white/75 text-pretty">
            {voice.shortDescription}
          </p>
          <p className="mt-1 ps-mono text-[9px] tracking-[0.25em] text-white/45">
            FIT: {(voice.idealUseCases[0] ?? "assistant").toUpperCase()}
          </p>
          <p className="mt-1 ps-mono text-[9px] tracking-[0.25em] text-white/45">
            PREVIEW: {availabilityLabel(voice.availability)}
          </p>
          {(() => {
            const badge = authoredBadge(voice)
            const badgeColor = BADGE_COLOR[badge]
            const indicator = runtimeIndicator(voice, capabilities)
            const indicatorColor = indicator ? INDICATOR_COLOR[indicator] : null
            return (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span
                  className="inline-block rounded-full px-2 py-0.5 ps-mono text-[9px] tracking-[0.22em]"
                  style={{
                    color: badgeColor,
                    background: `${badgeColor}1A`,
                    boxShadow: `inset 0 0 0 1px ${badgeColor}66`,
                  }}
                  title={voice.uniquenessExplanation}
                >
                  {badge}
                </span>
                {indicator && indicatorColor && (
                  <span
                    className="ps-mono text-[8px] tracking-[0.2em]"
                    style={{ color: indicatorColor, textShadow: `0 0 4px ${indicatorColor}` }}
                    title={`Runtime: ${indicator.toLowerCase()}`}
                  >
                    · {indicator}
                  </span>
                )}
              </div>
            )
          })()}
          {(() => {
            const truth = classifyRuntimeTruth(voice, capabilities)
            return truth ? (
              <p
                className="mt-1 ps-mono text-[9px] tracking-[0.22em]"
                style={{ color: truth.color, textShadow: `0 0 4px ${truth.color}55` }}
                title="Runtime classification: how this profile is actually delivered right now, not its authored intent."
              >
                RUNTIME: {truth.label}
              </p>
            ) : null
          })()}
          {(() => {
            const collapsed = collapsedSubtext(capabilities)
            return collapsed ? (
              <p
                className="mt-0.5 ps-mono text-[9px] tracking-[0.22em]"
                style={{ color: "#ff7a00" }}
                title="This runtime can only produce one underlying voice. All profiles will share this same timbre with pitch/rate/style adjustments on top."
              >
                {collapsed}
              </p>
            ) : null
          })()}
        </div>

        <div className="flex shrink-0 flex-col gap-1.5">
          <button
            type="button"
            onClick={() => onToggleFavorite?.(voice.id)}
            aria-label={favorite ? `Unfavorite ${voice.name}` : `Favorite ${voice.name}`}
            className="grid h-11 w-11 place-items-center rounded-lg touch-manipulation"
            style={{
              background: favorite ? "rgba(255,122,0,0.16)" : `${accent}10`,
              boxShadow: favorite
                ? "inset 0 0 0 1px #ff7a00, 0 0 10px rgba(255,122,0,0.55)"
                : `inset 0 0 0 1px ${accent}55`,
            }}
          >
            <Star
              className="h-3.5 w-3.5"
              style={{ color: favorite ? "#ff7a00" : accent, fill: favorite ? "#ff7a00" : "transparent" }}
            />
          </button>
          <button
            type="button"
            onClick={() => onPreview?.(voice.id)}
            disabled={previewDisabled}
            aria-label={`Preview ${voice.name}`}
            className="grid h-11 w-11 place-items-center rounded-lg touch-manipulation"
            style={{
              background: `${accent}1A`,
              boxShadow: `inset 0 0 0 1px ${accent}88, 0 0 10px ${accent}55`,
              opacity: previewDisabled ? 0.45 : 1,
            }}
          >
            <Play className="h-3.5 w-3.5" style={{ color: accent }} />
          </button>
          <button
            type="button"
            onClick={() => onDetails?.(voice)}
            aria-label={`Open ${voice.name} details`}
            className="grid h-11 w-11 place-items-center rounded-lg touch-manipulation"
            style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }}
          >
            <Info className="h-3.5 w-3.5 text-white/70" />
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {voice.toneTags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="rounded-full px-2 py-0.5 ps-mono text-[9px] tracking-[0.2em] text-white/70"
            style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }}
          >
            {tag.toUpperCase()}
          </span>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Bar label="ENG" value={voice.energyLevel * 20} color={accent} />
        <Bar label="WRM" value={voice.warmthLevel * 20} color={accent} />
        <Bar label="CLR" value={voice.clarityLevel * 20} color={accent} />
      </div>

      <button
        type="button"
        onClick={() => onSelect?.(voice.id)}
        className="mt-3 min-h-11 w-full rounded-lg py-2.5 ps-mono text-[11px] tracking-[0.3em] touch-manipulation"
        style={{
          color: selected ? "#000" : accent,
          background: selected
            ? `linear-gradient(180deg, ${accent}, ${accent}AA)`
            : `${accent}14`,
          boxShadow: selected
            ? `inset 0 0 0 1px ${accent}, 0 0 16px ${accent}AA`
            : `inset 0 0 0 1px ${accent}66`,
        }}
      >
        {selected ? "ACTIVE" : "SELECT"}
      </button>
    </motion.div>
  )
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="ps-mono text-[8px] tracking-[0.2em] text-white/50">{label}</span>
        <span className="ps-mono text-[8px] tracking-widest" style={{ color }}>
          {value}
        </span>
      </div>
      <div
        className="h-1.5 w-full rounded-full"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${value}%`,
            background: color,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
      </div>
    </div>
  )
}
