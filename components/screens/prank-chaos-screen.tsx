"use client"

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Dices,
  Layers,
  Music2,
  MessageSquareWarning,
  Play,
  Shuffle,
  Sparkles,
  StopCircle,
  Trash2,
  Volume2,
  XCircle,
  Zap,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useApp } from "@/lib/store"
import { NeonPanel } from "../neon-panel"
import {
  CHAOS_ACTION_KINDS,
  CHAOS_INTENSITIES,
  CHAOS_POOLS,
  chaosManager,
  describeChaosStep,
} from "@/lib/prankstar/chaosRandomizer"
import { useChaosRandomizer } from "@/lib/prankstar/useChaosRandomizer"
import type {
  ChaosActionKind,
  ChaosExecutionStatus,
  ChaosHistoryEntry,
  ChaosIntensity,
  ChaosPoolFilter,
} from "@/lib/types"

const KIND_META: Record<
  ChaosActionKind,
  { accent: string; icon: typeof Music2 }
> = {
  "random-sound": { accent: "#00f0ff", icon: Music2 },
  "safe-random-sound": { accent: "#39ff14", icon: Shuffle },
  "random-message": { accent: "#b829ff", icon: MessageSquareWarning },
  "spoken-message": { accent: "#ff2d9c", icon: Volume2 },
  "sound-plus-message": { accent: "#ff7a00", icon: Layers },
  sequence: { accent: "#ffd84d", icon: Dices },
}

function statusLabel(status: ChaosExecutionStatus): string {
  switch (status) {
    case "idle":
      return "IDLE"
    case "ready":
      return "READY"
    case "playing":
      return "PLAYING"
    case "speaking":
      return "SPEAKING"
    case "running-sequence":
      return "RUNNING"
    case "complete":
      return "COMPLETE"
    case "cancelled":
      return "CANCELLED"
    case "failed":
      return "FAILED"
  }
}

function isRunning(status: ChaosExecutionStatus | undefined): boolean {
  return (
    status === "playing" ||
    status === "speaking" ||
    status === "running-sequence"
  )
}

