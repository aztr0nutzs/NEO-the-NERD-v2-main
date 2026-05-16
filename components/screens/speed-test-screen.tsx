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
import { Activity, Bolt, Eraser, Rocket as RocketIcon, X, type LucideIcon } from "lucide-react"
import { useApp } from "@/lib/store"
import {
  defaultCloudflarePreset,
  runStreamingSpeedTest,
  type SpeedTestRunStatus,
} from "@/lib/network/speedTestRunner"
import type { SpeedTestConfig, SpeedTestResult } from "@/lib/network/types"

const NEO = {
  cyan: "#00f0ff",
  pink: "#ff2d9c",
  green: "#39ff14",
  yellow: "#ff7a00",
  text: "rgba(231,251,255,0.92)",
} as const

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
  const [uploadConfigured, setUploadConfigured] = useState<boolean>(
    Boolean(configOverride?.uploadUrl),
  )

  const abortRef = useRef<AbortController | null>(null)
  const telemetryRef = useRef<HTMLDivElement | null>(null)
  const logSeqRef = useRef(0)

  const pushLog = useCallback((text: string, color: TelemetryColor = "cyan") => {
    logSeqRef.current += 1
    const id = logSeqRef.current
    setTelemetry((prev) => [...prev, { id, text, color }])
  }, [])

  useEffect(() => {
    const el = telemetryRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [telemetry])

  /* ============================================================
     Sphere gauge — EXACT canvas animation from nerd_speed.html.
     Particle colors remapped to NEO cyan / pink.
  ============================================================ */
  const sphereRef = useRef<HTMLCanvasElement | null>(null)
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

      ctx.lineWidth = 1
      for (let i = 0; i < 8; i++) {
        const t = frame / 100 + (i / 8) * Math.PI * 2
        const xOffset = Math.sin(t) * 20
        ctx.beginPath()
        ctx.strokeStyle = `rgba(0, 240, 255, ${0.1 + Math.abs(Math.cos(t)) * 0.2})`
        ctx.arc(cx + xOffset, cy, radius, 0, Math.PI * 2)
        ctx.stroke()
      }

      for (let i = 0; i < 15; i++) {
        const angle = frame / 50 + (i / 15) * Math.PI * 2
        const dist = Math.sin(frame / 30 + i) * radius * 0.8
        const x = cx + Math.cos(angle) * dist
        const y = cy + Math.sin(angle) * dist

        ctx.fillStyle = i % 2 === 0 ? NEO.cyan : NEO.pink
        ctx.beginPath()
        ctx.arc(x, y, 1.5, 0, Math.PI * 2)
        ctx.fill()

        ctx.shadowBlur = 10
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
    const config: SpeedTestConfig = { ...baseConfig, ...configOverride }
    setUploadConfigured(Boolean(config.uploadUrl))

    // Reset readouts for the new run.
    setRunning(true)
    setTelemetry([])
    logSeqRef.current = 0
    setMainValue(0)
    setDlValue("--")
    setUlValue(config.uploadUrl ? "--" : "N/A")
    setPingMedian("--")
    setJitter("--")
    setJitterBars(seedJitterBars(2))
    setProbeStatus("RUNNING")
    setProbeColor("green")
    setStatusLabel("PREPARING")

    const runId = `speed-${Date.now()}`
    recordSpeedTestStarted(runId, config.provider)

    let result: SpeedTestResult
    try {
      result = await runStreamingSpeedTest(config, {
        signal: ctrl.signal,
        onStatus: (status, label) => {
          setStatusLabel(label)
          setProbeColor(STATUS_COLOR[status])
        },
        onLog: (line) => pushLog(line.message, LOG_LEVEL_COLOR[line.level]),
        onLatencySample: (sample) => {
          // While the latency phase runs, surface the running sample count.
          pushLog(`PING_SAMPLE ${sample.index}/${sample.total}=${Math.round(sample.sampleMs)}ms`, "cyan")
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

    if (result.success) {
      setProbeStatus("READY")
      setProbeColor("green")
    } else {
      setProbeStatus(result.failureReason === "aborted" ? "ABORTED" : "FAILED")
      setProbeColor("pink")
    }

    recordSpeedTestResult(result)
  }, [configOverride, pushLog, recordSpeedTestResult, recordSpeedTestStarted, running, safeMode])

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
          background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(10px)",
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

        {!uploadConfigured && (
          <p
            className="hud-mono mt-3 text-[9px] font-black"
            style={{ color: rgba(NEO.yellow, 0.85), letterSpacing: "0.10em" }}
          >
            UL_ENDPOINT_NOT_CONFIGURED — upload reads N/A until an upload URL is wired in.
          </p>
        )}

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
  return (
    <Panel accent={NEO.green} cp className="w-full">
      <div className="flex items-center justify-between">
        <span className="hud-mono text-[9px] font-black" style={{ color: NEO.green }}>
          RECENT RUNS
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
        {last.map((run) => (
          <div
            key={run.id}
            className="cpclip grid grid-cols-4 items-baseline gap-2 px-3 py-2"
            style={{
              background: "rgba(0,0,0,0.85)",
              border: `1px solid ${rgba(run.success ? NEO.green : NEO.pink, 0.4)}`,
            }}
          >
            <span
              className="hud-mono text-[9px] font-bold opacity-70"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              {new Date(run.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <Metric label="DL" value={`${run.downloadMbps.toFixed(1)}`} color={NEO.cyan} />
            <Metric
              label="UL"
              value={run.uploadMbps === null ? "N/A" : run.uploadMbps.toFixed(1)}
              color={NEO.pink}
            />
            <Metric label="LAT" value={`${Math.round(run.latencyMs)}ms`} color={NEO.yellow} />
          </div>
        ))}
      </div>
    </Panel>
  )
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col leading-tight">
      <span
        className="hud-mono text-[8px] font-black opacity-65"
        style={{ color: "rgba(255,255,255,0.7)" }}
      >
        {label}
      </span>
      <span className="hud-text-tight text-[11px] font-black italic" style={{ color }}>
        {value}
      </span>
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
        background: "rgba(0,0,0,0.72)",
        border: `1px solid ${rgba(accent, 0.28)}`,
        backdropFilter: "blur(8px)",
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
    `}</style>
  )
}

function seedJitterBars(ms: number): number[] {
  const base = Math.max(2, Math.min(30, ms || 2))
  return Array.from({ length: 10 }, () =>
    Math.max(3, Math.min(12, (Math.random() * base) / 2 + 3)),
  )
}

function rgba(hex: string, alpha: number) {
  const m = hex.replace("#", "")
  const r = parseInt(m.slice(0, 2), 16)
  const g = parseInt(m.slice(2, 4), 16)
  const b = parseInt(m.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
