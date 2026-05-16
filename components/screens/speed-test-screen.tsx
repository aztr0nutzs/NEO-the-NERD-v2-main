"use client"

/*
 * Faithful port of nerd_speed.html into NEO. The HUD layout, sphere gauge,
 * dual-value readout, stat panels, jitter bars, control strip, telemetry log,
 * safe-mode toggle, and Execute/Abort buttons are reproduced as in the source.
 * Only the colors are remapped from the source palette (cyan/pink/green/yellow)
 * to the NEO palette (cyan/pink/green/orange) defined in app/globals.css.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Activity, Bolt, Rocket as RocketIcon, X, type LucideIcon } from "lucide-react"

const NEO = {
  cyan: "#00f0ff",
  pink: "#ff2d9c",
  green: "#39ff14",
  yellow: "#ff7a00", // NEO "warm accent" — replaces the source HUD's yellow
  text: "rgba(231,251,255,0.92)",
} as const

interface SpeedTestScreenProps {
  /** Optional internal test seam — defaults to live Cloudflare endpoints. */
  endpoints?: {
    latency: string
    download: (bytes: number) => string
    upload: string
  }
}

const DEFAULT_ENDPOINTS = {
  latency: "https://www.cloudflare.com/cdn-cgi/trace",
  download: (bytes: number) => `https://speed.cloudflare.com/__down?bytes=${bytes}`,
  upload: "https://speed.cloudflare.com/__up",
} as const

type TelemetryColor = "cyan" | "pink" | "green" | "yellow"

interface TelemetryLine {
  id: number
  text: string
  color: TelemetryColor
}

export function SpeedTestScreen({ endpoints = DEFAULT_ENDPOINTS }: SpeedTestScreenProps = {}) {
  // Probe state — preserves the source HUD's IDLE / INJECTING_PACKETS /
  // PULLING_PAYLOADS / PUSHING_UPLINK / COMPLETE / ABORT / HALT phases.
  const [statusLabel, setStatusLabel] = useState("IDLE")
  const [statusColor, setStatusColor] = useState<TelemetryColor>("pink")
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

  const abortRef = useRef(false)
  const telemetryRef = useRef<HTMLDivElement | null>(null)

  const log = useCallback((text: string, color: TelemetryColor = "cyan") => {
    setTelemetry((prev) => [...prev, { id: prev.length + 1, text, color }])
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
     Probe pipeline — same shape as the source: latency, download,
     upload, in that order, with abort checkpoints between phases.
  ============================================================ */
  const handleExecute = useCallback(async () => {
    if (running) return
    abortRef.current = false
    setRunning(true)
    setTelemetry([])
    setProbeStatus("RUNNING")
    setProbeColor("green")
    setStatusLabel("INJECTING_PACKETS")
    setStatusColor("pink")
    log("PROBE START", "green")

    try {
      const p = await testLatency({ safe: safeMode, abortRef, url: endpoints.latency })
      if (abortRef.current) throw new Error("ABORTED")
      setPingMedian(String(Math.round(p.median)))
      setJitter(String(Math.round(p.jitter)))
      setJitterBars(seedJitterBars(p.jitter || 2))
      log(`PING_MEDIAN=${Math.round(p.median)}ms JITTER=${Math.round(p.jitter)}ms`, "cyan")

      setStatusLabel("PULLING_PAYLOADS")
      setStatusColor("cyan")
      const dl = await testDownload({
        safe: safeMode,
        abortRef,
        url: endpoints.download(safeMode ? 6_000_000 : 12_000_000),
        onTick: (mbps) => setMainValue(mbps),
        log,
      })
      if (abortRef.current) throw new Error("ABORTED")
      setDlValue(dl.toFixed(1))
      setMainValue(dl)
      log(`DL=${dl.toFixed(1)} Mbps`, "yellow")

      setStatusLabel("PUSHING_UPLINK")
      setStatusColor("green")
      const ul = await testUpload({ safe: safeMode, abortRef, url: endpoints.upload, log })
      if (abortRef.current) throw new Error("ABORTED")
      setUlValue(ul.toFixed(1))
      log(`UL=${ul.toFixed(1)} Mbps`, "yellow")

      setStatusLabel("COMPLETE")
      setStatusColor("pink")
      setProbeStatus("READY")
      setProbeColor("green")
      log("PROBE COMPLETE", "green")
    } catch (err) {
      setStatusLabel("HALT")
      setStatusColor("pink")
      setProbeStatus("READY")
      setProbeColor("green")
      log(`ERROR=${err instanceof Error ? err.message : String(err)}`, "pink")
    } finally {
      setRunning(false)
    }
  }, [endpoints, log, running, safeMode])

  const handleAbort = useCallback(() => {
    abortRef.current = true
    setProbeStatus("ABORTED")
    setProbeColor("pink")
    setStatusLabel("ABORT")
    setStatusColor("pink")
    log("ABORT SIGNAL SENT", "pink")
  }, [log])

  const mainDisplay = useMemo(() => mainValue.toFixed(1), [mainValue])

  return (
    <div
      className="speedtest-root flex w-full flex-col items-center gap-4 overflow-hidden px-1 pt-1"
      style={{ color: NEO.text }}
    >
      <ScopedSpeedStyles />

      {/* Top header strip — matches the source TOP BAR composition */}
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

      {/* Gauge block */}
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

      {/* Stat panels — Ping Median + Jitter */}
      <div className="grid w-full grid-cols-2 gap-3">
        <Panel accent={NEO.cyan} cp>
          <div className="flex items-start justify-between">
            <span className="hud-mono text-[9px] font-black" style={{ color: NEO.cyan }}>
              PING MEDIAN
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
              ms
            </span>
          </div>
          <div className="mt-2 h-1 w-full" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div
              className="h-full w-full"
              style={{
                background: `linear-gradient(90deg, transparent, ${rgba(NEO.cyan, 0.9)}, transparent)`,
                animation: "ps-pulse-ring 1.6s ease-in-out infinite",
              }}
            />
          </div>
        </Panel>

        <Panel accent={NEO.pink} cp>
          <div className="flex items-start justify-between">
            <span className="hud-mono text-[9px] font-black" style={{ color: NEO.pink }}>
              JITTER
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

      {/* Control strip */}
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
    </div>
  )
}

/* =====================================================================
   Internal pieces
===================================================================== */

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

/* =====================================================================
   Probe helpers — ported from nerd_speed.html
===================================================================== */

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

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit) {
  const ctrl = new AbortController()
  const to = window.setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { cache: "no-store", mode: "cors", signal: ctrl.signal, ...init })
  } finally {
    window.clearTimeout(to)
  }
}

