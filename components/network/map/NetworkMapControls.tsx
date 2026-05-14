"use client";

import type { ReactNode } from "react";
import { Crosshair, Maximize2, RotateCcw } from "lucide-react";
import type { NetworkMapLabelMode, NetworkMapViewMode } from "@/lib/network/types";

interface NetworkMapControlsProps {
  autoRotate: boolean;
  labelMode: NetworkMapLabelMode;
  reducedMotion: boolean;
  showLinks: boolean;
  showParticles: boolean;
  viewMode: NetworkMapViewMode;
  hasSelectedDevice: boolean;
  onAutoRotateChange: (value: boolean) => void;
  onFitAll: () => void;
  onFocusSelected: () => void;
  onLabelModeChange: (mode: NetworkMapLabelMode) => void;
  onReducedMotionChange: (value: boolean) => void;
  onResetCamera: () => void;
  onShowLinksChange: (value: boolean) => void;
  onShowParticlesChange: (value: boolean) => void;
  onViewModeChange: (mode: NetworkMapViewMode) => void;
}

const VIEW_MODES: Array<{ label: string; value: NetworkMapViewMode }> = [
  { label: "Orbital 3D", value: "orbital-3d" },
  { label: "Top-Down", value: "top-down" },
  { label: "Focus", value: "focus-selected" },
  { label: "Alerts", value: "alerts-only" },
];

const LABEL_MODES: Array<{ label: string; value: NetworkMapLabelMode }> = [
  { label: "Off", value: "off" },
  { label: "Name", value: "name" },
  { label: "IP", value: "ip" },
  { label: "Vendor", value: "vendor" },
  { label: "Status", value: "status" },
];

export function NetworkMapControls({
  autoRotate,
  labelMode,
  reducedMotion,
  showLinks,
  showParticles,
  viewMode,
  hasSelectedDevice,
  onAutoRotateChange,
  onFitAll,
  onFocusSelected,
  onLabelModeChange,
  onReducedMotionChange,
  onResetCamera,
  onShowLinksChange,
  onShowParticlesChange,
  onViewModeChange,
}: NetworkMapControlsProps) {
  return (
    <div className="space-y-4">
      <ControlSection title="VIEW_MODE">
        <div className="grid grid-cols-2 gap-2">
          {VIEW_MODES.map((mode) => (
            <SegmentButton
              key={mode.value}
              active={viewMode === mode.value}
              label={mode.label}
              onClick={() => onViewModeChange(mode.value)}
            />
          ))}
        </div>
      </ControlSection>

      <ControlSection title="CAMERA">
        <div className="grid grid-cols-3 gap-2">
          <IconButton icon={<RotateCcw className="h-3 w-3" />} label="Reset" onClick={onResetCamera} />
          <IconButton icon={<Maximize2 className="h-3 w-3" />} label="Fit" onClick={onFitAll} />
          <IconButton
            disabled={!hasSelectedDevice}
            icon={<Crosshair className="h-3 w-3" />}
            label="Focus"
            onClick={onFocusSelected}
          />
        </div>
      </ControlSection>

      <ControlSection title="LABELS">
        <div className="grid grid-cols-5 gap-1">
          {LABEL_MODES.map((mode) => (
            <SegmentButton
              key={mode.value}
              active={labelMode === mode.value}
              compact
              label={mode.label}
              onClick={() => onLabelModeChange(mode.value)}
            />
          ))}
        </div>
      </ControlSection>

      <ControlSection title="SCENE_TOGGLES">
        <div className="grid grid-cols-2 gap-2">
          <ToggleButton active={autoRotate} label="Auto Rotate" onClick={() => onAutoRotateChange(!autoRotate)} />
          <ToggleButton active={showLinks} label="Links" onClick={() => onShowLinksChange(!showLinks)} />
          <ToggleButton active={showParticles} label="Particles" onClick={() => onShowParticlesChange(!showParticles)} />
          <ToggleButton active={reducedMotion} label="Reduced Motion" onClick={() => onReducedMotionChange(!reducedMotion)} />
        </div>
      </ControlSection>
    </div>
  );
}

function ControlSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section>
      <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
        {title}
      </p>
      {children}
    </section>
  );
}

function SegmentButton({
  active,
  compact,
  label,
  onClick,
}: {
  active: boolean;
  compact?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2 py-1.5 font-mono font-bold uppercase transition ${
        compact ? "text-[9px]" : "text-[10px]"
      } ${
        active
          ? "border-cyan-400 bg-cyan-500/20 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.18)]"
          : "border-gray-800 bg-black/40 text-gray-500 hover:border-cyan-500/40 hover:text-cyan-300"
      }`}
    >
      {label}
    </button>
  );
}

function ToggleButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between gap-2 rounded border px-2 py-1.5 font-mono text-[10px] font-bold uppercase transition ${
        active
          ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-300"
          : "border-gray-800 bg-black/40 text-gray-500 hover:border-gray-600"
      }`}
    >
      <span>{label}</span>
      <span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-300" : "bg-gray-700"}`} />
    </button>
  );
}

function IconButton({
  disabled,
  icon,
  label,
  onClick,
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center justify-center gap-1 rounded border border-purple-500/30 bg-purple-500/10 px-2 py-1.5 font-mono text-[10px] font-bold uppercase text-purple-200 transition hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:border-gray-800 disabled:bg-black/30 disabled:text-gray-600"
    >
      {icon}
      {label}
    </button>
  );
}
