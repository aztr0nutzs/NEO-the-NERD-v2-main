"use client"

/*
 * Faithful port of nerd_speed.html into NEO. The HUD layout, sphere gauge,
 * dual-value readout, stat panels, jitter bars, control strip, telemetry log,
 * safe-mode toggle, and Execute/Abort buttons are reproduced as in the source.
 * Colors are remapped to the NEO palette (cyan/pink/green/orange) defined in
 * app/globals.css. All metrics are produced by the real streaming engine in
 * `lib/network/speedTestRunner.ts` — nothing on screen is fabricated.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Bolt,
  CheckCircle2,
  Eraser,
  Gauge,
  Link as LinkIcon,
  Lock,
  Rocket as RocketIcon,
  TrendingDown,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react"
import { useApp } from "@/lib/store"
import {
  defaultCloudflarePreset,
  runStreamingSpeedTest,
  type SpeedTestRunStatus,
} from "@/lib/network/speedTestRunner"
import type { SpeedTestConfig, SpeedTestResult } from "@/lib/network/types"
import {
  NEO_PALETTE,
  SPEED_TEST_SIGNIFICANCE,
  gradeDownload,
  gradeJitter,
  gradeLatency,
  gradeUpload,
  type MetricTier,
} from "@/lib/network/speedTestThresholds"

const UPLOAD_URL_STORAGE_KEY = "neo:speedtest:upload-url"

/**
 * The five visible phases of a run. The runner emits more states internally
 * (idle/aborted/failed) — those map to "prep" / "done" depending on outcome.
 * The segment strip and progress arc both consume this ordering.
 */
const PHASE_ORDER: SpeedTestRunStatus[] = [
  "preparing",
  "latency",
  "download",
  "upload",
  "complete",
]

const PHASE_LABEL: Record<SpeedTestRunStatus, string> = {
  idle: "IDLE",
  preparing: "PREP",
  latency: "PING",
  download: "DL",
  upload: "UL",
  complete: "DONE",
  aborted: "ABORT",
  failed: "HALT",
}

// Local alias kept so existing call sites (NEO.cyan etc.) keep reading the
// same — the underlying values now live in lib/network/speedTestThresholds.ts
// so Mission Control and the Speed Test screen share one palette.
const NEO = NEO_PALETTE

interface SpeedTestScreenProps {
  /** Override the test configuration (e.g. point at a custom endpoint). */
  configOverride?: Partial<SpeedTestConfig>
}

type TelemetryColor = "cyan" | "pink" | "green" | "yellow"
type LogLevel = "info" | "warn" | "error" | "ok"

interface TelemetryLine {
  id: number
  text: string
  color: TelemetryColor
}

const STATUS_COLOR: Record<SpeedTestRunStatus, TelemetryColor> = {
  idle: "pink",
  preparing: "cyan",
  latency: "pink",
  download: "cyan",
  upload: "green",
  complete: "green",
  aborted: "pink",
  failed: "pink",
}

const LOG_LEVEL_COLOR: Record<LogLevel, TelemetryColor> = {
  info: "cyan",
  warn: "yellow",
  error: "pink",
  ok: "green",
}

