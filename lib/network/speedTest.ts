import type { SpeedTestConfig, SpeedTestResult, ThroughputSample, SpeedTestPhase } from "./types";

export function calculateMbps(bytes: number, elapsedMs: number): number {
  if (!Number.isFinite(bytes) || !Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  return (bytes * 8) / (elapsedMs / 1000) / 1_000_000;
}

export function calculateJitterMs(samples: number[]): number {
  if (samples.length < 2) return 0;
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const variance = samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) / samples.length;
  return Math.sqrt(variance);
}

async function timedFetch(url: string, timeoutMs: number, init?: RequestInit) {
  const started = performance.now();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
    return { ok: response.ok, latencyMs: performance.now() - started, response };
  } catch {
    return { ok: false, latencyMs: performance.now() - started, response: null };
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function runSpeedTest(config: SpeedTestConfig): Promise<SpeedTestResult> {
  const phases: SpeedTestPhase[] = [];
  const samples: ThroughputSample[] = [];
  const startedAt = new Date().toISOString();
  const latencySamples: number[] = [];
  const latencyCount = Math.max(3, config.latencySampleCount ?? 5);
  for (let i = 0; i < latencyCount; i += 1) {
    const p0 = performance.now();
    const result = await timedFetch(config.latencyUrl, config.timeoutMs);
    const p1 = performance.now();
    phases.push({ name: "latency", startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), elapsedMs: p1 - p0, success: result.ok });
    if (result.ok) latencySamples.push(result.latencyMs);
  }

  const latencyMs = latencySamples.length ? latencySamples.reduce((a, b) => a + b, 0) / latencySamples.length : 0;
  const jitterMs = calculateJitterMs(latencySamples);

  const d0 = performance.now();
  const downloadResponse = await fetch(config.downloadUrl, { cache: "no-store" });
  let downloaded = 0;
  if (downloadResponse.body) {
    const reader = downloadResponse.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      downloaded += value.byteLength;
      const elapsed = performance.now() - d0;
      samples.push({ phase: "download", timestamp: new Date().toISOString(), bytesTransferred: downloaded, elapsedMs: elapsed, mbps: calculateMbps(downloaded, elapsed) });
      if (elapsed >= config.downloadDurationMs) break;
    }
  }
  const downloadElapsed = performance.now() - d0;
  const downloadMbps = calculateMbps(downloaded, downloadElapsed);
  phases.push({ name: "download", startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), elapsedMs: downloadElapsed, success: downloaded > 0 });

  let uploaded = 0;
  let uploadMbps = 0;
  if (config.uploadUrl) {
    const payloadSize = Math.max(64 * 1024, config.uploadBytes ?? 512 * 1024);
    const payload = new Uint8Array(payloadSize);
    crypto.getRandomValues(payload);
    const u0 = performance.now();
    const up = await timedFetch(config.uploadUrl, config.timeoutMs, { method: "POST", body: payload });
    const uploadElapsed = performance.now() - u0;
    uploaded = up.ok ? payloadSize : 0;
    uploadMbps = calculateMbps(uploaded, uploadElapsed);
    phases.push({ name: "upload", startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), elapsedMs: uploadElapsed, success: up.ok });
  }

  return {
    id: `speed-${Date.now()}`,
    startedAt,
    completedAt: new Date().toISOString(),
    mode: config.mode,
    provider: config.provider,
    source: config.downloadUrl,
    downloadMbps,
    uploadMbps: config.uploadUrl ? uploadMbps : null,
    latencyMs,
    jitterMs,
    testBytesDownloaded: downloaded,
    testBytesUploaded: uploaded,
    sampleCount: samples.length,
    success: downloaded > 0,
    failureReason: downloaded > 0 ? undefined : "download failed",
    uploadMeasured: Boolean(config.uploadUrl && uploaded > 0),
    completeness: config.uploadUrl && uploaded > 0 ? "full" : "partial-no-upload",
    phases,
    samples,
    environmentNotes: config.environmentNotes ?? "Browser HTTPS request-based throughput test",
  };
}
