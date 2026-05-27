"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Radar } from "lucide-react";
import { networkAdapter } from "@/lib/network/networkDiscoveryAdapter";
import { buildMapOperationalState, getFocusedDeviceIds } from "@/lib/network/mapOperationalState";
import { useApp } from "@/lib/store";
import type {
  DiscoveredDevice,
  NetworkAlert,
  NetworkEvent,
  NetworkMapFocusMode,
  NetworkMapFilterState,
  NetworkMapLabelMode,
  NetworkMapOverlayMode,
  NetworkMapViewMode,
  NetworkTopologyGraph,
  ScanState,
  ScanComparisonSummary,
} from "@/lib/network/types";
import { NetworkMapCanvas } from "./NetworkMapCanvas";
import type { NetworkMapControlsHandle } from "./NetworkMapCameraRig";
import { NetworkMapFallback } from "./NetworkMapFallback";
import { NetworkMapHud } from "./NetworkMapHud";
import { NetworkMapLoadingState } from "./NetworkMapLoadingState";
import { NetworkMapSelectionOverlay } from "./NetworkMapSelectionOverlay";

interface NetworkMap3DProps {
  devices: DiscoveredDevice[];
  selectedDevice: DiscoveredDevice | null;
  visibleDeviceIds: string[];
  scanProgress: number;
  scanState: ScanState;
  events: NetworkEvent[];
  alerts: NetworkAlert[];
  lastScanDelta: ScanComparisonSummary | null;
  onSelectDevice: (device: DiscoveredDevice) => void;
  onOpenDetails: (device: DiscoveredDevice) => void;
  onTrustDevice: (device: DiscoveredDevice) => void;
  onWatchDevice: (device: DiscoveredDevice) => void;
  onRenameDevice: (device: DiscoveredDevice, customName: string) => void;
  onViewTimeline: (device: DiscoveredDevice) => void;
  onAskNeo: (device: DiscoveredDevice) => void;
}

