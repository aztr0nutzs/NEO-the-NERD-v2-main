import type { SpeedTestResult, SpeedTestUploadState } from "./types"

export function inferUploadState(result: Pick<SpeedTestResult, "uploadMbps" | "uploadMeasured" | "failureReason"> & {
  uploadState?: SpeedTestUploadState
}): SpeedTestUploadState {
  if (result.uploadState) return result.uploadState
  if (result.uploadMeasured || result.uploadMbps !== null) return "MEASURED"
  if (result.failureReason === "upload-not-configured") return "NOT CONFIGURED"
  if (result.failureReason?.startsWith("upload-")) return "FAILED"
  if (result.failureReason === "aborted") return "SKIPPED"
  return "NOT MEASURED"
}

export function uploadStateLabel(state: SpeedTestUploadState): string {
  return state
}

export function uploadValueLabel(result: Pick<SpeedTestResult, "uploadMbps" | "uploadMeasured" | "failureReason"> & {
  uploadState?: SpeedTestUploadState
}): string {
  const state = inferUploadState(result)
  if (state === "MEASURED" && result.uploadMbps !== null) return `${result.uploadMbps.toFixed(1)} Mbps`
  if (state === "NOT CONFIGURED") return "Not configured"
  if (state === "FAILED") return "Failed"
  if (state === "SKIPPED") return "Skipped"
  return "Not measured"
}

export function uploadStateExplanation(state: SpeedTestUploadState): string {
  switch (state) {
    case "MEASURED":
      return "Upload was measured against the configured POST endpoint."
    case "NOT CONFIGURED":
      return "No upload POST endpoint is configured, so upload was not measured."
    case "FAILED":
      return "The configured upload endpoint did not complete successfully."
    case "SKIPPED":
      return "Upload was skipped because the run stopped before upload could complete."
    case "NOT MEASURED":
    default:
      return "Upload was not measured for this run."
  }
}

export function isFullSpeedTest(result: Pick<SpeedTestResult, "success" | "uploadMbps" | "uploadMeasured" | "failureReason" | "completeness"> & {
  uploadState?: SpeedTestUploadState
}): boolean {
  return result.success && result.completeness === "full" && inferUploadState(result) === "MEASURED"
}
