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

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Radar,
  Network,
  Cpu,
  AlertTriangle,
  ChevronDown,
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
import { NetworkMapLoadingState } from "./map/NetworkMapLoadingState";

import {
  networkAdapter,
  resolveNetworkAdapterStatus,
  resolveNetworkUiAdapterStatus,
} from "@/lib/network/networkDiscoveryAdapter";
import {
  trustDevice,
  watchDevice,
  blockDevice,
  wakeDevice,
  addDeviceNote,
  rebootRouter,
  toggleGuestNetwork,
  toggleQoS,
} from "@/lib/network/networkActions";

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
  const { playAvatarReaction } = useApp();
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

        setNetworkStatus(status);
        setDevices(deviceList);
        setRouterStatus(router);
        setSecurityInsights(insights);
        setScanHistory(history);
        setSettings(networkSettings);
        setAdapterStatus(currentAdapterStatus);
        setRouterCapabilities(capabilities);
        setRouterControlMode(controlMode);
        setSelectedMode(networkSettings.scanMode);
      } catch (error) {
        setAdapterStatus(resolveNetworkAdapterStatus({
          demoMode: false,
          nativePluginAvailable: false,
          fallbackReason: error instanceof Error ? error.message : "Native discovery unavailable",
        }))
      }
    };

    loadData();
  }, []);

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
        networkAdapter.getNetworkStatus().then(setNetworkStatus).catch(() => undefined);
        networkAdapter.getAdapterStatus().then(setAdapterStatus).catch(() => undefined);
        networkAdapter.getDiscoveredDevices().then((updatedDevices) => {
          setDevices(updatedDevices);
          const hasAttentionDevice = updatedDevices.some(
            (device) =>
              device.trustLevel === "new" ||
              device.trustLevel === "watch" ||
              device.deviceType === "unknown"
          );
          playAvatarReaction(hasAttentionDevice ? "surprised" : "happy");
        });
        networkAdapter.getScanHistory().then(setScanHistory).catch(() => undefined);
        networkAdapter.getSecurityInsights().then(setSecurityInsights).catch(() => undefined);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [networkStatus?.scanState, playAvatarReaction]);

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
      await networkAdapter.startNetworkScan(selectedMode);
      const status = await networkAdapter.getNetworkStatus();
      const currentAdapterStatus = await networkAdapter.getAdapterStatus();
      setNetworkStatus(status);
      setAdapterStatus(currentAdapterStatus);
      setScanProgress(0);
    } catch {
      setAdapterStatus(resolveNetworkAdapterStatus({
        demoMode: false,
        nativePluginAvailable: false,
        fallbackReason: "Live scan unavailable in current runtime.",
      }))
      setNetworkStatus((current) => current ? { ...current, scanState: "failed" } : current);
      playAvatarReaction("angry");
    }
  }, [playAvatarReaction, selectedMode]);

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
        switch (action) {
          case "trust":
            await trustDevice(device);
            playAvatarReaction("happy");
            break;
          case "watch":
            await watchDevice(device);
            playAvatarReaction("surprised");
            break;
          case "block":
            await blockDevice(device);
            playAvatarReaction("angry");
            break;
          case "wake":
            await wakeDevice(device);
            playAvatarReaction("happy");
            break;
        }
      } catch {
        playAvatarReaction("angry");
      }

      // Refresh devices
      const updatedDevices = await networkAdapter.getDiscoveredDevices();
      setDevices(updatedDevices);

      // Update selected device
      if (device) {
        const updated = updatedDevices.find((d) => d.id === device.id);
        if (updated) setSelectedDevice(updated);
      }
    },
    [playAvatarReaction]
  );

  const handleSaveNote = useCallback(async (device: DiscoveredDevice, note: string) => {
    try {
      await addDeviceNote(device, note);
      playAvatarReaction("happy");
      const updatedDevices = await networkAdapter.getDiscoveredDevices();
      setDevices(updatedDevices);
      const updated = updatedDevices.find((d) => d.id === device.id);
      if (updated) setSelectedDevice(updated);
    } catch {
      playAvatarReaction("angry");
    }
  }, [playAvatarReaction]);

  const handleRouterAction = useCallback(
    async (action: "refresh" | "reboot" | "toggleGuest" | "toggleQoS", value?: boolean) => {
      try {
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
    [playAvatarReaction]
  );

  const handleUpdateSettings = useCallback(async (newSettings: Partial<NetworkSettings>) => {
    try {
      const updated = await networkAdapter.updateNetworkSettings(newSettings);
      const currentAdapterStatus = await networkAdapter.getAdapterStatus();
      setSettings(updated);
      setAdapterStatus(currentAdapterStatus);
      playAvatarReaction("happy");
      if (newSettings.scanMode) {
        setSelectedMode(newSettings.scanMode);
      }
    } catch {
      playAvatarReaction("angry");
    }
  }, [playAvatarReaction]);

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
    const messages = [
      "Network module online. Ready to scan your local subnet.",
      "I can help you discover and manage all devices on your network.",
      "Demo adapter active. Connect native backend for real scanning.",
      `Currently tracking ${devices.length} devices. ${devices.filter(d => d.status === "online").length} are online.`,
      "Tip: Use Deep scan mode for comprehensive port detection.",
    ];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    setRobotMessage(randomMessage);
    setTimeout(() => setRobotMessage(null), 4000);
  }, [devices]);

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
          />
        </section>

        {/* Overview Stats */}
        <section className="mb-6">
          <NetworkOverviewPanel status={networkStatus} isDemoMode={isDemoMode} />
        </section>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid h-auto grid-cols-3 gap-1 rounded-xl border border-cyan-500/20 bg-black/50 p-1 sm:grid-cols-7">
            <TabsTrigger value="map" className="font-mono text-[10px] tracking-[0.2em]">MAP</TabsTrigger>
            <TabsTrigger value="overview" className="font-mono text-[10px] tracking-[0.2em]">SCAN</TabsTrigger>
            <TabsTrigger value="devices" className="font-mono text-[10px] tracking-[0.2em]">DEVICES</TabsTrigger>
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
                onSelectDevice={handleSelectDevice}
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
                    isDemoMode={isDemoMode}
                  />
                </div>
              </div>
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
            <div className="mx-auto max-w-4xl">
              <div className="h-[500px]">
                <ScanHistoryPanel history={scanHistory} />
              </div>
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
