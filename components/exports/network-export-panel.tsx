"use client"

import { motion } from "framer-motion"
import {
  Brackets,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Sparkles,
  Sparkle,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { useApp } from "@/lib/store"
import { NeonPanel } from "../neon-panel"
import { buildNetworkAssistantContext } from "@/lib/network/networkAssistantContext"
import { buildNetworkReport } from "@/lib/exports/network-report"
import { serializeReport, serializeDeviceInventory } from "@/lib/exports/formatters"
import type { ExportFormat } from "@/lib/exports/formatters"
import { downloadReport, copyReportToClipboard } from "@/lib/exports/download"
import { buildExportAiSummary } from "@/lib/exports/ai-summary"
import { canUseFeature, listPlusCandidates } from "@/lib/entitlements/tiers"

type Bundle = "network-report" | "device-inventory"

type Status =
  | { kind: "idle" }
  | { kind: "working"; message: string }
  | { kind: "ok"; message: string }
  | { kind: "error"; message: string }

const FORMAT_META: Record<ExportFormat, { label: string; icon: typeof FileJson; accent: string; description: string }> =
  {
    json: {
      label: "JSON",
      icon: FileJson,
      accent: "#00f0ff",
      description: "Structured machine-readable bundle.",
    },
    csv: {
      label: "CSV",
      icon: FileSpreadsheet,
      accent: "#39ff14",
      description: "Spreadsheet-friendly multi-section file.",
    },
    text: {
      label: "TEXT",
      icon: FileText,
      accent: "#b829ff",
      description: "Printable mission report.",
    },
  }

export function NetworkExportPanel() {
  const {
    networkAssistantSnapshot,
    networkEvents,
    networkAlerts,
    networkHealthSnapshots,
    lastNetworkScanDelta,
    networkMonitorState,
    persistedNetworkSettings,
    settings,
  } = useApp()

  const [bundle, setBundle] = useState<Bundle>("network-report")
  const [format, setFormat] = useState<ExportFormat>("json")
  const [includeAiSummary, setIncludeAiSummary] = useState(true)
  const [status, setStatus] = useState<Status>({ kind: "idle" })

  const adapterLabel = persistedNetworkSettings?.demoMode
    ? "DEMO_NETWORK_DATA"
    : "LIVE_NETWORK_ADAPTER"
  const adapterIsDemo = Boolean(persistedNetworkSettings?.demoMode ?? true)

  const reportPreview = useMemo(
    () =>
      buildNetworkReport({
        snapshot: networkAssistantSnapshot,
        events: networkEvents,
        alerts: networkAlerts,
        healthSnapshots: networkHealthSnapshots,
        latestScan: lastNetworkScanDelta,
        adapterLabel,
        adapterIsDemo,
      }),
    [
      adapterIsDemo,
      adapterLabel,
      lastNetworkScanDelta,
      networkAlerts,
      networkAssistantSnapshot,
      networkEvents,
      networkHealthSnapshots,
    ],
  )

  const aiProviderEntitled = canUseFeature(settings.entitlement, "ai.summary.provider")

  const handleExport = useCallback(async () => {
    setStatus({ kind: "working", message: "Building report…" })
    try {
      const report = buildNetworkReport({
        snapshot: networkAssistantSnapshot,
        events: networkEvents,
        alerts: networkAlerts,
        healthSnapshots: networkHealthSnapshots,
        latestScan: lastNetworkScanDelta,
        adapterLabel,
        adapterIsDemo,
      })

      let aiSummary: string | undefined
      if (bundle === "network-report" && includeAiSummary) {
        setStatus({ kind: "working", message: "Writing summary…" })
        const summary = await buildExportAiSummary(
          report,
          buildNetworkAssistantContext({
            prompt: "executive summary",
            snapshot: networkAssistantSnapshot,
            events: networkEvents,
            latestScan: lastNetworkScanDelta,
            healthSnapshots: networkHealthSnapshots,
            alerts: networkAlerts,
            monitorState: networkMonitorState,
          }),
          { allowProvider: aiProviderEntitled },
        )
        aiSummary = summary.text
      }

      const serialized =
        bundle === "device-inventory"
          ? serializeDeviceInventory(report, format)
          : serializeReport(report, format, { aiSummary })

      const result = await downloadReport(serialized)
      if (!result.ok) {
        setStatus({
          kind: "error",
          message: result.error ?? "Export failed.",
        })
        return
      }
      const where =
        result.location === "documents"
          ? "Saved to Documents."
          : result.location === "clipboard"
            ? "Copied to clipboard."
            : "Downloaded."
      setStatus({ kind: "ok", message: `${serialized.filename} · ${where}` })
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Unexpected export error.",
      })
    }
  }, [
    adapterIsDemo,
    adapterLabel,
    aiProviderEntitled,
    bundle,
    format,
    includeAiSummary,
    lastNetworkScanDelta,
    networkAlerts,
    networkAssistantSnapshot,
    networkEvents,
    networkHealthSnapshots,
    networkMonitorState,
  ])

  const handleCopy = useCallback(async () => {
    setStatus({ kind: "working", message: "Copying report…" })
    try {
      const report = buildNetworkReport({
        snapshot: networkAssistantSnapshot,
        events: networkEvents,
        alerts: networkAlerts,
        healthSnapshots: networkHealthSnapshots,
        latestScan: lastNetworkScanDelta,
        adapterLabel,
        adapterIsDemo,
      })
      const serialized =
        bundle === "device-inventory"
          ? serializeDeviceInventory(report, format)
          : serializeReport(report, format)
      const result = await copyReportToClipboard(serialized)
      setStatus(
        result.ok
          ? { kind: "ok", message: `${serialized.filename} copied to clipboard.` }
          : { kind: "error", message: result.error ?? "Clipboard write failed." },
      )
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Unexpected error.",
      })
    }
  }, [
    adapterIsDemo,
    adapterLabel,
    bundle,
    format,
    lastNetworkScanDelta,
    networkAlerts,
    networkAssistantSnapshot,
    networkEvents,
    networkHealthSnapshots,
  ])

  return (
    <NeonPanel accent="cyan" glow="strong" scanlines className="p-4">
      <div className="flex items-start gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
          style={{
            background: "rgba(0,240,255,0.12)",
            boxShadow: "inset 0 0 0 1px rgba(0,240,255,0.55)",
          }}
        >
          <Download className="h-4 w-4 ps-text-cyan" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="ps-mono text-[10px] tracking-[0.3em] ps-text-cyan">
            REPORTS / EXPORTS
          </p>
          <p className="mt-0.5 text-[12px] text-white/70">
            Build a snapshot of your scan, devices, events, alerts, and health
            timeline in the format of your choice. Nothing leaves your device.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <p className="ps-mono mb-2 text-[10px] tracking-[0.3em] text-white/55">
            BUNDLE
          </p>
          <div className="grid grid-cols-2 gap-2">
            <BundleButton
              icon={Brackets}
              accent="#00f0ff"
              label="NETWORK_REPORT"
              description="Summary · devices · flagged · events · alerts · health"
              active={bundle === "network-report"}
              onClick={() => setBundle("network-report")}
            />
            <BundleButton
              icon={FileSpreadsheet}
              accent="#39ff14"
              label="DEVICE_INVENTORY"
              description="Trusted/labeled devices with owner + room metadata"
              active={bundle === "device-inventory"}
              onClick={() => setBundle("device-inventory")}
            />
          </div>
        </div>

        <div>
          <p className="ps-mono mb-2 text-[10px] tracking-[0.3em] text-white/55">
            FORMAT
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(FORMAT_META) as Array<[ExportFormat, (typeof FORMAT_META)[ExportFormat]]>).map(
              ([key, meta]) => {
                const active = format === key
                const Icon = meta.icon
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormat(key)}
                    className="flex flex-col items-start gap-1 rounded-lg p-2.5 text-left"
                    style={{
                      background: active ? `${meta.accent}1f` : "rgba(0,0,0,0.45)",
                      boxShadow: active
                        ? `inset 0 0 0 1px ${meta.accent}, 0 0 14px ${meta.accent}55`
                        : "inset 0 0 0 1px rgba(255,255,255,0.08)",
                    }}
                  >
                    <span className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5" style={{ color: meta.accent }} />
                      <span
                        className="ps-mono text-[10px] tracking-[0.22em]"
                        style={{ color: meta.accent }}
                      >
                        {meta.label}
                      </span>
                    </span>
                    <span className="text-[11px] leading-snug text-white/75">
                      {meta.description}
                    </span>
                  </button>
                )
              },
            )}
          </div>
          <PlusFormatRow label="PDF" featureId="network.export.pdf" />
        </div>

        {bundle === "network-report" && (
          <button
            type="button"
            onClick={() => setIncludeAiSummary((value) => !value)}
            className="flex w-full items-start gap-2 rounded-lg bg-black/55 p-2.5 text-left"
            style={{ boxShadow: "inset 0 0 0 1px rgba(184,41,255,0.4)" }}
          >
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md"
              style={{
                background: includeAiSummary ? "#b829ff1f" : "rgba(0,0,0,0.45)",
                boxShadow: `inset 0 0 0 1px ${includeAiSummary ? "#b829ff" : "rgba(255,255,255,0.18)"}`,
              }}
            >
              {includeAiSummary ? (
                <Sparkles className="h-4 w-4" style={{ color: "#b829ff" }} />
              ) : (
                <Sparkle className="h-4 w-4 text-white/55" />
              )}
            </span>
            <span className="min-w-0">
              <span className="ps-mono block text-[10px] tracking-[0.25em] ps-text-purple">
                AI EXECUTIVE SUMMARY
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-white/75">
                {aiProviderEntitled
                  ? "Uses the configured AI provider when available; falls back to a deterministic local summary."
                  : "Local deterministic summary used (provider summary is a Plus candidate)."}
              </span>
            </span>
          </button>
        )}

        <div
          className="rounded-lg bg-black/55 p-3"
          style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
        >
          <p className="ps-mono text-[10px] tracking-[0.25em] text-white/55">
            REPORT PREVIEW
          </p>
          <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-white/75">
            <li>Devices: <span className="ps-text-cyan">{reportPreview.devices.count}</span></li>
            <li>Flagged: <span className="ps-text-orange">{reportPreview.flaggedDevices.count}</span></li>
            <li>Events: <span className="ps-text-purple">{reportPreview.events.count}</span></li>
            <li>Alerts: <span className="ps-text-pink">{reportPreview.alerts.count}</span></li>
            <li>Health: <span className="ps-text-green">{reportPreview.health.count}</span></li>
            <li>Adapter: <span className="ps-mono">{adapterIsDemo ? "DEMO" : "LIVE"}</span></li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleExport}
            disabled={status.kind === "working"}
            className="flex items-center justify-center gap-2 rounded-lg py-3 ps-mono text-[11px] tracking-[0.25em] disabled:opacity-60"
            style={{
              color: "#001218",
              background: "#00f0ff",
              boxShadow: "0 0 20px rgba(0,240,255,0.45), inset 0 0 0 1px rgba(0,240,255,0.85)",
            }}
          >
            <Download className="h-4 w-4" />
            EXPORT
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleCopy}
            disabled={status.kind === "working"}
            className="flex items-center justify-center gap-2 rounded-lg py-3 ps-mono text-[11px] tracking-[0.25em] disabled:opacity-60"
            style={{
              color: "#39ff14",
              boxShadow: "inset 0 0 0 1px rgba(57,255,20,0.55), 0 0 14px rgba(57,255,20,0.18)",
            }}
          >
            <FileText className="h-4 w-4" />
            COPY_TO_CLIPBOARD
          </motion.button>
        </div>

        <StatusLine status={status} />

        <PlusCandidatesNote />
      </div>
    </NeonPanel>
  )
}

