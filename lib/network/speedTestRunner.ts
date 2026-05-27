/**
 * Streaming speed-test runner — emits per-phase callbacks suitable for binding
 * directly to a live HUD. All metrics are computed from real transferred bytes
 * and real elapsed time; nothing is fabricated. Upload is only executed when an
 * upload endpoint is configured; otherwise `uploadMbps` is reported as `null`
 * with `failureReason="upload-not-configured"` carried out-of-band, while the
 * test as a whole still succeeds if the download succeeded.
 */
import type {
  SpeedTestConfig,
  SpeedTestPhase,
  SpeedTestPhaseName,
  SpeedTestResult,
  ThroughputSample,
} from "./types";
import { calculateJitterMs, calculateMbps } from "./speedTest";
import type { SpeedTestUploadState } from "./types";

export type SpeedTestRunStatus =
  | "idle"
  | "preparing"
  | "latency"
  | "download"
  | "upload"
  | "complete"
  | "aborted"
  | "failed";

export interface SpeedTestRunnerCallbacks {
  onStatus?: (status: SpeedTestRunStatus, label: string) => void;
  onPhase?: (phase: SpeedTestPhase) => void;
  onLatencySample?: (sample: { sampleMs: number; index: number; total: number }) => void;
  onLatencySummary?: (summary: { latencyMs: number; jitterMs: number; samples: number[] }) => void;
  onDownloadTick?: (tick: { mbps: number; bytes: number; elapsedMs: number }) => void;
  onUploadComplete?: (info: { mbps: number | null; bytes: number; reason?: string }) => void;
  onLog?: (line: { message: string; level: "info" | "warn" | "error" | "ok" }) => void;
}

export interface SpeedTestRunnerOptions extends SpeedTestRunnerCallbacks {
  signal?: AbortSignal;
}

const PHASE_LABELS: Record<SpeedTestRunStatus, string> = {
  idle: "IDLE",
  preparing: "PREPARING",
  latency: "INJECTING_PACKETS",
  download: "PULLING_PAYLOADS",
  upload: "PUSHING_UPLINK",
  complete: "COMPLETE",
  aborted: "ABORT",
  failed: "HALT",
};

export function statusLabel(status: SpeedTestRunStatus): string {
  return PHASE_LABELS[status];
}

function nowIso() {
  return new Date().toISOString();
}

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

async function timedSample(url: string, timeoutMs: number, signal?: AbortSignal) {
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  const t0 = performance.now();
  try {
    await fetch(`${url}${url.includes("?") ? "&" : "?"}_t=${Date.now()}`, {
      cache: "no-store",
      mode: "cors",
      signal: ctrl.signal,
    }).catch(() => undefined);
  } finally {
    clearTimeout(to);
    signal?.removeEventListener("abort", onAbort);
  }
  return performance.now() - t0;
}

async function measureLatency(
  cfg: SpeedTestConfig,
  signal: AbortSignal | undefined,
  cb: SpeedTestRunnerCallbacks,
): Promise<{ latencyMs: number; jitterMs: number; samples: number[]; phase: SpeedTestPhase }> {
  const startedAt = nowIso();
  const t0 = performance.now();
  const total = Math.max(3, cfg.latencySampleCount ?? 5);
  const samples: number[] = [];
  for (let i = 0; i < total; i++) {
    if (signal?.aborted) throw new DOMException("aborted", "AbortError");
    const sample = await timedSample(cfg.latencyUrl, cfg.timeoutMs, signal);
    samples.push(sample);
    cb.onLatencySample?.({ sampleMs: sample, index: i + 1, total });
    await new Promise<void>((r) => setTimeout(r, 70));
  }
  samples.sort((a, b) => a - b);
  const latencyMs =
    samples.length === 0 ? 0 : samples[Math.floor(samples.length / 2)];
  const jitterMs = calculateJitterMs(samples);
  const phase: SpeedTestPhase = {
    name: "latency",
    startedAt,
    completedAt: nowIso(),
    elapsedMs: performance.now() - t0,
    success: samples.length > 0,
  };
  cb.onPhase?.(phase);
  cb.onLatencySummary?.({ latencyMs, jitterMs, samples });
  return { latencyMs, jitterMs, samples, phase };
}

