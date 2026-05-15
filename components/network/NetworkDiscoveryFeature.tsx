/**
 * N.E.O. the N.E.R.D. - Network Discovery + Control Feature
 * Main Feature Component
 *
 * INTEGRATION INSTRUCTIONS:
 * 1. Copy `components/network/*` to your project
 * 2. Copy `lib/network/*` to your project
 * Integrated into the existing NEO screen-state shell.
 * Replace mock adapter with native/backend adapter when ready.
 *
 * This is a self-contained feature module designed to be dropped into
 * the existing NEO the N.E.R.D. application without modification.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Radar,
  Network,
  Cpu,
  AlertTriangle,
  ChevronDown,
  Box,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/lib/store";

import { NetworkOverviewPanel } from "./NetworkOverviewPanel";
import { NetworkScanPanel } from "./NetworkScanPanel";
import { DeviceListPanel } from "./DeviceListPanel";
import { DeviceDetailPanel } from "./DeviceDetailPanel";
import { RouterControlPanel } from "./RouterControlPanel";
import { SecurityInsightsPanel } from "./SecurityInsightsPanel";
import { ScanHistoryPanel } from "./ScanHistoryPanel";
import { NetworkSettingsPanel } from "./NetworkSettingsPanel";
import { NetworkActionQueue } from "./NetworkActionQueue";
import { NerdControlPanel } from "./NerdControlPanel";
import { NeoRobotAvatar } from "./NeoRobotAvatar";
import { DeviceIdentityReviewQueue } from "./DeviceIdentityReviewQueue";
import { NetworkTimelinePanel } from "./NetworkTimelinePanel";
import { NetworkAlertsPanel } from "./NetworkAlertsPanel";
import { NetworkHealthPanel } from "./NetworkHealthPanel";
import { NetworkMapLoadingState } from "./map/NetworkMapLoadingState";
import { NetworkExportPanel } from "@/components/exports/network-export-panel";

import {
  networkAdapter,
  resolveNetworkAdapterStatus,
  resolveNetworkUiAdapterStatus,
} from "@/lib/network/networkDiscoveryAdapter";
import {
  wakeDevice,
  rebootRouter,
  toggleGuestNetwork,
  toggleQoS,
} from "@/lib/network/networkActions";
import {
  mergeDeviceIdentities,
  projectIdentityOntoDevices,
  updateDeviceIdentity,
} from "@/lib/network/deviceIdentity";
import {
  appendNetworkEvents,
  compareNetworkContext,
  compareRouterStatus,
  compareScanDevices,
  createDeviceIdentityEvents,
  createScanFailedEvent,
  createScanStartedEvent,
} from "@/lib/network/networkEvents";
import {
  buildAlertsForScanEvents,
  getNetworkNotificationCapability,
  materializeNetworkAlerts,
} from "@/lib/network/networkNotifications";
import { computeNextAutoScanAt, shouldRunAutoScan } from "@/lib/network/networkMonitoring";
import {
  calculateNetworkHealth,
  retainHealthSnapshots,
  runNetworkDiagnostics,
  selectLatestHealthSnapshot,
} from "@/lib/network/networkDiagnostics";

import type {
  NetworkStatus,
  DiscoveredDevice,
  RouterStatus,
  SecurityInsight,
  ScanHistoryEntry,
  NetworkSettings,
  NetworkAction,
  NetworkAdapterStatus,
  ScanMode,
  RouterCapability,
  RouterControlMode,
  DeviceIdentityUpdate,
  DiagnosticProbeResult,
} from "@/lib/network/types";

const NetworkMap3D = dynamic(
  () => import("./map/NetworkMap3D").then((module) => module.NetworkMap3D),
  {
    // Surface chunk-load errors from the loading callback so an Android
    // WebView that fails to fetch the 3D engine chunk shows a deliberate
    // fallback instead of a forever-spinning radar.
    loading: ({ error, retry }) => (
      <NetworkMapLoadingState error={error ?? undefined} retry={retry} />
    ),
    ssr: false,
  }
);

export function NetworkDiscoveryFeature() {
  const {
    playAvatarReaction,
    networkDeviceIdentities,
    setNetworkDeviceIdentities,
    networkEvents,
    setNetworkEvents,
    lastNetworkScanDelta,
    setLastNetworkScanDelta,
    persistedNetworkSettings,
    setPersistedNetworkSettings,
    networkMonitorState,
    setNetworkMonitorState,
    networkAlerts,
    setNetworkAlerts,
    networkHealthSnapshots,
    setNetworkHealthSnapshots,
    setNetworkAssistantSnapshot,
    sendMessage,
    setScreen,
  } = useApp();
  // Core state
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [routerStatus, setRouterStatus] = useState<RouterStatus | null>(null);
  const [securityInsights, setSecurityInsights] = useState<SecurityInsight[]>([]);
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
  const [settings, setSettings] = useState<NetworkSettings | null>(null);
  const [actions, setActions] = useState<NetworkAction[]>([]);
  const [adapterStatus, setAdapterStatus] = useState<NetworkAdapterStatus | null>(null);
  const [routerCapabilities, setRouterCapabilities] = useState<RouterCapability[]>([]);
  const [routerControlMode, setRouterControlMode] = useState<RouterControlMode>("read-only");

  // UI state
  const [selectedDevice, setSelectedDevice] = useState<DiscoveredDevice | null>(null);
  const [selectedMode, setSelectedMode] = useState<ScanMode>("balanced");
  const [scanProgress, setScanProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("map");
  const [visibleDeviceIds, setVisibleDeviceIds] = useState<string[]>([]);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [robotMessage, setRobotMessage] = useState<string | null>(null);
  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false);
  const [latestDiagnostics, setLatestDiagnostics] = useState<DiagnosticProbeResult[]>([]);
  const previousDevicesRef = useRef<DiscoveredDevice[]>([]);
  const identityRecordsRef = useRef(networkDeviceIdentities);
  const networkEventsRef = useRef(networkEvents);
  const currentScanIdRef = useRef<string | null>(null);
  const previousNetworkStatusRef = useRef<NetworkStatus | null>(null);
  const previousRouterStatusRef = useRef<RouterStatus | null>(null);
  const settingsRef = useRef<NetworkSettings | null>(null);
  const persistedNetworkSettingsRef = useRef(persistedNetworkSettings);

  useEffect(() => {
    networkEventsRef.current = networkEvents;
  }, [networkEvents]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    setNetworkAssistantSnapshot({
      status: networkStatus,
      devices,
      routerStatus,
      routerCapabilities,
      routerControlMode,
    });
  }, [
    devices,
    networkStatus,
    routerCapabilities,
    routerControlMode,
    routerStatus,
    setNetworkAssistantSnapshot,
  ]);

  useEffect(() => {
    persistedNetworkSettingsRef.current = persistedNetworkSettings;
  }, [persistedNetworkSettings]);

  const appendEvents = useCallback(
    (eventsToAdd: Parameters<typeof appendNetworkEvents>[1]) => {
      if (!eventsToAdd.length) return;
      const nextEvents = appendNetworkEvents(networkEventsRef.current, eventsToAdd);
      networkEventsRef.current = nextEvents;
      setNetworkEvents(nextEvents);
    },
    [setNetworkEvents]
  );

  const appendAlerts = useCallback(
    async (alertsToAdd: Parameters<typeof materializeNetworkAlerts>[0]) => {
      if (!alertsToAdd.length) return;
      const materialized = await materializeNetworkAlerts(alertsToAdd);
      setNetworkAlerts((current) => [...materialized, ...current].slice(0, 100));
      const latest = materialized[0];
      if (latest) {
        setRobotMessage(latest.message);
        setTimeout(() => setRobotMessage(null), 5000);
      }
    },
    [setNetworkAlerts]
  );

  useEffect(() => {
    identityRecordsRef.current = networkDeviceIdentities;
    setDevices((current) => projectIdentityOntoDevices(networkDeviceIdentities, current));
    setSelectedDevice((current) => {
      if (!current) return current;
      return projectIdentityOntoDevices(networkDeviceIdentities, [current])[0] ?? current;
    });
  }, [networkDeviceIdentities]);

  const mergeIdentitiesForDevices = useCallback(
    (incomingDevices: DiscoveredDevice[]) => {
      const merged = mergeDeviceIdentities(identityRecordsRef.current, incomingDevices);
      identityRecordsRef.current = merged.identities;
      setNetworkDeviceIdentities(merged.identities);
      return merged.devices;
    },
    [setNetworkDeviceIdentities]
  );

  const commitIdentityUpdate = useCallback(
    (device: DiscoveredDevice, patch: DeviceIdentityUpdate) => {
      const beforeDevice = projectIdentityOntoDevices(identityRecordsRef.current, [device])[0] ?? device;
      const nextIdentities = updateDeviceIdentity(identityRecordsRef.current, device, patch);
      identityRecordsRef.current = nextIdentities;
      setNetworkDeviceIdentities(nextIdentities);
      const project = (currentDevices: DiscoveredDevice[]) =>
        projectIdentityOntoDevices(nextIdentities, currentDevices);
      const afterDevice = project([device])[0] ?? device;
      appendEvents(createDeviceIdentityEvents({ before: beforeDevice, after: afterDevice }));
      setDevices((current) => project(current));
      setSelectedDevice((current) => {
        if (!current) return current;
        return project([current])[0] ?? current;
      });
    },
    [appendEvents, setNetworkDeviceIdentities]
  );

  // Robot status based on app state
  const robotStatus = networkStatus?.scanState === "scanning" 
    ? "scanning" 
    : securityInsights.some(i => i.severity === "high") 
      ? "alert" 
      : "idle";

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [status, deviceList, router, insights, history, networkSettings, currentAdapterStatus, capabilities, controlMode] = await Promise.all([
          networkAdapter.getNetworkStatus(),
          networkAdapter.getDiscoveredDevices(),
          networkAdapter.getRouterStatus(),
          networkAdapter.getSecurityInsights(),
          networkAdapter.getScanHistory(),
          networkAdapter.getNetworkSettings(),
          networkAdapter.getAdapterStatus(),
          networkAdapter.getRouterCapabilities(),
          networkAdapter.getRouterControlMode(),
        ]);

        const restoredSettings = persistedNetworkSettingsRef.current
          ? await networkAdapter.updateNetworkSettings(persistedNetworkSettingsRef.current)
          : networkSettings;
        const notificationCapability = await getNetworkNotificationCapability();
        const identityDevices = mergeIdentitiesForDevices(deviceList);

        setNetworkStatus(status);
        setDevices(identityDevices);
        setRouterStatus(router);
        setSecurityInsights(insights);
        setScanHistory(history);
        setSettings(restoredSettings);
        setPersistedNetworkSettings(restoredSettings);
        setAdapterStatus(currentAdapterStatus);
        setRouterCapabilities(capabilities);
        setRouterControlMode(controlMode);
        setSelectedMode(restoredSettings.scanMode);
        setNetworkMonitorState((current) => ({
          ...current,
          enabled: restoredSettings.autoScanEnabled,
          nextRunAt:
            restoredSettings.autoScanEnabled && !current.nextRunAt
              ? computeNextAutoScanAt(restoredSettings)
              : current.nextRunAt,
          schedulerStatus: restoredSettings.autoScanEnabled ? "scheduled" : "idle",
          backgroundCapability: "in-app-only",
          notificationCapability,
        }));
        previousDevicesRef.current = identityDevices;
        previousNetworkStatusRef.current = status;
        previousRouterStatusRef.current = router;
      } catch (error) {
        setAdapterStatus(resolveNetworkAdapterStatus({
          demoMode: false,
          nativePluginAvailable: false,
          fallbackReason: error instanceof Error ? error.message : "Native discovery unavailable",
        }))
      }
    };

    loadData();
  }, [
    mergeIdentitiesForDevices,
    setNetworkMonitorState,
    setPersistedNetworkSettings,
  ]);

  // Scan progress polling
  useEffect(() => {
    if (networkStatus?.scanState !== "scanning") {
      return;
    }

    const interval = setInterval(() => {
      const progress = networkAdapter.getScanProgress();
      setScanProgress(progress);

      if (progress >= 100) {
        clearInterval(interval);
        // Refresh data after scan completes
        networkAdapter.getNetworkStatus().then((status) => {
          appendEvents(compareNetworkContext(previousNetworkStatusRef.current, status));
          previousNetworkStatusRef.current = status;
          setNetworkStatus(status);
        }).catch(() => undefined);
        networkAdapter.getAdapterStatus().then(setAdapterStatus).catch(() => undefined);
        networkAdapter.getDiscoveredDevices().then((rawUpdatedDevices) => {
          const updatedDevices = mergeIdentitiesForDevices(rawUpdatedDevices);
          const scanId = currentScanIdRef.current ?? `scan-${Date.now()}`;
          const previousDevices = previousDevicesRef.current;
          const comparison = compareScanDevices({
            previousDevices,
            currentDevices: updatedDevices,
            scanId,
          });
          const previousIds = new Set(previousDevices.map((device) => device.id));
          const previousOnlineIds = new Set(
            previousDevices.filter((device) => device.status === "online").map((device) => device.id)
          );
          const newDevices = updatedDevices.filter((device) => !previousIds.has(device.id));
          const offlineDevices = updatedDevices.filter(
            (device) => device.status === "offline" && previousOnlineIds.has(device.id)
          );
          previousDevicesRef.current = updatedDevices;
          setDevices(updatedDevices);
          setLastNetworkScanDelta(comparison.summary);
          appendEvents(comparison.events);
          const activeSettings = settingsRef.current;
          if (activeSettings) {
            appendAlerts(
              buildAlertsForScanEvents({
                events: comparison.events,
                devices: updatedDevices,
                settings: activeSettings,
                summary: comparison.summary,
              })
            ).catch(() => undefined);
          }
          setNetworkMonitorState((current) => ({
            ...current,
            enabled: Boolean(activeSettings?.autoScanEnabled),
            lastCompletedAt: new Date().toISOString(),
            schedulerStatus: activeSettings?.autoScanEnabled ? "scheduled" : "idle",
            nextRunAt: activeSettings?.autoScanEnabled ? computeNextAutoScanAt(activeSettings) : null,
            lastIssue: null,
          }));
          const previousHealth = selectLatestHealthSnapshot(networkHealthSnapshots);
          const healthSnapshot = calculateNetworkHealth({
            status: networkStatus ?? {
              networkName: "Unknown",
              gatewayIp: "",
              localIp: "",
              subnet: "",
              connectionType: "unknown",
              scanState: "complete",
              lastScanAt: null,
              devicesFound: updatedDevices.length,
              onlineDevices: updatedDevices.filter((device) => device.status === "online").length,
              unknownDevices: updatedDevices.filter((device) => device.deviceType === "unknown").length,
              flaggedDevices: updatedDevices.filter((device) => device.trustLevel !== "trusted").length,
            },
            routerStatus: previousRouterStatusRef.current,
            devices: updatedDevices,
            events: appendNetworkEvents(networkEventsRef.current, comparison.events),
            alerts: networkAlerts,
            lastScanDelta: comparison.summary,
            diagnostics: latestDiagnostics,
            previousSnapshot: previousHealth,
            source: "scan",
          });
          setNetworkHealthSnapshots((current) => retainHealthSnapshots([healthSnapshot, ...current]));
          const hasAttentionDevice = updatedDevices.some(
            (device) =>
              device.trustLevel === "new" ||
              device.trustLevel === "watch" ||
              device.deviceType === "unknown"
          );
          if (settings?.notifyNewDevices && newDevices.length > 0) {
            setRobotMessage(`${newDevices.length} new network device${newDevices.length === 1 ? "" : "s"} detected.`);
            setTimeout(() => setRobotMessage(null), 4500);
          } else if (settings?.notifyOfflineDevices && offlineDevices.length > 0) {
            setRobotMessage(`${offlineDevices.length} device${offlineDevices.length === 1 ? "" : "s"} went offline.`);
            setTimeout(() => setRobotMessage(null), 4500);
          }
          playAvatarReaction(hasAttentionDevice ? "surprised" : "happy");
        });
        networkAdapter.getScanHistory().then(setScanHistory).catch(() => undefined);
        networkAdapter.getSecurityInsights().then(setSecurityInsights).catch(() => undefined);
        networkAdapter.getRouterStatus().then((router) => {
          appendEvents(compareRouterStatus(previousRouterStatusRef.current, router));
          previousRouterStatusRef.current = router;
          setRouterStatus(router);
        }).catch(() => undefined);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [
    mergeIdentitiesForDevices,
    networkStatus?.scanState,
    appendEvents,
    appendAlerts,
    playAvatarReaction,
    setNetworkMonitorState,
    setLastNetworkScanDelta,
    settings?.notifyNewDevices,
    settings?.notifyOfflineDevices,
    networkHealthSnapshots,
    networkAlerts,
    latestDiagnostics,
    networkStatus,
    setNetworkHealthSnapshots,
  ]);

  // Action polling
  useEffect(() => {
    const interval = setInterval(async () => {
      const actionHistory = await networkAdapter.getActionHistory();
      setActions(actionHistory);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Handlers
  const handleStartScan = useCallback(async () => {
    try {
      playAvatarReaction("thinking");
      const scanId = `scan-${Date.now()}`;
      currentScanIdRef.current = scanId;
      appendEvents([createScanStartedEvent(scanId, selectedMode)]);
      setNetworkMonitorState((current) => ({
        ...current,
        enabled: Boolean(settingsRef.current?.autoScanEnabled),
        lastRunAt: new Date().toISOString(),
        schedulerStatus: "running",
        lastIssue: null,
      }));
      await networkAdapter.startNetworkScan(selectedMode);
      const status = await networkAdapter.getNetworkStatus();
      const currentAdapterStatus = await networkAdapter.getAdapterStatus();
      setNetworkStatus(status);
      setAdapterStatus(currentAdapterStatus);
      setScanProgress(0);
    } catch {
      const scanId = currentScanIdRef.current ?? `scan-${Date.now()}`;
      const failedEvent = createScanFailedEvent(scanId, selectedMode, "Live scan unavailable in current runtime.");
      appendEvents([failedEvent]);
      appendAlerts([
        {
          id: `alert-${failedEvent.id}`,
          eventId: failedEvent.id,
          timestamp: failedEvent.timestamp,
          title: "Monitoring issue",
          message: failedEvent.title,
          severity: "high",
          status: "unread",
        },
      ]).catch(() => undefined);
      setNetworkMonitorState((current) => ({
        ...current,
        schedulerStatus: "error",
        lastIssue: "Live scan unavailable in current runtime.",
      }));
      setAdapterStatus(resolveNetworkAdapterStatus({
        demoMode: false,
        nativePluginAvailable: false,
        fallbackReason: "Live scan unavailable in current runtime.",
      }))
      setNetworkStatus((current) => current ? { ...current, scanState: "failed" } : current);
      playAvatarReaction("angry");
    }
  }, [appendAlerts, appendEvents, playAvatarReaction, selectedMode, setNetworkMonitorState]);

  useEffect(() => {
    if (!settings) return;

    if (!settings.autoScanEnabled) {
      setNetworkMonitorState((current) => ({
        ...current,
        enabled: false,
        nextRunAt: null,
        schedulerStatus: "idle",
      }));
      return;
    }

    setNetworkMonitorState((current) => ({
      ...current,
      enabled: true,
      nextRunAt:
        current.nextRunAt ??
        computeNextAutoScanAt(settings),
      schedulerStatus: networkStatus?.scanState === "scanning" ? "running" : "scheduled",
      backgroundCapability: "in-app-only",
    }));

    const tick = window.setInterval(() => {
      const activeSettings = settingsRef.current;
      if (!activeSettings?.autoScanEnabled) return;
      if (networkAdapter.getIsScanning()) return;
      if (
        !shouldRunAutoScan({
          settings: activeSettings,
          monitorState: { nextRunAt: networkMonitorState.nextRunAt },
          isScanning: false,
        })
      ) {
        return;
      }
      handleStartScan().catch(() => undefined);
    }, 5_000);

    return () => window.clearInterval(tick);
  }, [
    handleStartScan,
    networkMonitorState.nextRunAt,
    networkStatus?.scanState,
    settings,
    settings?.autoScanEnabled,
    settings?.autoScanIntervalMinutes,
    setNetworkMonitorState,
  ]);

  const handleStopScan = useCallback(async () => {
    await networkAdapter.stopNetworkScan();
    const status = await networkAdapter.getNetworkStatus();
    const currentAdapterStatus = await networkAdapter.getAdapterStatus();
    setNetworkStatus(status);
    setAdapterStatus(currentAdapterStatus);
  }, []);

  const handleSelectDevice = useCallback((device: DiscoveredDevice) => {
    setSelectedDevice(device);
    setShowMobileDetail(true);
  }, []);

  const handleVisibleDeviceIdsChange = useCallback((deviceIds: string[]) => {
    setVisibleDeviceIds(deviceIds);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setShowMobileDetail(false);
    // Delay clearing device for animation
    setTimeout(() => setSelectedDevice(null), 200);
  }, []);

  const handleDeviceAction = useCallback(
    async (
      action: "trust" | "watch" | "block" | "wake",
      device: DiscoveredDevice
    ) => {
      try {
        if (!settings?.allowControlActions && action === "wake") {
          setRobotMessage("Control actions are disabled in Network settings.");
          setTimeout(() => setRobotMessage(null), 4000);
          playAvatarReaction("surprised");
          return;
        }

        if (settings?.safeMode && action === "wake") {
          setRobotMessage("Safe mode is active. Disable Safe Mode or enable an external connector before this control action.");
          setTimeout(() => setRobotMessage(null), 5000);
          playAvatarReaction("surprised");
          return;
        }

        switch (action) {
          case "trust":
            commitIdentityUpdate(device, {
              trustedState: "trusted",
              watchState: false,
              requestedBlockState: false,
              dismissedForNow: false,
              manuallyVerified: true,
            });
            playAvatarReaction("happy");
            break;
          case "watch":
            commitIdentityUpdate(device, {
              trustedState: "watch",
              watchState: true,
              requestedBlockState: false,
              dismissedForNow: false,
              manuallyVerified: true,
            });
            playAvatarReaction("surprised");
            break;
          case "block":
            commitIdentityUpdate(device, {
              trustedState: "requested-block",
              watchState: true,
              requestedBlockState: true,
              dismissedForNow: false,
              manuallyVerified: true,
            });
            setRobotMessage("Block request recorded. This build does not execute real device blocking without a connector.");
            setTimeout(() => setRobotMessage(null), 5500);
            playAvatarReaction("surprised");
            return;
          case "wake":
            await wakeDevice(device);
            playAvatarReaction("happy");
            break;
        }
      } catch {
        playAvatarReaction("angry");
      }

      // Refresh devices
      const updatedDevices = mergeIdentitiesForDevices(await networkAdapter.getDiscoveredDevices());
      setDevices(updatedDevices);

      // Update selected device
      if (device) {
        const updated = updatedDevices.find((d) => d.id === device.id);
        if (updated) setSelectedDevice(updated);
      }
    },
    [commitIdentityUpdate, mergeIdentitiesForDevices, playAvatarReaction, settings]
  );

  const handleSaveNote = useCallback(async (device: DiscoveredDevice, note: string) => {
    commitIdentityUpdate(device, { notes: note, manuallyVerified: true });
    playAvatarReaction("happy");
  }, [commitIdentityUpdate, playAvatarReaction]);

  const handleDismissDeviceIdentity = useCallback((device: DiscoveredDevice) => {
    commitIdentityUpdate(device, { dismissedForNow: true });
    playAvatarReaction("happy");
  }, [commitIdentityUpdate, playAvatarReaction]);

  const handleMapRenameDevice = useCallback(
    (device: DiscoveredDevice, customName: string) => {
      commitIdentityUpdate(device, { customName, manuallyVerified: true });
      playAvatarReaction("happy");
    },
    [commitIdentityUpdate, playAvatarReaction]
  );

  const handleMapViewTimeline = useCallback(
    (device: DiscoveredDevice) => {
      handleSelectDevice(device);
      setActiveTab("timeline");
    },
    [handleSelectDevice]
  );

  const handleMapAskNeo = useCallback(
    (device: DiscoveredDevice) => {
      void sendMessage(
        `What should I know about this network device: ${device.name} at ${device.ipAddress}? Use the current Network data only.`
      );
      setScreen("chat");
    },
    [sendMessage, setScreen]
  );

  const handleRouterAction = useCallback(
    async (action: "refresh" | "reboot" | "toggleGuest" | "toggleQoS", value?: boolean) => {
      try {
        if (action !== "refresh" && !settings?.allowControlActions) {
          setRobotMessage("Router control actions are disabled in Network settings.");
          setTimeout(() => setRobotMessage(null), 4000);
          playAvatarReaction("surprised");
          return;
        }

        if (action !== "refresh" && settings?.safeMode) {
          setRobotMessage("Safe mode is active. Router control remains read-only in this build.");
          setTimeout(() => setRobotMessage(null), 5000);
          playAvatarReaction("surprised");
          return;
        }

        switch (action) {
          case "refresh": {
            const router = await networkAdapter.getRouterStatus();
            setRouterStatus(router);
            const capabilities = await networkAdapter.getRouterCapabilities();
            const controlMode = await networkAdapter.getRouterControlMode();
            setRouterCapabilities(capabilities);
            setRouterControlMode(controlMode);
            playAvatarReaction("happy");
            break;
          }
          case "reboot": {
            const result = await rebootRouter();
            setActions((current) => [result, ...current].slice(0, 50));
            playAvatarReaction("surprised");
            break;
          }
          case "toggleGuest": {
            const result = await toggleGuestNetwork(value ?? false);
            setActions((current) => [result, ...current].slice(0, 50));
            playAvatarReaction("happy");
            break;
          }
          case "toggleQoS": {
            const result = await toggleQoS(value ?? false);
            setActions((current) => [result, ...current].slice(0, 50));
            playAvatarReaction("happy");
            break;
          }
        }
      } catch {
        playAvatarReaction("angry");
      }
    },
    [playAvatarReaction, settings]
  );

  const handleUpdateSettings = useCallback(async (newSettings: Partial<NetworkSettings>) => {
    try {
      const updated = await networkAdapter.updateNetworkSettings(newSettings);
      const currentAdapterStatus = await networkAdapter.getAdapterStatus();
      const notificationCapability = await getNetworkNotificationCapability();
      setSettings(updated);
      setPersistedNetworkSettings(updated);
      setNetworkMonitorState((current) => ({
        ...current,
        enabled: updated.autoScanEnabled,
        notificationCapability,
        backgroundCapability: "in-app-only",
        schedulerStatus: updated.autoScanEnabled ? "scheduled" : "idle",
        nextRunAt: updated.autoScanEnabled ? computeNextAutoScanAt(updated) : null,
      }));
      setAdapterStatus(currentAdapterStatus);
      playAvatarReaction("happy");
      if (newSettings.scanMode) {
        setSelectedMode(newSettings.scanMode);
      }
    } catch {
      playAvatarReaction("angry");
    }
  }, [playAvatarReaction, setNetworkMonitorState, setPersistedNetworkSettings]);

  const handleMarkAllAlertsRead = useCallback(() => {
    setNetworkAlerts((current) => current.map((alert) => ({ ...alert, status: "read" })));
  }, [setNetworkAlerts]);

  const handleClearReadAlerts = useCallback(() => {
    setNetworkAlerts((current) => current.filter((alert) => alert.status === "unread"));
  }, [setNetworkAlerts]);

  const handleRunDiagnostics = useCallback(async () => {
    if (!networkStatus) return;
    setDiagnosticsRunning(true);
    try {
      const diagnostics = await runNetworkDiagnostics(networkStatus);
      setLatestDiagnostics(diagnostics);
      const previousSnapshot = selectLatestHealthSnapshot(networkHealthSnapshots);
      const snapshot = calculateNetworkHealth({
        status: networkStatus,
        routerStatus,
        devices,
        events: networkEventsRef.current,
        alerts: networkAlerts,
        lastScanDelta: lastNetworkScanDelta,
        diagnostics,
        previousSnapshot,
        source: "diagnostic",
      });
      setNetworkHealthSnapshots((current) => retainHealthSnapshots([snapshot, ...current]));
      setRobotMessage(`${snapshot.grade} network health: ${snapshot.score}/100.`);
      setTimeout(() => setRobotMessage(null), 4500);
    } finally {
      setDiagnosticsRunning(false);
    }
  }, [
    devices,
    lastNetworkScanDelta,
    networkAlerts,
    networkHealthSnapshots,
    networkStatus,
    routerStatus,
    setNetworkHealthSnapshots,
  ]);

  const handleViewDeviceFromInsight = useCallback(
    (deviceId: string) => {
      const device = devices.find((d) => d.id === deviceId);
      if (device) {
        handleSelectDevice(device);
        setActiveTab("devices");
      }
    },
    [devices, handleSelectDevice]
  );

  // Robot interaction
  const handleRobotClick = useCallback(() => {
    const effectiveAdapterStatus = settings
      ? resolveNetworkUiAdapterStatus(settings, adapterStatus)
      : null
    const adapterHint =
      effectiveAdapterStatus?.mode === "demo"
        ? "Simulated network data mode is active."
        : effectiveAdapterStatus?.label === "LIVE_ANDROID_DISCOVERY"
          ? "Live Android discovery bridge is active."
          : effectiveAdapterStatus?.mode === "fallback"
            ? `Live discovery unavailable: ${effectiveAdapterStatus.message}`
            : "Discovery runtime status is initializing."
    const messages = [
      "Network module online. Ready to scan your local subnet.",
      "I can help you discover and manage all devices on your network.",
      adapterHint,
      `Currently tracking ${devices.length} devices. ${devices.filter(d => d.status === "online").length} are online.`,
      "Tip: Use Deep scan mode for comprehensive port detection.",
    ];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    setRobotMessage(randomMessage);
    setTimeout(() => setRobotMessage(null), 4000);
  }, [adapterStatus, devices, settings]);

  // Loading state
  if (!networkStatus || !routerStatus || !settings) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Radar className="h-12 w-12 animate-pulse text-cyan-400" />
          <p className="font-mono text-sm text-cyan-400">INITIALIZING_NETWORK_MODULE...</p>
        </div>
      </div>
    );
  }

  const effectiveAdapterStatus = resolveNetworkUiAdapterStatus(settings, adapterStatus);
  const isDemoMode = settings.demoMode || effectiveAdapterStatus.isDemo;
  const effectivePanelSettings =
    effectiveAdapterStatus.mode === "fallback" ? { ...settings, demoMode: true } : settings;
  const newIdentityDevices = devices.filter((device) => device.isNewIdentity && !device.dismissedForNow);
  const latestHealthSnapshot = selectLatestHealthSnapshot(networkHealthSnapshots);

  return (
    <div>
      <div className="relative mx-auto max-w-7xl">
        {/* Hero Header */}
        <header className="mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 font-mono text-xs text-gray-500">
                <Network className="h-3.5 w-3.5" />
                <span>N.E.O. // NETWORK_MODULE</span>
              </div>
              <h1
                className="font-mono text-2xl font-black uppercase italic tracking-tight text-transparent sm:text-3xl"
                style={{
                  background: "linear-gradient(135deg, #00FFFF 0%, #A855F7 50%, #EC4899 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                }}
              >
                NETWORK DISCOVERY + CONTROL
              </h1>
              <p className="mt-1 font-mono text-xs text-gray-500 sm:text-sm">
                Map nearby devices, review activity, and queue safe control actions from the N.E.O.
                command layer.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* NEO Robot Avatar */}
              <NeoRobotAvatar
                status={robotStatus}
                message={robotMessage ?? undefined}
                onClick={handleRobotClick}
              />
              <div className="flex flex-col gap-1">
                {isDemoMode && (
                  <span className="flex items-center gap-1.5 rounded-full border border-orange-500/50 bg-orange-500/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-orange-400">
                    <AlertTriangle className="h-3 w-3" />
                    {effectiveAdapterStatus.label}
                  </span>
                )}
                <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
                  effectiveAdapterStatus.isBackendAvailable
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                    : "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
                }`}>
                  <Cpu className="h-3 w-3" />
                  {effectiveAdapterStatus.label === "LIVE_ANDROID_DISCOVERY"
                    ? "LIVE ANDROID DISCOVERY"
                    : effectiveAdapterStatus.mode === "fallback"
                      ? "LIMITED DATA"
                      : effectiveAdapterStatus.isBackendAvailable
                        ? "BACKEND_CONNECTED"
                        : "DEMO ADAPTER"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* NERD Control Panel */}
        <section className="mb-6">
          <NerdControlPanel
            networkStatus={networkStatus}
            devices={devices}
            isScanning={networkStatus.scanState === "scanning"}
            scanProgress={scanProgress}
            actions={actions}
            settings={effectivePanelSettings}
            onOpenDevices={() => setActiveTab("devices")}
            onOpenQueue={() => setActiveTab("overview")}
            onOpenSecurity={() => setActiveTab("security")}
            onOpenScan={() => setActiveTab("overview")}
          />
        </section>

        <DeviceIdentityReviewQueue
          devices={newIdentityDevices}
          onReview={(device) => {
            handleSelectDevice(device);
            setActiveTab("devices");
          }}
          onTrust={(device) => handleDeviceAction("trust", device)}
          onWatch={(device) => handleDeviceAction("watch", device)}
          onDismiss={handleDismissDeviceIdentity}
        />

        <NetworkAlertsPanel
          alerts={networkAlerts}
          monitorState={networkMonitorState}
          onMarkAllRead={handleMarkAllAlertsRead}
          onClearRead={handleClearReadAlerts}
        />

        <NetworkHealthPanel
          snapshot={latestHealthSnapshot}
          lastScanDelta={lastNetworkScanDelta}
          diagnosticsRunning={diagnosticsRunning}
          onRunDiagnostics={handleRunDiagnostics}
          onOpenTimeline={() => setActiveTab("timeline")}
        />

        {/* Overview Stats */}
        <section className="mb-6">
          <NetworkOverviewPanel
            status={networkStatus}
            isDemoMode={isDemoMode}
            scanState={networkStatus.scanState}
            onJumpToDevices={() => setActiveTab("devices")}
            onJumpToSecurity={() => setActiveTab("security")}
            onJumpToScan={() => setActiveTab("overview")}
            healthSnapshot={latestHealthSnapshot}
          />
        </section>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <button
            type="button"
            onClick={() => setActiveTab("map")}
            className="flex w-full items-center justify-between rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-left"
            aria-label="Open 3D network map tab"
          >
            <span className="flex items-center gap-2 ps-mono text-[10px] tracking-[0.22em] text-emerald-300">
              <Box className="h-4 w-4" />
              3D NETWORK MAP
            </span>
            <span className="ps-mono text-[10px] tracking-[0.2em] text-white/75">
              {activeTab === "map" ? "ACTIVE" : "OPEN MAP"}
            </span>
          </button>
          <TabsList className="grid h-auto grid-cols-3 gap-1 rounded-xl border border-cyan-500/20 bg-black/50 p-1 sm:grid-cols-8">
            <TabsTrigger value="map" className="font-mono text-[10px] tracking-[0.2em]">MAP</TabsTrigger>
            <TabsTrigger value="overview" className="font-mono text-[10px] tracking-[0.2em]">SCAN</TabsTrigger>
            <TabsTrigger value="devices" className="font-mono text-[10px] tracking-[0.2em]">DEVICES</TabsTrigger>
            <TabsTrigger value="timeline" className="font-mono text-[10px] tracking-[0.2em]">TIMELINE</TabsTrigger>
            <TabsTrigger value="router" className="font-mono text-[10px] tracking-[0.2em]">ROUTER</TabsTrigger>
            <TabsTrigger value="security" className="font-mono text-[10px] tracking-[0.2em]">SECURITY</TabsTrigger>
            <TabsTrigger value="history" className="font-mono text-[10px] tracking-[0.2em]">HISTORY</TabsTrigger>
            <TabsTrigger value="settings" className="font-mono text-[10px] tracking-[0.2em]">CONFIG</TabsTrigger>
          </TabsList>

          {/* Map Tab */}
          <TabsContent value="map" className="space-y-4">
            {activeTab === "map" && (
              <NetworkMap3D
                devices={devices}
                selectedDevice={selectedDevice}
                visibleDeviceIds={visibleDeviceIds}
                scanProgress={scanProgress}
                scanState={networkStatus.scanState}
                events={networkEvents}
                alerts={networkAlerts}
                lastScanDelta={lastNetworkScanDelta}
                onSelectDevice={handleSelectDevice}
                onOpenDetails={handleSelectDevice}
                onTrustDevice={(device) => handleDeviceAction("trust", device)}
                onWatchDevice={(device) => handleDeviceAction("watch", device)}
                onRenameDevice={handleMapRenameDevice}
                onViewTimeline={handleMapViewTimeline}
                onAskNeo={handleMapAskNeo}
              />
            )}
            {activeTab === "map" && selectedDevice && (
              <div className="h-[560px]">
                <DeviceDetailPanel
                  device={selectedDevice}
                  onClose={handleCloseDetail}
                  onTrust={(d) => handleDeviceAction("trust", d)}
                  onWatch={(d) => handleDeviceAction("watch", d)}
                  onBlock={(d) => handleDeviceAction("block", d)}
                  onWake={(d) => handleDeviceAction("wake", d)}
                  onSaveNote={handleSaveNote}
                  onUpdateIdentity={commitIdentityUpdate}
                  onDismiss={handleDismissDeviceIdentity}
                  events={networkEvents}
                  isDemoMode={isDemoMode}
                />
              </div>
            )}
          </TabsContent>

          {/* Scan Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                <NetworkScanPanel
                  status={networkStatus}
                  scanProgress={scanProgress}
                  selectedMode={selectedMode}
                  onModeChange={setSelectedMode}
                  onStartScan={handleStartScan}
                  onStopScan={handleStopScan}
                  isDemoMode={isDemoMode}
                  lastScanDelta={lastNetworkScanDelta}
                />
                <div className="h-[400px]">
                  <SecurityInsightsPanel
                    insights={securityInsights}
                    onViewDevice={handleViewDeviceFromInsight}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-[300px]">
                  <NetworkActionQueue actions={actions} />
                </div>
                <div className="h-[350px]">
                  <ScanHistoryPanel history={scanHistory} />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Devices Tab */}
          <TabsContent value="devices" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="h-[600px]">
                <DeviceListPanel
                  devices={devices}
                  selectedDeviceId={selectedDevice?.id ?? null}
                  onSelectDevice={handleSelectDevice}
                  onVisibleDeviceIdsChange={handleVisibleDeviceIdsChange}
                />
              </div>
              <div
                className={`
                  fixed inset-0 z-50 bg-black/95 p-4 transition-transform duration-200 lg:static lg:z-auto lg:bg-transparent lg:p-0
                  ${showMobileDetail ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
                `}
              >
                {/* Mobile back button */}
                <button
                  onClick={handleCloseDetail}
                  className="mb-4 flex items-center gap-2 font-mono text-sm text-cyan-400 lg:hidden"
                >
                  <ChevronDown className="h-4 w-4 rotate-90" />
                  BACK_TO_LIST
                </button>
                <div className="h-[calc(100vh-120px)] lg:h-[600px]">
                  <DeviceDetailPanel
                    device={selectedDevice}
                    onClose={handleCloseDetail}
                    onTrust={(d) => handleDeviceAction("trust", d)}
                    onWatch={(d) => handleDeviceAction("watch", d)}
                    onBlock={(d) => handleDeviceAction("block", d)}
                    onWake={(d) => handleDeviceAction("wake", d)}
                    onSaveNote={handleSaveNote}
                    onUpdateIdentity={commitIdentityUpdate}
                    onDismiss={handleDismissDeviceIdentity}
                    events={networkEvents}
                    isDemoMode={isDemoMode}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-4">
            <div className="h-[650px]">
              <NetworkTimelinePanel
                events={networkEvents}
                devices={devices}
                lastScanDelta={lastNetworkScanDelta}
                onSelectDevice={(device) => {
                  handleSelectDevice(device);
                  setActiveTab("devices");
                }}
                onOpenMap={() => setActiveTab("map")}
              />
            </div>
          </TabsContent>

          {/* Router Tab */}
          <TabsContent value="router" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <RouterControlPanel
                routerStatus={routerStatus}
                onRefresh={() => handleRouterAction("refresh")}
                onToggleGuest={(enable) => handleRouterAction("toggleGuest", enable)}
                onToggleQoS={(enable) => handleRouterAction("toggleQoS", enable)}
                onReboot={() => handleRouterAction("reboot")}
                isDemoMode={isDemoMode}
                routerCapabilities={routerCapabilities}
                routerControlMode={routerControlMode}
              />
              <div className="h-[400px]">
                <NetworkActionQueue actions={actions.filter(a => 
                  ["router_reboot", "toggle_guest", "toggle_qos"].includes(a.type)
                )} />
              </div>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="h-[500px]">
                <SecurityInsightsPanel
                  insights={securityInsights}
                  onViewDevice={handleViewDeviceFromInsight}
                />
              </div>
              <div className="h-[500px]">
                <NetworkActionQueue actions={actions} />
              </div>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <div className="mx-auto max-w-4xl space-y-4">
              <div className="h-[500px]">
                <ScanHistoryPanel history={scanHistory} />
              </div>
              <NetworkExportPanel />
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="mx-auto max-w-2xl">
              <div className="h-[600px]">
                <NetworkSettingsPanel
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  adapterStatus={effectiveAdapterStatus}
                  monitorState={networkMonitorState}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer - with padding for dock */}
        <footer className="mt-8 border-t border-gray-800 pb-2 pt-4">
          <p className="text-center font-mono text-[10px] text-gray-600">
            {`N.E.O. NETWORK MODULE // ${effectiveAdapterStatus.label} // ${
              effectiveAdapterStatus.mode === "fallback" ? "LIMITED DATA" : "DEMO/LIVE TRUTHFUL MODE"
            }`}
          </p>
        </footer>
      </div>
    </div>
  );
}