function BundleButton({
  icon: Icon,
  accent,
  label,
  description,
  active,
  onClick,
}: {
  icon: typeof Brackets
  accent: string
  label: string
  description: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-1 rounded-lg p-2.5 text-left"
      style={{
        background: active ? `${accent}1f` : "rgba(0,0,0,0.45)",
        boxShadow: active
          ? `inset 0 0 0 1px ${accent}, 0 0 14px ${accent}55`
          : "inset 0 0 0 1px rgba(255,255,255,0.08)",
      }}
    >
      <span className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
        <span
          className="ps-mono text-[10px] tracking-[0.22em]"
          style={{ color: accent }}
        >
          {label}
        </span>
      </span>
      <span className="text-[11px] leading-snug text-white/75">{description}</span>
    </button>
  )
}

function StatusLine({ status }: { status: Status }) {
  if (status.kind === "idle") {
    return (
      <p className="ps-mono text-[10px] tracking-[0.25em] text-white/45">
        Reports are generated locally. They never leave your device automatically.
      </p>
    )
  }
  if (status.kind === "working") {
    return (
      <p className="ps-mono text-[10px] tracking-[0.25em] ps-text-cyan">
        {status.message}
      </p>
    )
  }
  if (status.kind === "ok") {
    return (
      <p className="flex items-center gap-1.5 ps-mono text-[10px] tracking-[0.25em] ps-text-green">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {status.message}
      </p>
    )
  }
  return (
    <p className="flex items-center gap-1.5 ps-mono text-[10px] tracking-[0.25em] ps-text-pink">
      <AlertTriangle className="h-3.5 w-3.5" />
      {status.message}
    </p>
  )
}