async function measureDownload(
  cfg: SpeedTestConfig,
  signal: AbortSignal | undefined,
  cb: SpeedTestRunnerCallbacks,
): Promise<{
  mbps: number;
  bytes: number;
  samples: ThroughputSample[];
  phase: SpeedTestPhase;
  failureReason?: string;
}> {
  const startedAt = nowIso();
  const t0 = performance.now();
  const samples: ThroughputSample[] = [];
  let bytes = 0;

  let response: Response;
  try {
    response = await fetch(cfg.downloadUrl, { cache: "no-store", signal });
  } catch (err) {
    if (isAbort(err)) throw err;
    const phase: SpeedTestPhase = {
      name: "download",
      startedAt,
      completedAt: nowIso(),
      elapsedMs: performance.now() - t0,
      success: false,
    };
    cb.onPhase?.(phase);
    return { mbps: 0, bytes: 0, samples, phase, failureReason: "download-fetch-failed" };
  }

  if (!response.body) {
    const phase: SpeedTestPhase = {
      name: "download",
      startedAt,
      completedAt: nowIso(),
      elapsedMs: performance.now() - t0,
      success: false,
    };
    cb.onPhase?.(phase);
    return { mbps: 0, bytes: 0, samples, phase, failureReason: "download-no-body" };
  }

  const reader = response.body.getReader();
  while (true) {
    if (signal?.aborted) throw new DOMException("aborted", "AbortError");
    const { done, value } = await reader.read();
    if (done) break;
    if (value) bytes += value.byteLength;
    const elapsedMs = performance.now() - t0;
    const mbps = calculateMbps(bytes, elapsedMs);
    samples.push({
      phase: "download",
      timestamp: nowIso(),
      bytesTransferred: bytes,
      elapsedMs,
      mbps,
    });
    cb.onDownloadTick?.({ mbps, bytes, elapsedMs });
    if (elapsedMs >= cfg.downloadDurationMs) {
      // Cancel the underlying reader so we don't keep streaming after the
      // window closes — accurate Mbps already captured for the window we ran.
      try {
        await reader.cancel();
      } catch {
        /* noop */
      }
      break;
    }
  }

  const elapsedMs = performance.now() - t0;
  const mbps = calculateMbps(bytes, elapsedMs);
  const phase: SpeedTestPhase = {
    name: "download",
    startedAt,
    completedAt: nowIso(),
    elapsedMs,
    success: bytes > 0,
  };
  cb.onPhase?.(phase);
  return { mbps, bytes, samples, phase };
}

async function measureUpload(
  cfg: SpeedTestConfig,
  signal: AbortSignal | undefined,
  cb: SpeedTestRunnerCallbacks,
): Promise<{
  mbps: number | null;
  bytes: number;
  samples: ThroughputSample[];
  phase: SpeedTestPhase | null;
  failureReason?: string;
  uploadState: SpeedTestUploadState;
}> {
  if (!cfg.uploadUrl) {
    cb.onUploadComplete?.({ mbps: null, bytes: 0, reason: "upload-not-configured" });
    cb.onLog?.({
      level: "warn",
      message: "UL_ENDPOINT_NOT_CONFIGURED",
    });
    return {
      mbps: null,
      bytes: 0,
      samples: [],
      phase: null,
      failureReason: "upload-not-configured",
      uploadState: "NOT CONFIGURED",
    };
  }

  const startedAt = nowIso();
  const t0 = performance.now();
  const bytes = Math.max(64 * 1024, cfg.uploadBytes ?? 512 * 1024);
  const payload = new Uint8Array(bytes);
  crypto.getRandomValues(payload);

  let success = false;
  let failureReason: string | undefined;
  try {
    const res = await fetch(cfg.uploadUrl, {
      method: "POST",
      cache: "no-store",
      body: payload,
      signal,
    });
    success = res.ok;
    if (!res.ok) failureReason = `upload-http-${res.status}`;
  } catch (err) {
    if (isAbort(err)) throw err;
    failureReason = "upload-fetch-failed";
  }

  const elapsedMs = performance.now() - t0;
  const mbps = success ? calculateMbps(bytes, elapsedMs) : 0;
  const phase: SpeedTestPhase = {
    name: "upload",
    startedAt,
    completedAt: nowIso(),
    elapsedMs,
    success,
  };
  cb.onPhase?.(phase);
  const samples: ThroughputSample[] = success
    ? [
        {
          phase: "upload",
          timestamp: nowIso(),
          bytesTransferred: bytes,
          elapsedMs,
          mbps,
        },
      ]
    : [];
  cb.onUploadComplete?.({
    mbps: success ? mbps : null,
    bytes: success ? bytes : 0,
    reason: failureReason,
  });
  return {
    mbps: success ? mbps : null,
    bytes: success ? bytes : 0,
    samples,
    phase,
    failureReason,
    uploadState: success ? "MEASURED" : "FAILED",
  };
}

