"use client"

import { motion } from "framer-motion"
import { useApp } from "@/lib/store"
import { MOOD_COLORS, MOOD_LABELS } from "@/lib/data"
import { NeoAvatarVideo } from "./avatar/neo-avatar-video"
import { useEffect, useRef, useState } from "react"

interface Props {
  onTapHead?: () => void
  onTapCore?: () => void
  onTapHand?: () => void
  size?: number
}

export function RobotStage({
  onTapHead,
  onTapCore,
  onTapHand,
  size = 320,
}: Props) {
  const { mood, settings, capabilityPlatform, avatarReaction, clearAvatarReaction } = useApp()
  const moodColor = MOOD_COLORS[mood]
  const [pressed, setPressed] = useState<string | null>(null)
  const [visible, setVisible] = useState(true)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const intensity = Math.max(0, Math.min(1, settings.animationIntensity / 100))
  const reducedMotion =
    settings.reducedMotion || prefersReducedMotion || intensity <= 0.05
  const shouldAnimate = visible && !reducedMotion
  const isAndroid = capabilityPlatform === "android"
  const motionScale = shouldAnimate ? intensity : 0
  const glowAlpha = 0.25 + intensity * 0.45

  const idleY =
    mood === "idle" || mood === "listening"
      ? [0, -6 * motionScale, 0]
      : mood === "speaking" || mood === "playful"
        ? [0, -4 * motionScale, 2 * motionScale, -4 * motionScale, 0]
      : [0, -5 * motionScale, 0]

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)")
    if (!media) return
    const update = () => setPrefersReducedMotion(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    const node = rootRef.current
    if (!node || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
      { threshold: 0.12 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const update = () => setVisible(!document.hidden)
    document.addEventListener("visibilitychange", update)
    return () => document.removeEventListener("visibilitychange", update)
  }, [])

  return (
    <div
      ref={rootRef}
      className="relative mx-auto flex items-end justify-center"
      style={{ width: size, height: size }}
    >
      {/* Outer glow halo */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full opacity-70 blur-2xl"
        style={{
          background: `radial-gradient(circle, ${moodColor}55 0%, transparent 65%)`,
          opacity: glowAlpha,
        }}
      />

      {/* Reactor pedestal — concentric rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* slow rotating outer dashed ring */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: size * 0.96,
            height: size * 0.96,
            border: `1px dashed ${moodColor}88`,
            boxShadow: `0 0 30px ${moodColor}44, inset 0 0 30px ${moodColor}22`,
          }}
          animate={shouldAnimate ? { rotate: 360 } : { rotate: 0 }}
          transition={{
            duration: isAndroid ? 34 - intensity * 8 : 30 - intensity * 8,
            ease: "linear",
            repeat: shouldAnimate ? Infinity : 0,
          }}
        />
        {/* counter ring */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: size * 0.78,
            height: size * 0.78,
            border: `1px solid ${moodColor}44`,
            boxShadow: `inset 0 0 24px ${moodColor}33`,
          }}
          animate={shouldAnimate ? { rotate: -360 } : { rotate: 0 }}
          transition={{
            duration: isAndroid ? 48 - intensity * 10 : 42 - intensity * 8,
            ease: "linear",
            repeat: shouldAnimate ? Infinity : 0,
          }}
        />
        {/* tick ring with marks */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: size * 0.88,
            height: size * 0.88,
          }}
          animate={shouldAnimate ? { rotate: 360 } : { rotate: 0 }}
          transition={{
            duration: isAndroid ? 78 - intensity * 12 : 66 - intensity * 10,
            ease: "linear",
            repeat: shouldAnimate ? Infinity : 0,
          }}
        >
          {Array.from({ length: 36 }).map((_, i) => (
            <span
              key={i}
              className="absolute left-1/2 top-0 -translate-x-1/2"
              style={{
                width: 2,
                height: i % 3 === 0 ? 10 : 5,
                background: moodColor,
                opacity: i % 3 === 0 ? 0.8 : 0.35,
                transform: `translate(-50%, 0) rotate(${i * 10}deg) translateY(-${size * 0.44 - 10}px)`,
                transformOrigin: "50% 50%",
                boxShadow: `0 0 6px ${moodColor}`,
              }}
            />
          ))}
        </motion.div>

        {/* Pedestal disc */}
        <div
          className="absolute bottom-2 rounded-full"
          style={{
            width: size * 0.78,
            height: size * 0.18,
            background:
              "radial-gradient(ellipse at center, rgba(255,255,255,0.06), rgba(0,0,0,0) 70%)",
            filter: "blur(6px)",
          }}
        />
        <div
          className="absolute bottom-3 rounded-full"
          style={{
            width: size * 0.5,
            height: size * 0.06,
            background: `radial-gradient(ellipse at center, ${moodColor}aa, transparent 70%)`,
            filter: "blur(3px)",
          }}
        />
      </div>

      {/* Floating robot */}
      <motion.div
        className="relative"
        style={{ width: size * 0.78, height: size * 0.92 }}
        animate={shouldAnimate ? { y: idleY } : { y: 0 }}
        transition={{
          duration: 5.4 - intensity,
          repeat: shouldAnimate ? Infinity : 0,
          ease: "easeInOut",
        }}
      >
        {/*
          Reactor portal backing — a deep dark oval that sits behind the
          avatar video. The avatar itself (variant="stage") is `object-cover`
          with a feathered edge mask, so its near-black background dissolves
          into this chamber instead of reading as a pasted-on black rectangle.
          The tint picks up the current mood color very subtly so it ties
          into the rings.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[103%] w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-[48%]"
          style={{
            background: `radial-gradient(ellipse 50% 62% at 50% 42%, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.96) 45%, ${moodColor}24 62%, rgba(0,0,0,0.72) 78%, rgba(0,0,0,0) 100%)`,
            boxShadow: `inset 0 0 ${size * 0.12}px rgba(0,0,0,0.92), inset 0 0 ${size * 0.08}px ${moodColor}26, 0 0 ${size * 0.13}px ${moodColor}24`,
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[49%] h-[94%] w-[77%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
          style={{
            border: `1px solid ${moodColor}44`,
            background: `radial-gradient(ellipse 60% 82% at 50% 48%, rgba(0,0,0,0) 52%, ${moodColor}18 74%, rgba(0,0,0,0.66) 100%)`,
            filter: "blur(0.2px)",
          }}
        />
        <NeoAvatarVideo
          className="pointer-events-none relative h-full w-full select-none"
          reactionKey={avatarReaction?.key ?? null}
          reactionId={avatarReaction?.id ?? null}
          reducedMotion={reducedMotion}
          active={visible}
          ariaLabel="NEO the Nerd robot companion"
          onReactionComplete={clearAvatarReaction}
          variant="stage"
        />

        {/* Tap zones — overlay invisible buttons over head/core/hand */}
        <button
          type="button"
          aria-label="Tap robot head — open mood and personality panel"
          onPointerDown={() => setPressed("head")}
          onPointerUp={() => setPressed(null)}
          onPointerLeave={() => setPressed(null)}
          onClick={onTapHead}
          className="absolute left-1/2 top-[2%] h-[36%] w-[58%] -translate-x-1/2 rounded-full"
          style={{
            background:
              pressed === "head"
                ? `radial-gradient(circle, ${moodColor}33, transparent 70%)`
                : "transparent",
          }}
        />
        <button
          type="button"
          aria-label="Tap robot chest core — trigger greeting"
          onPointerDown={() => setPressed("core")}
          onPointerUp={() => setPressed(null)}
          onPointerLeave={() => setPressed(null)}
          onClick={onTapCore}
          className="absolute left-1/2 top-[44%] h-[30%] w-[44%] -translate-x-1/2 rounded-full"
          style={{
            background:
              pressed === "core"
                ? `radial-gradient(circle, ${moodColor}55, transparent 70%)`
                : "transparent",
          }}
        />
        <button
          type="button"
          aria-label="Tap robot hand — open quick actions"
          onPointerDown={() => setPressed("hand")}
          onPointerUp={() => setPressed(null)}
          onPointerLeave={() => setPressed(null)}
          onClick={onTapHand}
          className="absolute left-[2%] top-[58%] h-[30%] w-[28%] rounded-full"
          style={{
            background:
              pressed === "hand"
                ? `radial-gradient(circle, ${moodColor}55, transparent 70%)`
                : "transparent",
          }}
        />
      </motion.div>

      {/* Mood badge bottom */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
        <div
          className="flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-3 py-1 ps-glass"
          style={{
            boxShadow: `0 0 0 1px ${moodColor}55, 0 0 18px ${moodColor}55`,
          }}
        >
          <span
            className={`h-2 w-2 rounded-full ${shouldAnimate ? "animate-ps-pulse-ring" : ""}`}
            style={{
              background: moodColor,
              boxShadow: `0 0 8px ${moodColor}`,
            }}
          />
          <span
            className="ps-mono text-[10px] tracking-[0.3em]"
            style={{ color: moodColor }}
          >
            {MOOD_LABELS[mood].toUpperCase()}
          </span>
        </div>
      </div>

      {/* Status LEDs around stage */}
      <div className="absolute inset-x-6 bottom-7 flex items-center justify-between">
        <span className={`h-1.5 w-1.5 rounded-full bg-[#39ff14] ${shouldAnimate ? "animate-ps-pulse-ring" : ""}`} style={{ boxShadow: "0 0 8px #39ff14" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-[#ff7a00]" style={{ boxShadow: "0 0 8px #ff7a00" }} />
        <span className={`h-1.5 w-1.5 rounded-full bg-[#00f0ff] ${shouldAnimate ? "animate-ps-pulse-ring" : ""}`} style={{ boxShadow: "0 0 8px #00f0ff" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-[#b829ff]" style={{ boxShadow: "0 0 8px #b829ff" }} />
      </div>
    </div>
  )
}
