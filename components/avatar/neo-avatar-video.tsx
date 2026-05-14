"use client"

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import {
  AVATAR_MEDIA,
  type AvatarClipKey,
} from "@/lib/avatar-media"

export interface NeoAvatarVideoHandle {
  playReaction: (key: Exclude<AvatarClipKey, "idle">) => void
}

interface NeoAvatarVideoProps {
  className?: string
  baseKey?: Extract<AvatarClipKey, "idle">
  reactionKey?: Exclude<AvatarClipKey, "idle"> | null
  reactionId?: number | null
  reducedMotion?: boolean
  active?: boolean
  ariaLabel?: string
  onReactionComplete?: () => void
  /**
   * When true, render the inner <video> with `mix-blend-mode: screen` and a
   * radial mask. This dissolves the MP4's opaque black background so the clip
   * integrates into a stage instead of reading as a square video box.
   * Off by default — circle-cropped surfaces (orb) don't need it.
   */
  portalMode?: boolean
}

const PORTAL_MASK =
  "radial-gradient(ellipse 58% 74% at 50% 49%, rgba(0,0,0,1) 48%, rgba(0,0,0,0.92) 64%, rgba(0,0,0,0.36) 84%, rgba(0,0,0,0) 100%)"

export const NeoAvatarVideo = forwardRef<NeoAvatarVideoHandle, NeoAvatarVideoProps>(
  function NeoAvatarVideo(
    {
      className,
      baseKey = "idle",
      reactionKey = null,
      reactionId = null,
      reducedMotion = false,
      active = true,
      ariaLabel = "NEO the Nerd avatar",
      onReactionComplete,
      portalMode = false,
    },
    ref,
  ) {
    const rootRef = useRef<HTMLDivElement | null>(null)
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const lastReactionRef = useRef<number | null>(null)
    const [currentKey, setCurrentKey] = useState<AvatarClipKey>(baseKey)
    const [pageVisible, setPageVisible] = useState(true)
    const [onscreen, setOnscreen] = useState(true)
    const currentEntry = AVATAR_MEDIA[currentKey]
    const shouldPlay = active && pageVisible && onscreen && !reducedMotion

    const playReaction = useCallback(
      (key: Exclude<AvatarClipKey, "idle">) => {
        const next = AVATAR_MEDIA[key]
        const current = AVATAR_MEDIA[currentKey]

        if (current.state === "reaction" && next.priority < current.priority) return

        setCurrentKey(key)
      },
      [currentKey],
    )

    useImperativeHandle(ref, () => ({ playReaction }), [playReaction])

    useEffect(() => {
      if (!reactionKey || reactionId === null || reactionId === lastReactionRef.current) return
      lastReactionRef.current = reactionId
      playReaction(reactionKey)
    }, [playReaction, reactionId, reactionKey])

    useEffect(() => {
      const update = () => setPageVisible(!document.hidden)
      update()
      document.addEventListener("visibilitychange", update)
      return () => document.removeEventListener("visibilitychange", update)
    }, [])

    useEffect(() => {
      const node = rootRef.current
      if (!node || typeof IntersectionObserver === "undefined") return

      const observer = new IntersectionObserver(
        ([entry]) => setOnscreen(Boolean(entry?.isIntersecting)),
        { threshold: 0.05 },
      )
      observer.observe(node)
      return () => observer.disconnect()
    }, [])

    useEffect(() => {
      // Drive playback strictly from `shouldPlay`. This effect re-runs when the
      // source key changes (one-shot reaction swap) or when the tab/screen/orb
      // visibility flips. play() is idempotent; pause() releases the decoder
      // cycles for hidden or offscreen instances so no invisible clip is
      // chewing CPU/GPU in the background.
      const video = videoRef.current
      if (!video) return

      if (shouldPlay) {
        video.play().catch(() => {})
      } else {
        video.pause()
      }
    }, [currentEntry.src, shouldPlay])

    useEffect(() => {
      // Final unmount safety: detach the source so the underlying media
      // element does not hold a decoded buffer pinned after React removes it.
      const mountedVideo = videoRef.current
      return () => {
        if (!mountedVideo) return
        mountedVideo.pause()
        mountedVideo.removeAttribute("src")
        mountedVideo.load()
      }
    }, [])

    const returnToIdle = useCallback(() => {
      // Reaction clips are one-shot — when `onEnded` fires (or the element
      // errors out) we revert to the base loop. The `key` on <video> changes
      // with `currentKey`, so React mounts a fresh element for the idle clip;
      // the previous reaction element is unmounted and garbage-collected,
      // preventing any duplicate `ended`/`error` listener from lingering.
      if (currentEntry.playback === "one-shot") {
        setCurrentKey(baseKey)
        onReactionComplete?.()
      }
    }, [baseKey, currentEntry.playback, onReactionComplete])

    return (
      <div
        ref={rootRef}
        className={`${className ?? ""}${
          portalMode
            ? " relative isolate overflow-hidden rounded-[48%_48%_44%_44%/40%_40%_62%_62%]"
            : ""
        }`}
        style={
          portalMode
            ? {
                // Apply the feather to the presentation window itself, not
                // only to the <video>. Android WebView can be inconsistent
                // with video-element masks; masking/clipping the wrapper plus
                // a stage-colored edge wash guarantees the rectangular MP4
                // corners do not survive as a visible black box.
                maskImage: PORTAL_MASK,
                WebkitMaskImage: PORTAL_MASK,
              }
            : undefined
        }
      >
        {portalMode && (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0 rounded-[48%_48%_44%_44%/40%_40%_62%_62%]"
              style={{
                background:
                  "radial-gradient(ellipse 70% 82% at 50% 52%, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.88) 54%, rgba(0,0,0,0.20) 82%, rgba(0,0,0,0) 100%)",
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-20 rounded-[48%_48%_44%_44%/40%_40%_62%_62%]"
              style={{
                background:
                  "radial-gradient(ellipse 66% 80% at 50% 52%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.30) 76%, rgba(0,0,0,0.88) 100%)",
              }}
            />
          </>
        )}
        <video
          key={currentEntry.key}
          ref={videoRef}
          src={currentEntry.src}
          className={`${portalMode ? "relative z-10 h-full w-full object-contain mix-blend-screen contrast-110 saturate-110" : "h-full w-full object-contain"}`}
          style={
            portalMode
              ? {
                  transform: "scale(1.03)",
                }
              : undefined
          }
          autoPlay
          muted
          playsInline
          loop={currentEntry.playback === "loop"}
          preload={currentEntry.state === "base" ? "auto" : "metadata"}
          aria-label={ariaLabel}
          onEnded={returnToIdle}
          onError={returnToIdle}
        />
      </div>
    )
  },
)
