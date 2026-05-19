"use client"

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Music2,
  MessageSquareWarning,
  Search,
  Shuffle,
  Timer as TimerIcon,
  Trash2,
  X,
  XCircle,
  Zap,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useApp } from "@/lib/store"
import { NeonPanel } from "../neon-panel"
import {
  PRANKSTAR_SOUNDS,
  getSafeRandomSound,
  getSoundById,
} from "@/lib/prankstar/soundCatalog"
import {
  TRAP_DELAY_PRESETS_MS,
  formatRemainingMs,
  prankTrapsManager,
  type CreatePrankTrapInput,
} from "@/lib/prankstar/prankTraps"
import { usePrankTraps, useCountdownTick } from "@/lib/prankstar/usePrankTraps"
import type {
  PrankSound,
} from "@/lib/prankstar/types"
import type {
  PrankTrap,
  PrankTrapKind,
  PrankTrapStatus,
} from "@/lib/types"

const KIND_META: Record<
  PrankTrapKind,
  { label: string; icon: typeof Music2; accent: string }
> = {
  sound: { label: "Sound Trap", icon: Music2, accent: "#00f0ff" },
  "random-safe-sound": { label: "Random Safe", icon: Shuffle, accent: "#39ff14" },
  "spoken-message": { label: "Spoken Message", icon: MessageSquareWarning, accent: "#b829ff" },
}

const MAX_CUSTOM_SECONDS = 60 * 60 // 1h via custom UI; runtime caps higher.

