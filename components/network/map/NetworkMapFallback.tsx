"use client";

import { AlertTriangle, Network } from "lucide-react";
import type { NetworkTopologyGraph } from "@/lib/network/types";

interface NetworkMapFallbackProps {
  message?: string;
  topologyGraph?: NetworkTopologyGraph | null;
}

export function NetworkMapFallback({ message, topologyGraph }: NetworkMapFallbackProps) {
  return (
    <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-lg border border-cyan-500/20 bg-black/70 p-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-orange-500/40 bg-orange-500/10 shadow-[0_0_28px_rgba(249,115,22,0.22)]">
        <AlertTriangle className="h-8 w-8 text-orange-400" />
      </div>
      <p className="font-mono text-sm font-bold uppercase tracking-[0.24em] text-orange-300">
        3D map unavailable in this environment
      </p>
      <p className="mt-2 max-w-md font-mono text-xs text-gray-500">
        {message ?? "Switching to topology summary fallback."}
      </p>

      {topologyGraph && (
        <div className="mt-5 grid w-full max-w-md grid-cols-3 gap-2">
          <SummaryCell label="NODES" value={topologyGraph.summary.totalNodes} />
          <SummaryCell label="LINKS" value={topologyGraph.summary.totalEdges} />
          <SummaryCell label="FLAGS" value={topologyGraph.summary.flaggedNodes} />
        </div>
      )}

      <div className="mt-5 flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-300">
        <Network className="h-3 w-3" />
        TOPOLOGY SUMMARY FALLBACK
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
