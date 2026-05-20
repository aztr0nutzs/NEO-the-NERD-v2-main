"use client";

import { GitBranch, SlidersHorizontal } from "lucide-react";
import type {
  NetworkMapFilterState,
  NetworkMapFocusMode,
  NetworkMapLabelMode,
  NetworkMapOverlayMode,
  NetworkMapViewMode,
  NetworkTopologyGraph,
} from "@/lib/network/types";
import { NetworkMapControls } from "./NetworkMapControls";
import { NetworkMapFilterPanel } from "./NetworkMapFilterPanel";
import { NetworkMapLegend } from "./NetworkMapLegend";

interface NetworkMapHudProps {
  autoRotate: boolean;
  filters: NetworkMapFilterState;
  hasSelectedDevice: boolean;
  focusMode: NetworkMapFocusMode;
  labelMode: NetworkMapLabelMode;
  overlayMode: NetworkMapOverlayMode;
  reducedMotion: boolean;
  showLinks: boolean;
  showParticles: boolean;
  topologyGraph: NetworkTopologyGraph | null;
  viewMode: NetworkMapViewMode;
  onAutoRotateChange: (value: boolean) => void;
  onFiltersChange: (filters: NetworkMapFilterState) => void;
  onFocusModeChange: (mode: NetworkMapFocusMode) => void;
  onFitAll: () => void;
  onFocusSelected: () => void;
  onLabelModeChange: (mode: NetworkMapLabelMode) => void;
  onOverlayModeChange: (mode: NetworkMapOverlayMode) => void;
  onReducedMotionChange: (value: boolean) => void;
  onResetCamera: () => void;
  onShowLinksChange: (value: boolean) => void;
  onShowParticlesChange: (value: boolean) => void;
  onViewModeChange: (mode: NetworkMapViewMode) => void;
}

export function NetworkMapHud(props: NetworkMapHudProps) {
  const topologyMode = props.topologyGraph?.topologyMode;
  const relationshipsConfirmed = Boolean(props.topologyGraph?.relationshipsConfirmed);
  const confidenceLabel =
    topologyMode === "backend-confirmed" && relationshipsConfirmed
      ? "CONFIRMED"
      : topologyMode === "demo"
        ? "DEMO"
        : "ESTIMATED";
  const confidenceClasses =
    topologyMode === "backend-confirmed" && relationshipsConfirmed
      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
      : "border-orange-500/50 bg-orange-500/10 text-orange-300";
  const confidenceFootnote =
    topologyMode === "backend-confirmed" && relationshipsConfirmed
      ? "Relationships confirmed by backend probe."
      : "Relationships inferred from the current device list. Not a verified topology probe.";

  return (
    <aside className="rounded-lg border border-purple-500/20 bg-gray-950/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-purple-400" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-purple-300">
            MAP_HUD
          </h3>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] ${confidenceClasses}`}
          title={confidenceFootnote}
        >
          {confidenceLabel}
        </span>
      </div>

      <div className="mb-2 grid grid-cols-3 gap-2 2xl:grid-cols-1">
        <HudMetric label="NODES" value={props.topologyGraph?.summary.totalNodes ?? "--"} />
        <HudMetric label="LINKS" value={props.showLinks ? props.topologyGraph?.summary.totalEdges ?? "--" : "OFF"} />
        <HudMetric label="FLAGS" value={props.topologyGraph?.summary.flaggedNodes ?? "--"} />
      </div>
      <p className="mb-4 font-mono text-[9px] leading-relaxed text-orange-300/80">
        {confidenceFootnote}
      </p>

      <details className="group rounded border border-cyan-500/20 bg-black/30 p-3" open>
        <summary className="flex cursor-pointer list-none items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Controls
        </summary>
        <div className="mt-4">
          <NetworkMapControls {...props} />
        </div>
      </details>

      <details className="mt-3 rounded border border-cyan-500/20 bg-black/30 p-3">
        <summary className="cursor-pointer list-none font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
          Filters
        </summary>
        <div className="mt-4">
          <NetworkMapFilterPanel filters={props.filters} onChange={props.onFiltersChange} />
        </div>
      </details>

      <details className="mt-3 rounded border border-cyan-500/20 bg-black/30 p-3">
        <summary className="cursor-pointer list-none font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
          Legend
        </summary>
        <div className="mt-4">
          <NetworkMapLegend />
        </div>
      </details>
    </aside>
  );
}

function HudMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded border border-gray-800 bg-black/40 p-3">
      <p className="font-mono text-[9px] text-gray-500">{label}</p>
      <p className="font-mono text-lg font-black text-cyan-300">{value}</p>
    </div>
  );
}
