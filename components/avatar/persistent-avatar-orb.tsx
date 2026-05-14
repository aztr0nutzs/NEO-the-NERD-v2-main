"use client"

import { useEffect, useState } from "react"
import { useApp } from "@/lib/store"
import { MOOD_COLORS } from "@/lib/data"
import { NeoAvatarVideo } from "./neo-avatar-video"

export function PersistentAvatarOrb() {
  const { mood, settings, avatarReaction, clearAvatarReaction } = useApp()
  const moodColor = MOOD_COLORS[mood]
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Honor OS-level reduced-motion in addition to the app setting so the
    // compact orb stops decoding video frames when the user has asked the
    // platform to dial down animation. Visibility/intersection-based pauses
    // are handled inside NeoAvatarVideo itself.
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)")
    if (!media) return
    const update = () => setPrefersReducedMotion(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  const reducedMotion = settings.reducedMotion || prefersReducedMotion

  return (
    <div
      // Slightly smaller on narrow phones so the orb does not cover the
      // right-edge of screen headers ("AI:" pill in Chat, etc.). Tablet+
      // restores the original 80px size. pointer-events-none keeps taps
      // passing through to whatever is underneath.
      className="pointer-events-none fixed right-3 top-16 z-30 h-16 w-16 rounded-full bg-black/70 ps-glass sm:h-20 sm:w-20"
      style={{
        boxShadow: `0 0 0 1px ${moodColor}66, 0 0 22px ${moodColor}55, inset 0 0 24px rgba(0,0,0,0.75)`,
      }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-1 rounded-full"
        style={{
          border: `1px dashed ${moodColor}88`,
          boxShadow: `inset 0 0 14px ${moodColor}33`,
        }}
      />
      <NeoAvatarVideo
        className="absolute inset-2"
        variant="circle"
        reactionKey={avatarReaction?.key ?? null}
        reactionId={avatarReaction?.id ?? null}
        reducedMotion={reducedMotion}
        ariaLabel="NEO persistent idle avatar"
        onReactionComplete={clearAvatarReaction}
      />
      <span
        className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
        style={{ background: moodColor, boxShadow: `0 0 8px ${moodColor}` }}
      />
    </div>
  )
}
