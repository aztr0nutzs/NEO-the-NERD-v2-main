"use client"

import { useEffect, useState } from "react"
import { useApp } from "@/lib/store"
import { NeoAvatarVideo } from "./neo-avatar-video"

export function PersistentAvatarOrb() {
  const { settings, avatarReaction, clearAvatarReaction } = useApp()
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
      // The persistent avatar should read as part of the screen, not as a
      // separate orb. Keep the container transparent and let the avatar clip
      // define the silhouette.
      className="pointer-events-none fixed right-2 top-14 z-30 h-20 w-20 sm:h-24 sm:w-24"
      aria-hidden="true"
    >
      <NeoAvatarVideo
        className="absolute inset-0"
        variant="screen"
        reactionKey={avatarReaction?.key ?? null}
        reactionId={avatarReaction?.id ?? null}
        reducedMotion={reducedMotion}
        ariaLabel="NEO persistent idle avatar"
        onReactionComplete={clearAvatarReaction}
      />
    </div>
  )
}