export function NetworkMap3D({
  devices,
  selectedDevice,
  visibleDeviceIds,
  scanProgress,
  scanState,
  events,
  alerts,
  lastScanDelta,
  onSelectDevice,
  onOpenDetails,
  onTrustDevice,
  onWatchDevice,
  onRenameDevice,
  onViewTimeline,
  onAskNeo,
}: NetworkMap3DProps) {
  const { settings } = useApp();
  const [topologyGraph, setTopologyGraph] = useState<NetworkTopologyGraph | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [webglAvailable, setWebglAvailable] = useState(true);
  const [hoveredDeviceId, setHoveredDeviceId] = useState<string | null>(null);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [isPanelOnScreen, setIsPanelOnScreen] = useState(true);
  const [osReducedMotion, setOsReducedMotion] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [labelMode, setLabelMode] = useState<NetworkMapLabelMode>("off");
  // HUD-local reduced motion toggle (the button on the map). The effective
  // value passed downstream OR's this with the OS prefers-reduced-motion
  // query and the global app setting, so any one of those flips the map into
  // calm mode without surprising the user.
  const [hudReducedMotion, setHudReducedMotion] = useState(false);
  const [showLinks, setShowLinks] = useState(true);
  const [showParticles, setShowParticles] = useState(true);
  const [viewMode, setViewMode] = useState<NetworkMapViewMode>("orbital-3d");
  const [overlayMode, setOverlayMode] = useState<NetworkMapOverlayMode>("operational");
  const [focusMode, setFocusMode] = useState<NetworkMapFocusMode>("all");
  const panelRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = hudReducedMotion || osReducedMotion || settings.reducedMotion;
  const [filters, setFilters] = useState<NetworkMapFilterState>({
    showTrusted: true,
    showNew: true,
    showWatch: true,
    showBlocked: true,
    showOffline: true,
    showUnknown: true,
    showOnlyFlagged: false,
  });
  const controlsRef = useRef<NetworkMapControlsHandle>(null);
  const topologyLoadedRef = useRef(false);
  const deviceById = useMemo(
    () => new Map(devices.map((device) => [device.id, device])),
    [devices]
  );
  const deviceStateSignature = useMemo(
    () =>
      devices
        .map(
          (device) =>
            `${device.id}:${device.name}:${device.status}:${device.trustLevel}:${device.deviceType}:${
              device.room ?? ""
            }:${device.ownerLabel ?? ""}:${device.manuallyVerified ? "verified" : "unverified"}`
        )
        .join("|"),
    [devices]
  );
  const hoveredDevice = hoveredDeviceId ? deviceById.get(hoveredDeviceId) ?? null : null;
  const nodeStates = useMemo(
    () =>
      buildMapOperationalState({
        devices,
        events,
        alerts,
        lastScanDelta,
        overlayMode,
      }),
    [alerts, devices, events, lastScanDelta, overlayMode]
  );
  const focusedDeviceIds = useMemo(
    () => getFocusedDeviceIds(devices, nodeStates, focusMode),
    [devices, focusMode, nodeStates]
  );
  const handleNodeHover = useCallback((deviceId: string | null) => {
    setHoveredDeviceId((current) => (current === deviceId ? current : deviceId));
  }, []);
  const filteredDeviceIds = useMemo(
    () => {
      const matchingIds = devices
        .filter((device) => {
          const state = nodeStates.get(device.id);
          if (visibleDeviceIds.length > 0 && !visibleDeviceIds.includes(device.id)) return false;
          if (focusMode !== "all" && focusedDeviceIds.length === 0) return false;
          if (focusMode !== "all" && !focusedDeviceIds.includes(device.id)) {
            return false;
          }
          if (viewMode === "alerts-only") {
            return Boolean(state?.hasRecentAlert || state?.isWatchOrFlagged || state?.isNew || device.deviceType === "unknown");
          }
          if (viewMode === "recent-changes") {
            return Boolean(state?.changedSinceLastScan || state?.isReturned || state?.isNew || state?.hasRecentAlert);
          }
          if (filters.showOnlyFlagged) {
            return (
              device.trustLevel === "new" ||
              device.trustLevel === "watch" ||
              device.trustLevel === "blocked" ||
              device.deviceType === "unknown"
            );
          }
          if (!filters.showTrusted && device.trustLevel === "trusted") return false;
          if (!filters.showNew && device.trustLevel === "new") return false;
          if (!filters.showWatch && device.trustLevel === "watch") return false;
          if (!filters.showBlocked && device.trustLevel === "blocked") return false;
          if (!filters.showOffline && device.status === "offline") return false;
          if (!filters.showUnknown && device.deviceType === "unknown") return false;
          return true;
        })
        .map((device) => device.id);

      return matchingIds.length > 0 ? matchingIds : ["__none__"];
    },
    [devices, filters, focusedDeviceIds, focusMode, nodeStates, viewMode, visibleDeviceIds]
  );

  useEffect(() => {
    // Subscribe to OS-level prefers-reduced-motion so the map drops out of
    // its high-motion rendering path even when the user has not toggled the
    // HUD button. The match is folded into `reducedMotion` above.
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return;
    const update = () => setOsReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    // Pause GPU work when the map panel scrolls off-screen, not just when the
    // tab is hidden. On a phone this matters: Network screen has the device
    // list and action queue below the map, and a user reading those should
    // not be burning frames on an invisible canvas above.
    const node = panelRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsPanelOnScreen(Boolean(entry?.isIntersecting)),
      { threshold: 0.05 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setWebglAvailable(canUseWebGL());
    setIsPageVisible(document.visibilityState === "visible");

    let cancelled = false;
    const handleVisibilityChange = () => {
      setIsPageVisible(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Watchdog: if topology hasn't arrived within 12 seconds, surface a
    // deliberate fallback so users don't sit on a spinning Radar icon
    // forever. The adapter's getNetworkTopology() normally resolves
    // synchronously-ish in demo mode, so anything past 12s is broken.
    const timeoutId = window.setTimeout(() => {
      if (!cancelled && !topologyLoadedRef.current) {
        setLoadError(
          "Topology graph did not load in time. Falling back to summary view.",
        );
      }
    }, 12000);

    networkAdapter
      .getNetworkTopology()
      .then((graph) => {
        if (!cancelled) {
          topologyLoadedRef.current = true;
          setTopologyGraph(graph);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("Topology graph could not be loaded from the network adapter.");
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (scanState !== "complete") return;

    let cancelled = false;
    networkAdapter.getNetworkTopology().then((graph) => {
      if (!cancelled) {
        topologyLoadedRef.current = true;
        setTopologyGraph(graph);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [scanState]);

  useEffect(() => {
    if (!topologyLoadedRef.current) return;

    let cancelled = false;
    networkAdapter.getNetworkTopology().then((graph) => {
      if (!cancelled) {
        setTopologyGraph(graph);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [deviceStateSignature]);

  const topologyMode = topologyGraph?.topologyMode;
  const relationshipsConfirmed = Boolean(topologyGraph?.relationshipsConfirmed);
  const truthBadge =
    topologyMode === "demo"
      ? "DEMO"
      : topologyMode === "estimated"
        ? "ESTIMATED"
        : "LIVE";
  const confidenceLabel =
    topologyMode === "backend-confirmed" && relationshipsConfirmed
      ? "LIVE"
      : topologyMode === "demo"
        ? "DEMO"
        : "ESTIMATED";
  const confidenceClasses =
    topologyMode === "backend-confirmed" && relationshipsConfirmed
      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
      : "border-orange-500/50 bg-orange-500/10 text-orange-300";
  const confidenceTooltip =
    topologyMode === "backend-confirmed" && relationshipsConfirmed
      ? "Relationships were confirmed by a backend-side topology probe."
      : "Relationships are inferred from the current device list. This is not a verified topology probe — gateway links are estimated.";
  const subtitleText =
    topologyMode === "backend-confirmed" && relationshipsConfirmed
      ? "Interactive logical map of discovered devices and confirmed gateway relationships."
      : "Logical map inferred from the current device list — gateway relationships are estimated, not probed.";

  return (
    <div className="rounded-lg border border-cyan-500/30 bg-black/60 p-4 shadow-[0_0_35px_rgba(34,211,238,0.08)] backdrop-blur-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2 font-mono text-xs text-gray-500">
            <Box className="h-3.5 w-3.5" />
            <span>N.E.O. // TOPOLOGY_VIEW</span>
          </div>
          <h2 className="font-mono text-xl font-black uppercase italic tracking-tight text-cyan-300 sm:text-2xl">
            3D NETWORK TOPOLOGY
          </h2>
          <p className="mt-1 font-mono text-xs text-gray-500 sm:text-sm" title={confidenceTooltip}>
            {subtitleText}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${confidenceClasses}`}
            title={confidenceTooltip}
          >
            <Radar className="h-3 w-3" />
            {confidenceLabel}
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-orange-500/50 bg-orange-500/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-orange-400">
            {truthBadge}
          </span>
        </div>
      </div>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_240px]">
        <div
          ref={panelRef}
          className="relative h-[430px] overflow-hidden rounded-lg border border-cyan-500/20 bg-black/70 sm:h-[520px]"
        >
          <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_20%,rgba(34,211,238,0.13),transparent_45%)]" />
          {loadError ? (
            <NetworkMapFallback message={loadError} topologyGraph={topologyGraph} />
          ) : !webglAvailable ? (
            <NetworkMapFallback topologyGraph={topologyGraph} />
          ) : topologyGraph ? (
            <>
              <NetworkMapSelectionOverlay
                selectedDevice={selectedDevice}
                hoveredDevice={hoveredDevice}
                selectedState={selectedDevice ? nodeStates.get(selectedDevice.id) ?? null : null}
                hoveredState={hoveredDevice ? nodeStates.get(hoveredDevice.id) ?? null : null}
                onFitAll={() => controlsRef.current?.fitAllNodes()}
                onResetCamera={() => controlsRef.current?.resetCamera()}
                onFocusSelected={() => controlsRef.current?.focusSelectedNode()}
                onOpenDetails={onOpenDetails}
                onTrustDevice={onTrustDevice}
                onWatchDevice={onWatchDevice}
                onRenameDevice={onRenameDevice}
                onViewTimeline={onViewTimeline}
                onAskNeo={onAskNeo}
              />
              <NetworkMapCanvas
                ref={controlsRef}
                topologyGraph={topologyGraph}
                devices={devices}
                selectedDeviceId={selectedDevice?.id ?? null}
                hoveredDeviceId={hoveredDeviceId}
                visibleDeviceIds={filteredDeviceIds}
                autoRotate={autoRotate}
                labelMode={labelMode}
                reducedMotion={reducedMotion}
                scanProgress={scanProgress}
                scanState={scanState}
                showLinks={showLinks}
                showParticles={showParticles}
                viewMode={viewMode}
                overlayMode={overlayMode}
                nodeStates={nodeStates}
                // Render only when the tab is visible AND the panel is on
                // screen AND no reduced-motion source has been triggered.
                // Pointer/touch state changes still trigger renders via R3F's
                // demand frameloop so interaction stays responsive.
                isRenderingActive={isPageVisible && isPanelOnScreen && !reducedMotion}
                onNodeHover={handleNodeHover}
                onNodeSelect={(deviceId) => {
                  const device = deviceById.get(deviceId);
                  if (device) {
                    onSelectDevice(device);
                  }
                }}
              />
            </>
          ) : (
            <NetworkMapLoadingState />
          )}

          {process.env.NODE_ENV !== "production" && (
            // Dev-only diagnostics. Stripped from production builds because
            // process.env.NODE_ENV !== "production" folds to a static false.
            <div
              className="pointer-events-none absolute bottom-2 right-2 z-20 rounded-md border border-cyan-500/30 bg-black/80 px-2 py-1 font-mono text-[9px] leading-tight tracking-[0.18em] text-cyan-300/85"
              aria-hidden="true"
            >
              <div>RND {isPageVisible && isPanelOnScreen && !reducedMotion ? "ON" : "OFF"}</div>
              <div>RM {reducedMotion ? "Y" : "N"}</div>
              <div>NODES {devices.length}</div>
            </div>
          )}
        </div>

        <NetworkMapHud
          autoRotate={autoRotate}
          filters={filters}
          hasSelectedDevice={selectedDevice !== null}
          labelMode={labelMode}
          focusMode={focusMode}
          overlayMode={overlayMode}
          reducedMotion={reducedMotion}
          showLinks={showLinks}
          showParticles={showParticles}
          topologyGraph={topologyGraph}
          viewMode={viewMode}
          onAutoRotateChange={setAutoRotate}
          onFiltersChange={setFilters}
          onFitAll={() => controlsRef.current?.fitAllNodes()}
          onFocusSelected={() => controlsRef.current?.focusSelectedNode()}
          onLabelModeChange={setLabelMode}
          onFocusModeChange={(mode) => {
            setFocusMode(mode);
            if (mode === "changed") {
              setViewMode("recent-changes");
            }
          }}
          onOverlayModeChange={setOverlayMode}
          onReducedMotionChange={setHudReducedMotion}
          onResetCamera={() => controlsRef.current?.resetCamera()}
          onShowLinksChange={setShowLinks}
          onShowParticlesChange={setShowParticles}
          onViewModeChange={(mode) => {
            setViewMode(mode);
            if (mode === "focus-selected") {
              controlsRef.current?.focusSelectedNode();
            }
          }}
        />
      </div>
    </div>
  );
}

function canUseWebGL() {
  if (typeof window === "undefined") return false;

  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