export async function runStreamingSpeedTest(
  cfg: SpeedTestConfig,
  options: SpeedTestRunnerOptions = {},
): Promise<SpeedTestResult> {
  const { signal } = options;
  const phases: SpeedTestPhase[] = [];
  const samples: ThroughputSample[] = [];
  const startedAt = nowIso();
  const runId = `speed-${Date.now()}`;

  options.onStatus?.("preparing", PHASE_LABELS.preparing);
  options.onLog?.({ level: "info", message: `PROBE_START provider=${cfg.provider}` });

  try {
    options.onStatus?.("latency", PHASE_LABELS.latency);
    const latency = await measureLatency(cfg, signal, options);
    phases.push(latency.phase);
    options.onLog?.({
      level: "ok",
      message: `LATENCY_MEDIAN=${Math.round(latency.latencyMs)}ms JITTER=${Math.round(
        latency.jitterMs,
      )}ms (${latency.samples.length} samples)`,
    });

    options.onStatus?.("download", PHASE_LABELS.download);
    const download = await measureDownload(cfg, signal, options);
    phases.push(download.phase);
    samples.push(...download.samples);
    if (download.failureReason) {
      options.onLog?.({ level: "error", message: `DL_${download.failureReason.toUpperCase()}` });
    } else {
      options.onLog?.({ level: "ok", message: `DL=${download.mbps.toFixed(2)} Mbps` });
    }

    options.onStatus?.("upload", PHASE_LABELS.upload);
    const upload = await measureUpload(cfg, signal, options);
    if (upload.phase) phases.push(upload.phase);
    samples.push(...upload.samples);
    if (upload.mbps !== null) {
      options.onLog?.({ level: "ok", message: `UL=${upload.mbps.toFixed(2)} Mbps` });
    }

    const completedAt = nowIso();
    const success = download.bytes > 0;
    const result: SpeedTestResult = {
      id: runId,
      startedAt,
      completedAt,
      mode: cfg.mode,
      provider: cfg.provider,
      source: cfg.downloadUrl,
      downloadMbps: download.mbps,
      uploadMbps: upload.mbps,
      latencyMs: latency.latencyMs,
      jitterMs: latency.jitterMs,
      testBytesDownloaded: download.bytes,
      testBytesUploaded: upload.bytes,
      sampleCount: samples.length,
      success,
      failureReason: success ? upload.failureReason ?? download.failureReason : (download.failureReason ?? "download-failed"),
      uploadMeasured: upload.mbps !== null,
      uploadState: success ? upload.uploadState : upload.uploadState === "MEASURED" ? "SKIPPED" : upload.uploadState,
      completeness: success && upload.uploadState === "MEASURED" ? "full" : "partial-no-upload",
      phases,
      samples,
      environmentNotes: cfg.environmentNotes ?? "Browser HTTPS fetch-based throughput test",
    };

    options.onStatus?.(success ? "complete" : "failed", PHASE_LABELS[success ? "complete" : "failed"]);
    options.onLog?.({ level: success ? "ok" : "error", message: success ? "PROBE_COMPLETE" : "PROBE_DOWNLOAD_FAILED" });
    return result;
  } catch (err) {
    const aborted = isAbort(err);
    options.onStatus?.(aborted ? "aborted" : "failed", PHASE_LABELS[aborted ? "aborted" : "failed"]);
    options.onLog?.({
      level: aborted ? "warn" : "error",
      message: aborted ? "ABORTED_BY_USER" : `ERROR=${err instanceof Error ? err.message : String(err)}`,
    });
    return {
      id: runId,
      startedAt,
      completedAt: nowIso(),
      mode: cfg.mode,
      provider: cfg.provider,
      source: cfg.downloadUrl,
      downloadMbps: 0,
      uploadMbps: null,
      latencyMs: 0,
      jitterMs: 0,
      testBytesDownloaded: 0,
      testBytesUploaded: 0,
      sampleCount: 0,
      success: false,
      failureReason: aborted ? "aborted" : err instanceof Error ? err.message : "unknown-error",
      uploadMeasured: false,
      uploadState: aborted ? "SKIPPED" : "NOT MEASURED",
      completeness: "partial-no-upload",
      phases,
      samples,
      environmentNotes: cfg.environmentNotes ?? "Browser HTTPS fetch-based throughput test",
    };
  }
}

/**
 * Default config preset using Cloudflare's public speed endpoints.
 * Upload URL is omitted by default — Cloudflare's `__up` endpoint blocks
 * cross-origin POSTs in many environments, and we never want to fabricate
 * upload numbers. Configure `uploadUrl` explicitly when an endpoint exists.
 */
export function defaultCloudflarePreset(safeMode: boolean): SpeedTestConfig {
  return {
    mode: "internet",
    provider: "Cloudflare speed.cloudflare.com",
    latencyUrl: "https://speed.cloudflare.com/__down?bytes=1",
    downloadUrl: `https://speed.cloudflare.com/__down?bytes=${safeMode ? 6_000_000 : 12_000_000}`,
    timeoutMs: safeMode ? 9000 : 12000,
    downloadDurationMs: safeMode ? 6500 : 8500,
    latencySampleCount: safeMode ? 5 : 8,
    environmentNotes: safeMode
      ? "Safe-mode HTTPS throughput probe (small window)."
      : "Extended HTTPS throughput probe.",
  };
}
