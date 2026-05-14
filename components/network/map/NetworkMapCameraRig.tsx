"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Vector3 } from "three";
import type { NetworkMapViewMode, NetworkTopologyGraph } from "@/lib/network/types";

export interface NetworkMapControlsHandle {
  fitAllNodes: () => void;
  resetCamera: () => void;
  focusSelectedNode: () => void;
}

interface NetworkMapCameraRigProps {
  autoRotate: boolean;
  topologyGraph: NetworkTopologyGraph;
  selectedDeviceId: string | null;
  viewMode: NetworkMapViewMode;
  isSceneActive: boolean;
}

const DEFAULT_CAMERA = new Vector3(0, 8, 14);
const DEFAULT_TARGET = new Vector3(0, 0, 0);

export const NetworkMapCameraRig = forwardRef<NetworkMapControlsHandle, NetworkMapCameraRigProps>(
  function NetworkMapCameraRig({ autoRotate, topologyGraph, selectedDeviceId, viewMode, isSceneActive }, ref) {
    const { camera } = useThree();
    const controlsRef = useRef<OrbitControlsImpl>(null);
    const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [goal, setGoal] = useState<{ camera: Vector3; target: Vector3 } | null>(null);

    const selectedNode = useMemo(
      () => topologyGraph.nodes.find((node) => node.deviceId === selectedDeviceId) ?? null,
      [selectedDeviceId, topologyGraph.nodes]
    );

    const scheduleGoal = useCallback((nextGoal: { camera: Vector3; target: Vector3 }) => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }

      focusTimeoutRef.current = setTimeout(() => {
        setGoal(nextGoal);
      }, 80);
    }, []);

    const focusNode = useCallback(() => {
      if (!selectedNode?.position) return;

      const target = new Vector3(
        selectedNode.position.x,
        selectedNode.position.y,
        selectedNode.position.z
      );
      const cameraOffset = selectedNode.role === "gateway"
        ? new Vector3(0, 4.6, 7.5)
        : new Vector3(2.8, 2.4, 4.2);

      scheduleGoal({ camera: target.clone().add(cameraOffset), target });
    }, [scheduleGoal, selectedNode]);

    useEffect(() => {
      return () => {
        if (focusTimeoutRef.current) {
          clearTimeout(focusTimeoutRef.current);
        }
      };
    }, []);

    useEffect(() => {
      focusNode();
    }, [focusNode, selectedDeviceId]);

    useEffect(() => {
      if (viewMode === "top-down") {
        scheduleGoal({ camera: new Vector3(0, 17, 0.1), target: DEFAULT_TARGET.clone() });
        return;
      }

      if (viewMode === "focus-selected") {
        focusNode();
        return;
      }

      if (viewMode === "alerts-only") {
        scheduleGoal({ camera: new Vector3(0, 8.8, 15), target: DEFAULT_TARGET.clone() });
        return;
      }

      scheduleGoal({ camera: DEFAULT_CAMERA.clone(), target: DEFAULT_TARGET.clone() });
    }, [focusNode, scheduleGoal, viewMode]);

    useImperativeHandle(ref, () => ({
      fitAllNodes() {
        scheduleGoal({ camera: new Vector3(0, 9.4, 16.5), target: DEFAULT_TARGET.clone() });
      },
      resetCamera() {
        scheduleGoal({ camera: DEFAULT_CAMERA.clone(), target: DEFAULT_TARGET.clone() });
      },
      focusSelectedNode: focusNode,
    }), [focusNode, scheduleGoal]);

    useFrame(() => {
      if (!isSceneActive) return;
      if (!goal || !controlsRef.current) return;

      camera.position.lerp(goal.camera, 0.08);
      controlsRef.current.target.lerp(goal.target, 0.08);
      controlsRef.current.update();

      if (
        camera.position.distanceTo(goal.camera) < 0.05 &&
        controlsRef.current.target.distanceTo(goal.target) < 0.05
      ) {
        setGoal(null);
      }
    });

    return (
      <OrbitControls
        ref={controlsRef}
        autoRotate={autoRotate}
        autoRotateSpeed={0.45}
        enableDamping
        enablePan={false}
        enableZoom
        maxDistance={22}
        maxPolarAngle={viewMode === "top-down" ? Math.PI / 2.01 : Math.PI / 2.05}
        minDistance={4}
        minPolarAngle={viewMode === "top-down" ? 0 : Math.PI / 8}
      />
    );
  }
);
