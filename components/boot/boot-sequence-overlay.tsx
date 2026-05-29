"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useCallback, useEffect, useRef, useState } from "react"
import { logBootEvent } from "@/lib/boot-instrumentation"

const BOOT_VIDEO_SRC = "/media/neo/boot/neo_boot_new.mp4"
const BOOT_POSTER_SRC = "/images/neo/backgrounds/neo-background-square.png"
// Outer hard ceiling. Reached only when the <video> never even emits
// `loadedmetadata` (e.g. asset missing, format rejected). The metadata
// failsafe below replaces this with a duration-derived bound as soon as
// the media starts to negotiate.
const BOOT_MAX_FAILSAFE_MS = 12000
const BOOT_REDUCED_MOTION_MS = 900
// If the video element emits no progress for this long after starting
// playback we treat it as stalled and exit so the user is never trapped
// behind a frozen frame.
const BOOT_STALL_THRESHOLD_MS = 6000

interface BootSequenceOverlayProps {
  onBootComplete?: () => void
  reducedMotion?: boolean
}

export function BootSequenceOverlay({
  onBootComplete,
  reducedMotion = false,
}: BootSequenceOverlayProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const completedRef = useRef(false)
  const failsafeRef = useRef<number | null>(null)
  const stallRef = useRef<number | null>(null)
  const exitFallbackRef = useRef<number | null>(null)
  const lastTimeRef = useRef(0)
  const [visible, setVisible] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)
  // Captured locally so we can fire it once the AnimatePresence exit settles —
  // the parent uses this signal to unmount the entire overlay, including the
  // <video> element, so no detached decoder lingers in memory.
  const completionStatusRef = useRef<"none" | "success" | "fail">("none")

  const handleExitComplete = useCallback(() => {
    if (exitFallbackRef.current !== null) {
      window.clearTimeout(exitFallbackRef.current)
      exitFallbackRef.current = null
    }
    if (completionStatusRef.current !== "none") {
      logBootEvent("boot_overlay_dismissed", {
        status: completionStatusRef.current,
      })
      onBootComplete?.()
    }
    completionStatusRef.current = "none"
  }, [onBootComplete])

  const finishBoot = useCallback((completedSuccessfully: boolean, reason = "complete") => {
    if (completedRef.current) return

    completedRef.current = true
    completionStatusRef.current = completedSuccessfully ? "success" : "fail"
    logBootEvent(reason === "failsafe" ? "failsafe" : "boot_finish", {
      reason,
      completedSuccessfully,
    })
    if (failsafeRef.current !== null) {
      window.clearTimeout(failsafeRef.current)
      failsafeRef.current = null
    }
    if (stallRef.current !== null) {
      window.clearInterval(stallRef.current)
      stallRef.current = null
    }
    if (exitFallbackRef.current !== null) {
      window.clearTimeout(exitFallbackRef.current)
      exitFallbackRef.current = null
    }
    const video = videoRef.current
    if (video) {
      // Detach source proactively so the decoder buffers release before
      // React unmounts the element after the fade-out completes.
      video.pause()
      video.removeAttribute("src")
      video.load()
    }
    setVisible(false)
    exitFallbackRef.current = window.setTimeout(() => {
      handleExitComplete()
    }, 700)
  }, [handleExitComplete])

  useEffect(() => {
    logBootEvent("BootSeq mounted", { reducedMotion })
    const updateVisibility = () => setPageVisible(!document.hidden)
    updateVisibility()
    document.addEventListener("visibilitychange", updateVisibility)
    failsafeRef.current = window.setTimeout(
      () => finishBoot(false, "failsafe"),
      reducedMotion ? BOOT_REDUCED_MOTION_MS : BOOT_MAX_FAILSAFE_MS,
    )
    return () => {
      document.removeEventListener("visibilitychange", updateVisibility)
      if (failsafeRef.current !== null) {
        window.clearTimeout(failsafeRef.current)
      }
      if (exitFallbackRef.current !== null) {
        window.clearTimeout(exitFallbackRef.current)
      }
    }
  }, [finishBoot, reducedMotion])

  useEffect(() => {
    if (!reducedMotion) return
    const timer = window.setTimeout(
      () => finishBoot(true, "reduced_motion_skip"),
      BOOT_REDUCED_MOTION_MS,
    )
    return () => window.clearTimeout(timer)
  }, [finishBoot, reducedMotion])

  const armFailsafe = useCallback(
    (video: HTMLVideoElement) => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return
      if (failsafeRef.current !== null) window.clearTimeout(failsafeRef.current)

      failsafeRef.current = window.setTimeout(() => {
        const nearEnd = video.currentTime >= video.duration - 0.35
        finishBoot(nearEnd, "duration_failsafe")
      }, video.duration * 1000 + 1500)
    },
    [finishBoot],
  )

  const startVideo = useCallback((video: HTMLVideoElement) => {
    if (reducedMotion) return
    video.controls = false
    video.muted = true
    logBootEvent("canplay", { source: BOOT_VIDEO_SRC })
    logBootEvent("play attempt", { source: BOOT_VIDEO_SRC })
    video.play().then(() => {
      logBootEvent("play success", { source: BOOT_VIDEO_SRC })
    }).catch((error: unknown) => {
      logBootEvent("play failure", {
        source: BOOT_VIDEO_SRC,
        error: error instanceof Error ? error.message : String(error),
      })
      finishBoot(false, "play_failure")
    })
  }, [finishBoot, reducedMotion])

  // Watch playback progress. If currentTime is not advancing while the
  // element is supposed to be playing, exit the overlay so a broken
  // decoder cannot trap the user behind a frozen frame.
  const armStallWatcher = useCallback(() => {
    if (stallRef.current !== null) window.clearInterval(stallRef.current)
    lastTimeRef.current = 0
    let stagnantFor = 0
    stallRef.current = window.setInterval(() => {
      const video = videoRef.current
      if (!video || completedRef.current) return
      if (video.paused || video.ended) return
      if (video.currentTime > lastTimeRef.current + 0.05) {
        lastTimeRef.current = video.currentTime
        stagnantFor = 0
        return
      }
      stagnantFor += 250
      if (stagnantFor >= BOOT_STALL_THRESHOLD_MS) {
        finishBoot(false, "stall")
      }
    }, 250)
  }, [finishBoot])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (reducedMotion) {
      video.pause()
      return
    }
    if (!pageVisible) {
      video.pause()
      return
    }

    if (!completedRef.current) {
      logBootEvent("play attempt", { source: BOOT_VIDEO_SRC, reason: "visibility_resume" })
      video.play().then(() => {
        logBootEvent("play success", { source: BOOT_VIDEO_SRC, reason: "visibility_resume" })
      }).catch((error: unknown) => {
        logBootEvent("play failure", {
          source: BOOT_VIDEO_SRC,
          reason: "visibility_resume",
          error: error instanceof Error ? error.message : String(error),
        })
        finishBoot(false, "play_failure")
      })
    }
  }, [finishBoot, pageVisible, reducedMotion])

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
          aria-hidden="true"
        >
          <style jsx>{`
            .boot-poster-frame {
              background:
                radial-gradient(circle at 50% 42%, rgba(0, 240, 255, 0.24), rgba(0, 0, 0, 0) 38%),
                linear-gradient(180deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.74)),
                url("${BOOT_POSTER_SRC}") center / cover no-repeat;
            }

            video.boot-sequence-video::-webkit-media-controls,
            video.boot-sequence-video::-webkit-media-controls-panel,
            video.boot-sequence-video::-webkit-media-controls-play-button,
            video.boot-sequence-video::-webkit-media-controls-start-playback-button {
              display: none !important;
              -webkit-appearance: none;
            }
          `}</style>
          <div className="boot-poster-frame absolute inset-0" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,240,255,0.14),rgba(0,0,0,0)_42%),linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,0,0,0.76))]" />
          <div className="pointer-events-none absolute inset-x-8 bottom-10 h-px bg-cyan-300/45 shadow-[0_0_22px_rgba(0,240,255,0.8)]" />
          <video
            ref={videoRef}
            className={`boot-sequence-video h-full w-full object-contain transition-opacity duration-150 ${
              isPlaying ? "opacity-100" : "opacity-0"
            }`}
            src={reducedMotion ? undefined : BOOT_VIDEO_SRC}
            poster={BOOT_POSTER_SRC}
            muted
            autoPlay={!reducedMotion}
            playsInline
            preload={reducedMotion ? "none" : "metadata"}
            controls={false}
            controlsList="nodownload nofullscreen noremoteplayback"
            disablePictureInPicture
            disableRemotePlayback
            loop={false}
            {...{
              "webkit-playsinline": "true",
              "x5-playsinline": "true",
              "x5-video-player-type": "h5-page",
            }}
            onLoadStart={() => logBootEvent("video loadstart", { source: BOOT_VIDEO_SRC })}
            onLoadedMetadata={(event) => armFailsafe(event.currentTarget)}
            onCanPlay={(event) => startVideo(event.currentTarget)}
            onCanPlayThrough={() => logBootEvent("canplaythrough", { source: BOOT_VIDEO_SRC })}
            onPlaying={() => {
              setIsPlaying(true)
              armStallWatcher()
            }}
            onStalled={() => armStallWatcher()}
            onEnded={() => {
              logBootEvent("ended", { source: BOOT_VIDEO_SRC })
              finishBoot(true, "ended")
            }}
            onError={() => finishBoot(false, "video_error")}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
