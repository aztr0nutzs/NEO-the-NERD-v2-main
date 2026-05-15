"use client";

import { Component, Suspense, forwardRef, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import type {
  DiscoveredDevice,
  NetworkMapLabelMode,
  NetworkMapNodeOperationalState,
  NetworkMapOverlayMode,
  NetworkMapViewMode,
  NetworkTopologyGraph,
  ScanState,
} from "@/lib/network/types";
import { NetworkMapFallback } from "./NetworkMapFallback";
import { NetworkMapLoadingState } from "./NetworkMapLoadingState";
import { NetworkMapScene } from "./NetworkMapScene";
import { NetworkMapCameraRig, type NetworkMapControlsHandle } from "./NetworkMapCameraRig";

interface NetworkMapCanvasProps {
  topologyGraph: NetworkTopologyGraph;
  devices: DiscoveredDevice[];
  selectedDeviceId: string | null;
  hoveredDeviceId: string | null;
  visibleDeviceIds: string[];
  autoRotate: boolean;
  labelMode: NetworkMapLabelMode;
  reducedMotion: boolean;
  scanProgress: number;
  scanState: ScanState;
  showLinks: boolean;
  showParticles: boolean;
  viewMode: NetworkMapViewMode;
  overlayMode: NetworkMapOverlayMode;
  nodeStates: Map<string, NetworkMapNodeOperationalState>;
  isRenderingActive: boolean;
  onNodeHover: (deviceId: string | null) => void;
  onNodeSelect: (deviceId: string) => void;
}

export const NetworkMapCanvas = forwardRef<NetworkMapControlsHandle, NetworkMapCanvasProps>(
  function NetworkMapCanvas(
    {
      topologyGraph,
      devices,
      selectedDeviceId,
      hoveredDeviceId,
      visibleDeviceIds,
      autoRotate,
      labelMode,
      reducedMotion,
      scanProgress,
      scanState,
      showLinks,
      showParticles,
      viewMode,
      overlayMode,
      nodeStates,
      isRenderingActive,
      onNodeHover,
      onNodeSelect,
    },
    ref
  ) {
  return (
    <WebGLErrorBoundary topologyGraph={topologyGraph}>
      <Canvas
        camera={{ position: [0, 8, 14], fov: 52, near: 0.1, far: 100 }}
        dpr={[1, 1.75]}
        frameloop={isRenderingActive ? "always" : "demand"}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.setClearColor("#000000", 0);
        }}
      >
        <Suspense fallback={null}>
          <NetworkMapScene
            topologyGraph={topologyGraph}
            devices={devices}
            selectedDeviceId={selectedDeviceId}
            hoveredDeviceId={hoveredDeviceId}
            visibleDeviceIds={visibleDeviceIds}
            labelMode={labelMode}
            reducedMotion={reducedMotion}
            scanProgress={scanProgress}
            scanState={scanState}
            showLinks={showLinks}
            showParticles={showParticles}
            overlayMode={overlayMode}
            nodeStates={nodeStates}
            isSceneActive={isRenderingActive}
            onNodeHover={onNodeHover}
            onNodeSelect={onNodeSelect}
          />
          <NetworkMapCameraRig
            ref={ref}
            autoRotate={autoRotate && !reducedMotion && isRenderingActive}
            topologyGraph={topologyGraph}
            selectedDeviceId={selectedDeviceId}
            viewMode={viewMode}
            isSceneActive={isRenderingActive}
          />
        </Suspense>
      </Canvas>
    </WebGLErrorBoundary>
  );
  }
);

interface WebGLErrorBoundaryProps {
  children: ReactNode;
  topologyGraph: NetworkTopologyGraph;
}

interface WebGLErrorBoundaryState {
  hasError: boolean;
}

class WebGLErrorBoundary extends Component<WebGLErrorBoundaryProps, WebGLErrorBoundaryState> {
  state: WebGLErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): WebGLErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <NetworkMapFallback
          message="Switching to topology summary fallback after WebGL initialization failed."
          topologyGraph={this.props.topologyGraph}
        />
      );
    }

    return (
      <Suspense fallback={<NetworkMapLoadingState />}>
        <div className="h-full min-h-[420px] w-full overflow-hidden rounded-lg bg-black/70">
          {this.props.children}
        </div>
      </Suspense>
    );
  }
}
