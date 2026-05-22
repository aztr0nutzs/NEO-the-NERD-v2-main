"use client"

import type { VoiceRuntimeCapabilities } from "@/lib/voice/voice-runtime"

/**
 * Honest, dominant top-of-screen banner that tells the user — in one line —
 * which TTS engine is actually about to play, before they tap any profile.
 *
 * The truth source is the already-resolved `VoiceRuntimeCapabilities` object
 * — this component renders, it does not classify.
 */
export function VoiceModeBanner({ capabilities }: { capabilities: VoiceRuntimeCapabilities }) {
  const { copy, accent } = bannerCopy(capabilities)
  return (
    <div
      role="status"
      className="rounded-xl p-3"
      style={{
        background: `linear-gradient(135deg, ${accent}22, ${accent}05)`,
        boxShadow: `inset 0 0 0 1.5px ${accent}, 0 0 18px ${accent}55`,
      }}
    >
      <p
        className="ps-mono text-[11px] leading-tight tracking-[0.18em]"
        style={{ color: accent, textShadow: `0 0 6px ${accent}` }}
      >
        {copy}
      </p>
    </div>
  )
}

interface BannerSpec {
  copy: string
  /** Cyan / yellow / red — neon palette only. */
  accent: string
}

function bannerCopy(capabilities: VoiceRuntimeCapabilities): BannerSpec {
  const CYAN = "#00f0ff"
  const CYAN_MUTED = "#7ad8ff"
  const YELLOW = "#ffd700"
  const RED = "#ff2d9c"

  if (capabilities.currentPreviewMode === "provider-tts") {
    return { copy: "▶ PROVIDER · OpenAI cloud TTS · all voices distinct", accent: CYAN }
  }
  if (capabilities.currentPreviewMode === "native-android") {
    if (capabilities.nativeAndroidVoiceCount <= 1) {
      return {
        copy: "▶ DEVICE TTS · only 1 system voice installed · voices may sound similar",
        accent: YELLOW,
      }
    }
    return {
      copy: `▶ DEVICE TTS · ${capabilities.nativeAndroidVoiceCount} system voices · install more languages in Android Settings → Languages → Text-to-speech for richer differentiation`,
      accent: CYAN_MUTED,
    }
  }
  if (capabilities.currentPreviewMode === "browser-speech") {
    return {
      copy: "▶ BROWSER FALLBACK · limited voice set · install the Android app for full device TTS",
      accent: YELLOW,
    }
  }
  return { copy: "▶ TTS UNAVAILABLE · no preview engine detected", accent: RED }
}
