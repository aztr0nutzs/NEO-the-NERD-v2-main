"use client";

import { Activity, Gauge, History, Play, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NetworkHealthSnapshot, ScanComparisonSummary } from "@/lib/network/types";

interface NetworkHealthPanelProps {
  snapshot: NetworkHealthSnapshot | null;
  lastScanDelta: ScanComparisonSummary | null;
  onRunDiagnostics: () => void;
  onOpenTimeline: () => void;
  diagnosticsRunning: boolean;
}

const GRADE_COLOR: Record<NetworkHealthSnapshot["grade"], string> = {
  Excellent: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10",
  Good: "text-cyan-300 border-cyan-500/40 bg-cyan-500/10",
  Watch: "text-yellow-300 border-yellow-500/40 bg-yellow-500/10",
  Degraded: "text-orange-300 border-orange-500/40 bg-orange-500/10",
  Critical: "text-red-300 border-red-500/40 bg-red-500/10",
};

export function NetworkHealthPanel({
  snapshot,
  lastScanDelta,
  onRunDiagnostics,
  onOpenTimeline,
  diagnosticsRunning,
}: NetworkHealthPanelProps) {
  const gradeClass = snapshot ? GRADE_COLOR[snapshot.grade] : "text-gray-400 border-gray-700 bg-gray-900/40";
  const factors = snapshot?.factors.slice(0, 3) ?? [];
  const changeLine = lastScanDelta
    ? `${lastScanDelta.newDeviceIds.length} new / ${lastScanDelta.offlineDeviceIds.length} offline / ${lastScanDelta.changedDeviceIds.length} changed since latest scan`
    : "No scan delta recorded yet";

  return (
    <section className={`mb-6 rounded-lg border p-4 backdrop-blur-sm ${gradeClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            <h2 className="font-mono text-xs font-bold uppercase tracking-[0.22em]">
              NETWORK_HEALTH
            </h2>
          </div>
          <p className="font-mono text-2xl font-black uppercase italic text-white">
            {snapshot?.headline ?? "Health pending"}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-gray-400">
            {snapshot ? `${snapshot.grade} / trend ${snapshot.trend}` : "Run a scan or diagnostics to calculate health"}
          </p>
        </div>

        <div className="grid h-24 w-24 place-items-center rounded-full border border-white/15 bg-black/45">
          <div className="text-center">
            <p className="font-mono text-3xl font-black text-white">{snapshot?.score ?? "--"}</p>
            <p className="font-mono text-[9px] uppercase tracking-widest text-gray-500">/100</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-lg border border-black/30 bg-black/35 p-3">
          <div className="mb-2 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-gray-300">
              TOP_FACTORS
            </p>
          </div>
          {factors.length === 0 ? (
            <p className="font-mono text-xs text-gray-400">No negative factors detected from available inputs.</p>
          ) : (
            <div className="space-y-2">
              {factors.map((factor) => (
                <div key={factor.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold uppercase text-gray-200">{factor.label}</p>
                    <p className="font-mono text-[10px] text-gray-500">{factor.detail}</p>
                  </div>
                  <span className="font-mono text-xs text-orange-300">-{factor.impact}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-black/30 bg-black/35 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-gray-300">
              WHAT_CHANGED
            </p>
          </div>
          <p className="font-mono text-xs text-gray-300">{changeLine}</p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-gray-600">
            {snapshot ? new Date(snapshot.timestamp).toLocaleString() : "No snapshot"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={onRunDiagnostics}
          disabled={diagnosticsRunning}
          className="h-8 border border-cyan-500/40 bg-cyan-500/15 font-mono text-[10px] uppercase text-cyan-300 hover:bg-cyan-500/25 disabled:opacity-50"
        >
          <Play className="mr-1.5 h-3 w-3" />
          {diagnosticsRunning ? "RUNNING" : "DIAGNOSTICS"}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onOpenTimeline}
          className="h-8 border border-purple-500/40 bg-purple-500/15 font-mono text-[10px] uppercase text-purple-300 hover:bg-purple-500/25"
        >
          <History className="mr-1.5 h-3 w-3" />
          HISTORY
        </Button>
      </div>

      {snapshot?.diagnostics.some((probe) => probe.key === "throughput" && probe.status !== "passed") && (
        <p className="mt-3 rounded border border-gray-800 bg-black/35 p-2 font-mono text-[10px] text-gray-500">
          Throughput/speed Mbps is intentionally not shown without a real provider-backed speed test.
        </p>
      )}
    </section>
  );
}
