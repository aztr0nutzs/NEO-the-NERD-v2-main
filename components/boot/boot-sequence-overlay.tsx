"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useCallback, useEffect, useRef, useState } from "react"

const BOOT_VIDEO_SRC = "/media/neo/boot/neo_boot_new.mp4"
const BOOT_MAX_FAILSAFE_MS = 35000

interface BootSequenceOverlayProps {
  onBootComplete?: () => void
}

export function BootSequenceOverlay({ onBootComplete }: BootSequenceOverlayProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const completedRef = useRef(false)
  const failsafeRef = useRef<number | null>(null)
  const [visible, setVisible] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)
  // Captured locally so we can fire it once the AnimatePresence exit settles —
  // the parent uses this signal to unmount the entire overlay, including the
  // <video> element, so no detached decoder lingers in memory.
  const completionStatusRef = useRef<"none" | "success" | "fail">("none")

  const finishBoot = useCallback((completedSuccessfully: boolean) => {
    if (completedRef.current) return

    completedRef.current = true
    completionStatusRef.current = completedSuccessfully ? "success" : "fail"
    if (failsafeRef.current !== null) {
      window.clearTimeout(failsafeRef.current)
      failsafeRef.current = null
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
  }, [])

  const handleExitComplete = useCallback(() => {
    if (completionStatusRef.current !== "none") {
      onBootComplete?.()
    }
    completionStatusRef.current = "none"
  }, [onBootComplete])

  useEffect(() => {
    const updateVisibility = () => setPageVisible(!document.hidden)
    updateVisibility()
    document.addEventListener("visibilitychange", updateVisibility)
    failsafeRef.current = window.setTimeout(() => finishBoot(false), BOOT_MAX_FAILSAFE_MS)
    return () => {
      document.removeEventListener("visibilitychange", updateVisibility)
      if (failsafeRef.current !== null) {
        window.clearTimeout(failsafeRef.current)
      }
    }
  }, [finishBoot])

  const armFailsafe = useCallback(
    (video: HTMLVideoElement) => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return
      if (failsafeRef.current !== null) window.clearTimeout(failsafeRef.current)

      failsafeRef.current = window.setTimeout(() => {
        const nearEnd = video.currentTime >= video.duration - 0.35
        finishBoot(nearEnd)
      }, video.duration * 1000 + 1500)
    },
    [finishBoot],
  )

  const startVideo = useCallback((video: HTMLVideoElement) => {
    video.controls = false
    video.muted = true
    video.play().catch(() => finishBoot(false))
  }, [finishBoot])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (!pageVisible) {
      video.pause()
      return
    }

    if (!completedRef.current) {
      video.play().catch(() => finishBoot(false))
    }
  }, [finishBoot, pageVisible])

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
          aria-hidden="true"
        >
          <style jsx>{`
            video.boot-sequence-video::-webkit-media-controls,
            video.boot-sequence-video::-webkit-media-controls-panel,
            video.boot-sequence-video::-webkit-media-controls-play-button,
            video.boot-sequence-video::-webkit-media-controls-start-playback-button {
              display: none !important;
              -webkit-appearance: none;
            }
          `}</style>
          <video
            ref={videoRef}
            className={`boot-sequence-video h-full w-full object-contain transition-opacity duration-150 ${
              isPlaying ? "opacity-100" : "opacity-0"
            }`}
            src={BOOT_VIDEO_SRC}
            muted
            autoPlay
            playsInline
            preload="auto"
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
            onLoadedMetadata={(event) => armFailsafe(event.currentTarget)}
            onCanPlay={(event) => startVideo(event.currentTarget)}
            onPlaying={() => setIsPlaying(true)}
            onEnded={() => finishBoot(true)}
            onError={() => finishBoot(false)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
