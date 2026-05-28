/**
 * N.E.O. the N.E.R.D. - Network Discovery + Control Feature
 * Main Feature Component
 *
 * INTEGRATION INSTRUCTIONS:
 * 1. Copy `components/network/*` to your project
 * 2. Copy `lib/network/*` to your project
 * Integrated into the existing NEO screen-state shell.
 * Browser preview uses demo data. Installed Android live discovery uses the native plugin.
 *
 * This is a self-contained feature module designed to be dropped into
 * the existing NEO the N.E.R.D. application without modification.
 */

"use client";

import { useState, useEffect, useCallback, useRef, type RefObject } from "react";
import dynamic from "next/dynamic";
import { Capacitor } from "@capacitor/core";
import {
  Radar,
  Network,
  Cpu,
  AlertTriangle,
  ChevronDown,
  Box,
  RotateCcw,
  Wifi,
  MapPin,
  ShieldCheck,
  Router,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/lib/store";

import { NetworkOverviewPanel } from "./NetworkOverviewPanel";
import { NetworkScanPanel } from "./NetworkScanPanel";
import { DeviceListPanel, type DeviceListFilterType } from "./DeviceListPanel";
import { DeviceDetailPanel } from "./DeviceDetailPanel";
import { NetworkReactorCore } from "./NetworkReactorCore";
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
import { NetworkDiagnosticsPanel } from "./NetworkDiagnosticsPanel";
import { NetworkMapLoadingState } from "./map/NetworkMapLoadingState";
import { NetworkExportPanel } from "@/components/exports/network-export-panel";

import {
  networkAdapter,
  resolveNetworkAdapterStatus,
  resolveNetworkUiAdapterStatus,
} from "@/lib/network/networkDiscoveryAdapter";
import {
  MOCK_NETWORK_STATUS,
  MOCK_ROUTER_STATUS,
  MOCK_SECURITY_INSIGHTS,
  MOCK_SCAN_HISTORY,
  DEFAULT_NETWORK_SETTINGS,
} from "@/lib/network/mockNetworkData";
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
  checkNetworkPermissions,
  configureAndroidBackgroundMonitoring,
  getLocalNetworkContext as getNativeLocalNetworkContext,
  getAndroidBackgroundMonitoringStatus,
  requestNetworkPermissions,
} from "@/lib/network/native-network-bridge";
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
  NetworkTopologyGraph,
  ScanCompletionResult,
} from "@/lib/network/types";
import type { NativeLocalNetworkContext } from "@/lib/network/native-network-types";
import type { NativeNetworkPermissionStatus } from "@/lib/network/native-network-bridge";

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

const UI_SCAN_WATCHDOG_MS: Record<ScanMode, number> = {
  quick: 45_000,
  balanced: 95_000,
  deep: 195_000,
};

function isNetworkPermissionDeniedMessage(message: string | null | undefined): boolean {
  return typeof message === "string" && /wi-fi\/location permission denied|network permission denied|permission denied/i.test(message);
}

function getReadinessState({
  platform,
  adapterStatus,
  settings,
  networkStatus,
  permissionStatus,
  permissionDenied,
}: {
  platform: string;
  adapterStatus: NetworkAdapterStatus;
  settings: NetworkSettings;
  networkStatus: NetworkStatus;
  permissionStatus: NativeNetworkPermissionStatus | null;
  permissionDenied: boolean;
}) {
  const locationDenied = permissionDenied || permissionStatus?.location === "denied";
  const wifiDenied = permissionStatus?.wifi === "denied";
  const hasWifi =
    networkStatus.connectionType === "wifi" &&
    networkStatus.localIp !== "Unavailable" &&
    networkStatus.gatewayIp !== "Unavailable";
  const probablyEmulator =
    networkStatus.localIp.startsWith("10.0.2.") ||
    networkStatus.gatewayIp === "10.0.2.2";

  if (settings.demoMode || adapterStatus.isDemo) {
    return {
      label: "DEMO MODE ACTIVE",
      tone: "warn" as const,
      detail: "Demo Preview is using simulated devices. Turn Demo Mode off in Config and run on Android for real LAN discovery.",
      steps: ["Results are not live scan results.", "Use a physical Android device on Wi-Fi to validate discovery."],
    };
  }

  if (adapterStatus.mode === "native-unavailable") {
    return {
      label: platform === "android" ? "SCAN FAILED" : "BROWSER LIMITED",
      tone: "critical" as const,
      detail: adapterStatus.message,
      steps: platform === "android"
        ? ["Restart the app and retry.", "Confirm the Android plugin is registered.", "Grant network permissions when prompted."]
        : ["Browser preview cannot scan your LAN.", "Install/run the Android app on a physical device for live results."],
    };
  }

  if (locationDenied || wifiDenied) {
    return {
      label: "PERMISSION NEEDED",
      tone: "warn" as const,
      detail: "Android requires Location and, on Android 13+, Nearby Wi-Fi permission for Wi-Fi metadata and local discovery context.",
      steps: ["Grant Location permission.", "Grant Nearby Wi-Fi permission if Android asks.", "Keep Location Services enabled."],
    };
  }

  if (!hasWifi) {
    return {
      label: "WI-FI NOT DETECTED",
      tone: "warn" as const,
      detail: "Local LAN discovery needs an active Wi-Fi/LAN interface with local IP, gateway, and subnet.",
      steps: ["Connect to Wi-Fi.", "Disable cellular-only mode or VPN if it hides local routing.", "Refresh diagnostics after connecting."],
    };
  }

  if (probablyEmulator) {
    return {
      label: "EMULATOR LIMITED",
      tone: "warn" as const,
      detail: "Emulator networking usually exposes a virtual gateway, not your real LAN peers.",
      steps: ["Use a physical Android device for real LAN discovery.", "Do not treat emulator discovery as a real LAN PASS."],
    };
  }

  return {
    label: "READY TO SCAN",
    tone: "ok" as const,
    detail: "Native Android discovery can scan the local subnet. Results are discovered devices, not a guarantee of every device on the network.",
    steps: ["Balanced Scan is recommended.", "Keep the phone awake while scanning.", "Some devices may not respond or may hide names."],
  };
}

