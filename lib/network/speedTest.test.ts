import { strict as assert } from "node:assert";
import { calculateJitterMs, calculateMbps } from "./speedTest";
import { defaultCloudflarePreset, runStreamingSpeedTest, statusLabel } from "./speedTestRunner";
import type { SpeedTestRunStatus } from "./speedTestRunner";

// Mbps math
assert.equal(calculateMbps(1_000_000, 1000).toFixed(3), "8.000");
assert.equal(calculateMbps(0, 1000), 0);
assert.equal(calculateMbps(1_000_000, 0), 0, "guard divide-by-zero");

// Jitter math
assert.equal(Number(calculateJitterMs([10, 10, 10]).toFixed(3)), 0);
assert.ok(calculateJitterMs([10, 20, 30]) > 0);
assert.equal(calculateJitterMs([42]), 0, "single sample has no jitter");

// State machine labels are stable contracts the UI binds to
const expected: Record<SpeedTestRunStatus, string> = {
  idle: "IDLE",
  preparing: "PREPARING",
  latency: "INJECTING_PACKETS",
  download: "PULLING_PAYLOADS",
  upload: "PUSHING_UPLINK",
  complete: "COMPLETE",
  aborted: "ABORT",
  failed: "HALT",
};
for (const [k, v] of Object.entries(expected)) {
  assert.equal(statusLabel(k as SpeedTestRunStatus), v, `label for ${k}`);
}

// Default preset shape
const preset = defaultCloudflarePreset(true);
assert.equal(preset.mode, "internet");
assert.ok(preset.downloadUrl.includes("speed.cloudflare.com"));
assert.equal(preset.uploadUrl, undefined, "default preset has no upload endpoint — keeps results honest");

// Failure path: bogus fetch URL drives the runner through failed status
// without throwing. Wrapped in an async IIFE to avoid top-level await.
async function failurePathSmokeTest() {
  if (typeof fetch !== "function") return;
  const statuses: SpeedTestRunStatus[] = [];
  const result = await runStreamingSpeedTest(
    {
      mode: "internet",
      provider: "test-bogus",
      latencyUrl: "http://127.0.0.1:1/latency",
      downloadUrl: "http://127.0.0.1:1/download",
      timeoutMs: 200,
      downloadDurationMs: 500,
      latencySampleCount: 3,
    },
    {
      onStatus: (s) => statuses.push(s),
    },
  );
  assert.ok(statuses.includes("preparing"), "emits preparing");
  assert.equal(result.success, false, "bogus endpoint should not report success");
  assert.equal(result.uploadMbps, null, "no upload endpoint => null mbps");
  assert.ok(typeof result.failureReason === "string", "failure reason set");
}

failurePathSmokeTest()
  .then(() => console.log("speedTest logic checks passed"))
  .catch((err) => {
    console.error("speedTest test failed", err);
    process.exitCode = 1;
  });
