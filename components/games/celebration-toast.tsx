"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect } from "react"
import { Award, Flame, Trophy, Zap, X } from "lucide-react"
import { useApp } from "@/lib/store"
import type { Celebration } from "@/lib/game-progression"

const TYPE_STYLES: Record<Celebration["type"], { color: string; icon: React.ReactNode; bg: string }> = {
  achievement: { color: "#39ff14", icon: <Award className="h-4 w-4" />, bg: "rgba(57,255,20,0.18)" },
  daily:       { color: "#b829ff", icon: <Trophy className="h-4 w-4" />, bg: "rgba(184,41,255,0.2)" },
  best:        { color: "#00f0ff", icon: <Flame className="h-4 w-4" />, bg: "rgba(0,240,255,0.18)" },
  level:       { color: "#ff7a00", icon: <Zap className="h-4 w-4" />, bg: "rgba(255,122,0,0.18)" },
}

export function CelebrationToast() {
  const { pendingCelebrations, dismissCelebration, playAvatarReaction } = useApp()
  const head = pendingCelebrations[0]

  useEffect(() => {
    if (!head) return
    playAvatarReaction("ecstatic")
    const id = window.setTimeout(() => dismissCelebration(head.id), 5200)
    return () => window.clearTimeout(id)
  }, [head, dismissCelebration, playAvatarReaction])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-50 flex justify-center px-3">
      <AnimatePresence mode="wait">
        {head && (
          <motion.div
            key={head.id}
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="pointer-events-auto w-full max-w-sm"
          >
            <ToastCard celebration={head} onDismiss={() => dismissCelebration(head.id)} />
            {pendingCelebrations.length > 1 && (
              <p className="mt-1 text-center ps-mono text-[9px] tracking-[0.3em] text-white/55">
                +{pendingCelebrations.length - 1} MORE
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ToastCard({ celebration, onDismiss }: { celebration: Celebration; onDismiss: () => void }) {
  const style = TYPE_STYLES[celebration.type]
  return (
    <div
      className="relative overflow-hidden rounded-xl ps-glass-strong p-3"
      style={{ boxShadow: `inset 0 0 0 1px ${style.color}, 0 0 24px ${style.color}88` }}
    >
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ duration: 1.4, ease: "easeOut" }}
        className="pointer-events-none absolute inset-y-0 w-1/2"
        style={{
          background: `linear-gradient(90deg, transparent, ${style.color}33, transparent)`,
        }}
      />
      <div className="flex items-start gap-3">
        <div
          className="grid h-9 w-9 place-items-center rounded-lg shrink-0"
          style={{ background: style.bg, boxShadow: `inset 0 0 0 1px ${style.color}` , color: style.color }}
        >
          {style.icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="ps-mono text-[10px] tracking-[0.3em]" style={{ color: style.color, textShadow: `0 0 6px ${style.color}aa` }}>
            {celebration.title}
          </p>
          <p className="text-[12px] text-white/90 text-pretty leading-tight">{celebration.line}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="grid h-7 w-7 place-items-center rounded-md text-white/55 shrink-0"
          style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)" }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
