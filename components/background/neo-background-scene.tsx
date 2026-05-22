"use client"

/* eslint-disable @next/next/no-img-element -- Native picture/img keeps these fixed public art assets unoptimized and exact. */
import { useCallback, useEffect, useRef, useState } from "react"
import type { BackgroundMode } from "@/lib/types"

const PORTRAIT_BACKGROUND = "/images/neo/backgrounds/neo-background-portrait.png"
const SQUARE_BACKGROUND = "/images/neo/backgrounds/neo-background-square.png"
const ANIMATED_BACKGROUND = "/media/neo/neo_backround.mp4"

interface NeoBackgroundSceneProps {
  mode?: BackgroundMode
  /**
   * Controls whether the animated background `<video>` element is allowed to
   * mount. The boot overlay sets this to `false` for the duration of the
   * cinematic intro so the background decoder does not fight the boot video
   * for memory/decoder slots on Android WebView. The static PNG poster is
   * always rendered behind both states, so gating the video here does not
   * change the visual identity — the background simply fades in cleanly
   * once the boot sequence has exited.
   */
  videoEnabled?: boolean
  /**
   * Fires once when the background `<video>` actually starts playing back its
   * first frame. AppShell uses this to stagger the avatar orb mount so the
   * bg decoder owns the WebView's H.264 slots on cold start and the orb's
   * idle.mp4 doesn't compete for them on the same frame.
   */
  onReady?: () => void
}

export function NeoBackgroundScene({ mode = "auto", videoEnabled = true, onReady }: NeoBackgroundSceneProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  // `videoReady` flips true once the MP4 is actually playing, which fades it
  // in over the static PNG fallback. If autoplay fails or the file errors out
  // we leave it false and the PNG remains visible.
  const [videoReady, setVideoReady] = useState(false)
  const [videoDisabled, setVideoDisabled] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = () => setReducedMotion(media.matches)
    apply()
    media.addEventListener?.("change", apply)
    return () => media.removeEventListener?.("change", apply)
  }, [])

  // Pause/resume with tab visibility so a hidden tab does not keep decoding
  // frames. The play() call is wrapped because some browsers reject promises
  // when the document just unhid; failures fall back to the PNG quietly.
  useEffect(() => {
    if (videoDisabled || reducedMotion || !videoEnabled) return
    const handleVisibility = () => {
      const video = videoRef.current
      if (!video) return
      if (document.hidden) {
        video.pause()
      } else {
        video.play().catch(() => undefined)
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [videoDisabled, reducedMotion, videoEnabled])

  // When the video is gated off (boot in progress), make sure any leftover
  // playback state is reset so the next mount starts clean.
  useEffect(() => {
    if (!videoEnabled) {
      setVideoReady(false)
    }
  }, [videoEnabled])

  const readyEmittedRef = useRef(false)
  const emitReadyOnce = useCallback(() => {
    if (readyEmittedRef.current) return
    readyEmittedRef.current = true
    onReady?.()
  }, [onReady])

  const handleCanPlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = true
    video.play().then(() => {
      setVideoReady(true)
      emitReadyOnce()
    }).catch(() => {
      // Autoplay was rejected — keep PNG fallback visible instead of an empty
      // black canvas. We do not disable the video element entirely so it can
      // still attempt to resume on the next visibility change.
      setVideoReady(false)
    })
  }, [emitReadyOnce])

  const handleError = useCallback(() => {
    setVideoReady(false)
    setVideoDisabled(true)
  }, [])

  const showVideo = !reducedMotion && !videoDisabled && videoEnabled

  // When the video path is suppressed entirely (reduced-motion, decode error,
  // or the bg gate hasn't lifted yet — but here we've been asked to render,
  // i.e. videoEnabled is true), the bg "ready" signal should fire on the next
  // tick so downstream consumers (e.g. the persistent avatar orb mount gate
  // in AppShell) don't wait forever for an onPlaying that will never come.
  useEffect(() => {
    if (videoEnabled && !showVideo) {
      const t = window.setTimeout(emitReadyOnce, 0)
      return () => window.clearTimeout(t)
    }
  }, [videoEnabled, showVideo, emitReadyOnce])

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black" aria-hidden="true">
      {/* Static PNG art always rendered as the bottom layer so it shows
          through during the video fade-in and is the natural fallback when
          reduced motion, autoplay failure, or a load error blocks the MP4. */}
      {mode === "auto" ? (
        <picture className="absolute inset-0 block h-full w-full">
          <source media="(min-aspect-ratio: 1/1)" srcSet={SQUARE_BACKGROUND} />
          <img
            src={PORTRAIT_BACKGROUND}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
        </picture>
      ) : (
        <img
          src={mode === "square" ? SQUARE_BACKGROUND : PORTRAIT_BACKGROUND}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      )}

      {showVideo && (
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            videoReady ? "opacity-100" : "opacity-0"
          }`}
          src={ANIMATED_BACKGROUND}
          muted
          autoPlay
          loop
          playsInline
          // `metadata` lets Android WebView prepare the demuxer without
          // pulling the full asset across the wire alongside the boot
          // decoder. We then start playback explicitly in onCanPlay.
          preload="metadata"
          controls={false}
          controlsList="nodownload nofullscreen noremoteplayback"
          disablePictureInPicture
          disableRemotePlayback
          {...{
            "webkit-playsinline": "true",
            "x5-playsinline": "true",
            "x5-video-player-type": "h5-page",
          }}
          onCanPlay={handleCanPlay}
          onPlaying={() => { setVideoReady(true); emitReadyOnce() }}
          onError={handleError}
        />
      )}

      {/*
        Readability stack. The background art is intentionally vivid, so we
        layer two compositing fields on top of it before any UI mounts:

        1. A heavier vertical scrim that keeps a usable contrast floor across
           the whole frame. The previous gradient dipped to ~0.04 alpha in
           the middle band — exactly where content sits — and let the bright
           portions of the animated background bleed straight into headings
           and telemetry. The new stop pattern keeps the same shape but
           raises the minimum to ~0.40, so the NEO art is still clearly
           recognizable while text and HUD cards regain separation.

        2. A subtle centered radial vignette dimming the focal hot spot a
           little further. This keeps the background "alive" near the edges
           and lets the middle of the canvas — where headlines, key numbers,
           and dock chips live — sit on a darker substrate without flattening
           the look into a generic dashboard.
      */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.42) 22%, rgba(0,0,0,0.40) 60%, rgba(0,0,0,0.66) 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 45%, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.18) 35%, rgba(0,0,0,0) 75%)",
        }}
      />
    </div>
  )
}
