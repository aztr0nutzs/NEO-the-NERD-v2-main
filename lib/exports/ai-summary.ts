import { generateAssistantReply } from "@/lib/assistant/assistant-runtime"
import type { NetworkAssistantContext } from "@/lib/network/types"
import type { NetworkReport } from "./network-report"

export interface AiSummaryResult {
  text: string
  source: "provider" | "deterministic"
  fallbackReason?: string
}

function deterministicSummary(report: NetworkReport): string {
  const { summary, devices, flaggedDevices, events, alerts, health } = report
  const fresh = devices.items.filter((row) => row.newSinceLastScan).length
  const offline = devices.items.filter((row) => row.offlineSinceLastScan).length
  const topAlert = alerts.items[0]
  const latestHealth = summary.latestHealth ?? health.items[0]

  const lines: string[] = []
  lines.push(
    `Network "${summary.networkName}" reports ${summary.onlineDevices} of ${summary.devicesFound} devices online.`,
  )
  if (latestHealth) {
    lines.push(
      `Health snapshot scores ${latestHealth.score}/100 (${latestHealth.grade}, trend ${latestHealth.trend}).`,
    )
  }
  if (fresh > 0) {
    lines.push(`${fresh} new device${fresh === 1 ? "" : "s"} appeared since the previous scan.`)
  }
  if (offline > 0) {
    lines.push(`${offline} device${offline === 1 ? "" : "s"} went offline in the same window.`)
  }
  if (flaggedDevices.count > 0) {
    const first = flaggedDevices.items[0]
    lines.push(
      `${flaggedDevices.count} device${flaggedDevices.count === 1 ? "" : "s"} flagged for review — starting with ${first.name} (${first.ipAddress || "no IP"}).`,
    )
  }
  if (topAlert) {
    lines.push(`Top alert: ${topAlert.title} [${topAlert.severity}].`)
  }
  if (events.count > 0) {
    lines.push(`${events.count} event${events.count === 1 ? "" : "s"} captured in the recent timeline.`)
  }
  if (summary.adapterIsDemo) {
    lines.push(
      "Note: this report was built from simulated demo data because the live adapter is not currently active.",
    )
  }
  return lines.join(" ")
}

/**
 * Builds a human-readable executive summary for the export.
 *
 * Tries the configured Claude provider via `generateAssistantReply`, and
 * falls back to a deterministic, on-device summary if the provider is
 * unavailable. Either way the function always returns a usable string.
 */
export async function buildExportAiSummary(
  report: NetworkReport,
  context: NetworkAssistantContext | null,
  options: { allowProvider?: boolean } = {},
): Promise<AiSummaryResult> {
  const deterministic = deterministicSummary(report)
  if (options.allowProvider === false) {
    return { text: deterministic, source: "deterministic" }
  }

  try {
    const reply = await generateAssistantReply({
      userMessage:
        "Write a one-paragraph executive summary of my home network from this context, suitable for a printed report. " +
        "Mention device counts, anything flagged, top alert if present, and health score. Avoid hedging or filler.",
      recentMessages: [],
      personalityId: "wizard",
      conversationMode: "Tech Helper",
      networkContext: context ?? null,
    })
    if (reply.mode === "provider" && reply.text?.trim()) {
      return {
        text: reply.text.trim(),
        source: "provider",
      }
    }
    return {
      text: deterministic,
      source: "deterministic",
      fallbackReason:
        reply.fallbackReason ?? "AI provider was unavailable; deterministic summary used.",
    }
  } catch (error) {
    return {
      text: deterministic,
      source: "deterministic",
      fallbackReason: error instanceof Error ? error.message : "Unknown AI summary failure.",
    }
  }
}
