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

/**
 * Avatar presentation variants. The avatar MP4s have *opaque, near-black*
 * backgrounds (sampled #010101–#070707) and a brighter reflective floor along
 * the bottom edge — they are NOT alpha video. `mix-blend-mode: screen` was
 * tried previously and is the wrong tool: the robot's own body is dark, so
 * screen-blend dissolves the robot itself, not just the background (this is
 * what made the Network circle show through to the page background).
 *
 * Instead every variant composites honestly:
 *   - `object-cover` so the robot fills the frame with no letterbox bars
 *   - tuned `object-position` + scale to frame the robot and crop the bright
 *     floor strip out of view
 *   - a broad edge feather that fades the clip into the dark app surface
 *     without creating an oval/circular portal silhouette
 *   - `overflow-hidden` + surface-specific framing so the reflective floor is
 *     cropped while avoiding any hard chrome ring around the robot
 * The near-black video background is screen-blended into the app surface so
 * the underlying screen texture remains visible instead of becoming a framed
 * black video block.
 */
export type AvatarVariant = "stage" | "screen" | "bare"

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
  * Compositing variant. `stage` = large main robot stage, `screen` = compact
  * avatar surfaces (Network avatar, persistent orb, badge, opponent icons),
  * `bare` = unmasked raw.
   */
  variant?: AvatarVariant
}

// Broad top/bottom feathering avoids both failure modes from the previous
// passes: no hard rectangular MP4 edge and no visible circular/oval frame.
const STAGE_EDGE_MASK =
  "linear-gradient(to bottom, rgba(0,0,0,0) 0%, #000 8%, #000 82%, rgba(0,0,0,0.58) 91%, rgba(0,0,0,0) 100%)"

const SCREEN_EDGE_MASK =
  "linear-gradient(to bottom, rgba(0,0,0,0) 0%, #000 12%, #000 78%, rgba(0,0,0,0.55) 90%, rgba(0,0,0,0) 100%)"

const ROBOT_SURFACE_CLIP =
  "polygon(21% 0%, 79% 0%, 94% 17%, 100% 56%, 88% 86%, 64% 100%, 36% 100%, 12% 86%, 0% 56%, 6% 17%)"

interface VariantConfig {
  wrapper: string
  wrapperStyle?: React.CSSProperties
  video: string
  videoStyle?: React.CSSProperties
}

const VARIANT_CONFIG: Record<AvatarVariant, VariantConfig> = {
  stage: {
    wrapper: "relative overflow-hidden bg-transparent",
    wrapperStyle: {
      clipPath: ROBOT_SURFACE_CLIP,
      maskImage: STAGE_EDGE_MASK,
      WebkitMaskImage: STAGE_EDGE_MASK,
    },
    video: "h-full w-full object-cover",
    // Bias the crop upward so the head keeps headroom and the bright reflective
    // floor at the bottom of the clip is pushed out of frame, while still
    // showing the robot down past the glowing chest core.
    videoStyle: { objectPosition: "50% 18%", transform: "scale(1.14)", mixBlendMode: "screen" },
  },
  screen: {
    wrapper: "relative overflow-hidden bg-transparent",
    wrapperStyle: {
      clipPath: ROBOT_SURFACE_CLIP,
      maskImage: SCREEN_EDGE_MASK,
      WebkitMaskImage: SCREEN_EDGE_MASK,
    },
    video: "h-full w-full object-cover",
    // Frame the head + glowing chest core so the robot fills the compact
    // avatar cutout edge-to-edge with no inner gap.
    videoStyle: { objectPosition: "50% 20%", transform: "scale(1.22)", mixBlendMode: "screen" },
  },
  bare: {
    wrapper: "",
    video: "h-full w-full object-contain",
  },
}

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
      variant = "bare",
    },
    ref,
  ) {
    const rootRef = useRef<HTMLDivElement | null>(null)
    const videoRef = useRef<HTMLVideoElement | null>(null)
    // If the component is mounted with a one-shot reaction already queued
    // (the common post-boot path: AppShell fires `playAvatarReaction("wakeup")`
    // before the avatar tree mounts), start the <video> element on that
    // reaction clip directly. Otherwise the first render mounts
    // `<video src=idle.mp4 preload>` — an 18 MB asset — only to throw it
    // away one effect tick later when the reaction takes over. Seeding the
    // initial key avoids that wasted preload entirely.
    const lastReactionRef = useRef<number | null>(
      reactionKey !== null && reactionId !== null ? reactionId : null,
    )
    const [currentKey, setCurrentKey] = useState<AvatarClipKey>(
      reactionKey !== null && reactionId !== null ? reactionKey : baseKey,
    )
    const [pageVisible, setPageVisible] = useState(true)
    const [onscreen, setOnscreen] = useState(true)
    const currentEntry = AVATAR_MEDIA[currentKey]
    const shouldPlay = active && pageVisible && onscreen && !reducedMotion
    const config = VARIANT_CONFIG[variant]

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
      //
      // The src detach is guarded by `isConnected`: React's StrictMode (dev)
      // and the AppShell screen-swap <AnimatePresence> both run effect cleanup
      // while the element is still mounted/connected. Stripping `src` then —
      // React won't re-apply it without a re-render — left the element source-
      // less (this is what made the Network avatar render an empty circle).
      // On a real unmount the node is already detached, so it's safe to strip.
      const mountedVideo = videoRef.current
      return () => {
        if (!mountedVideo) return
        mountedVideo.pause()
        if (!mountedVideo.isConnected) {
          mountedVideo.removeAttribute("src")
          mountedVideo.load()
        }
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
        className={`${className ?? ""} ${config.wrapper}`.trim()}
        style={config.wrapperStyle}
      >
        {variant === "stage" && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10"
            style={{
              // A vertical wash hides the clip's bright floor without drawing
              // a portal or circular frame around the avatar.
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.42) 84%, rgba(0,0,0,0.92) 100%)",
            }}
          />
        )}
        <video
          key={currentEntry.key}
          ref={videoRef}
          src={currentEntry.src}
          className={config.video}
          style={config.videoStyle}
          autoPlay
          muted
          playsInline
          loop={currentEntry.playback === "loop"}
          // Always `metadata`, never `auto`. The base idle clip is 18 MB —
          // an `auto` preload pulls the whole asset into the WebView's
          // memory the moment the element mounts, which competes with both
          // the boot intro decoder (during the cinematic handoff frame) and
          // the ambient background loop (immediately after). `metadata`
          // lets the demuxer prep the file and start streaming on play()
          // without the greedy whole-file fetch, and the visible playback
          // start is still effectively instant because we are autoplaying.
          preload="metadata"
          aria-label={ariaLabel}
          onEnded={returnToIdle}
          onError={returnToIdle}
        />
      </div>
    )
  },
)
