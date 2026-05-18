"use client"

import { motion } from "framer-motion"
import {
  AlertTriangle,
  ChevronRight,
  Hammer,
  Loader2,
  Library as LibraryIcon,
  MessageSquareWarning,
  Pause,
  Play,
  Timer as TimerIcon,
  Wand2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useMemo } from "react"
import { useApp } from "@/lib/store"
import { NeonPanel } from "../neon-panel"
import {
  PRANKSTAR_CATALOG_DIAGNOSTICS,
  PRANKSTAR_SOUNDS,
  getFeaturedPreviewSounds,
} from "@/lib/prankstar/soundCatalog"
import { prankAudioRuntime } from "@/lib/prankstar/prankAudioRuntime"
import { usePrankAudio } from "@/lib/prankstar/usePrankAudio"
import type { PrankSound } from "@/lib/prankstar/types"

export function PrankScreen() {
  const { setScreen, recordPrankSoundPlay } = useApp()
  const audio = usePrankAudio()
  const featured = useMemo(() => getFeaturedPreviewSounds(8), [])
  const totalPlayable = PRANKSTAR_SOUNDS.length
  const totalDeferred = PRANKSTAR_CATALOG_DIAGNOSTICS.totalDeferred

  const onPlay = (sound: PrankSound) => {
    if (audio.currentSoundId === sound.id && audio.status === "playing") {
      prankAudioRuntime.stop()
      return
    }
    void prankAudioRuntime.play(sound)
    recordPrankSoundPlay(sound.id)
  }

  return (
    <div className="space-y-4">
      <header className="px-1 pt-1">
        <p className="ps-mono text-[10px] tracking-[0.4em] text-white/50">
          NEO // PRANK_LAB_01
        </p>
        <h1 className="ps-heading text-3xl leading-[1.05]">
          <span className="ps-text-pink">PRANKSTAR</span>{" "}
          <span className="text-white/90">PROTOCOL</span>
        </h1>
        <p className="mt-1 ps-mono text-[10px] tracking-widest text-white/50">
          MISCHIEF AUDIO // TIMED TRAPS // SOUND FORGE
        </p>
      </header>

      <NeonPanel accent="pink" glow="strong" scanlines className="p-4">
        <p className="ps-mono text-[10px] tracking-[0.3em] ps-text-pink">
          BRIEFING
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/85">
          Prankstar Protocol is NEO&apos;s mischief subsystem — curated prank
          audio, generated mischief messages, and future timed traps.
          The Sound Library and Prank Messages modules are live; further
          modules arrive in upcoming phases.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="PLAYABLE" value={String(totalPlayable)} accent="#ff2d9c" />
          <Stat
            label="PREVIEW"
            value={String(featured.length)}
            accent="#00f0ff"
          />
          <Stat
            label="MODULES"
            value="02"
            accent="#39ff14"
          />
        </div>
        {totalDeferred > 0 && (
          <p className="mt-2 ps-mono text-[9px] tracking-[0.22em] text-white/40">
            +{totalDeferred} CATALOG ENTRIES DEFERRED · ASSETS PENDING
          </p>
        )}
      </NeonPanel>

      <div className="grid grid-cols-2 gap-2">
        <ModuleCard
          icon={LibraryIcon}
          label="Sound Library"
          status="LIVE"
          accent="#00f0ff"
          onClick={() => setScreen("prankLibrary")}
        />
        <ModuleCard
          icon={MessageSquareWarning}
          label="Prank Messages"
          status="LIVE"
          accent="#b829ff"
          onClick={() => setScreen("prankMessages")}
        />
        <ModuleCard
          icon={TimerIcon}
          label="Timer Traps"
          status="NEXT_PHASE"
          accent="#ff7a00"
        />
        <ModuleCard
          icon={Hammer}
          label="Sound Forge"
          status="NEXT_PHASE"
          accent="#39ff14"
        />
      </div>

      <NeonPanel accent="cyan" glow="strong" className="p-4">
        <div className="flex items-center justify-between">
          <p className="ps-mono text-[10px] tracking-[0.3em] ps-text-cyan">
            SOUND_LIBRARY // FEATURED
          </p>
          <button
            type="button"
            onClick={() => prankAudioRuntime.stop()}
            disabled={audio.status === "idle"}
            className="ps-mono text-[10px] tracking-[0.25em] text-white/70 disabled:text-white/25"
          >
            STOP_ALL
          </button>
        </div>

        {audio.status === "error" && audio.error && (
          <div
            className="mt-3 flex items-start gap-2 rounded-lg border border-[#ff7a00]/50 bg-[#ff7a00]/10 p-2.5"
            role="alert"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 ps-text-orange" />
            <p className="ps-mono text-[10px] leading-tight tracking-[0.12em] text-white/80">
              {audio.error}
            </p>
          </div>
        )}

        <ul className="mt-3 space-y-2">
          {featured.map((sound) => {
            const isActive = audio.currentSoundId === sound.id
            const isPlaying = isActive && audio.status === "playing"
            const isLoading = isActive && audio.status === "loading"
            const isError = isActive && audio.status === "error"
            return (
              <li key={sound.id}>
                <button
                  type="button"
                  onClick={() => onPlay(sound)}
                  className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-black/45 p-3 text-left transition-colors hover:border-[#00f0ff]/40"
                  aria-pressed={isPlaying}
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                    style={{
                      background: isError
                        ? "rgba(255,122,0,0.15)"
                        : "rgba(0,240,255,0.15)",
                      boxShadow: isError
                        ? "inset 0 0 0 1px rgba(255,122,0,0.6)"
                        : "inset 0 0 0 1px rgba(0,240,255,0.6)",
                    }}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin ps-text-cyan" />
                    ) : isError ? (
                      <AlertTriangle className="h-4 w-4 ps-text-orange" />
                    ) : isPlaying ? (
                      <Pause className="h-4 w-4 ps-text-cyan" />
                    ) : (
                      <Play className="h-4 w-4 ps-text-cyan" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white/90">
                      {sound.name}
                    </p>
                    <p className="ps-mono text-[9px] tracking-[0.22em] text-white/45">
                      {sound.category} ·{" "}
                      {sound.durationMs > 0
                        ? `${(sound.durationMs / 1000).toFixed(1)}s`
                        : "—"}
                    </p>
                  </div>
                  {isPlaying && (
                    <motion.span
                      className="h-1.5 w-1.5 rounded-full bg-[#00f0ff]"
                      style={{ boxShadow: "0 0 8px #00f0ff" }}
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        <button
          type="button"
          onClick={() => setScreen("prankLibrary")}
          className="mt-3 flex w-full items-center justify-between rounded-lg border border-[#00f0ff]/40 bg-[#00f0ff]/10 px-3 py-2.5 ps-mono text-[10px] tracking-[0.22em] ps-text-cyan hover:bg-[#00f0ff]/20"
        >
          OPEN_FULL_LIBRARY · {totalPlayable} SOUNDS
          <ChevronRight className="h-4 w-4" />
        </button>
      </NeonPanel>

      {PRANKSTAR_CATALOG_DIAGNOSTICS.duplicateIds.length > 0 && (
        <NeonPanel accent="orange" glow="soft" className="p-3">
          <p className="ps-mono text-[10px] tracking-[0.25em] ps-text-orange">
            CATALOG_WARNINGS
          </p>
          <p className="mt-1 ps-mono text-[10px] text-white/70">
            {PRANKSTAR_CATALOG_DIAGNOSTICS.duplicateIds.length} duplicate IDs
            dropped during import.
          </p>
        </NeonPanel>
      )}

      <NeonPanel accent="purple" glow="soft" className="p-3">
        <div className="flex items-center gap-2 ps-mono text-[10px] tracking-[0.25em] text-white/70">
          <Wand2 className="h-3.5 w-3.5 ps-text-purple" />
          <span>NEXT PHASE: FULL LIBRARY · TRAPS · FORGE</span>
        </div>
      </NeonPanel>
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent: string
}) {
  return (
    <div
      className="rounded-md border border-white/5 bg-black/50 px-2 py-1.5"
      style={{ boxShadow: `inset 0 0 0 1px ${accent}33` }}
    >
      <p className="ps-mono text-[9px] tracking-[0.25em] text-white/50">
        {label}
      </p>
      <p
        className="ps-mono text-[14px] tracking-widest font-semibold"
        style={{ color: accent, textShadow: `0 0 8px ${accent}` }}
      >
        {value}
      </p>
    </div>
  )
}

function ModuleCard({
  icon: Icon,
  label,
  status,
  accent,
  onClick,
}: {
  icon: LucideIcon
  label: string
  status: "LIVE" | "NEXT_PHASE"
  accent: string
  onClick?: () => void
}) {
  const live = status === "LIVE"
  const interactive = live && onClick
  const Tag = interactive ? "button" : "div"
  return (
    <Tag
      {...(interactive
        ? { type: "button" as const, onClick }
        : {})}
      className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/55 p-3 text-left disabled:opacity-60"
      style={{ boxShadow: `inset 0 0 0 1px ${accent}55, 0 0 14px ${accent}22` }}
      {...(!interactive ? { "aria-disabled": true } : {})}
    >
      <Icon
        className="h-4 w-4"
        style={{ color: accent, filter: `drop-shadow(0 0 6px ${accent})` }}
      />
      <span className="block ps-mono text-[11px] tracking-[0.18em] text-white/90">
        {label.toUpperCase()}
      </span>
      <span
        className="block ps-mono text-[8px] tracking-[0.25em]"
        style={{ color: live ? accent : "rgba(255,255,255,0.4)" }}
      >
        {live ? "OPEN →" : "COMING NEXT PHASE"}
      </span>
    </Tag>
  )
}
