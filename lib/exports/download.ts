import type { SerializedReport } from "./formatters"

/**
 * Trigger a browser/native download for a serialized export.
 *
 * - Web: uses Blob + anchor click; falls back to data URI if blob URLs are
 *   blocked.
 * - Native (Capacitor): defers to Filesystem write + Share intent so the
 *   file lands in Documents instead of forcing a download dialog.
 *
 * Returns a small status object so the UI can display "Saved to Documents"
 * vs "Downloaded" feedback.
 */
export interface DownloadResult {
  ok: boolean
  location: "browser" | "documents" | "clipboard" | "unsupported"
  error?: string
}

async function getCapacitorPlatform(): Promise<"android" | "ios" | "web" | "unknown"> {
  if (typeof window === "undefined") return "unknown"
  try {
    const { Capacitor } = await import("@capacitor/core")
    if (!Capacitor.isNativePlatform()) return "web"
    const platform = Capacitor.getPlatform()
    if (platform === "android" || platform === "ios") return platform
    return "web"
  } catch {
    return "web"
  }
}

async function writeViaCapacitor(report: SerializedReport): Promise<DownloadResult> {
  try {
    const [{ Filesystem, Directory, Encoding }, share] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share").then((m) => m.Share).catch(() => null),
    ])
    await Filesystem.writeFile({
      path: report.filename,
      data: report.body,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    })
    if (share) {
      const uri = await Filesystem.getUri({
        path: report.filename,
        directory: Directory.Documents,
      })
      await share
        .share({
          title: "NEO network report",
          text: report.filename,
          url: uri.uri,
          dialogTitle: "Share NEO report",
        })
        .catch(() => {
          /* user dismissed share sheet — file is already saved */
        })
    }
    return { ok: true, location: "documents" }
  } catch (error) {
    return {
      ok: false,
      location: "documents",
      error: error instanceof Error ? error.message : "Unknown filesystem error",
    }
  }
}

export async function downloadReport(report: SerializedReport): Promise<DownloadResult> {
  if (typeof window === "undefined") {
    return { ok: false, location: "unsupported", error: "Window is not available." }
  }

  const platform = await getCapacitorPlatform()
  if (platform === "android" || platform === "ios") {
    return writeViaCapacitor(report)
  }

  try {
    const blob = new Blob([report.body], { type: `${report.mime};charset=utf-8` })
    const url = window.URL.createObjectURL(blob)
    const link = window.document.createElement("a")
    link.href = url
    link.download = report.filename
    link.rel = "noopener"
    link.style.display = "none"
    window.document.body.appendChild(link)
    link.click()
    window.document.body.removeChild(link)
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    return { ok: true, location: "browser" }
  } catch (error) {
    return {
      ok: false,
      location: "browser",
      error: error instanceof Error ? error.message : "Unknown browser export error",
    }
  }
}

/** Copy the report body to clipboard. Used for "Copy report" actions. */
export async function copyReportToClipboard(report: SerializedReport): Promise<DownloadResult> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return { ok: false, location: "clipboard", error: "Clipboard API unavailable" }
  }
  try {
    await navigator.clipboard.writeText(report.body)
    return { ok: true, location: "clipboard" }
  } catch (error) {
    return {
      ok: false,
      location: "clipboard",
      error: error instanceof Error ? error.message : "Clipboard write failed",
    }
  }
}