export function PrankChaosScreen() {
  const { setScreen, voiceId, personalityId, settings } = useApp()
  const { current, history } = useChaosRandomizer()

  const [kind, setKind] = useState<ChaosActionKind>("random-sound")
  const [intensity, setIntensity] = useState<ChaosIntensity>("goofy")
  const [pool, setPool] = useState<ChaosPoolFilter>("playable-all")
  const [notice, setNotice] = useState<string | null>(null)

  // Auto-generate an initial preview so the result panel is never empty on
  // first paint — gives a clear "this is what would fire" view.
  useEffect(() => {
    if (current === null) {
      chaosManager.generate({ kind, intensity, pool, personalityId })
    }
    // Intentionally only runs when the singleton has nothing staged.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onGenerate = useCallback(() => {
    setNotice(null)
    const action = chaosManager.generate({
      kind,
      intensity,
      pool,
      personalityId,
    })
    if (action.status === "failed") {
      setNotice(action.error ?? "Could not generate a chaos action.")
    }
  }, [kind, intensity, pool, personalityId])

  const onExecute = useCallback(() => {
    setNotice(null)
    void chaosManager.execute({
      voiceId,
      voiceQualityPreference: settings.voiceQualityPreference,
      personalityId,
    })
  }, [personalityId, settings.voiceQualityPreference, voiceId])

  const onCancel = useCallback(() => {
    chaosManager.cancel()
  }, [])

  const runningNow = isRunning(current?.status)
  const canExecute =
    !!current && current.status === "ready" && current.steps.length > 0
  const canGenerate = !runningNow

  return (
    <div className="space-y-4 pb-2">
      <header className="px-1 pt-1">
        <button
          type="button"
          onClick={() => {
            chaosManager.cancel()
            setScreen("prank")
          }}
          className="mb-2 inline-flex items-center gap-1.5 ps-mono text-[10px] tracking-[0.3em] text-white/65 hover:text-white"
          aria-label="Back to Prankstar Protocol"
        >
          <ArrowLeft className="h-3 w-3" />
          BACK
        </button>
        <p className="ps-mono text-[10px] tracking-[0.4em] text-white/50">
          PRANKSTAR // CHAOS_CONSOLE
        </p>
        <h1 className="ps-heading text-2xl leading-[1.05]">
          <span className="ps-text-pink">CHAOS</span>{" "}
          <span className="text-white/90">CONSOLE</span>
        </h1>
        <p className="mt-1 ps-mono text-[10px] tracking-widest text-white/50">
          ROLL · STAGE · EXECUTE
        </p>
      </header>

      <NeonPanel accent="orange" glow="soft" className="p-3">
        <p className="ps-mono text-[10px] tracking-[0.25em] ps-text-orange">
          RUNTIME_TRUTH
        </p>
        <p className="mt-1 ps-mono text-[10px] leading-relaxed tracking-[0.15em] text-white/75">
          Chaos actions execute immediately while NEO is open. Scheduled or
          delayed firing belongs to Timer Traps. Closed-app / background prank
          chaos is not enabled.
        </p>
      </NeonPanel>

      <NeonPanel accent="purple" glow="strong" className="p-3">
        <p className="ps-mono text-[10px] tracking-[0.25em] ps-text-purple">
          CHAOS MODE
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {CHAOS_ACTION_KINDS.map((k) => {
            const active = k.id === kind
            const meta = KIND_META[k.id]
            const Icon = meta.icon
            return (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                aria-pressed={active}
                className="flex items-start gap-2 rounded-lg border p-2.5 text-left"
                style={{
                  borderColor: active ? meta.accent : "rgba(255,255,255,0.15)",
                  background: active ? `${meta.accent}1f` : "rgba(0,0,0,0.45)",
                  boxShadow: active ? `0 0 12px ${meta.accent}55` : undefined,
                }}
              >
                <Icon
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ color: active ? meta.accent : "rgba(255,255,255,0.7)" }}
                />
                <div className="min-w-0">
                  <p
                    className="ps-mono text-[10px] tracking-[0.18em]"
                    style={{
                      color: active ? meta.accent : "rgba(255,255,255,0.85)",
                    }}
                  >
                    {k.label.toUpperCase()}
                  </p>
                  <p className="mt-0.5 ps-mono text-[9px] leading-snug tracking-[0.12em] text-white/55">
                    {k.blurb}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        <p className="mt-4 ps-mono text-[10px] tracking-[0.25em] ps-text-purple">
          INTENSITY
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CHAOS_INTENSITIES.map((i) => {
            const active = i.id === intensity
            return (
              <button
                key={i.id}
                type="button"
                onClick={() => setIntensity(i.id)}
                aria-pressed={active}
                title={i.hint}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ps-mono text-[10px] tracking-[0.22em]"
                style={{
                  background: active ? `${i.accent}22` : "rgba(255,255,255,0.04)",
                  boxShadow: active
                    ? `inset 0 0 0 1px ${i.accent}aa, 0 0 10px ${i.accent}55`
                    : "inset 0 0 0 1px rgba(255,255,255,0.12)",
                  color: active ? i.accent : "rgba(255,255,255,0.78)",
                }}
              >
                {i.label.toUpperCase()}
              </button>
            )
          })}
        </div>

        <p className="mt-4 ps-mono text-[10px] tracking-[0.25em] ps-text-purple">
          SOUND POOL
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CHAOS_POOLS.map((p) => {
            const active = p.id === pool
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPool(p.id)}
                aria-pressed={active}
                title={p.hint}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ps-mono text-[10px] tracking-[0.22em]"
                style={{
                  background: active ? "rgba(0,240,255,0.18)" : "rgba(255,255,255,0.04)",
                  boxShadow: active
                    ? "inset 0 0 0 1px rgba(0,240,255,0.7), 0 0 10px rgba(0,240,255,0.4)"
                    : "inset 0 0 0 1px rgba(255,255,255,0.12)",
                  color: active ? "#00f0ff" : "rgba(255,255,255,0.78)",
                }}
              >
                {p.label.toUpperCase()}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#b829ff]/55 bg-[#b829ff]/15 px-3 py-2.5 ps-mono text-[11px] tracking-[0.25em] ps-text-purple hover:bg-[#b829ff]/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Sparkles className="h-4 w-4" />
          GENERATE_CHAOS
        </button>

        {notice && (
          <p
            role="alert"
            className="mt-2 ps-mono text-[10px] leading-tight tracking-[0.15em] ps-text-orange"
          >
            {notice}
          </p>
        )}
      </NeonPanel>

      <NeonPanel accent="pink" glow="strong" scanlines className="p-3">
        <div className="flex items-center justify-between">
          <p className="ps-mono text-[10px] tracking-[0.3em] ps-text-pink">
            STAGED · {current ? statusLabel(current.status) : "—"}
          </p>
          {current && (
            <p
              className="ps-mono text-[9px] tracking-[0.2em]"
              style={{ color: KIND_META[current.kind].accent }}
            >
              {current.intensity.toUpperCase()}
            </p>
          )}
        </div>

        {current && current.steps.length > 0 ? (
          <div className="mt-3 space-y-2">
            <p
              className="ps-mono text-[10px] tracking-[0.22em]"
              style={{ color: KIND_META[current.kind].accent }}
            >
              {current.summary.toUpperCase()}
            </p>
            <ol className="space-y-2">
              {current.steps.map((step, idx) => {
                const accent =
                  step.kind === "sound" ? "#00f0ff" : "#ff2d9c"
                const Icon = step.kind === "sound" ? Music2 : Volume2
                return (
                  <li
                    key={`${current.id}-${idx}`}
                    className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/55 p-2.5"
                    style={{ boxShadow: `inset 0 0 0 1px ${accent}33` }}
                  >
                    <Icon
                      className="mt-0.5 h-4 w-4 shrink-0"
                      style={{ color: accent }}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className="ps-mono text-[9px] tracking-[0.2em]"
                        style={{ color: accent }}
                      >
                        STEP {idx + 1} · {step.kind === "sound" ? "SOUND" : "SPEECH"}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-white/90">
                        {describeChaosStep(step)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>
            {current.error && (
              <p
                role="alert"
                className="ps-mono text-[10px] leading-tight tracking-[0.15em] ps-text-orange"
              >
                {current.error}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-3 flex flex-col items-center gap-2 rounded-lg border border-dashed border-white/15 bg-black/40 px-3 py-6 text-center">
            <Zap className="h-6 w-6 text-white/40" />
            <p className="ps-mono text-[10px] leading-relaxed tracking-[0.18em] text-white/65">
              {current?.error
                ? current.error.toUpperCase()
                : "PICK A MODE AND INTENSITY, THEN TAP GENERATE."}
            </p>
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onExecute}
            disabled={!canExecute}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#ff2d9c]/55 bg-[#ff2d9c]/15 px-3 py-2.5 ps-mono text-[11px] tracking-[0.25em] ps-text-pink hover:bg-[#ff2d9c]/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Play className="h-4 w-4" />
            EXECUTE_NOW
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={!runningNow}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-black/55 px-3 py-2.5 ps-mono text-[11px] tracking-[0.25em] text-white/85 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <StopCircle className="h-4 w-4" />
            STOP_CHAOS
          </button>
        </div>
      </NeonPanel>

      <NeonPanel accent="cyan" glow="soft" className="p-3">
        <div className="flex items-center justify-between">
          <p className="ps-mono text-[10px] tracking-[0.3em] ps-text-cyan">
            RECENT · {history.length}
          </p>
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => chaosManager.clearHistory()}
              className="inline-flex items-center gap-1 ps-mono text-[10px] tracking-[0.22em] text-white/70 hover:text-white"
            >
              <Trash2 className="h-3 w-3" /> CLEAR
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-white/15 bg-black/40 px-3 py-4 text-center ps-mono text-[10px] tracking-[0.18em] text-white/55">
            NO CHAOS HISTORY YET. EXECUTE A CHAOS ACTION.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {history.slice(0, 12).map((entry) => (
              <HistoryRow key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </NeonPanel>
    </div>
  )
}

function HistoryRow({ entry }: { entry: ChaosHistoryEntry }) {
  const meta = KIND_META[entry.kind]
  const Icon = meta.icon
  const statusVisual = statusIconFor(entry.status)
  const StatusIcon = statusVisual.icon
  return (
    <li>
      <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/55 p-2.5">
        <Icon
          className="mt-0.5 h-4 w-4 shrink-0"
          style={{ color: meta.accent }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-white/90">{entry.summary}</p>
          <p className="ps-mono text-[9px] tracking-[0.2em] text-white/45">
            {entry.intensity.toUpperCase()} · {entry.status.toUpperCase()}
            {entry.error ? ` · ${entry.error}` : ""}
          </p>
        </div>
        <StatusIcon
          className="mt-0.5 h-4 w-4 shrink-0"
          style={{ color: statusVisual.color }}
        />
      </div>
    </li>
  )
}

function statusIconFor(
  status: ChaosHistoryEntry["status"],
): { icon: typeof CheckCircle2; color: string } {
  switch (status) {
    case "complete":
      return { icon: CheckCircle2, color: "#39ff14" }
    case "cancelled":
      return { icon: XCircle, color: "#b829ff" }
    case "failed":
      return { icon: AlertTriangle, color: "#ff7a00" }
  }
}