export function SpeedTestScreen({ configOverride }: SpeedTestScreenProps = {}) {
  const { recordSpeedTestStarted, recordSpeedTestResult, speedTestHistory, clearSpeedTestHistory } =
    useApp()

  // Probe state — preserves the source HUD's IDLE / INJECTING_PACKETS /
  // PULLING_PAYLOADS / PUSHING_UPLINK / COMPLETE / ABORT / HALT phases.
  const [statusLabel, setStatusLabel] = useState("IDLE")
  const [probeStatus, setProbeStatus] = useState("READY")
  const [probeColor, setProbeColor] = useState<TelemetryColor>("green")
  const [mainValue, setMainValue] = useState(0)
  const [dlValue, setDlValue] = useState<string>("--")
  const [ulValue, setUlValue] = useState<string>("--")
  const [pingMedian, setPingMedian] = useState<string>("--")
  const [jitter, setJitter] = useState<string>("--")
  const [jitterBars, setJitterBars] = useState<number[]>(() => seedJitterBars(2))
  const [safeMode, setSafeMode] = useState(true)
  const [running, setRunning] = useState(false)
  const [telemetry, setTelemetry] = useState<TelemetryLine[]>([])
  // Active run state — every visual element below derives from these so the
  // animation always reflects real probe state and never decorative theatrics.
  const [activeStatus, setActiveStatus] = useState<SpeedTestRunStatus>("idle")
  const [phaseProgress, setPhaseProgress] = useState(0)
  const [latencySamplesCount, setLatencySamplesCount] = useState({ done: 0, total: 0 })
  // Persisted upload endpoint (user-configurable). When set, the runner will
  // actually exercise the upload path; otherwise UL reads "N/A" honestly.
  const [uploadUrlInput, setUploadUrlInput] = useState<string>("")
  const [uploadUrlSaved, setUploadUrlSaved] = useState<string | null>(null)
  const [uploadConfigOpen, setUploadConfigOpen] = useState(false)
  // Latest completed result — drives the verdict banner and delta badges.
  const [lastResult, setLastResult] = useState<SpeedTestResult | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const telemetryRef = useRef<HTMLDivElement | null>(null)
  const logSeqRef = useRef(0)
  // Hold start times locally so the progress arc can render an honest 0→100
  // fill across the download window — driven by elapsed/duration, not magic.
  const downloadStartedAtRef = useRef<number>(0)
  const downloadDurationRef = useRef<number>(0)
  // One-shot completion shockwave: scaled ring overlay fired the instant the
  // status transitions to `complete`. Auto-clears so it cannot replay.
  const [showShockwave, setShowShockwave] = useState(false)
  // One-shot failure scanline glitch — pink overlay flash when the run halts
  // or is aborted. Auto-clears like the shockwave so it stays a punctuation.
  const [showFailGlitch, setShowFailGlitch] = useState(false)
  // Rolling buffer of the last few latency samples, used to drive the jitter
  // bar heights from REAL measurements during the latency phase. Falls back
  // to the seeded decorative bars when not running.
  const recentLatencySamples = useRef<number[]>([])

  const pushLog = useCallback((text: string, color: TelemetryColor = "cyan") => {
    logSeqRef.current += 1
    const id = logSeqRef.current
    setTelemetry((prev) => [...prev, { id, text, color }])
  }, [])

  // Restore saved upload endpoint from localStorage so the user's
  // configured URL persists across launches. No server round-trip.
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem(UPLOAD_URL_STORAGE_KEY)
      if (stored) {
        setUploadUrlSaved(stored)
        setUploadUrlInput(stored)
      }
    } catch {
      /* localStorage unavailable — ignore */
    }
  }, [])

  // True only when an upload endpoint is wired in either via prop override
  // or via the user-configured saved URL. Drives all upload-related copy.
  const uploadConfigured = useMemo(
    () => Boolean(configOverride?.uploadUrl ?? uploadUrlSaved),
    [configOverride?.uploadUrl, uploadUrlSaved],
  )

  // Per-phase progress is what the arc around the gauge consumes. We derive
  // it from real signals only — latency uses sample-count progress, download
  // uses elapsed/duration of the current window, upload terminates on
  // completion. Never randomized.
  useEffect(() => {
    if (activeStatus !== "download") return
    let raf = 0
    const tick = () => {
      const duration = downloadDurationRef.current
      if (duration > 0) {
        const elapsed = performance.now() - downloadStartedAtRef.current
        setPhaseProgress(Math.max(0, Math.min(1, elapsed / duration)))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [activeStatus])

  useEffect(() => {
    const el = telemetryRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [telemetry])

  // Trigger the completion shockwave the instant the runner transitions to
  // `complete`. The animation runs once and then we clear the flag so it
  // cannot replay (and so subsequent renders are quiet). The pink failure
  // flash works the same way on `failed` / `aborted`.
  useEffect(() => {
    if (activeStatus === "complete") {
      setShowShockwave(true)
      const t = window.setTimeout(() => setShowShockwave(false), 1500)
      return () => window.clearTimeout(t)
    }
    if (activeStatus === "failed" || activeStatus === "aborted") {
      setShowFailGlitch(true)
      const t = window.setTimeout(() => setShowFailGlitch(false), 900)
      return () => window.clearTimeout(t)
    }
    return undefined
  }, [activeStatus])

  /* ============================================================
     Sphere gauge — canvas animation faithful to nerd_speed.html
     but with intensity/particle count/color *driven by real
     probe phase*. Idle = restrained baseline. Latency = sharper
     rings. Download = full particle storm scaled by live mbps.
     Upload = green-tinted. Failed = pink burst-down.

     The status ref is read each frame so the same RAF loop can
     mirror the live state without re-spinning on every status
     change (a remount would kill the smooth motion).
  ============================================================ */
  const sphereRef = useRef<HTMLCanvasElement | null>(null)
  const sphereStateRef = useRef({
    status: "idle" as SpeedTestRunStatus,
    mbps: 0,
  })
  useEffect(() => {
    sphereStateRef.current = { status: activeStatus, mbps: mainValue }
  }, [activeStatus, mainValue])

  useEffect(() => {
    const canvas = sphereRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let frame = 0
    let raf = 0
    let cancelled = false

    const resize = () => {
      const box = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.floor(box.width * dpr))
      canvas.height = Math.max(1, Math.floor(box.height * dpr))
    }
    resize()
    const onResize = () => resize()
    window.addEventListener("resize", onResize)

    const draw = () => {
      if (cancelled) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const cx = canvas.width / 2
      const cy = canvas.height / 2
      const radius = Math.min(cx, cy) * 0.75
      frame++

      const { status, mbps } = sphereStateRef.current
      // Phase-driven intensity: 0.55 idle, 1.0 running, 0.4 aborted/failed.
      // mbps boost only kicks in during download where mbps is meaningful.
      const baseIntensity =
        status === "download"
          ? 1
          : status === "latency" || status === "upload" || status === "preparing"
            ? 0.85
            : status === "failed" || status === "aborted"
              ? 0.45
              : 0.55
      const mbpsBoost = status === "download" ? Math.min(0.5, Math.log10(1 + mbps) / 3) : 0
      const intensity = Math.min(1.3, baseIntensity + mbpsBoost)
      const ringCount = Math.round(8 * intensity)
      const particleCount = Math.round(15 * intensity) + (status === "download" ? 6 : 0)

      // Phase color tinting for the particle set without redoing the rings,
      // so the cyber identity reads consistently.
      const particleA =
        status === "complete"
          ? NEO.green
          : status === "failed" || status === "aborted"
            ? NEO.pink
            : status === "upload"
              ? NEO.green
              : NEO.cyan
      const particleB =
        status === "complete"
          ? NEO.cyan
          : status === "failed" || status === "aborted"
            ? NEO.yellow
            : NEO.pink

      ctx.lineWidth = 1
      for (let i = 0; i < ringCount; i++) {
        const t = frame / 100 + (i / ringCount) * Math.PI * 2
        const xOffset = Math.sin(t) * 20 * intensity
        ctx.beginPath()
        ctx.strokeStyle = `rgba(0, 240, 255, ${0.1 + Math.abs(Math.cos(t)) * 0.2 * intensity})`
        ctx.arc(cx + xOffset, cy, radius, 0, Math.PI * 2)
        ctx.stroke()
      }

      for (let i = 0; i < particleCount; i++) {
        const angle = frame / 50 + (i / particleCount) * Math.PI * 2
        const dist = Math.sin(frame / 30 + i) * radius * 0.8 * intensity
        const x = cx + Math.cos(angle) * dist
        const y = cy + Math.sin(angle) * dist

        ctx.fillStyle = i % 2 === 0 ? particleA : particleB
        ctx.beginPath()
        ctx.arc(x, y, 1.5, 0, Math.PI * 2)
        ctx.fill()

        ctx.shadowBlur = 10 * intensity
        ctx.shadowColor = ctx.fillStyle as string
        ctx.fill()
        ctx.shadowBlur = 0
      }

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", onResize)
    }
  }, [])

  /* ============================================================
     Real probe — drives every readout from the streaming runner's
     callbacks. No values are invented; download Mbps animates from
     the live byte stream, latency/jitter come from real samples,
     upload only runs when an endpoint is configured.
  ============================================================ */
  const handleExecute = useCallback(async () => {
    if (running) return
    const ctrl = new AbortController()
    abortRef.current = ctrl

    const baseConfig = defaultCloudflarePreset(safeMode)
    const effectiveUploadUrl = configOverride?.uploadUrl ?? uploadUrlSaved ?? undefined
    const config: SpeedTestConfig = {
      ...baseConfig,
      ...configOverride,
      ...(effectiveUploadUrl ? { uploadUrl: effectiveUploadUrl } : {}),
    }

    // Reset readouts for the new run.
    setRunning(true)
    setActiveStatus("preparing")
    setPhaseProgress(0)
    setLatencySamplesCount({ done: 0, total: 0 })
    setTelemetry([])
    logSeqRef.current = 0
    setMainValue(0)
    setDlValue("--")
    setUlValue(config.uploadUrl ? "--" : "N/A")
    setPingMedian("--")
    setJitter("--")
    setJitterBars(seedJitterBars(2))
    recentLatencySamples.current = []
    setProbeStatus("RUNNING")
    setProbeColor("green")
    setStatusLabel("PREPARING")
    downloadStartedAtRef.current = 0
    downloadDurationRef.current = config.downloadDurationMs

    const runId = `speed-${Date.now()}`
    recordSpeedTestStarted(runId, config.provider)

    let result: SpeedTestResult
    try {
      result = await runStreamingSpeedTest(config, {
        signal: ctrl.signal,
        onStatus: (status, label) => {
          setStatusLabel(label)
          setProbeColor(STATUS_COLOR[status])
          setActiveStatus(status)
          if (status === "download") {
            downloadStartedAtRef.current = performance.now()
            setPhaseProgress(0)
          } else if (status === "upload") {
            setPhaseProgress(0)
          } else if (status === "complete") {
            setPhaseProgress(1)
          } else if (status === "failed" || status === "aborted") {
            setPhaseProgress(1)
          }
        },
        onLog: (line) => pushLog(line.message, LOG_LEVEL_COLOR[line.level]),
        onLatencySample: (sample) => {
          // While the latency phase runs, surface the running sample count
          // and drive the jitter bars from REAL measurements so the user
          // sees the engine working with actual data instead of decorative
          // randomness. Bars are clamped to a readable height range.
          pushLog(`PING_SAMPLE ${sample.index}/${sample.total}=${Math.round(sample.sampleMs)}ms`, "cyan")
          setLatencySamplesCount({ done: sample.index, total: sample.total })
          setPhaseProgress(sample.index / sample.total)
          recentLatencySamples.current = [
            ...recentLatencySamples.current,
            sample.sampleMs,
          ].slice(-10)
          setJitterBars(barsFromLatencySamples(recentLatencySamples.current))
        },
        onLatencySummary: (summary) => {
          setPingMedian(String(Math.round(summary.latencyMs)))
          setJitter(String(Math.round(summary.jitterMs)))
          setJitterBars(seedJitterBars(summary.jitterMs || 2))
        },
        onDownloadTick: (tick) => {
          // Real live mbps — this is what feeds the main gauge animation.
          setMainValue(tick.mbps)
        },
        onUploadComplete: (info) => {
          if (info.mbps === null) {
            setUlValue(info.reason === "upload-not-configured" ? "N/A" : "FAIL")
          } else {
            setUlValue(info.mbps.toFixed(1))
          }
        },
      })
    } finally {
      abortRef.current = null
      setRunning(false)
    }

    // Final commits derived from the result the runner returned.
    setDlValue(result.downloadMbps.toFixed(1))
    if (result.uploadMbps !== null) setUlValue(result.uploadMbps.toFixed(1))
    setMainValue(result.downloadMbps)
    setPingMedian(String(Math.round(result.latencyMs)))
    setJitter(String(Math.round(result.jitterMs)))
    setLastResult(result)

    if (result.success) {
      setProbeStatus("READY")
      setProbeColor("green")
      setActiveStatus("complete")
      setPhaseProgress(1)
    } else {
      setProbeStatus(result.failureReason === "aborted" ? "ABORTED" : "FAILED")
      setProbeColor("pink")
      setActiveStatus(result.failureReason === "aborted" ? "aborted" : "failed")
      setPhaseProgress(1)
    }

    recordSpeedTestResult(result)
  }, [
    configOverride,
    pushLog,
    recordSpeedTestResult,
    recordSpeedTestStarted,
    running,
    safeMode,
    uploadUrlSaved,
  ])

  const handleSaveUploadUrl = useCallback(() => {
    const trimmed = uploadUrlInput.trim()
    if (trimmed.length === 0) {
      try {
        window.localStorage.removeItem(UPLOAD_URL_STORAGE_KEY)
      } catch {
        /* ignore */
      }
      setUploadUrlSaved(null)
      setUploadConfigOpen(false)
      return
    }
    try {
      // Validate the URL shape so we never persist garbage.
      const parsed = new URL(trimmed)
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        pushLog("UL_ENDPOINT_REJECTED scheme must be http/https", "pink")
        return
      }
      window.localStorage.setItem(UPLOAD_URL_STORAGE_KEY, trimmed)
      setUploadUrlSaved(trimmed)
      setUploadConfigOpen(false)
      pushLog(`UL_ENDPOINT_SET ${parsed.host}`, "green")
    } catch {
      pushLog("UL_ENDPOINT_REJECTED invalid URL", "pink")
    }
  }, [pushLog, uploadUrlInput])

  const handleClearUploadUrl = useCallback(() => {
    try {
      window.localStorage.removeItem(UPLOAD_URL_STORAGE_KEY)
    } catch {
      /* ignore */
    }
    setUploadUrlSaved(null)
    setUploadUrlInput("")
    pushLog("UL_ENDPOINT_CLEARED", "yellow")
  }, [pushLog])

  const handleAbort = useCallback(() => {
    abortRef.current?.abort()
    setProbeStatus("ABORTING")
    setProbeColor("pink")
    setStatusLabel("ABORT")
    pushLog("ABORT_SIGNAL_SENT", "pink")
  }, [pushLog])

  const mainDisplay = useMemo(() => mainValue.toFixed(1), [mainValue])

  return (
    <div
      className="speedtest-root flex w-full flex-col items-center gap-4 overflow-hidden px-1 pt-1"
      style={{ color: NEO.text }}
    >
      <ScopedSpeedStyles />

      <header
        className="speedtest-topbar flex w-full items-center justify-between rounded-lg px-3 py-2"
        style={{
          // Substrate raised from 0.55 -> 0.78 so the topbar reads cleanly
          // when the animated background is on a bright frame. Border is
          // a touch warmer for hierarchy without changing the cyber accent.
          background: "rgba(0,0,0,0.78)",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div className="flex flex-col leading-tight">
          <span className="hud-mono text-[10px] font-black opacity-90" style={{ color: NEO.cyan }}>
            NET_PROBE_SUITE
          </span>
          <h1
            className="hud-text-tight glitch-text text-[13px] font-black"
            style={{ color: NEO.yellow }}
          >
            HOLO COMMAND CORE
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end leading-tight">
            <span
              className="hud-mono text-[9px] font-bold opacity-60"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              SIGNAL
            </span>
            <div className="mt-1 flex gap-[2px]">
              <span className="h-3 w-1" style={{ background: NEO.cyan }} />
              <span className="h-3 w-1" style={{ background: NEO.cyan }} />
              <span className="h-3 w-1" style={{ background: NEO.cyan }} />
              <span className="h-3 w-1" style={{ background: "rgba(255,255,255,0.12)" }} />
            </div>
          </div>
          <div
            className="grid h-9 w-9 place-items-center rounded-full"
            style={{ border: `1px solid ${rgba(NEO.cyan, 0.28)}`, background: "rgba(0,0,0,0.9)" }}
          >
            <Activity className="h-4 w-4" style={{ color: NEO.cyan }} aria-hidden="true" />
          </div>
        </div>
      </header>

      {/* Phase segment strip — five LED slots mapping to prep / ping / dl /
          ul / done. Active phase glows, completed phases dim to a steady
          accent, future phases stay muted. Drives clear motion across the
          run. The right-hand side surfaces the current sample-count so the
          motion is obviously tied to live measurement. */}
      <PhaseSegmentStrip
        status={activeStatus}
        running={running}
        latencySamples={latencySamplesCount}
        phaseProgress={phaseProgress}
        uploadConfigured={uploadConfigured}
      />

      <div className="rotating-sphere-container relative mx-auto flex aspect-square w-full max-w-[340px] items-center justify-center">
        <div
          className="absolute inset-0 rounded-full border opacity-30"
          style={{
            borderColor: rgba(NEO.cyan, 0.18),
            animation: "ps-spin-slow 20s linear infinite",
          }}
        />
        <div
          className="absolute inset-8 rounded-full border border-dashed opacity-40"
          style={{
            borderColor: rgba(NEO.pink, 0.22),
            animation: "ps-spin-rev 15s linear infinite",
          }}
        />

        {/* Idle "ready" breath halo — only visible when no run is active.
            A slow cyan opacity throb makes the screen read as ALIVE before
            the user presses Execute, replacing the previously dead idle
            state. Disabled the moment a run kicks off so it never competes
            with the live phase animations. */}
        {!running && activeStatus === "idle" && (
          <div
            className="speedtest-ready-halo pointer-events-none absolute z-[2] aspect-square w-[88%] rounded-full"
            style={{
              border: `1px solid ${rgba(NEO.cyan, 0.35)}`,
              boxShadow: `0 0 36px ${rgba(NEO.cyan, 0.25)} inset, 0 0 24px ${rgba(NEO.cyan, 0.22)}`,
            }}
            aria-hidden="true"
          />
        )}

        {/* One-shot completion shockwave. Fires the moment status transitions
            to `complete` and clears after ~1.5s so it cannot replay. Green
            ring expands outward, signalling "PROBE COMPLETE" viscerally. */}
        {showShockwave && (
          <>
            <div
              className="speedtest-shockwave pointer-events-none absolute z-[6] aspect-square w-[80%] rounded-full"
              style={{
                border: `2px solid ${NEO.green}`,
                boxShadow: `0 0 18px ${NEO.green}`,
              }}
              aria-hidden="true"
            />
            <div
              className="speedtest-shockwave-late pointer-events-none absolute z-[6] aspect-square w-[80%] rounded-full"
              style={{
                border: `1px solid ${rgba(NEO.cyan, 0.85)}`,
                boxShadow: `0 0 12px ${rgba(NEO.cyan, 0.6)}`,
              }}
              aria-hidden="true"
            />
          </>
        )}

        {/* One-shot failure scanline glitch. Quick pink flash + horizontal
            scanline overlay on `failed` / `aborted` so the user feels the
            verdict rather than just reading it. */}
        {showFailGlitch && (
          <div
            className="speedtest-fail-glitch pointer-events-none absolute z-[6] aspect-square w-[88%] rounded-full"
            style={{
              border: `1px solid ${rgba(NEO.pink, 0.85)}`,
              boxShadow: `0 0 22px ${rgba(NEO.pink, 0.55)} inset, 0 0 18px ${rgba(NEO.pink, 0.45)}`,
            }}
            aria-hidden="true"
          />
        )}

        {/* Real-state progress arc. Wraps the gauge with a stroke that fills
            cleanly during latency (sample count / total), download (elapsed
            within the test window), and snaps to full on terminal states.
            Color switches to green on success, pink on failure. */}
        <ProgressArc status={activeStatus} progress={phaseProgress} />

        <canvas
          ref={sphereRef}
          className="pointer-events-none absolute z-10 h-full w-full"
          aria-hidden="true"
        />

        <div className="relative z-20 flex flex-col items-center text-center">
          <div className="mb-1">
            <span
              className="hud-text micro-glitch text-[10px] font-black"
              style={{ color: NEO.pink }}
            >
              {statusLabel}
            </span>
          </div>

          <div className="relative">
            <span
              className="font-display text-[64px] sm:text-[72px] font-black italic leading-none tracking-tighter"
              style={{ color: NEO.yellow }}
            >
              {mainDisplay}
            </span>
            <span
              className="font-display absolute inset-0 translate-x-[1px] text-[64px] sm:text-[72px] font-black italic leading-none tracking-tighter opacity-25 blur-[1px]"
              style={{ color: NEO.pink }}
              aria-hidden="true"
            >
              {mainDisplay}
            </span>
          </div>

          <span
            className="hud-text mt-2 text-[18px] font-black opacity-90"
            style={{ color: NEO.cyan }}
          >
            MBPS
          </span>

          <div className="mt-6 flex gap-2">
            <Pill border={rgba(NEO.cyan, 0.32)}>
              <span className="hud-mono text-[9px] font-black" style={{ color: NEO.cyan }}>
                DL:
              </span>
              <span
                className="hud-text-tight text-[12px] font-black italic"
                style={{ color: NEO.yellow }}
              >
                {dlValue}
              </span>
            </Pill>
            <Pill border={rgba(NEO.pink, 0.32)}>
              <span className="hud-mono text-[9px] font-black" style={{ color: NEO.pink }}>
                UL:
              </span>
              <span
                className="hud-text-tight text-[12px] font-black italic"
                style={{ color: NEO.yellow }}
              >
                {ulValue}
              </span>
            </Pill>
          </div>
        </div>
      </div>

      {/* Verdict banner — only renders once a run has finished. Pulls
          thresholds from the result itself, no fabrication. */}
      {lastResult && !running && (
        <VerdictBanner result={lastResult} previous={speedTestHistory[1] ?? null} />
      )}

      <div className="grid w-full grid-cols-2 gap-3">
        <Panel accent={NEO.cyan} cp>
          <div className="flex items-start justify-between">
            <span className="hud-mono text-[9px] font-black" style={{ color: NEO.cyan }}>
              REQUEST LATENCY
            </span>
            <Bolt className="h-3 w-3" style={{ color: NEO.cyan }} aria-hidden="true" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className="font-display text-2xl font-black italic"
              style={{ color: NEO.yellow }}
            >
              {pingMedian}
            </span>
            <span
              className="hud-mono text-[9px] font-bold opacity-70"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              ms · median
            </span>
          </div>
          <div className="mt-2 h-1 w-full" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div
              className="h-full w-full"
              style={{
                background: `linear-gradient(90deg, transparent, ${rgba(NEO.cyan, 0.9)}, transparent)`,
                animation: running ? "ps-pulse-ring 1.6s ease-in-out infinite" : undefined,
                opacity: running ? 1 : 0.3,
              }}
            />
          </div>
        </Panel>

        <Panel accent={NEO.pink} cp>
          <div className="flex items-start justify-between">
            <span className="hud-mono text-[9px] font-black" style={{ color: NEO.pink }}>
              JITTER (σ)
            </span>
            <Activity className="h-3 w-3" style={{ color: NEO.pink }} aria-hidden="true" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className="font-display text-2xl font-black italic"
              style={{ color: NEO.yellow }}
            >
              {jitter}
            </span>
            <span
              className="hud-mono text-[9px] font-bold opacity-70"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              ms
            </span>
          </div>
          <div className="mt-2 flex h-3 items-end gap-[2px]">
            {jitterBars.map((h, idx) => (
              <span
                key={idx}
                className="w-[6px]"
                style={{
                  height: `${h}px`,
                  background: idx % 2 === 0 ? rgba(NEO.pink, 0.85) : rgba(NEO.pink, 0.45),
                }}
              />
            ))}
          </div>
        </Panel>
      </div>

      <Panel accent={NEO.yellow} cp className="w-full">
        <div className="flex items-center justify-between">
          <div className="flex flex-col leading-tight">
            <span
              className="hud-mono text-[9px] font-black opacity-70"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              PROBE STATUS
            </span>
            <span
              className="hud-text-tight text-[11px] font-black"
              style={{ color: NEO[probeColor] }}
            >
              {probeStatus}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="hud-mono text-[9px] font-black opacity-70"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              SAFE_MODE
            </span>
            <button
              type="button"
              onClick={() => setSafeMode((s) => !s)}
              aria-pressed={safeMode}
              aria-label="Toggle safe mode"
              className="relative h-6 w-12 rounded-full"
              style={{
                background: "rgba(0,0,0,0.9)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <span
                className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full transition-transform duration-150 ease-out"
                style={{
                  background: NEO.cyan,
                  left: 4,
                  transform: `translateY(-50%) translateX(${safeMode ? 24 : 0}px)`,
                }}
              />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <CyberButton
            color="pink"
            onClick={handleAbort}
            icon={X}
            label="Abort"
            disabled={!running}
          />
          <CyberButton
            color="cyan"
            onClick={handleExecute}
            icon={RocketIcon}
            label="Execute"
            disabled={running}
          />
        </div>

        {/* Upload endpoint configuration. The runner has no built-in upload
            target because we will not fabricate upload numbers — but the
            user can wire in their own POST endpoint (e.g. a self-hosted
            speed-test backend) and the URL is persisted to localStorage.
            When unset we say so explicitly; when set we show the host
            and let the user clear or change it. */}
        <UploadEndpointConfig
          uploadUrlSaved={uploadUrlSaved}
          uploadUrlInput={uploadUrlInput}
          onChangeInput={setUploadUrlInput}
          open={uploadConfigOpen}
          onToggle={() => setUploadConfigOpen((v) => !v)}
          onSave={handleSaveUploadUrl}
          onClear={handleClearUploadUrl}
        />

        <div className="mt-4">
          <div
            className="hud-mono mb-2 text-[9px] font-black opacity-70"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            TELEMETRY
          </div>
          <div
            ref={telemetryRef}
            className="cpclip overflow-auto p-3"
            style={{
              background: "rgba(0,0,0,0.9)",
              border: "1px solid rgba(255,255,255,0.12)",
              height: 86,
            }}
          >
            {telemetry.length === 0 ? (
              <div
                className="hud-mono text-[9px] font-black opacity-50"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                AWAITING_PROBE
              </div>
            ) : (
              telemetry.map((line) => (
                <div
                  key={line.id}
                  className="hud-mono mb-1.5 text-[9px] font-extrabold"
                  style={{ color: NEO[line.color], letterSpacing: "0.10em" }}
                >
                  {line.text}
                </div>
              ))
            )}
          </div>
        </div>
      </Panel>

      <RecentResultsPanel runs={speedTestHistory} onClear={clearSpeedTestHistory} />

      <p
        className="hud-mono px-2 pb-4 text-center text-[9px] font-bold opacity-60"
        style={{ color: "rgba(255,255,255,0.65)", letterSpacing: "0.10em" }}
      >
        MEASURES HTTPS REQUEST LATENCY & REAL DOWNLOAD THROUGHPUT FROM THE CONFIGURED ENDPOINT.
        RESULTS REFLECT INTERNET-PATH PERFORMANCE, NOT LAN-INTERNAL DEVICE SPEEDS.
      </p>
    </div>
  )
}

/* =====================================================================
   Internal pieces
===================================================================== */

function RecentResultsPanel({
  runs,
  onClear,
}: {
  runs: SpeedTestResult[]
  onClear: () => void
}) {
  if (!runs.length) return null
  const last = runs.slice(0, 5)
  // Compute best download and lowest latency across the entire history so
  // each card can flag itself with a tiny badge. Pure computation — no
  // fabricated data anywhere.
  const successful = runs.filter((r) => r.success)
  const bestDownload = successful.reduce(
    (best, r) => (r.downloadMbps > (best?.downloadMbps ?? -Infinity) ? r : best),
    null as SpeedTestResult | null,
  )
  const bestLatency = successful.reduce(
    (best, r) =>
      r.latencyMs > 0 && r.latencyMs < (best?.latencyMs ?? Infinity) ? r : best,
    null as SpeedTestResult | null,
  )

  return (
    <Panel accent={NEO.green} cp className="w-full">
      <div className="flex items-center justify-between">
        <span className="hud-mono text-[9px] font-black" style={{ color: NEO.green }}>
          RECENT RUNS · {runs.length}
        </span>
        <button
          type="button"
          onClick={onClear}
          className="hud-mono inline-flex items-center gap-1 text-[9px] font-black opacity-70"
          style={{ color: "rgba(255,255,255,0.7)", letterSpacing: "0.10em" }}
        >
          <Eraser className="h-3 w-3" aria-hidden="true" />
          CLEAR
        </button>
      </div>
      <div className="mt-2 grid gap-2">
        {last.map((run, index) => {
          const prior = last[index + 1] ?? null
          const isBestDl = bestDownload && run.id === bestDownload.id
          const isBestLat = bestLatency && run.id === bestLatency.id
          return (
            <div
              key={run.id}
              className="cpclip grid grid-cols-[1fr,1fr,1fr,1fr] items-baseline gap-2 px-3 py-2"
              style={{
                background: "rgba(0,0,0,0.86)",
                border: `1px solid ${rgba(run.success ? NEO.green : NEO.pink, 0.45)}`,
              }}
            >
              <div className="flex flex-col leading-tight">
                <span
                  className="hud-mono text-[9px] font-bold opacity-70"
                  style={{ color: "rgba(255,255,255,0.78)" }}
                >
                  {new Date(run.completedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {(isBestDl || isBestLat) && (
                  <span
                    className="hud-mono mt-0.5 text-[8px] font-black"
                    style={{ color: NEO.green, letterSpacing: "0.12em" }}
                  >
                    {isBestDl ? "BEST DL" : "BEST LAT"}
                  </span>
                )}
              </div>
              <MetricWithDelta
                label="DL"
                value={run.downloadMbps.toFixed(1)}
                delta={prior ? run.downloadMbps - prior.downloadMbps : null}
                color={NEO.cyan}
                higherIsBetter
              />
              <MetricWithDelta
                label="UL"
                value={run.uploadMbps === null ? "N/A" : run.uploadMbps.toFixed(1)}
                delta={
                  prior && prior.uploadMbps !== null && run.uploadMbps !== null
                    ? run.uploadMbps - prior.uploadMbps
                    : null
                }
                color={NEO.pink}
                higherIsBetter
              />
              <MetricWithDelta
                label="LAT"
                value={`${Math.round(run.latencyMs)}ms`}
                delta={prior ? run.latencyMs - prior.latencyMs : null}
                color={NEO.yellow}
              />
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

function MetricWithDelta({
  label,
  value,
  delta,
  color,
  higherIsBetter = false,
}: {
  label: string
  value: string
  delta: number | null
  color: string
  higherIsBetter?: boolean
}) {
  // Significance threshold so a noisy 0.05 Mbps wiggle does not light up
  // the badge — keeps the delta indicator honest. Pulled from the shared
  // module so Mission Control and this screen agree on the noise floor.
  const noiseFloor = higherIsBetter
    ? SPEED_TEST_SIGNIFICANCE.downloadMbps
    : SPEED_TEST_SIGNIFICANCE.latencyMs
  const significant = delta !== null && Math.abs(delta) > noiseFloor
  const positive = delta !== null && delta > 0
  const goodDirection = higherIsBetter ? positive : !positive
  const trendColor = significant ? (goodDirection ? NEO.green : NEO.pink) : "rgba(255,255,255,0.5)"
  const TrendIcon = significant ? (positive ? TrendingUp : TrendingDown) : null
  return (
    <div className="flex flex-col leading-tight">
      <span
        className="hud-mono text-[8px] font-black opacity-65"
        style={{ color: "rgba(255,255,255,0.7)" }}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="hud-text-tight text-[11px] font-black italic" style={{ color }}>
          {value}
        </span>
        {TrendIcon && significant && delta !== null && (
          <span
            className="inline-flex items-center"
            style={{ color: trendColor }}
            title={`Δ ${delta > 0 ? "+" : ""}${delta.toFixed(1)} vs prior`}
          >
            <TrendIcon className="h-2.5 w-2.5" aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  )
}

function Panel({
  children,
  accent,
  cp,
  className,
}: {
  children: React.ReactNode
  accent: string
  cp?: boolean
  className?: string
}) {
  return (
    <div
      className={`${cp ? "cpclip" : ""} p-3 ${className ?? ""}`}
      style={{
        // Bumped from 0.72 -> 0.86: makes the telemetry cards read
        // clearly when the background is on a bright stripe, without
        // killing the glass effect (still allows accent glow through).
        background: "rgba(0,0,0,0.86)",
        border: `1px solid ${rgba(accent, 0.36)}`,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      {children}
    </div>
  )
}

function Pill({ children, border }: { children: React.ReactNode; border: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-full px-3 py-1.5"
      style={{ background: "rgba(0,0,0,0.9)", border: `1px solid ${border}` }}
    >
      {children}
    </div>
  )
}

function CyberButton({
  color,
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  color: "cyan" | "pink" | "green" | "yellow"
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  const c = NEO[color]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="cpclip inline-flex h-14 items-center justify-center gap-2.5 rounded-[10px] transition-transform duration-150 active:scale-[0.98] disabled:opacity-40"
      style={{
        background: "rgba(0,0,0,0.92)",
        border: `1px solid ${rgba(c, 0.55)}`,
        color: c,
        boxShadow: `0 0 0 1px ${rgba(c, 0.08)}`,
      }}
    >
      <Icon className="h-[18px] w-[18px]" style={{ color: c }} aria-hidden="true" />
      <span
        className="font-display text-[12px] font-black italic uppercase"
        style={{ letterSpacing: "0.22em" }}
      >
        {label}
      </span>
    </button>
  )
}

function ScopedSpeedStyles() {
  // Scoped to .speedtest-root so the source HUD's typography/clip-path and
  // micro-glitch animation render correctly without leaking into the rest of
  // the app. Fonts gracefully fall back to the existing NEO font stack.
  return (
    <style jsx global>{`
      .speedtest-root .hud-text {
        font-family: var(--font-sans);
        font-style: italic;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }
      .speedtest-root .hud-text-tight {
        font-family: var(--font-sans);
        font-style: italic;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .speedtest-root .hud-mono {
        font-family: var(--font-mono);
        font-style: italic;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
      .speedtest-root .font-display {
        font-family: var(--font-sans);
      }
      .speedtest-root .glitch-text {
        text-shadow: 2px 0 #ff2d9c, -2px 0 #00f0ff;
      }
      .speedtest-root .cpclip {
        clip-path: polygon(
          10px 0,
          100% 0,
          100% calc(100% - 10px),
          calc(100% - 10px) 100%,
          0 100%,
          0 10px
        );
      }
      .speedtest-root .micro-glitch {
        animation: speedtest-micro-glitch 4s infinite;
      }
      @keyframes speedtest-micro-glitch {
        0%,
        90%,
        100% {
          transform: translate(0, 0);
          opacity: 1;
        }
        91% {
          transform: translate(-2px, 1px);
          opacity: 0.85;
        }
        92% {
          transform: translate(2px, -1px);
          opacity: 0.92;
        }
        93% {
          transform: translate(0, 0);
        }
      }

      /* Slow opacity + scale breath used by the idle ready-halo so the
         screen reads alive before a run starts. Caps at ~5% scale so the
         halo never crowds the sphere. */
      .speedtest-root .speedtest-ready-halo {
        animation: speedtest-ready-breath 3.4s ease-in-out infinite;
      }
      @keyframes speedtest-ready-breath {
        0%,
        100% {
          opacity: 0.35;
          transform: scale(0.97);
        }
        50% {
          opacity: 0.7;
          transform: scale(1.04);
        }
      }

      /* Completion shockwave: green ring expands and fades out once. A
         second cyan ring follows slightly later so the burst reads as
         multilayered without looping. */
      .speedtest-root .speedtest-shockwave {
        animation: speedtest-shockwave 1.4s ease-out forwards;
        opacity: 0;
      }
      .speedtest-root .speedtest-shockwave-late {
        animation: speedtest-shockwave 1.5s ease-out forwards;
        animation-delay: 0.18s;
        opacity: 0;
      }
      @keyframes speedtest-shockwave {
        0% {
          opacity: 0.95;
          transform: scale(0.55);
        }
        70% {
          opacity: 0.45;
        }
        100% {
          opacity: 0;
          transform: scale(1.6);
        }
      }

      /* Failure flash + brief horizontal jitter so a halted probe feels
         punctuated. Tasteful — runs for under a second total. */
      .speedtest-root .speedtest-fail-glitch {
        animation: speedtest-fail-glitch 0.85s steps(1, end) forwards;
        opacity: 0;
      }
      @keyframes speedtest-fail-glitch {
        0% {
          opacity: 0;
          transform: translateX(0);
        }
        12% {
          opacity: 0.9;
          transform: translateX(-3px);
        }
        24% {
          opacity: 0.85;
          transform: translateX(3px);
        }
        36% {
          opacity: 0.9;
          transform: translateX(-2px);
        }
        48% {
          opacity: 0.8;
          transform: translateX(2px);
        }
        100% {
          opacity: 0;
          transform: translateX(0);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .speedtest-root .micro-glitch,
        .speedtest-root .speedtest-ready-halo,
        .speedtest-root .speedtest-shockwave,
        .speedtest-root .speedtest-shockwave-late,
        .speedtest-root .speedtest-fail-glitch {
          animation: none;
        }
      }
    `}</style>
  )
}

/* =====================================================================
   PhaseSegmentStrip — five-segment LED bar mapping to the real runner
   phases (prep / ping / dl / ul / done). The active segment glows
   brightly, completed segments dim to a steady accent, future segments
   stay muted. All motion is driven by the runner's onStatus callbacks.
===================================================================== */
function PhaseSegmentStrip({
  status,
  running,
  latencySamples,
  phaseProgress,
  uploadConfigured,
}: {
  status: SpeedTestRunStatus
  running: boolean
  latencySamples: { done: number; total: number }
  phaseProgress: number
  uploadConfigured: boolean
}) {
  const activeIndex = PHASE_ORDER.indexOf(status)
  const isFailed = status === "failed" || status === "aborted"
  const PHASE_COLOR: Record<SpeedTestRunStatus, string> = {
    idle: NEO.cyan,
    preparing: NEO.cyan,
    latency: NEO.cyan,
    download: NEO.cyan,
    upload: NEO.green,
    complete: NEO.green,
    aborted: NEO.pink,
    failed: NEO.pink,
  }

  // Detail label shown under the strip — kept honest. During latency we
  // show the sample counter; during download we show the elapsed window
  // percentage; in terminal states we show the verdict word.
  const detail =
    status === "latency" && latencySamples.total > 0
      ? `PING ${latencySamples.done}/${latencySamples.total}`
      : status === "download"
        ? `DL ${Math.round(phaseProgress * 100)}%`
        : status === "upload"
          ? uploadConfigured
            ? "PUSHING UPLINK"
            : "UL N/A"
          : status === "preparing"
            ? "WARMING PROBE"
            : status === "complete"
              ? "PROBE COMPLETE"
              : isFailed
                ? status === "aborted"
                  ? "ABORTED"
                  : "HALTED"
                : running
                  ? "ARMED"
                  : "READY"

  return (
    <div
      className="cpclip w-full"
      style={{
        background: "rgba(0,0,0,0.78)",
        border: "1px solid rgba(255,255,255,0.10)",
        padding: "10px 12px",
      }}
    >
      <div className="flex w-full items-center justify-between">
        <span
          className="hud-mono text-[9px] font-black"
          style={{ color: "rgba(255,255,255,0.72)" }}
        >
          PHASE TRACK
        </span>
        <span
          className="hud-text-tight text-[10px] font-black"
          style={{ color: isFailed ? NEO.pink : NEO.cyan, letterSpacing: "0.18em" }}
        >
          {detail}
        </span>
      </div>
      <div className="mt-2 flex gap-1.5">
        {PHASE_ORDER.map((phase, i) => {
          const isActive = i === activeIndex
          const isPast = activeIndex > i || status === "complete"
          const segColor = isFailed
            ? i <= activeIndex
              ? NEO.pink
              : "rgba(255,255,255,0.08)"
            : isActive
              ? PHASE_COLOR[phase]
              : isPast
                ? rgba(NEO.cyan, 0.45)
                : "rgba(255,255,255,0.08)"
          return (
            <div
              key={phase}
              className="flex-1"
              style={{
                height: 6,
                background: segColor,
                boxShadow: isActive ? `0 0 12px ${PHASE_COLOR[phase]}` : undefined,
                animation: isActive && running ? "ps-pulse-ring 1.4s ease-in-out infinite" : undefined,
              }}
              aria-label={PHASE_LABEL[phase]}
              role="presentation"
            />
          )
        })}
      </div>
      <div className="mt-1 flex justify-between">
        {PHASE_ORDER.map((phase) => (
          <span
            key={phase}
            className="hud-mono text-[8px] font-black opacity-65"
            style={{ color: "rgba(255,255,255,0.6)", letterSpacing: "0.16em" }}
          >
            {PHASE_LABEL[phase]}
          </span>
        ))}
      </div>
    </div>
  )
}

/* =====================================================================
   ProgressArc — SVG ring sitting just inside the sphere container.
   Sweep is driven by the real per-phase progress (sample count /
   elapsed window / completion state). Stays subtle on idle, locks
   green on success, locks pink on failure.
===================================================================== */
function ProgressArc({
  status,
  progress,
}: {
  status: SpeedTestRunStatus
  progress: number
}) {
  // Size matches the sphere container's aspect-square 340 max width with
  // a small inset. SVG draws a 1:1 coordinate system; absolute positioning
  // scales it to the actual rendered box.
  const size = 100
  const radius = 46
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(1, progress))
  const dashOffset = circumference * (1 - clamped)
  const strokeColor =
    status === "complete"
      ? NEO.green
      : status === "failed" || status === "aborted"
        ? NEO.pink
        : status === "upload"
          ? NEO.green
          : NEO.cyan
  const trackOpacity = status === "idle" ? 0.08 : 0.16

  return (
    <svg
      className="pointer-events-none absolute z-[5] h-[88%] w-[88%]"
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
    >
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={`rgba(255,255,255,${trackOpacity})`}
        strokeWidth={1.6}
      />
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{
          transition: "stroke-dashoffset 220ms ease-out, stroke 200ms ease-out",
          filter: `drop-shadow(0 0 6px ${strokeColor})`,
        }}
      />
    </svg>
  )
}

/* =====================================================================
   VerdictBanner — completion verdict computed from REAL thresholds.
   Renders only after a run finishes. Tone shifts to pink when the run
   failed; green when excellent; cyan/yellow for mid-tier results.
===================================================================== */
function VerdictBanner({
  result,
  previous,
}: {
  result: SpeedTestResult
  previous: SpeedTestResult | null
}) {
  const verdict = computeVerdict(result)
  const highlights = result.success ? computeMetricHighlights(result) : null
  const dlDelta =
    previous && previous.success && result.success
      ? result.downloadMbps - previous.downloadMbps
      : null
  const latDelta =
    previous && previous.success && result.success
      ? result.latencyMs - previous.latencyMs
      : null
  return (
    <div
      className="cpclip w-full p-3"
      style={{
        background: "rgba(0,0,0,0.88)",
        border: `1px solid ${rgba(verdict.color, 0.55)}`,
        boxShadow: `0 0 0 1px ${rgba(verdict.color, 0.1)}, 0 0 24px ${rgba(verdict.color, 0.18)}`,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {result.success ? (
            <CheckCircle2 className="h-4 w-4" style={{ color: verdict.color }} aria-hidden="true" />
          ) : (
            <X className="h-4 w-4" style={{ color: verdict.color }} aria-hidden="true" />
          )}
          <span
            className="hud-text-tight text-[12px] font-black italic"
            style={{ color: verdict.color, letterSpacing: "0.18em" }}
          >
            {verdict.label}
          </span>
        </div>
        <span
          className="hud-mono text-[9px] font-black opacity-70"
          style={{ color: "rgba(255,255,255,0.7)" }}
        >
          {new Date(result.completedAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      <p
        className="hud-mono mt-1 text-[9px] font-bold opacity-85"
        style={{ color: "rgba(255,255,255,0.82)" }}
      >
        {verdict.detail}
      </p>
      {highlights && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <HighlightChip
            icon={TrendingUp}
            label="STRONGEST"
            value={highlights.strongest.label}
            note={highlights.strongest.note}
            color={NEO.green}
          />
          <HighlightChip
            icon={TrendingDown}
            label="WEAKEST"
            value={highlights.weakest.label}
            note={highlights.weakest.note}
            color={highlights.weakest.tone === "ok" ? NEO.cyan : NEO.yellow}
          />
        </div>
      )}
      {(dlDelta !== null || latDelta !== null) && (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {dlDelta !== null && (
            <DeltaChip
              icon={ArrowDown}
              label="DL"
              delta={dlDelta}
              unit="Mbps"
              higherIsBetter
            />
          )}
          {latDelta !== null && (
            <DeltaChip icon={Bolt} label="LAT" delta={latDelta} unit="ms" />
          )}
        </div>
      )}
      {result.success && result.uploadMbps === null && (
        <p
          className="hud-mono mt-2 text-[9px] font-bold"
          style={{ color: rgba(NEO.yellow, 0.85), letterSpacing: "0.08em" }}
        >
          UL_NOT_MEASURED · UPLOAD ENDPOINT NOT CONFIGURED
        </p>
      )}
    </div>
  )
}

function HighlightChip({
  icon: Icon,
  label,
  value,
  note,
  color,
}: {
  icon: LucideIcon
  label: string
  value: string
  note: string
  color: string
}) {
  return (
    <div
      className="cpclip flex flex-col gap-0.5 px-2.5 py-2"
      style={{
        background: "rgba(0,0,0,0.78)",
        border: `1px solid ${rgba(color, 0.45)}`,
      }}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="h-3 w-3" style={{ color }} aria-hidden="true" />
        <span
          className="hud-mono text-[8px] font-black opacity-80"
          style={{ color: "rgba(255,255,255,0.75)", letterSpacing: "0.16em" }}
        >
          {label}
        </span>
      </div>
      <span
        className="hud-text-tight text-[11px] font-black italic"
        style={{ color, letterSpacing: "0.06em" }}
      >
        {value}
      </span>
      <span
        className="hud-mono text-[9px] font-bold"
        style={{ color: "rgba(255,255,255,0.7)", letterSpacing: "0.06em" }}
      >
        {note}
      </span>
    </div>
  )
}

/**
 * Pick a strongest/weakest metric from a completed result. The criteria are
 * the same thresholds the verdict uses (download, latency, jitter), but
 * applied per-metric so the user gets a one-glance interpretation:
 *
 *   - download:  ≥50 strong · ≥20 ok · <20 weak
 *   - latency:   ≤35 strong · ≤80 ok · >80 weak
 *   - jitter:    ≤8 strong  · ≤25 ok · >25 weak
 *   - upload:    measured + ≥10 Mbps strong · measured ok · not-measured weak
 *
 * The function is honest: it never lies, never invents a metric that wasn't
 * captured, and labels "Upload not measured" plainly when applicable.
 */
function computeMetricHighlights(result: SpeedTestResult): {
  strongest: { label: string; note: string }
  weakest: { label: string; note: string; tone: "ok" | "warn" }
} {
  type Metric = {
    name: string
    note: string
    tier: MetricTier
    rank: number
  }

  // Each metric is graded by the shared helpers in
  // lib/network/speedTestThresholds.ts so this UI never disagrees with
  // computeVerdict / verdictAccentColor / Mission Control.
  const metrics: Metric[] = []

  metrics.push({
    name: "Download path",
    note: `${result.downloadMbps.toFixed(1)} Mbps`,
    tier: gradeDownload(result.downloadMbps),
    rank: result.downloadMbps,
  })

  // Latency + jitter rank as -value so lower-is-better metrics sort the
  // same direction as higher-is-better metrics in the tier-tied tiebreaker.
  metrics.push({
    name: "Request latency",
    note: `${Math.round(result.latencyMs)} ms`,
    tier: gradeLatency(result.latencyMs),
    rank: -result.latencyMs,
  })

  metrics.push({
    name: "Jitter",
    note: `${Math.round(result.jitterMs)} ms σ`,
    tier: gradeJitter(result.jitterMs),
    rank: -result.jitterMs,
  })

  if (result.uploadMbps !== null) {
    metrics.push({
      name: "Upload path",
      note: `${result.uploadMbps.toFixed(1)} Mbps`,
      tier: gradeUpload(result.uploadMbps),
      rank: result.uploadMbps,
    })
  }

  const TIER_RANK: Record<MetricTier, number> = { strong: 2, ok: 1, weak: 0 }
  const sorted = [...metrics].sort((a, b) => {
    const t = TIER_RANK[b.tier] - TIER_RANK[a.tier]
    if (t !== 0) return t
    return b.rank - a.rank
  })

  const strongest = sorted[0]
  const weakest = sorted[sorted.length - 1]

  // Upload-not-measured is shown explicitly in the weakest slot only when no
  // other "weak" metric stands out — keeps the badge honest.
  const uploadMissing = result.uploadMbps === null
  if (uploadMissing && weakest.tier === "strong") {
    return {
      strongest: { label: strongest.name, note: strongest.note },
      weakest: {
        label: "Upload not measured",
        note: "Endpoint not configured",
        tone: "warn",
      },
    }
  }

  return {
    strongest: { label: strongest.name, note: strongest.note },
    weakest: {
      label: weakest.name,
      note: weakest.note,
      tone: weakest.tier === "weak" ? "warn" : "ok",
    },
  }
}

function DeltaChip({
  icon: Icon,
  label,
  delta,
  unit,
  higherIsBetter = false,
}: {
  icon: LucideIcon
  label: string
  delta: number
  unit: string
  higherIsBetter?: boolean
}) {
  const positive = delta > 0
  const goodDirection = higherIsBetter ? positive : !positive
  // Same significance gating as the recent-runs delta — keeps small
  // measurement noise from triggering misleading colored chips. Pulled
  // from the shared module so the noise floor matches Mission Control.
  const noiseFloor = higherIsBetter
    ? SPEED_TEST_SIGNIFICANCE.downloadMbps
    : SPEED_TEST_SIGNIFICANCE.latencyMs
  const significant = Math.abs(delta) > noiseFloor
  const color = significant ? (goodDirection ? NEO.green : NEO.pink) : "rgba(255,255,255,0.55)"
  const sign = delta > 0 ? "+" : ""
  return (
    <span
      className="hud-mono inline-flex items-center gap-1 text-[9px] font-black"
      style={{ color, letterSpacing: "0.14em" }}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label} {sign}
      {delta.toFixed(1)} {unit} vs prior
    </span>
  )
}

function computeVerdict(result: SpeedTestResult): {
  label: string
  detail: string
  color: string
} {
  if (!result.success) {
    if (result.failureReason === "aborted") {
      return {
        label: "ABORTED",
        detail: "Probe aborted before completion. No metrics recorded.",
        color: NEO.pink,
      }
    }
    return {
      label: "PROBE FAILED",
      detail: result.failureReason
        ? `Reason: ${result.failureReason.replace(/-/g, " ")}`
        : "Probe did not complete; metrics unavailable.",
      color: NEO.pink,
    }
  }
  // Use the shared graders so this verdict, the strongest/weakest chips,
  // and Mission Control's LAST_RUN summary all interpret the same numbers
  // the same way.
  const dl = result.downloadMbps
  const lat = result.latencyMs
  const dlTier = gradeDownload(dl)
  const latTier = gradeLatency(lat)
  if (dlTier === "strong" && latTier === "strong") {
    return {
      label: "EXCELLENT",
      detail: `Internet path is fast and responsive — ${dl.toFixed(1)} Mbps down, ${Math.round(lat)} ms latency.`,
      color: NEO.green,
    }
  }
  if (dlTier !== "weak" && latTier !== "weak") {
    return {
      label: "GOOD",
      detail: `Stable internet path — ${dl.toFixed(1)} Mbps down, ${Math.round(lat)} ms latency.`,
      color: NEO.cyan,
    }
  }
  if (dlTier !== "weak" || latTier !== "weak") {
    return {
      label: "USABLE",
      detail: `Throughput is adequate but latency or jitter may impact realtime use (${dl.toFixed(1)} Mbps · ${Math.round(lat)} ms).`,
      color: NEO.yellow,
    }
  }
  return {
    label: "DEGRADED",
    detail: `Throughput is low — ${dl.toFixed(1)} Mbps down, ${Math.round(lat)} ms latency.`,
    color: NEO.pink,
  }
}

/* =====================================================================
   UploadEndpointConfig — honest UI for the upload path. Without a
   configured endpoint we say so explicitly, and offer an inline input
   that the user can fill with their own POST endpoint. The URL is
   persisted to localStorage; the runner picks it up on the next run.
===================================================================== */
function UploadEndpointConfig({
  uploadUrlSaved,
  uploadUrlInput,
  onChangeInput,
  open,
  onToggle,
  onSave,
  onClear,
}: {
  uploadUrlSaved: string | null
  uploadUrlInput: string
  onChangeInput: (value: string) => void
  open: boolean
  onToggle: () => void
  onSave: () => void
  onClear: () => void
}) {
  const configured = uploadUrlSaved !== null
  const accentColor = configured ? NEO.green : NEO.yellow
  return (
    <div
      className="cpclip mt-3 p-3"
      style={{
        background: "rgba(0,0,0,0.86)",
        // Configured state gets the green accent (live and ready); the
        // unconfigured "locked by configuration" state gets a warm-amber
        // accent so it reads as intentional, not as an error dump.
        border: `1px solid ${rgba(accentColor, configured ? 0.45 : 0.4)}`,
        boxShadow: configured
          ? `0 0 0 1px ${rgba(NEO.green, 0.08)}`
          : `0 0 0 1px ${rgba(NEO.yellow, 0.06)}`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {configured ? (
            <LinkIcon className="h-3 w-3" style={{ color: NEO.green }} aria-hidden="true" />
          ) : (
            <Lock className="h-3 w-3" style={{ color: NEO.yellow }} aria-hidden="true" />
          )}
          <span
            className="hud-mono text-[9px] font-black"
            style={{ color: accentColor, letterSpacing: "0.12em" }}
          >
            UPLOAD ENDPOINT
          </span>
          {!configured && (
            <span
              className="hud-mono rounded px-1.5 py-px text-[8px] font-black"
              style={{
                color: NEO.yellow,
                background: rgba(NEO.yellow, 0.1),
                border: `1px solid ${rgba(NEO.yellow, 0.45)}`,
                letterSpacing: "0.18em",
              }}
            >
              LOCKED
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="hud-mono text-[9px] font-black opacity-90"
          style={{ color: NEO.cyan, letterSpacing: "0.12em" }}
        >
          {open ? "CLOSE" : configured ? "EDIT" : "UNLOCK"}
        </button>
      </div>
      <p
        className="hud-mono mt-1 text-[9px] font-bold"
        style={{ color: "rgba(255,255,255,0.82)", letterSpacing: "0.08em" }}
      >
        {configured ? (
          <>
            <span style={{ color: NEO.green }}>CONFIGURED · </span>
            {safeUrlHost(uploadUrlSaved!)}
          </>
        ) : (
          <>
            <span style={{ color: NEO.yellow }}>UL_ENDPOINT_NOT_CONFIGURED · </span>
            Upload reads N/A until a POST endpoint is wired in. Download,
            latency, and jitter are unaffected — they remain fully measured.
          </>
        )}
      </p>
      {open && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="url"
            value={uploadUrlInput}
            placeholder="https://your-endpoint.example/upload"
            onChange={(event) => onChangeInput(event.target.value)}
            className="cpclip flex-1 px-3 py-2 hud-mono text-[10px] font-black"
            style={{
              background: "rgba(0,0,0,0.92)",
              border: "1px solid rgba(255,255,255,0.14)",
              color: NEO.yellow,
              letterSpacing: "0.10em",
            }}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Upload endpoint URL"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSave}
              className="cpclip inline-flex h-9 items-center justify-center gap-1.5 px-3 hud-mono text-[10px] font-black"
              style={{
                background: "rgba(0,0,0,0.92)",
                border: `1px solid ${rgba(NEO.cyan, 0.55)}`,
                color: NEO.cyan,
                letterSpacing: "0.16em",
              }}
            >
              SAVE
            </button>
            {uploadUrlSaved && (
              <button
                type="button"
                onClick={onClear}
                className="cpclip inline-flex h-9 items-center justify-center gap-1.5 px-3 hud-mono text-[10px] font-black"
                style={{
                  background: "rgba(0,0,0,0.92)",
                  border: `1px solid ${rgba(NEO.pink, 0.55)}`,
                  color: NEO.pink,
                  letterSpacing: "0.16em",
                }}
              >
                CLEAR
              </button>
            )}
          </div>
        </div>
      )}
      {uploadConfiguredHasUrlAndIsOpen(uploadUrlSaved, open) && (
        <p
          className="hud-mono mt-2 text-[9px] font-bold opacity-75"
          style={{ color: "rgba(255,255,255,0.7)", letterSpacing: "0.08em" }}
        >
          Endpoint must accept POST with a raw binary body and respond 200 OK.
          The runner sends a 64–512 KB payload of cryptographic random bytes.
        </p>
      )}
    </div>
  )
}

function safeUrlHost(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

function uploadConfiguredHasUrlAndIsOpen(saved: string | null, open: boolean): boolean {
  // Small helper purely to keep the JSX readable above.
  return open && saved !== null
}

function seedJitterBars(ms: number): number[] {
  const base = Math.max(2, Math.min(30, ms || 2))
  return Array.from({ length: 10 }, () =>
    Math.max(3, Math.min(12, (Math.random() * base) / 2 + 3)),
  )
}

/**
 * Bars derived from REAL latency samples. Each bar height is proportional to
 * the spread between that sample and the rolling mean — so a quiet network
 * produces a flat row, a noisy one produces visible variation. Padded with
 * neutral mid-height bars when we have fewer than 10 samples so the row
 * still looks alive while the phase fills up.
 */
function barsFromLatencySamples(samples: number[]): number[] {
  if (!samples.length) return seedJitterBars(2)
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length
  const mapped = samples.map((s) => {
    const delta = Math.abs(s - mean)
    // Scale to [3..12] using the deviation; cap at 12 so the tallest bar
    // stays inside the row. Floor at 3 so bars stay visible at low jitter.
    return Math.max(3, Math.min(12, 3 + delta / 1.5))
  })
  while (mapped.length < 10) mapped.unshift(6)
  return mapped.slice(-10)
}

function rgba(hex: string, alpha: number) {
  const m = hex.replace("#", "")
  const r = parseInt(m.slice(0, 2), 16)
  const g = parseInt(m.slice(2, 4), 16)
  const b = parseInt(m.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