function sleep(ms: number) {
  return new Promise<void>((r) => window.setTimeout(r, ms))
}

interface AbortLike {
  current: boolean
}

async function testLatency({
  safe,
  abortRef,
  url,
}: {
  safe: boolean
  abortRef: AbortLike
  url: string
}): Promise<{ median: number; jitter: number }> {
  const samples = safe ? 8 : 14
  const timeoutMs = safe ? 1400 : 1800
  const times: number[] = []
  for (let i = 0; i < samples; i++) {
    if (abortRef.current) throw new Error("ABORTED")
    const t0 = performance.now()
    await fetchWithTimeout(`${url}?${Date.now()}-${i}`, timeoutMs).catch(() => null)
    times.push(performance.now() - t0)
    await sleep(70)
  }
  if (times.length === 0) return { median: 0, jitter: 0 }
  times.sort((a, b) => a - b)
  const median = times[Math.floor(times.length / 2)]
  const mean = times.reduce((s, v) => s + v, 0) / times.length
  const variance = times.reduce((s, v) => s + (v - mean) ** 2, 0) / times.length
  return { median, jitter: Math.sqrt(variance) }
}

async function testDownload({
  safe,
  abortRef,
  url,
  onTick,
  log,
}: {
  safe: boolean
  abortRef: AbortLike
  url: string
  onTick: (mbps: number) => void
  log: (msg: string, color: TelemetryColor) => void
}): Promise<number> {
  const timeoutMs = safe ? 9000 : 12000
  const t0 = performance.now()
  let bytes = 0
  const res = await fetchWithTimeout(`${url}&${Date.now()}`, timeoutMs).catch(() => null)
  if (!res || !res.body) {
    log("DL_ENDPOINT_BLOCKED (CORS/FILE MODE). DISPLAYING 0.0", "pink")
    return 0
  }
  const reader = res.body.getReader()
  while (true) {
    if (abortRef.current) throw new Error("ABORTED")
    const { value, done } = await reader.read()
    if (done) break
    bytes += value?.byteLength ?? 0
    const dt = (performance.now() - t0) / 1000
    if (dt > (safe ? 6.5 : 8.5)) break
    const mbpsLive = (bytes * 8) / (dt * 1e6)
    onTick(mbpsLive)
  }
  const secs = (performance.now() - t0) / 1000
  const mbps = (bytes * 8) / (secs * 1e6)
  return Number.isFinite(mbps) ? mbps : 0
}

async function testUpload({
  safe,
  abortRef,
  url,
  log,
}: {
  safe: boolean
  abortRef: AbortLike
  url: string
  log: (msg: string, color: TelemetryColor) => void
}): Promise<number> {
  const timeoutMs = safe ? 9000 : 12000
  const bytes = safe ? 2_500_000 : 5_000_000
  const payload = new Uint8Array(bytes)
  crypto.getRandomValues(payload)
  if (abortRef.current) throw new Error("ABORTED")
  const t0 = performance.now()
  await fetchWithTimeout(`${url}?${Date.now()}`, timeoutMs, {
    method: "POST",
    body: payload,
  }).catch(() => null)
  const secs = (performance.now() - t0) / 1000
  const mbps = (bytes * 8) / (secs * 1e6)
  if (!Number.isFinite(mbps) || mbps < 0) {
    log("UL_ENDPOINT_BLOCKED (CORS/FILE MODE). DISPLAYING 0.0", "pink")
    return 0
  }
  return mbps
}
