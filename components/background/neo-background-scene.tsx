"use client"

/* eslint-disable @next/next/no-img-element -- Native picture/img keeps these fixed public art assets unoptimized and exact. */
import { useCallback, useEffect, useRef, useState } from "react"
import type { BackgroundMode } from "@/lib/types"

const PORTRAIT_BACKGROUND = "/images/neo/backgrounds/neo-background-portrait.png"
const SQUARE_BACKGROUND = "/images/neo/backgrounds/neo-background-square.png"
const ANIMATED_BACKGROUND = "/media/neo/neo_backround.mp4"

interface NeoBackgroundSceneProps {
  mode?: BackgroundMode
}

export function NeoBackgroundScene({ mode = "auto" }: NeoBackgroundSceneProps) {
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
    if (videoDisabled || reducedMotion) return
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
  }, [videoDisabled, reducedMotion])

  const handleCanPlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = true
    video.play().then(() => setVideoReady(true)).catch(() => {
      // Autoplay was rejected — keep PNG fallback visible instead of an empty
      // black canvas. We do not disable the video element entirely so it can
      // still attempt to resume on the next visibility change.
      setVideoReady(false)
    })
  }, [])

  const handleError = useCallback(() => {
    setVideoReady(false)
    setVideoDisabled(true)
  }, [])

  const showVideo = !reducedMotion && !videoDisabled

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
          preload="auto"
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
          onPlaying={() => setVideoReady(true)}
          onError={handleError}
        />
      )}

      {/*
        Soft vertical scrim — keeps the status bar and bottom dock legible
        without dimming the focal NEO art in the middle of the frame.
      */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0.08) 22%, rgba(0,0,0,0.04) 60%, rgba(0,0,0,0.38) 100%)",
        }}
      />
    </div>
  )
}
