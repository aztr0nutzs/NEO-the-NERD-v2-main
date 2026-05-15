"use client"

import { motion } from "framer-motion"
import { Check, Info, Play, Star } from "lucide-react"
import type { VoiceProfile } from "@/lib/voice/types"
import { availabilityLabel } from "@/lib/voice/voicePresets"

type AuthoredBadge = "UNIQUE TIMBRE" | "STYLED VARIANT" | "DEVICE VOICE" | "PROFILE ONLY" | "UNAVAILABLE"

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
  onSelect?: (id: string) => void
  onPreview?: (id: string) => void
  onDetails?: (voice: VoiceProfile) => void
  onToggleFavorite?: (id: string) => void
}

export function VoiceCard({
  voice,
  selected,
  favorite,
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
            return (
              <span
                className="mt-1.5 inline-block rounded-full px-2 py-0.5 ps-mono text-[9px] tracking-[0.22em]"
                style={{
                  color: badgeColor,
                  background: `${badgeColor}1A`,
                  boxShadow: `inset 0 0 0 1px ${badgeColor}66`,
                }}
                title={voice.uniquenessExplanation}
              >
                {badge}
              </span>
            )
          })()}
        </div>

        <div className="flex shrink-0 flex-col gap-1.5">
          <button
            type="button"
            onClick={() => onToggleFavorite?.(voice.id)}
            aria-label={favorite ? `Unfavorite ${voice.name}` : `Favorite ${voice.name}`}
            className="grid h-9 w-9 place-items-center rounded-lg"
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
            className="grid h-9 w-9 place-items-center rounded-lg"
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
            className="grid h-9 w-9 place-items-center rounded-lg"
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
        className="mt-3 w-full rounded-lg py-2 ps-mono text-[11px] tracking-[0.3em]"
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