function StatusCell({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wifi;
  label: string;
  value: string;
}) {
  const unavailable = !value || value === "Unavailable" || value === "unknown";
  return (
    <div className="rounded border border-gray-800 bg-black/45 p-2.5">
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${unavailable ? "text-orange-300" : "text-cyan-300"}`} />
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-500">{label}</p>
      </div>
      <p className={`break-words font-mono text-[11px] uppercase tracking-[0.08em] ${unavailable ? "text-orange-200" : "text-gray-100"}`}>
        {unavailable ? "Unavailable" : value}
      </p>
    </div>
  );
}

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
    settings: appSettings,
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
  // Initialization state machine — must always terminate so the UI never
  // gets stuck on `INITIALIZING_NETWORK_MODULE...`.
  const [initState, setInitState] = useState<"loading" | "ready" | "partial-ready" | "failed">("loading");
  const [initIssues, setInitIssues] = useState<string[]>([]);
  const [initAttempt, setInitAttempt] = useState(0);

  // UI state
  const [selectedDevice, setSelectedDevice] = useState<DiscoveredDevice | null>(null);
  const [selectedMode, setSelectedMode] = useState<ScanMode>("balanced");
  const [scanProgress, setScanProgress] = useState(0);
  const [lastScanCompletion, setLastScanCompletion] = useState<ScanCompletionResult | null>(null);
  const [activeTab, setActiveTab] = useState("map");
  const [visibleDeviceIds, setVisibleDeviceIds] = useState<string[]>([]);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [robotMessage, setRobotMessage] = useState<string | null>(null);
  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false);
  const [latestDiagnostics, setLatestDiagnostics] = useState<DiagnosticProbeResult[]>([]);
  const [networkPermissionDenied, setNetworkPermissionDenied] = useState(false);
  const [requestingNetworkPermissions, setRequestingNetworkPermissions] = useState(false);
  const [diagnosticPlatform, setDiagnosticPlatform] = useState("web");
  const [diagnosticLocalContext, setDiagnosticLocalContext] = useState<NativeLocalNetworkContext | null>(null);
  const [diagnosticPermissionStatus, setDiagnosticPermissionStatus] = useState<NativeNetworkPermissionStatus | null>(null);
  const [diagnosticTopologyGraph, setDiagnosticTopologyGraph] = useState<NetworkTopologyGraph | null>(null);
  const [deviceListFilter, setDeviceListFilter] = useState<DeviceListFilterType>("all");
  const [clipboardAvailable, setClipboardAvailable] = useState(false);
  const mapSectionRef = useRef<HTMLDivElement | null>(null);
  const devicesSectionRef = useRef<HTMLDivElement | null>(null);
  const diagnosticsSectionRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    setClipboardAvailable(Boolean(navigator.clipboard?.writeText));
  }, []);

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

  useEffect(() => {
    if (!networkStatus || networkStatus.scanState === "scanning") return;
    if (networkStatus.devicesFound <= 0 || devices.length === networkStatus.devicesFound) return;

    let cancelled = false;
    networkAdapter.getDiscoveredDevices().then((rawDevices) => {
      if (cancelled || rawDevices.length === 0) return;
      const syncedDevices = mergeIdentitiesForDevices(rawDevices);
      if (cancelled) return;
      previousDevicesRef.current = syncedDevices;
      setDevices(syncedDevices);
      setSelectedDevice((current) => {
        if (!current) return current;
        return syncedDevices.find((device) => device.id === current.id) ?? current;
      });
    }).catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [
    devices.length,
    mergeIdentitiesForDevices,
    networkStatus,
  ]);

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
  //
  // Initialization MUST always terminate. We use Promise.allSettled and per-call
  // safe defaults so a single failed adapter call cannot trap the user on
  // `INITIALIZING_NETWORK_MODULE...`. If a critical call fails we surface a
  // visible failure panel with retry, but the screen never hangs.
  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      const issues: string[] = [];
      const settled = await Promise.allSettled([
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

      const recordIssue = (label: string, result: PromiseSettledResult<unknown>) => {
        if (result.status === "rejected") {
          const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
          issues.push(`${label}: ${message}`);
        }
      };

      const pick = <T,>(result: PromiseSettledResult<T>, fallback: T, label: string): T => {
        recordIssue(label, result);
        return result.status === "fulfilled" ? result.value : fallback;
      };

      const [
        statusResult,
        devicesResult,
        routerResult,
        insightsResult,
        historyResult,
        settingsResult,
        adapterResult,
        capabilitiesResult,
        controlModeResult,
      ] = settled;

      // Determine the user's intended mode BEFORE picking fallbacks. When the
      // user is NOT in demo mode, an unexpected adapter throw must NOT leak
      // mock data into the UI — surface empty/unavailable state instead.
      const intendedDemoMode =
        persistedNetworkSettingsRef.current?.demoMode ??
        DEFAULT_NETWORK_SETTINGS.demoMode;
      const unavailableStatusStub: NetworkStatus = {
        networkName: "Unavailable",
        gatewayIp: "Unavailable",
        localIp: "Unavailable",
        subnet: "Unavailable",
        connectionType: "unknown",
        scanState: "idle",
        lastScanAt: null,
        devicesFound: 0,
        onlineDevices: 0,
        unknownDevices: 0,
        flaggedDevices: 0,
      };
      const unavailableRouterStub: RouterStatus = {
        name: "Unavailable",
        model: "Unavailable",
        gatewayIp: "Unavailable",
        firmwareVersion: "Unavailable",
        connectionStatus: "unknown",
        uptime: "Unavailable",
        wanIp: "Unavailable",
        dnsServers: [],
        guestNetworkEnabled: false,
        qosEnabled: false,
        firewallEnabled: false,
        rebootAvailable: false,
        readOnlyMode: true,
      };

      const status = pick<NetworkStatus>(
        statusResult,
        intendedDemoMode ? { ...MOCK_NETWORK_STATUS } : unavailableStatusStub,
        "network_status"
      );
      const deviceList = pick<DiscoveredDevice[]>(devicesResult, [], "discovered_devices");
      const router = pick<RouterStatus>(
        routerResult,
        intendedDemoMode ? { ...MOCK_ROUTER_STATUS } : unavailableRouterStub,
        "router_status"
      );
      const insights = pick<SecurityInsight[]>(
        insightsResult,
        intendedDemoMode ? [...MOCK_SECURITY_INSIGHTS] : [],
        "security_insights"
      );
      const history = pick<ScanHistoryEntry[]>(
        historyResult,
        intendedDemoMode ? [...MOCK_SCAN_HISTORY] : [],
        "scan_history"
      );
      const networkSettings = pick<NetworkSettings>(
        settingsResult,
        { ...DEFAULT_NETWORK_SETTINGS },
        "network_settings"
      );
      const currentAdapterStatus = pick<NetworkAdapterStatus>(
        adapterResult,
        resolveNetworkAdapterStatus({
          demoMode: false,
          nativePluginAvailable: false,
          fallbackReason:
            adapterResult.status === "rejected"
              ? adapterResult.reason instanceof Error
                ? adapterResult.reason.message
                : String(adapterResult.reason)
              : "Adapter status unavailable",
        }),
        "adapter_status"
      );
      const capabilities = pick<RouterCapability[]>(capabilitiesResult, [], "router_capabilities");
      const controlMode = pick<RouterControlMode>(controlModeResult, "read-only", "router_control_mode");

      // Restore persisted settings on top, but never let a failed write trap us.
      let restoredSettings = networkSettings;
      if (persistedNetworkSettingsRef.current) {
        try {
          restoredSettings = await networkAdapter.updateNetworkSettings(persistedNetworkSettingsRef.current);
        } catch (error) {
          issues.push(
            `persisted_settings_restore: ${error instanceof Error ? error.message : String(error)}`
          );
          restoredSettings = { ...networkSettings, ...persistedNetworkSettingsRef.current };
        }
      }

      let notificationCapability: Awaited<ReturnType<typeof getNetworkNotificationCapability>> = "unavailable";
      try {
        notificationCapability = await getNetworkNotificationCapability();
      } catch (error) {
        issues.push(
          `notification_capability: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      if (cancelled) return;

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

      // Resolution rule:
      //   - 0 issues       -> ready
      //   - 1+ critical    -> partial-ready (we still rendered, but warn)
      //   - all critical   -> failed (only when literally nothing usable came back)
      const allCriticalFailed =
        statusResult.status === "rejected" &&
        devicesResult.status === "rejected" &&
        routerResult.status === "rejected" &&
        settingsResult.status === "rejected" &&
        adapterResult.status === "rejected";

      setInitIssues(issues);
      setInitState(allCriticalFailed ? "failed" : issues.length === 0 ? "ready" : "partial-ready");
    };

    setInitState("loading");
    setInitIssues([]);
    loadData().catch((error) => {
      if (cancelled) return;
      // Last-resort safety net — should not be reachable because every
      // adapter call above is wrapped in allSettled, but if something
      // throws synchronously we still escape the spinner. Only fall back
      // to mock data when the user has explicitly chosen demo mode.
      const demo =
        persistedNetworkSettingsRef.current?.demoMode ??
        DEFAULT_NETWORK_SETTINGS.demoMode;
      const networkStatusStub: NetworkStatus = demo
        ? { ...MOCK_NETWORK_STATUS }
        : {
            networkName: "Unavailable",
            gatewayIp: "Unavailable",
            localIp: "Unavailable",
            subnet: "Unavailable",
            connectionType: "unknown",
            scanState: "idle",
            lastScanAt: null,
            devicesFound: 0,
            onlineDevices: 0,
            unknownDevices: 0,
            flaggedDevices: 0,
          };
      const routerStub: RouterStatus = demo
        ? { ...MOCK_ROUTER_STATUS }
        : {
            name: "Unavailable",
            model: "Unavailable",
            gatewayIp: "Unavailable",
            firmwareVersion: "Unavailable",
            connectionStatus: "unknown",
            uptime: "Unavailable",
            wanIp: "Unavailable",
            dnsServers: [],
            guestNetworkEnabled: false,
            qosEnabled: false,
            firewallEnabled: false,
            rebootAvailable: false,
            readOnlyMode: true,
          };
      setNetworkStatus((current) => current ?? networkStatusStub);
      setRouterStatus((current) => current ?? routerStub);
      setSettings((current) => current ?? { ...DEFAULT_NETWORK_SETTINGS });
      setAdapterStatus(
        resolveNetworkAdapterStatus({
          demoMode: demo,
          nativePluginAvailable: false,
          fallbackReason: error instanceof Error ? error.message : "Native discovery unavailable",
        })
      );
      setInitIssues([error instanceof Error ? error.message : String(error)]);
      setInitState("failed");
    });

    return () => {
      cancelled = true;
    };
  }, [
    mergeIdentitiesForDevices,
    setNetworkMonitorState,
    setPersistedNetworkSettings,
    initAttempt,
  ]);

  const handleRetryInitialization = useCallback(() => {
    setInitAttempt((value) => value + 1);
  }, []);

  // Scan progress + lifecycle polling. The TS-side completion detection is
  // single-source-of-truth via the adapter's `getLastScanResult()`. Late
  // results from a cancelled or superseded scan are filtered out by the
  // generation counter inside the adapter, so we never apply stale device
  // lists or generate phantom comparison events.
  useEffect(() => {
    if (networkStatus?.scanState !== "scanning") {
      return;
    }

    let cancelled = false;
    const initialResult = networkAdapter.getLastScanResult?.() ?? null;
    const initialGeneration = initialResult?.generation ?? null;
    const scanStartedAt = new Date().toISOString();

    const interval = setInterval(() => {
      if (cancelled) return;
      const progress = networkAdapter.getScanProgress();
      setScanProgress(progress);

      const latestResult = networkAdapter.getLastScanResult?.() ?? null;
      const nativeReported =
        latestResult !== null &&
        (initialGeneration === null || latestResult.generation !== initialGeneration);
      // Demo adapter doesn't emit a ScanCompletionResult — detect demo
      // completion via the adapter facade's scanning flag dropping to false
      // while progress has reached 100. This covers both demo and native.
      const demoCompleted =
        latestResult === null &&
        !networkAdapter.getIsScanning() &&
        progress >= 100;
      const uiWatchdogExceeded =
        Date.now() - new Date(scanStartedAt).getTime() > UI_SCAN_WATCHDOG_MS[selectedMode];

      if (!nativeReported && !demoCompleted && !uiWatchdogExceeded) return;

      clearInterval(interval);
      if (cancelled) return;

      const resolvedResult: ScanCompletionResult =
        latestResult && nativeReported
          ? latestResult
          : uiWatchdogExceeded
            ? {
                status: "failed",
                scanMode: selectedMode,
                startedAt: scanStartedAt,
                finishedAt: new Date().toISOString(),
                durationMs: Date.now() - new Date(scanStartedAt).getTime(),
                coverage: null,
                failureReason:
                  "Native scan reached the UI watchdog timeout before returning a result. The scan was stopped so the Network screen does not stay in SCANNING state.",
                generation: -1,
              }
          : {
              status: "complete",
              scanMode: selectedMode,
              startedAt: scanStartedAt,
              finishedAt: new Date().toISOString(),
              durationMs: Date.now() - new Date(scanStartedAt).getTime(),
              coverage: null,
              failureReason: null,
              generation: 0,
            };

      const scanId = currentScanIdRef.current ?? `scan-${resolvedResult.generation}`;
      const status = resolvedResult.status;
      const latestResultForBranches = resolvedResult;
      setLastScanCompletion(resolvedResult);
      if (uiWatchdogExceeded) {
        networkAdapter.stopNetworkScan().catch(() => undefined);
      }

      // CANCELLED — silent; do not generate a failure event, do not touch
      // device lists, do not write scan history. The user asked to stop.
      if (status === "cancelled") {
        networkAdapter.getNetworkStatus().then((next) => {
          if (cancelled) return;
          setNetworkStatus(next);
        }).catch(() => undefined);
        networkAdapter.getAdapterStatus().then((next) => {
          if (cancelled) return;
          setAdapterStatus(next);
        }).catch(() => undefined);
        setScanProgress(0);
        setNetworkMonitorState((current) => ({
          ...current,
          schedulerStatus: settingsRef.current?.autoScanEnabled ? "scheduled" : "idle",
          lastIssue: null,
        }));
        return;
      }

      // FAILED — generate a single failure event/alert; preserve previous
      // devices and history so the UI doesn't silently lose context.
      if (status === "failed") {
        const failureReason =
          latestResultForBranches.failureReason ??
          "Native local discovery did not return a result.";
        setNetworkPermissionDenied(isNetworkPermissionDeniedMessage(failureReason));
        const failureEvent = createScanFailedEvent(scanId, latestResultForBranches.scanMode, failureReason);
        appendEvents([failureEvent]);
        appendAlerts([
          {
            id: `alert-${failureEvent.id}`,
            eventId: failureEvent.id,
            timestamp: failureEvent.timestamp,
            title: "Network scan failed",
            message: failureReason,
            severity: "high",
            status: "unread",
          },
        ]).catch(() => undefined);

        networkAdapter.getNetworkStatus().then((next) => {
          if (cancelled) return;
          appendEvents(compareNetworkContext(previousNetworkStatusRef.current, next));
          previousNetworkStatusRef.current = next;
          setNetworkStatus(next);
        }).catch(() => undefined);
        networkAdapter.getAdapterStatus().then((next) => {
          if (cancelled) return;
          setAdapterStatus(next);
        }).catch(() => undefined);
        setScanProgress(0);
        setNetworkMonitorState((current) => ({
          ...current,
          schedulerStatus: "error",
          lastIssue: failureReason,
        }));
        playAvatarReaction("angry");
        return;
      }

      // COMPLETE — real success path. Apply device list updates, diff events,
      // scan history, health snapshot, and notification alerts.
      setNetworkPermissionDenied(false);
      networkAdapter.getNetworkStatus().then((next) => {
        if (cancelled) return;
        appendEvents(compareNetworkContext(previousNetworkStatusRef.current, next));
        previousNetworkStatusRef.current = next;
        setNetworkStatus(next);
      }).catch(() => undefined);
      networkAdapter.getAdapterStatus().then((next) => {
        if (cancelled) return;
        setAdapterStatus(next);
      }).catch(() => undefined);

      networkAdapter.getDiscoveredDevices().then((rawUpdatedDevices) => {
        if (cancelled) return;
        const updatedDevices = mergeIdentitiesForDevices(rawUpdatedDevices);
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
        // Only advance previousDevicesRef on a SUCCESSFUL scan — otherwise
        // a failed/cancelled scan would erase the prior reference list and
        // trigger phantom "new device" events on the next successful scan.
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
          lastCompletedAt: latestResultForBranches.finishedAt,
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
            lastScanAt: latestResultForBranches.finishedAt,
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

        if (latestResultForBranches.coverage) {
          const { scannedHosts, subnetTotalHosts, fullCoverage, scanDeadlineExceeded, subnetCidr } = latestResultForBranches.coverage;
          if (!fullCoverage || scanDeadlineExceeded) {
            const detail = subnetCidr
              ? `Scanned ${scannedHosts} of ${subnetTotalHosts} hosts on ${subnetCidr}.`
              : `Scanned ${scannedHosts} of ${subnetTotalHosts} hosts.`;
            setRobotMessage(scanDeadlineExceeded
              ? `${detail} Native scan stopped at the time budget.`
              : `${detail} Some hosts outside the scanned slice were not probed.`);
            setTimeout(() => setRobotMessage(null), 5500);
          }
        }
        playAvatarReaction(hasAttentionDevice ? "surprised" : "happy");
      }).catch(() => undefined);

      networkAdapter.getScanHistory().then((history) => {
        if (cancelled) return;
        setScanHistory(history);
      }).catch(() => undefined);
      networkAdapter.getSecurityInsights().then((insights) => {
        if (cancelled) return;
        setSecurityInsights(insights);
      }).catch(() => undefined);
      networkAdapter.getRouterStatus().then((router) => {
        if (cancelled) return;
        appendEvents(compareRouterStatus(previousRouterStatusRef.current, router));
        previousRouterStatusRef.current = router;
        setRouterStatus(router);
      }).catch(() => undefined);
    }, 100);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
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
    selectedMode,
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
      setNetworkPermissionDenied(false);
      playAvatarReaction("thinking");
      const scanId = `scan-${Date.now()}`;
      currentScanIdRef.current = scanId;
      // Clear any prior completion record so the panel reflects the new scan's lifecycle.
      setLastScanCompletion(null);
      appendEvents([createScanStartedEvent(scanId, selectedMode)]);
      setNetworkMonitorState((current) => ({
        ...current,
        enabled: Boolean(settingsRef.current?.autoScanEnabled),
        lastRunAt: new Date().toISOString(),
        schedulerStatus: "running",
        lastIssue: null,
      }));
      await networkAdapter.startNetworkScan(selectedMode);
      const immediateScanResult = networkAdapter.getLastScanResult?.() ?? null;
      if (!networkAdapter.getIsScanning() && immediateScanResult?.status === "failed") {
        throw new Error(
          immediateScanResult.failureReason ??
            "Native local discovery did not return a result."
        );
      }
      const status = await networkAdapter.getNetworkStatus();
      const currentAdapterStatus = await networkAdapter.getAdapterStatus();
      setNetworkStatus({
        ...status,
        scanState: networkAdapter.getIsScanning() ? "scanning" : status.scanState,
      });
      setAdapterStatus(currentAdapterStatus);
      setScanProgress(0);
    } catch (error) {
      const scanId = currentScanIdRef.current ?? `scan-${Date.now()}`;
      const failureReason =
        error instanceof Error && error.message
          ? error.message
          : "Live scan unavailable in current runtime.";
      setNetworkPermissionDenied(isNetworkPermissionDeniedMessage(failureReason));
      const failedEvent = createScanFailedEvent(scanId, selectedMode, failureReason);
      appendEvents([failedEvent]);
      appendAlerts([
        {
          id: `alert-${failedEvent.id}`,
          eventId: failedEvent.id,
          timestamp: failedEvent.timestamp,
          title: "Network scan failed",
          message: failureReason,
          severity: "high",
          status: "unread",
        },
      ]).catch(() => undefined);
      setNetworkMonitorState((current) => ({
        ...current,
        schedulerStatus: "error",
        lastIssue: failureReason,
      }));
      setAdapterStatus(resolveNetworkAdapterStatus({
        demoMode: false,
        nativePluginAvailable: false,
        fallbackReason: failureReason,
      }));
      setNetworkStatus((current) => current ? { ...current, scanState: "failed" } : current);
      // Surface the failure to the Scan panel via a synthetic completion record.
      const now = new Date().toISOString();
      setLastScanCompletion({
        status: "failed",
        scanMode: selectedMode,
        startedAt: now,
        finishedAt: now,
        durationMs: 0,
        coverage: null,
        failureReason,
        generation: -1,
      });
      playAvatarReaction("angry");
    }
  }, [appendAlerts, appendEvents, playAvatarReaction, selectedMode, setNetworkMonitorState]);

  const handleRequestNetworkPermissions = useCallback(async () => {
    setRequestingNetworkPermissions(true);
    try {
      const granted = await requestNetworkPermissions();
      setNetworkPermissionDenied(!granted);
      const status = await checkNetworkPermissions();
      setDiagnosticPermissionStatus(status);
    } catch {
      setNetworkPermissionDenied(true);
    } finally {
      setRequestingNetworkPermissions(false);
    }
  }, []);

  const refreshOperationalDiagnostics = useCallback(async () => {
    setDiagnosticPlatform(Capacitor.getPlatform());
    const [permissionResult, contextResult, topologyResult] = await Promise.allSettled([
      checkNetworkPermissions(),
      getNativeLocalNetworkContext(),
      networkAdapter.getNetworkTopology(),
    ]);

    setDiagnosticPermissionStatus(
      permissionResult.status === "fulfilled" ? permissionResult.value : null
    );
    setDiagnosticLocalContext(
      contextResult.status === "fulfilled" ? contextResult.value : null
    );
    setDiagnosticTopologyGraph(
      topologyResult.status === "fulfilled" ? topologyResult.value : null
    );
  }, []);

  useEffect(() => {
    void refreshOperationalDiagnostics();
  }, [
    refreshOperationalDiagnostics,
    initAttempt,
    networkStatus?.lastScanAt,
    networkStatus?.scanState,
    lastScanCompletion?.finishedAt,
    settings?.demoMode,
    adapterStatus?.mode,
  ]);

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

  useEffect(() => {
    let cancelled = false;
    const syncNativeMonitoring = async () => {
      if (!settings) return;
      try {
        await configureAndroidBackgroundMonitoring({
          enabled: settings.autoScanEnabled,
          intervalMinutes: settings.autoScanIntervalMinutes,
          notifyOnChanges: settings.notifyNewDevices || settings.notifyOfflineDevices,
        });
        const nativeStatus = await getAndroidBackgroundMonitoringStatus();
        if (!cancelled && nativeStatus) {
          setNetworkMonitorState((current) => ({
            ...current,
            schedulerStatus: nativeStatus.schedulerStatus,
            backgroundCapability: "workmanager-unavailable",
            lastIssue:
              "Android WorkManager is active for closed-app checks. Execution time is OS-managed and may be deferred by battery policy.",
          }));
        }
      } catch {
        if (!cancelled) {
          setNetworkMonitorState((current) => ({
            ...current,
            lastIssue:
              "Closed-app monitoring could not be configured on this runtime. In-app scheduler remains active while NEO is open.",
          }));
        }
      }
    };
    void syncNativeMonitoring();
    return () => {
      cancelled = true;
    };
  }, [settings, setNetworkMonitorState]);

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

  const scrollToSection = useCallback((ref: RefObject<HTMLDivElement | null>) => {
    window.setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, []);

  const handleOpenDevicesFromReactor = useCallback(() => {
    setActiveTab("devices");
    scrollToSection(devicesSectionRef);
  }, [scrollToSection]);

  const handleOpenMapFromReactor = useCallback(() => {
    setActiveTab("map");
    scrollToSection(mapSectionRef);
  }, [scrollToSection]);

  const handleOpenDiagnosticsFromReactor = useCallback(() => {
    scrollToSection(diagnosticsSectionRef);
  }, [scrollToSection]);

  const handleFilterDevicesFromReactor = useCallback(
    (filter: "all" | "unknown" | "online" | "router" | "needs-review") => {
      setDeviceListFilter(filter);
      setActiveTab("devices");
      scrollToSection(devicesSectionRef);
    },
    [scrollToSection]
  );

  const handleOpenGatewayFromReactor = useCallback(() => {
    const gatewayDevice = devices.find(
      (device) =>
        device.deviceType === "router" ||
        device.discoverySources.includes("gateway") ||
        device.ipAddress === networkStatus?.gatewayIp ||
        device.ipAddress === routerStatus?.gatewayIp
    );
    if (!gatewayDevice) {
      setRobotMessage("Gateway device is not present in the current discovered device list.");
      setTimeout(() => setRobotMessage(null), 4500);
      return;
    }
    handleSelectDevice(gatewayDevice);
    setActiveTab("devices");
    scrollToSection(devicesSectionRef);
  }, [devices, handleSelectDevice, networkStatus?.gatewayIp, routerStatus?.gatewayIp, scrollToSection]);

  const handleCopyScanSummary = useCallback(() => {
    if (!navigator.clipboard?.writeText || !networkStatus) return;
    const coverage = lastScanCompletion?.coverage;
    const summary = [
      "NEO Network Scan Summary",
      `Source: ${settingsRef.current?.demoMode ? "DEMO" : adapterStatus?.label ?? "UNKNOWN"}`,
      `SSID: ${networkStatus.networkName}`,
      `Gateway: ${networkStatus.gatewayIp}`,
      `Local IP: ${networkStatus.localIp}`,
      `Subnet: ${networkStatus.subnet}`,
      `Scan state: ${networkStatus.scanState}`,
      `Selected mode: ${selectedMode}`,
      `Devices: ${devices.length}`,
      `Online: ${devices.filter((device) => device.status === "online").length}`,
      `Unknown: ${devices.filter((device) => device.deviceType === "unknown").length}`,
      coverage ? `Coverage: ${coverage.scannedHosts}/${coverage.subnetTotalHosts} hosts, ${coverage.discoveredHosts} discovered` : "Coverage: not available",
      `Last error: ${lastScanCompletion?.failureReason ?? "none"}`,
      "Truth: topology is estimated unless labeled LIVE; router control requires connector.",
    ].join("\n");
    navigator.clipboard.writeText(summary).then(
      () => {
        setRobotMessage("Network scan summary copied.");
        setTimeout(() => setRobotMessage(null), 3000);
      },
      () => {
        setRobotMessage("Clipboard copy failed in this runtime.");
        setTimeout(() => setRobotMessage(null), 3500);
      }
    );
  }, [adapterStatus?.label, devices, lastScanCompletion, networkStatus, selectedMode]);

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
      const throughputProbe = diagnostics.find((probe) => probe.key === "throughput");
      if (throughputProbe) {
        appendEvents([
          {
            id: `event-speed-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: throughputProbe.status === "passed" ? "scan_completed" : "scan_failed",
            severity: throughputProbe.status === "passed" ? "info" : "medium",
            title:
              throughputProbe.status === "passed"
                ? `Speed test completed: ${throughputProbe.value ?? "result available"}`
                : "Speed test failed",
            detail: {
              provider: throughputProbe.provider ?? "unknown",
              probe: throughputProbe.detail,
            },
          },
        ]);
      }
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
    appendEvents,
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
      effectiveAdapterStatus?.mode === "demo-browser"
        ? "Simulated network data mode is active."
        : effectiveAdapterStatus?.label === "LIVE_ANDROID_DISCOVERY"
          ? "Live Android discovery bridge is active."
          : effectiveAdapterStatus?.mode === "native-unavailable"
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

  // Loading state — bounded. While loading we render the spinner, but if the
  // initializer reaches a terminal state with critical state still missing we
  // fall through to the failure panel below instead of hanging forever.
  if (initState === "loading" && (!networkStatus || !routerStatus || !settings)) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Radar className="h-12 w-12 animate-pulse text-cyan-400" />
          <p className="font-mono text-sm text-cyan-400">INITIALIZING_NETWORK_MODULE...</p>
        </div>
      </div>
    );
  }

  if (initState === "failed" || !networkStatus || !routerStatus || !settings) {
    return (
      <div className="flex min-h-[420px] items-center justify-center px-4">
        <div className="w-full max-w-md space-y-4 rounded-lg border border-red-500/40 bg-black/70 p-6 text-center backdrop-blur-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-red-500/50 bg-red-500/10">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-red-300">
            NETWORK_MODULE_INIT_FAILED
          </h2>
          <p className="font-mono text-[11px] leading-relaxed text-red-200/85">
            Native Android discovery did not initialize and no usable fallback could be loaded.
            Local LAN discovery does not require a backend — try again, or restart the app.
          </p>
          {initIssues.length > 0 && (
            <ul className="space-y-1 rounded border border-red-500/20 bg-red-500/5 p-3 text-left font-mono text-[10px] text-red-200/80">
              {initIssues.slice(0, 5).map((issue) => (
                <li key={issue} className="break-words">• {issue}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={handleRetryInitialization}
            className="inline-flex items-center gap-2 rounded border border-cyan-500/50 bg-cyan-500/10 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-cyan-300 hover:bg-cyan-500/20"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            RETRY_LIVE_DISCOVERY
          </button>
        </div>
      </div>
    );
  }

  const effectiveAdapterStatus = resolveNetworkUiAdapterStatus(settings, adapterStatus);
  const isDemoMode = settings.demoMode || effectiveAdapterStatus.isDemo;
  const effectivePanelSettings = settings;
  const newIdentityDevices = devices.filter((device) => device.isNewIdentity && !device.dismissedForNow);
  const latestHealthSnapshot = selectLatestHealthSnapshot(networkHealthSnapshots);
  const readiness = getReadinessState({
    platform: diagnosticPlatform,
    adapterStatus: effectiveAdapterStatus,
    settings,
    networkStatus,
    permissionStatus: diagnosticPermissionStatus,
    permissionDenied: networkPermissionDenied,
  });
  const readinessColor =
    readiness.tone === "ok"
      ? "border-lime-500/35 bg-lime-500/5 text-lime-300"
      : readiness.tone === "critical"
        ? "border-pink-500/40 bg-pink-500/10 text-pink-300"
        : "border-orange-500/35 bg-orange-500/10 text-orange-300";

  return (
    <div>
      <div className="relative mx-auto max-w-7xl">
        {/* Hero Header */}
        <header className="mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 font-mono text-xs text-cyan-300/80">
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
                NETWORK DISCOVERY + READ ONLY CONTROL
              </h1>
              <p className="mt-1 font-mono text-xs text-gray-300/90 sm:text-sm">
                Map nearby devices, review activity, and inspect router state. Control actions require a connector.
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
                {!isDemoMode && effectiveAdapterStatus.mode === "native-unavailable" && (
                  <span className="flex items-center gap-1.5 rounded-full border border-yellow-500/50 bg-yellow-500/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-yellow-300">
                    <AlertTriangle className="h-3 w-3" />
                    UNAVAILABLE // NO DEMO DATA LOADED
                  </span>
                )}
                <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
                  effectiveAdapterStatus.mode === "native-android"
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                    : effectiveAdapterStatus.mode === "native-unavailable"
                      ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-300"
                      : "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
                }`}>
                  <Cpu className="h-3 w-3" />
                  {effectiveAdapterStatus.label === "LIVE_ANDROID_DISCOVERY"
                    ? "LIVE"
                    : effectiveAdapterStatus.mode === "native-unavailable"
                      ? "UNAVAILABLE"
                      : effectiveAdapterStatus.mode === "native-android"
                        ? "LIVE"
                        : "DEMO"}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="mb-4">
          <NetworkReactorCore
            status={networkStatus}
            devices={devices}
            routerStatus={routerStatus}
            adapterStatus={effectiveAdapterStatus}
            localContext={diagnosticLocalContext}
            permissionStatus={diagnosticPermissionStatus}
            permissionDenied={networkPermissionDenied}
            isRequestingPermissions={requestingNetworkPermissions}
            isDemoMode={isDemoMode}
            selectedMode={selectedMode}
            scanProgress={scanProgress}
            lastScanResult={lastScanCompletion}
            lastScanDelta={lastNetworkScanDelta}
            topologyGraph={diagnosticTopologyGraph}
            reducedMotion={appSettings.reducedMotion}
            clipboardAvailable={clipboardAvailable}
            onModeChange={setSelectedMode}
            onStartScan={handleStartScan}
            onStopScan={handleStopScan}
            onRequestPermissions={handleRequestNetworkPermissions}
            onRescanLastMode={handleStartScan}
            onOpenDevices={handleOpenDevicesFromReactor}
            onOpenMap={handleOpenMapFromReactor}
            onOpenDiagnostics={handleOpenDiagnosticsFromReactor}
            onOpenGateway={handleOpenGatewayFromReactor}
            onFilterDevices={handleFilterDevicesFromReactor}
            onCopyScanSummary={handleCopyScanSummary}
          />
        </div>

        <section className="mb-4 grid items-start gap-3 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.45fr)_minmax(300px,0.9fr)]">
          <aside className="space-y-3 xl:sticky xl:top-4">
            <div className={`rounded-lg border p-3 backdrop-blur-sm ${readinessColor}`}>
              <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em]">
                <ShieldCheck className="h-4 w-4" />
                <span>{readiness.label}</span>
              </div>
              <p className="font-mono text-[10px] leading-relaxed text-gray-200/90">
                {readiness.detail}
              </p>
              {!isDemoMode && (networkPermissionDenied || diagnosticPermissionStatus?.location === "denied" || diagnosticPermissionStatus?.wifi === "denied") && (
                <button
                  type="button"
                  onClick={handleRequestNetworkPermissions}
                  disabled={requestingNetworkPermissions}
                  className="mt-3 w-full rounded border border-yellow-500/50 bg-yellow-500/15 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-yellow-200 hover:bg-yellow-500/25 disabled:opacity-60"
                >
                  {requestingNetworkPermissions ? "REQUESTING..." : "GRANT PERMISSION"}
                </button>
              )}
              <div className="mt-3 grid gap-2">
                <StatusCell icon={Wifi} label="SSID" value={networkStatus.networkName} />
                <StatusCell icon={Router} label="Gateway" value={networkStatus.gatewayIp} />
                <StatusCell icon={Network} label="Local IP" value={networkStatus.localIp} />
                <StatusCell icon={MapPin} label="Subnet" value={networkStatus.subnet} />
                <StatusCell icon={Cpu} label="Source" value={effectiveAdapterStatus.label} />
              </div>
            </div>

            <NetworkScanPanel
              status={networkStatus}
              scanProgress={scanProgress}
              selectedMode={selectedMode}
              onModeChange={setSelectedMode}
              onStartScan={handleStartScan}
              onStopScan={handleStopScan}
              onRequestPermissions={handleRequestNetworkPermissions}
              isDemoMode={isDemoMode}
              permissionDenied={networkPermissionDenied}
              isRequestingPermissions={requestingNetworkPermissions}
              lastScanDelta={lastNetworkScanDelta}
              lastScanResult={lastScanCompletion}
              adapterStatus={effectiveAdapterStatus}
            />
          </aside>

          <div className="min-w-0 space-y-3">
            <NetworkOverviewPanel
              status={networkStatus}
              isDemoMode={isDemoMode}
              scanState={networkStatus.scanState}
              onJumpToDevices={() => setActiveTab("devices")}
              onJumpToSecurity={() => setActiveTab("security")}
              onJumpToScan={() => setActiveTab("overview")}
              healthSnapshot={latestHealthSnapshot}
            />

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
          </div>

          <aside className="space-y-3 xl:sticky xl:top-4">
            <NetworkHealthPanel
              snapshot={latestHealthSnapshot}
              lastScanDelta={lastNetworkScanDelta}
              diagnosticsRunning={diagnosticsRunning}
              onRunDiagnostics={handleRunDiagnostics}
              onOpenTimeline={() => setActiveTab("timeline")}
            />

            <NetworkAlertsPanel
              alerts={networkAlerts}
              monitorState={networkMonitorState}
              onMarkAllRead={handleMarkAllAlertsRead}
              onClearRead={handleClearReadAlerts}
            />

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
          </aside>
        </section>

        <section ref={diagnosticsSectionRef} className="mb-4 scroll-mt-24 grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <NetworkDiagnosticsPanel
              platform={diagnosticPlatform}
              adapterStatus={effectiveAdapterStatus}
              settings={effectivePanelSettings}
              networkStatus={networkStatus}
              selectedMode={selectedMode}
              localContext={diagnosticLocalContext}
              permissionStatus={diagnosticPermissionStatus}
              permissionDenied={networkPermissionDenied}
              lastScanResult={lastScanCompletion}
              topologyGraph={diagnosticTopologyGraph}
              routerStatus={routerStatus}
              devices={devices}
              routerCapabilities={routerCapabilities}
              routerControlMode={routerControlMode}
              onRefresh={refreshOperationalDiagnostics}
            />
          </div>
          <div className="h-[360px] min-w-0">
            <NetworkActionQueue actions={actions} />
          </div>
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
          <TabsContent value="map" ref={mapSectionRef} className="scroll-mt-24 space-y-4">
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
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="h-[520px]">
                <SecurityInsightsPanel
                  insights={securityInsights}
                  onViewDevice={handleViewDeviceFromInsight}
                />
              </div>
              <div className="h-[520px]">
                <ScanHistoryPanel history={scanHistory} />
              </div>
            </div>
          </TabsContent>

          {/* Devices Tab */}
          <TabsContent value="devices" ref={devicesSectionRef} className="scroll-mt-24 space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="h-[600px]">
                <DeviceListPanel
                  devices={devices}
                  selectedDeviceId={selectedDevice?.id ?? null}
                  onSelectDevice={handleSelectDevice}
                  onVisibleDeviceIdsChange={handleVisibleDeviceIdsChange}
                  activeFilter={deviceListFilter}
                  onFilterChange={setDeviceListFilter}
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
        <footer className="mt-8 border-t border-gray-700/70 pb-2 pt-4">
          <p className="text-center font-mono text-[10px] text-gray-400">
            {`N.E.O. NETWORK MODULE // ${effectiveAdapterStatus.label} // ${
              effectiveAdapterStatus.mode === "native-android"
                ? "LIVE · LOCAL DISCOVERY · NO BACKEND REQUIRED"
                : effectiveAdapterStatus.mode === "native-unavailable"
                  ? "UNAVAILABLE"
                  : effectiveAdapterStatus.mode === "scan-failed"
                    ? "PARTIAL · LAST SCAN FAILED"
                    : "DEMO"
            }`}
          </p>
        </footer>
      </div>
    </div>
  );
}