function PlusFormatRow({ label, featureId }: { label: string; featureId: "network.export.pdf" }) {
  const { settings } = useApp()
  const granted = canUseFeature(settings.entitlement, featureId)
  if (granted) return null
  return (
    <div
      className="mt-2 flex items-center gap-2 rounded-lg bg-black/45 px-3 py-2"
      style={{ boxShadow: "inset 0 0 0 1px rgba(255,122,0,0.35)" }}
    >
      <Lock className="h-3.5 w-3.5 ps-text-orange" />
      <p className="ps-mono text-[10px] tracking-[0.22em] ps-text-orange">
        {label} REPORTS // PLUS CANDIDATE
      </p>
      <span className="ml-auto rounded-sm px-2 py-0.5 ps-mono text-[9px] tracking-[0.22em]"
        style={{
          color: "#ff7a00",
          boxShadow: "inset 0 0 0 1px rgba(255,122,0,0.6)",
          background: "rgba(255,122,0,0.08)",
        }}
      >
        PLUS
      </span>
    </div>
  )
}

function PlusCandidatesNote() {
  const candidates = listPlusCandidates()
  return (
    <details
      className="rounded-lg bg-black/45 p-2.5"
      style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
    >
      <summary className="cursor-pointer ps-mono text-[10px] tracking-[0.25em] text-white/55">
        FUTURE_PLUS_CANDIDATES ({candidates.length})
      </summary>
      <p className="mt-2 text-[11px] leading-snug text-white/70">
        These features are flagged as future Plus candidates in code. None are
        paywalled in this build — they ship as part of Free today and may move
        to a paid plan in the future.
      </p>
      <ul className="mt-2 space-y-1 text-[11px] text-white/80">
        {candidates.map((feature) => (
          <li key={feature.id} className="flex flex-col">
            <span className="ps-mono text-[10px] tracking-[0.22em] ps-text-orange">
              {feature.label}
            </span>
            <span className="text-white/65">{feature.description}</span>
          </li>
        ))}
      </ul>
    </details>
  )
}