export function PrankTrapsScreen() {
  const {
    setScreen,
    voiceId,
    personalityId,
    settings,
    prankMessageHistory,
    prankMessageFavorites,
    trapIntent,
    setTrapIntent,
  } = useApp()
  const { active, recent } = usePrankTraps()
  const now = useCountdownTick(200)

  const [kind, setKind] = useState<PrankTrapKind>("sound")
  const [selectedSoundId, setSelectedSoundId] = useState<string | null>(null)
  const [randomPreview, setRandomPreview] = useState<PrankSound | null>(null)
  const [messageText, setMessageText] = useState<string>("")
  const [delayMs, setDelayMs] = useState<number>(TRAP_DELAY_PRESETS_MS[1].ms)
  const [customSeconds, setCustomSeconds] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [armNotice, setArmNotice] = useState<string | null>(null)

  // Initial random preview seeded once so users see what would fire.
  useEffect(() => {
    if (kind === "random-safe-sound" && !randomPreview) {
      const pick = getSafeRandomSound()
      if (pick) setRandomPreview(pick)
    }
  }, [kind, randomPreview])

  // Pull in any preselect intent set by Sound Library / Prank Messages.
  useEffect(() => {
    if (!trapIntent) return
    setKind(trapIntent.kind)
    if (trapIntent.kind === "sound" && trapIntent.soundId) {
      setSelectedSoundId(trapIntent.soundId)
    }
    if (trapIntent.kind === "spoken-message" && trapIntent.messageText) {
      setMessageText(trapIntent.messageText)
    }
    setTrapIntent(null)
  }, [trapIntent, setTrapIntent])

  const sortedSounds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const pool = q
      ? PRANKSTAR_SOUNDS.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.category.toLowerCase().includes(q) ||
            s.tags.some((t) => t.toLowerCase().includes(q)),
        )
      : [...PRANKSTAR_SOUNDS]
    return pool.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 40)
  }, [searchQuery])

  const messageOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { id: string; text: string; tag: string }[] = []
    for (const m of prankMessageFavorites) {
      if (seen.has(m.text)) continue
      seen.add(m.text)
      opts.push({ id: m.id, text: m.text, tag: "FAVORITE" })
    }
    for (const m of prankMessageHistory) {
      if (seen.has(m.text)) continue
      seen.add(m.text)
      opts.push({ id: m.id, text: m.text, tag: "RECENT" })
    }
    return opts.slice(0, 12)
  }, [prankMessageFavorites, prankMessageHistory])

  const selectedSound = useMemo(
    () => (selectedSoundId ? getSoundById(selectedSoundId) ?? null : null),
    [selectedSoundId],
  )

  const onPickCustom = useCallback(() => {
    const seconds = Number.parseFloat(customSeconds)
    if (!Number.isFinite(seconds) || seconds <= 0) return
    const clamped = Math.min(seconds, MAX_CUSTOM_SECONDS)
    setDelayMs(Math.round(clamped * 1000))
  }, [customSeconds])

  const canArm = useMemo(() => {
    if (delayMs < 1000) return false
    if (kind === "sound") return !!selectedSound
    if (kind === "random-safe-sound") return !!randomPreview
    if (kind === "spoken-message") return messageText.trim().length > 0
    return false
  }, [delayMs, kind, messageText, randomPreview, selectedSound])

  const onArm = useCallback(() => {
    setArmNotice(null)
    const input: CreatePrankTrapInput = {
      kind,
      delayMs,
      voiceId,
      voiceQualityPreference: settings.voiceQualityPreference,
      personalityId,
    }
    if (kind === "sound") input.soundId = selectedSoundId ?? undefined
    if (kind === "random-safe-sound") {
      // Pass the exact sound the user is previewing so the manager can lock
      // it in. The manager only falls back to a fresh random pick if this
      // id no longer resolves to a playable, safe-random sound.
      input.soundId = randomPreview?.id
    }
    if (kind === "spoken-message") input.messageText = messageText.trim()

    const trap = prankTrapsManager.arm(input)
    if (trap.status === "failed") {
      setArmNotice(trap.lastError ?? "Trap could not be armed.")
    } else {
      setArmNotice(`Armed: ${trap.label} · ${formatRemainingMs(trap.delayMs)}`)
    }

    if (kind === "random-safe-sound") {
      const pick = getSafeRandomSound(randomPreview ? [randomPreview.id] : [])
      if (pick) setRandomPreview(pick)
    }
  }, [
    delayMs,
    kind,
    messageText,
    personalityId,
    randomPreview,
    selectedSoundId,
    settings.voiceQualityPreference,
    voiceId,
  ])

  const onReroll = useCallback(() => {
    const pick = getSafeRandomSound(randomPreview ? [randomPreview.id] : [])
    if (pick) setRandomPreview(pick)
  }, [randomPreview])

  return (
    <div className="space-y-4 pb-2">
      <header className="px-1 pt-1">
        <button
          type="button"
          onClick={() => setScreen("prank")}
          className="mb-2 inline-flex items-center gap-1.5 ps-mono text-[10px] tracking-[0.3em] text-white/65 hover:text-white"
          aria-label="Back to Prankstar Protocol"
        >
          <ArrowLeft className="h-3 w-3" />
          BACK
        </button>
        <p className="ps-mono text-[10px] tracking-[0.4em] text-white/50">
          PRANKSTAR // TIMER_TRAPS
        </p>
        <h1 className="ps-heading text-2xl leading-[1.05]">
          <span className="ps-text-orange">TIMER</span>{" "}
          <span className="text-white/90">TRAPS</span>
        </h1>
        <p className="mt-1 ps-mono text-[10px] tracking-widest text-white/50">
          ARM · COUNTDOWN · FIRE
        </p>
      </header>

      <NeonPanel accent="orange" glow="soft" className="p-3">
        <p className="ps-mono text-[10px] tracking-[0.25em] ps-text-orange">RUNTIME_TRUTH</p>
        <p className="mt-1 ps-mono text-[10px] leading-relaxed tracking-[0.15em] text-white/75">
          Timer Traps run while NEO remains open and active. Closed-app /
          background prank execution is not enabled yet.
        </p>
      </NeonPanel>

      <NeonPanel accent="purple" glow="strong" className="p-3">
        <p className="ps-mono text-[10px] tracking-[0.25em] ps-text-purple">TRAP TYPE</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(Object.keys(KIND_META) as PrankTrapKind[]).map((k) => {
            const meta = KIND_META[k]
            const Icon = meta.icon
            const active = k === kind
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={active}
                className="flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5"
                style={{
                  borderColor: active ? meta.accent : "rgba(255,255,255,0.15)",
                  background: active ? `${meta.accent}1f` : "rgba(0,0,0,0.45)",
                  boxShadow: active ? `0 0 12px ${meta.accent}55` : undefined,
                  color: active ? meta.accent : "rgba(255,255,255,0.78)",
                }}
              >
                <Icon className="h-4 w-4" />
                <span className="ps-mono text-[9px] tracking-[0.18em] uppercase">
                  {meta.label}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-4">
          <p className="ps-mono text-[10px] tracking-[0.25em] ps-text-purple">PAYLOAD</p>

          {kind === "sound" && (
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/45 px-3 py-2">
                <Search className="h-4 w-4 ps-text-cyan" aria-hidden="true" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search playable sounds…"
                  className="w-full bg-transparent text-sm text-white/90 placeholder:text-white/35 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4 text-white/50" />
                  </button>
                )}
              </label>

              <div className="max-h-52 overflow-y-auto rounded-lg border border-white/10 bg-black/40">
                {sortedSounds.length === 0 ? (
                  <p className="p-3 ps-mono text-[10px] tracking-[0.18em] text-white/55">
                    NO PLAYABLE SOUNDS MATCH.
                  </p>
                ) : (
                  <ul>
                    {sortedSounds.map((s) => {
                      const isSelected = s.id === selectedSoundId
                      return (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedSoundId(s.id)}
                            aria-pressed={isSelected}
                            className="flex w-full items-center justify-between gap-2 border-t border-white/5 px-3 py-2 text-left first:border-t-0"
                            style={{
                              background: isSelected ? "rgba(0,240,255,0.12)" : "transparent",
                            }}
                          >
                            <span className="min-w-0 flex-1 truncate text-sm text-white/90">
                              {s.name}
                            </span>
                            <span className="ps-mono text-[9px] tracking-[0.2em] text-white/45">
                              {s.category}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
              {selectedSound && (
                <p className="ps-mono text-[10px] tracking-[0.2em] ps-text-cyan">
                  SELECTED · {selectedSound.name.toUpperCase()}
                </p>
              )}
            </div>
          )}

          {kind === "random-safe-sound" && (
            <div className="mt-2 rounded-lg border border-white/10 bg-black/45 p-3">
              {randomPreview ? (
                <>
                  <p className="ps-mono text-[10px] tracking-[0.22em] text-white/60">
                    QUEUED RANDOM
                  </p>
                  <p className="mt-1 text-sm text-white/90">{randomPreview.name}</p>
                  <p className="ps-mono text-[9px] tracking-[0.2em] text-white/45">
                    {randomPreview.category}
                  </p>
                </>
              ) : (
                <p className="ps-mono text-[10px] tracking-[0.18em] text-white/55">
                  No safe sounds available to queue.
                </p>
              )}
              <button
                type="button"
                onClick={onReroll}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#39ff14]/55 bg-[#39ff14]/10 px-3 py-1.5 ps-mono text-[10px] tracking-[0.22em] text-[#39ff14] hover:bg-[#39ff14]/20"
              >
                <Shuffle className="h-3.5 w-3.5" />
                REROLL
              </button>
            </div>
          )}

          {kind === "spoken-message" && (
            <div className="mt-2 space-y-2">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type or paste a prank line, or pick one below…"
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-black/45 px-3 py-2 text-sm text-white/90 placeholder:text-white/35 focus:outline-none focus:border-[#b829ff]/55"
              />
              {messageOptions.length > 0 ? (
                <ul className="max-h-44 overflow-y-auto rounded-lg border border-white/10 bg-black/40">
                  {messageOptions.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => setMessageText(m.text)}
                        className="flex w-full items-start gap-2 border-t border-white/5 px-3 py-2 text-left first:border-t-0 hover:bg-white/5"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm text-white/90">
                          {m.text}
                        </span>
                        <span className="ps-mono text-[9px] tracking-[0.2em] text-white/45">
                          {m.tag}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center justify-between rounded-lg border border-dashed border-white/15 bg-black/40 px-3 py-2">
                  <p className="ps-mono text-[10px] tracking-[0.15em] text-white/55">
                    No prank messages yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => setScreen("prankMessages")}
                    className="ps-mono text-[10px] tracking-[0.22em] ps-text-purple hover:underline"
                  >
                    OPEN_MESSAGES →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-4">
          <p className="ps-mono text-[10px] tracking-[0.25em] ps-text-purple">DELAY</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TRAP_DELAY_PRESETS_MS.map((p) => {
              const active = delayMs === p.ms && !customSeconds
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setDelayMs(p.ms)
                    setCustomSeconds("")
                  }}
                  aria-pressed={active}
                  className="inline-flex items-center rounded-full px-3 py-1.5 ps-mono text-[10px] tracking-[0.22em]"
                  style={{
                    background: active ? "rgba(255,122,0,0.18)" : "rgba(255,255,255,0.04)",
                    boxShadow: active
                      ? "inset 0 0 0 1px rgba(255,122,0,0.7), 0 0 10px rgba(255,122,0,0.4)"
                      : "inset 0 0 0 1px rgba(255,255,255,0.12)",
                    color: active ? "#ff7a00" : "rgba(255,255,255,0.78)",
                  }}
                >
                  {p.label}
                </button>
              )
            })}
            <div className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-2 py-1">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_CUSTOM_SECONDS}
                value={customSeconds}
                onChange={(e) => setCustomSeconds(e.target.value)}
                onBlur={onPickCustom}
                onKeyDown={(e) => e.key === "Enter" && onPickCustom()}
                placeholder="custom"
                className="w-20 bg-transparent ps-mono text-[10px] tracking-[0.18em] text-white/85 placeholder:text-white/40 focus:outline-none"
                aria-label="Custom delay in seconds"
              />
              <span className="ps-mono text-[9px] tracking-[0.22em] text-white/55">SEC</span>
              <button
                type="button"
                onClick={onPickCustom}
                className="ps-mono text-[10px] tracking-[0.22em] ps-text-orange"
              >
                SET
              </button>
            </div>
          </div>
          <p className="mt-2 ps-mono text-[10px] tracking-[0.2em] text-white/55">
            COUNTDOWN · {formatRemainingMs(delayMs)}
          </p>
        </div>

        <button
          type="button"
          onClick={onArm}
          disabled={!canArm}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#ff7a00]/55 bg-[#ff7a00]/15 px-3 py-2.5 ps-mono text-[11px] tracking-[0.25em] ps-text-orange hover:bg-[#ff7a00]/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Zap className="h-4 w-4" />
          ARM_TRAP
        </button>

        {armNotice && (
          <p
            role="status"
            className="mt-2 ps-mono text-[10px] leading-tight tracking-[0.15em] text-white/70"
          >
            {armNotice}
          </p>
        )}
      </NeonPanel>

      <NeonPanel accent="cyan" glow="strong" scanlines className="p-3">
        <div className="flex items-center justify-between">
          <p className="ps-mono text-[10px] tracking-[0.3em] ps-text-cyan">
            ACTIVE · {active.length}
          </p>
          {active.length > 0 && (
            <button
              type="button"
              onClick={() => prankTrapsManager.cancelAll()}
              className="ps-mono text-[10px] tracking-[0.22em] text-white/70 hover:text-white"
            >
              CANCEL_ALL
            </button>
          )}
        </div>
        {active.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-white/15 bg-black/40 px-3 py-4 text-center ps-mono text-[10px] tracking-[0.18em] text-white/55">
            NO ACTIVE TRAPS. ARM ONE ABOVE.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {active.map((trap) => (
              <ActiveTrapRow key={trap.id} trap={trap} now={now} />
            ))}
          </ul>
        )}
      </NeonPanel>

      <NeonPanel accent="pink" glow="soft" className="p-3">
        <div className="flex items-center justify-between">
          <p className="ps-mono text-[10px] tracking-[0.3em] ps-text-pink">RECENT</p>
          {recent.length > 0 && (
            <button
              type="button"
              onClick={() => prankTrapsManager.clearHistory()}
              className="inline-flex items-center gap-1 ps-mono text-[10px] tracking-[0.22em] text-white/70 hover:text-white"
            >
              <Trash2 className="h-3 w-3" /> CLEAR
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-white/15 bg-black/40 px-3 py-4 text-center ps-mono text-[10px] tracking-[0.18em] text-white/55">
            NO TRAP HISTORY YET.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recent.slice(0, 15).map((trap) => (
              <RecentTrapRow key={trap.id} trap={trap} />
            ))}
          </ul>
        )}
      </NeonPanel>
    </div>
  )
}

function ActiveTrapRow({ trap, now }: { trap: PrankTrap; now: number }) {
  const meta = KIND_META[trap.kind]
  const Icon = meta.icon
  const remaining = Math.max(0, trap.triggerAt - now)
  const progress = trap.delayMs > 0 ? 1 - remaining / trap.delayMs : 1
  const isTriggering = trap.status === "triggering"
  return (
    <li>
      <div
        className="rounded-lg border bg-black/55 p-3"
        style={{ borderColor: `${meta.accent}55` }}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0" style={{ color: meta.accent }} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-white/90">{trap.label}</p>
            <p className="ps-mono text-[9px] tracking-[0.2em] text-white/45">
              {meta.label.toUpperCase()} · {trap.status.toUpperCase()}
            </p>
          </div>
          <p
            className="ps-mono text-[12px] tracking-[0.18em] font-semibold"
            style={{ color: meta.accent, textShadow: `0 0 6px ${meta.accent}` }}
          >
            {isTriggering ? "FIRING" : formatRemainingMs(remaining)}
          </p>
          <button
            type="button"
            onClick={() => prankTrapsManager.cancel(trap.id)}
            aria-label={`Cancel ${trap.label}`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/15 text-white/65 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div
          className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10"
          aria-hidden="true"
        >
          <div
            className="h-full transition-[width] duration-200"
            style={{
              width: `${Math.min(100, Math.max(0, progress * 100))}%`,
              background: meta.accent,
              boxShadow: `0 0 8px ${meta.accent}`,
            }}
          />
        </div>
      </div>
    </li>
  )
}

function RecentTrapRow({ trap }: { trap: PrankTrap }) {
  const meta = KIND_META[trap.kind]
  const Icon = meta.icon
  const statusIcon = statusIconFor(trap.status)
  const StatusIcon = statusIcon.icon
  return (
    <li>
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/55 p-2.5">
        <Icon className="h-4 w-4 shrink-0" style={{ color: meta.accent }} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-white/90">{trap.label}</p>
          <p className="ps-mono text-[9px] tracking-[0.2em] text-white/45">
            {meta.label.toUpperCase()} · {trap.status.toUpperCase()}
            {trap.lastError ? ` · ${trap.lastError}` : ""}
          </p>
        </div>
        <StatusIcon className="h-4 w-4 shrink-0" style={{ color: statusIcon.color }} />
      </div>
    </li>
  )
}

function statusIconFor(status: PrankTrapStatus): { icon: typeof CheckCircle2; color: string } {
  switch (status) {
    case "fired":
      return { icon: CheckCircle2, color: "#39ff14" }
    case "cancelled":
      return { icon: XCircle, color: "#b829ff" }
    case "failed":
      return { icon: AlertTriangle, color: "#ff7a00" }
    default:
      return { icon: TimerIcon, color: "#00f0ff" }
  }
}
