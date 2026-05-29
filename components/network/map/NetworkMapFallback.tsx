"use client";

import { AlertTriangle, Network } from "lucide-react";
import type { NetworkTopologyGraph } from "@/lib/network/types";

interface NetworkMapFallbackProps {
  message?: string;
  topologyGraph?: NetworkTopologyGraph | null;
}

export function NetworkMapFallback({ message, topologyGraph }: NetworkMapFallbackProps) {
  const isEmptyMap = message?.startsWith("No discovered devices");
  const title = isEmptyMap ? "No devices to map yet" : "3D map fallback active";
  return (
    <div className="relative flex h-full min-h-[360px] flex-col items-center justify-center overflow-hidden rounded-lg border border-cyan-500/20 bg-black/70 p-6 text-center">
      <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="pointer-events-none absolute h-72 w-72 rounded-full border border-cyan-500/20 shadow-[0_0_80px_rgba(34,211,238,0.16)]" />
      <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-orange-500/40 bg-orange-500/10 shadow-[0_0_28px_rgba(249,115,22,0.22)]">
        <div className="absolute inset-2 rounded-full border border-dashed border-cyan-500/30" />
        <AlertTriangle className="h-8 w-8 text-orange-400" />
      </div>
      <p className="relative font-mono text-sm font-bold uppercase tracking-[0.24em] text-orange-300">
        {title}
      </p>
      <p className="relative mt-2 max-w-md font-mono text-xs text-gray-500">
        {message ?? "Switching to topology summary fallback."}
      </p>

      {topologyGraph && (
        <div className="relative mt-5 grid w-full max-w-md grid-cols-3 gap-2">
          <SummaryCell label="NODES" value={topologyGraph.summary.totalNodes} />
          <SummaryCell label="LINKS" value={topologyGraph.summary.totalEdges} />
          <SummaryCell label="FLAGS" value={topologyGraph.summary.flaggedNodes} />
        </div>
      )}

      <div className="relative mt-5 flex flex-wrap items-center justify-center gap-2">
        <div className="flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-300">
          <Network className="h-3 w-3" />
          {isEmptyMap ? "RUN SCAN TO BUILD MAP" : "TOPOLOGY SUMMARY FALLBACK"}
        </div>
        {topologyGraph && (
          <span
            className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${
              topologyGraph.topologyMode === "backend-confirmed" && topologyGraph.relationshipsConfirmed
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                : "border-orange-500/50 bg-orange-500/10 text-orange-300"
            }`}
            title={
              topologyGraph.topologyMode === "backend-confirmed" && topologyGraph.relationshipsConfirmed
                ? "Relationships confirmed by backend probe."
                : "Relationships inferred from the current device list. Not a verified topology probe."
            }
          >
            CONFIDENCE:{" "}
            {topologyGraph.topologyMode === "backend-confirmed" && topologyGraph.relationshipsConfirmed
              ? "CONFIRMED"
              : topologyGraph.topologyMode === "demo"
                ? "DEMO"
                : "ESTIMATED"}
          </span>
        )}
      </div>
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-gray-800 bg-gray-950/80 p-3">
      <p className="font-mono text-[9px] text-gray-500">{label}</p>
      <p className="font-mono text-lg font-black text-cyan-300">{value}</p>
    </div>
  );
}
