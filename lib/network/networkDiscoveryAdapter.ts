/**
 * N.E.O. the N.E.R.D. - Network Discovery + Control Feature
 * Network Discovery Adapter
 *
 * This adapter layer abstracts all network functionality.
 * Browser preview returns DEMO/MOCK data; installed Android uses the native plugin.
 *
 * FUTURE INTEGRATION POINTS:
 * - Android native LAN scanner (via Capacitor plugin or WebView bridge)
 * - ARP table parser (requires native/root access)
 * - SSDP discovery (Android native plugin, bounded multicast M-SEARCH)
 * - mDNS discovery (not available in current native plugin implementation)
 * - TCP port probe (requires native implementation)
 * - Router API connector (vendor-specific APIs)
 * - Optional router/provider connectors for non-discovery extras
 *
 * DO NOT implement unsafe scanning logic directly in the browser.
 * Live local LAN scanning must run through the Android native plugin.
 * Backend services are not required for basic Android device discovery.
 */

import type {
  NetworkStatus,
  DiscoveredDevice,
  RouterStatus,
  RouterCapability,
  RouterControlMode,
  RouterActionResult,
  NetworkAction,
  SecurityInsight,
  ScanHistoryEntry,
  NetworkSettings,
  ScanMode,
  NetworkAdapterInterface,
  NetworkAdapterStatus,
  NetworkTopologyGraph,
} from "./types";
import type { NativeScanResult } from "./native-network-types";

import {
  MOCK_NETWORK_STATUS,
  MOCK_DEVICES,
  MOCK_ROUTER_STATUS,
  MOCK_SECURITY_INSIGHTS,
  MOCK_SCAN_HISTORY,
  DEFAULT_NETWORK_SETTINGS,
} from "./mockNetworkData";
import { createDemoTopologyGraph, buildTopologyGraphFromDevices } from "./topology";
import {
  getGatewayInfo as getNativeGatewayInfo,
  isAndroidNativeNetworkPluginAvailable,
  getLocalNetworkContext as getNativeLocalNetworkContext,
  isAndroidNativeNetworkAvailable,
  scanLocalSubnet as runNativeSubnetScan,
} from "./native-network-bridge";

type NativeNetworkDiscoveryBridge = {
  getNetworkStatus?: () => Promise<NetworkStatus>;
  startNetworkScan?: (mode: ScanMode) => Promise<{ scanProgress?: number } | void>;
  stopNetworkScan?: () => Promise<void>;
  getDiscoveredDevices?: () => Promise<DiscoveredDevice[]>;
  getDeviceDetails?: (deviceId: string) => Promise<DiscoveredDevice | null>;
  getRouterStatus?: () => Promise<RouterStatus>;
  getScanHistory?: () => Promise<ScanHistoryEntry[]>;
  getSecurityInsights?: () => Promise<SecurityInsight[]>;
  getNetworkTopology?: () => Promise<NetworkTopologyGraph>;
  getAdapterStatus?: () => Promise<NetworkAdapterStatus>;
};

declare global {
  interface Window {
    NeoNetworkDiscovery?: NativeNetworkDiscoveryBridge;
  }
}

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_NEO_NETWORK_BACKEND_URL?.replace(/\/$/, "") ?? "";
const BACKEND_TIMEOUT_MS = 4500;

class BackendUnavailableError extends Error {
  constructor(message = "Optional network connector is unavailable") {
    super(message);
    this.name = "BackendUnavailableError";
  }
}

function getNativeBridge(): NativeNetworkDiscoveryBridge | null {
  if (typeof window === "undefined") return null;
  return window.NeoNetworkDiscovery ?? null;
}

async function requestBackendJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BACKEND_BASE_URL) {
    throw new BackendUnavailableError(
      "Optional network connector URL is not configured; Android local discovery does not require it"
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);

  try {
    const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Optional network connector returned ${response.status} for ${path}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown adapter error";
}

type AdapterStatusResolutionInput = {
  demoMode: boolean;
  nativePluginAvailable: boolean;
  webBridgeAvailable?: boolean;
    fallbackReason?: string | null;
};

export function resolveNetworkAdapterStatus({
  demoMode,
  nativePluginAvailable,
  webBridgeAvailable = false,
  fallbackReason = null,
}: AdapterStatusResolutionInput): NetworkAdapterStatus {
  // Native/plugin availability is only capability. demoMode is the active-mode override.
  if (demoMode) {
    return {
      mode: "demo-browser",
      label: "SIMULATED NETWORK DATA",
      isDemo: true,
      message: nativePluginAvailable
        ? "Demo Preview is active: simulated network data. Switch back to Live Android Discovery for native local LAN scanning."
        : "Browser preview mode: simulated network data. Install/run the Android app for live local LAN discovery. No backend is required for installed Android local discovery.",
    };
  }

  if (nativePluginAvailable) {
    return {
      mode: "native-android",
      label: "LIVE_ANDROID_DISCOVERY",
      isDemo: false,
      message: "Live local Android discovery active. Scanning the local LAN directly from this device. No cloud backend required for local device discovery.",
    };
  }


  return {
    mode: "native-unavailable",
    label: "SIMULATED NETWORK DATA",
    isDemo: true,
        message:
      fallbackReason ??
      "Native Android discovery is unavailable or failed to initialize. Retry live discovery, or choose Demo Preview explicitly.",
  };
}

export function resolveNetworkUiAdapterStatus(
  settings: NetworkSettings,
  adapterStatus: NetworkAdapterStatus | null
): NetworkAdapterStatus {
  if (settings.demoMode) {
    return resolveNetworkAdapterStatus({
      demoMode: true,
      nativePluginAvailable:
        adapterStatus?.label === "LIVE_ANDROID_DISCOVERY",
    });
  }

  if (adapterStatus) return adapterStatus;

  return resolveNetworkAdapterStatus({
    demoMode: false,
    nativePluginAvailable: false,
    fallbackReason: "Adapter status has not been reported yet.",
  });
}

function createReadOnlyActionResult(
  action: Omit<NetworkAction, "id" | "createdAt" | "status">,
  reason = "Native discovery adapter is read-only for control actions. Local LAN scanning remains live when the plugin is available."
): NetworkAction {
  return {
    ...action,
    id: `readonly-action-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: "failed",
    message: `${action.message} [READ_ONLY_NATIVE_ADAPTER - ${reason}]`,
  };
}

function normalizeNativeTopology(topology: NetworkTopologyGraph): NetworkTopologyGraph {
  if (topology.topologyMode !== "backend-confirmed" || topology.relationshipsConfirmed) {
    return topology;
  }

  return {
    ...topology,
    topologyMode: "estimated",
    relationshipsConfirmed: false,
  };
}

function createRouterCapabilities(
  mode: RouterControlMode,
  timestamp: string
): RouterCapability[] {
  const requireConnectorReason = "Requires a vendor/router connector; generic LAN discovery cannot safely execute this action.";
  if (mode === "demo") {
    return [
      { key: "refresh-status", label: "Refresh Router Status", supported: true, status: "demo-only", reason: "Demo adapter simulation.", lastCheckedAt: timestamp },
      { key: "reboot", label: "Reboot Router", supported: false, status: "demo-only", reason: "Demo queue only; no real router reboot.", lastCheckedAt: timestamp },
      { key: "toggle-guest", label: "Toggle Guest Wi-Fi", supported: false, status: "demo-only", reason: "Demo queue only; no real router change.", lastCheckedAt: timestamp },
      { key: "toggle-qos", label: "Toggle QoS", supported: false, status: "demo-only", reason: "Demo queue only; no real router change.", lastCheckedAt: timestamp },
    ];
  }

  if (mode === "connector-backed") {
    return [
      { key: "refresh-status", label: "Refresh Router Status", supported: true, status: "available", lastCheckedAt: timestamp },
      { key: "reboot", label: "Reboot Router", supported: true, status: "available", lastCheckedAt: timestamp },
      { key: "toggle-guest", label: "Toggle Guest Wi-Fi", supported: true, status: "available", lastCheckedAt: timestamp },
      { key: "toggle-qos", label: "Toggle QoS", supported: true, status: "available", lastCheckedAt: timestamp },
    ];
  }

  return [
    { key: "refresh-status", label: "Refresh Router Status", supported: true, status: "available", lastCheckedAt: timestamp },
    { key: "reboot", label: "Reboot Router", supported: false, status: "requires-connector", reason: requireConnectorReason, lastCheckedAt: timestamp },
    { key: "toggle-guest", label: "Toggle Guest Wi-Fi", supported: false, status: "requires-connector", reason: requireConnectorReason, lastCheckedAt: timestamp },
    { key: "toggle-qos", label: "Toggle QoS", supported: false, status: "requires-connector", reason: requireConnectorReason, lastCheckedAt: timestamp },
  ];
}

// In-memory state for demo mode
let currentSettings: NetworkSettings = { ...DEFAULT_NETWORK_SETTINGS };
let currentNetworkStatus: NetworkStatus = { ...MOCK_NETWORK_STATUS };
let currentDevices: DiscoveredDevice[] = [...MOCK_DEVICES];
let actionHistory: NetworkAction[] = [];
let scanHistory: ScanHistoryEntry[] = [...MOCK_SCAN_HISTORY];

/**
 * Demo Network Discovery Adapter
 *
 * This implementation uses mock data for demonstration.
 * Replace with real implementation when connecting to:
 * - Android native scanner
 * - Capacitor LAN scan plugin
 * - Local backend service
 * - Router management APIs
 */
class DemoNetworkAdapter implements NetworkAdapterInterface {
  private isScanning = false;
  private scanProgress = 0;

  async getAdapterStatus(): Promise<NetworkAdapterStatus> {
    return resolveNetworkAdapterStatus({
      demoMode: true,
      nativePluginAvailable: await isAndroidNativeNetworkPluginAvailable(),
    });
  }

  /**
   * Get current network status
   *
   * FUTURE: Connect to native network info API
   * - Android: WifiManager, ConnectivityManager
   * - iOS: NEHotspotNetwork, NWPathMonitor
   */
  async getNetworkStatus(): Promise<NetworkStatus> {
    return { ...currentNetworkStatus };
  }

  /**
   * Start a network scan
   *
   * FUTURE: Connect to native LAN scanner
   * - Android: ARP scan via native code
   * - SSDP/UPnP discovery in balanced/deep native scans
   * - mDNS/Bonjour discovery is not currently implemented
   * - bounded TCP connect probes for selected common ports
   */
  async startNetworkScan(mode: ScanMode): Promise<void> {
    if (this.isScanning) {
      throw new Error("Scan already in progress");
    }

    this.isScanning = true;
    this.scanProgress = 0;

    currentNetworkStatus = {
      ...currentNetworkStatus,
      scanState: "scanning",
    };

    // Simulate scan duration based on mode
    const durations: Record<ScanMode, number> = {
      quick: 3000,
      balanced: 6000,
      deep: 12000,
    };

    const duration = durations[mode];
    const startTime = Date.now();

    // Simulate scan progress
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      this.scanProgress = Math.min((elapsed / duration) * 100, 100);

      if (this.scanProgress >= 100) {
        clearInterval(progressInterval);
        this.completeScan(mode, startTime, duration);
      }
    }, 100);
  }

  private completeScan(mode: ScanMode, startTime: number, duration: number): void {
    this.isScanning = false;
    this.scanProgress = 100;

    // Update network status
    currentNetworkStatus = {
      ...currentNetworkStatus,
      scanState: "complete",
      lastScanAt: new Date().toISOString(),
      devicesFound: currentDevices.length,
      onlineDevices: currentDevices.filter((d) => d.status === "online").length,
      unknownDevices: currentDevices.filter((d) => d.deviceType === "unknown").length,
      flaggedDevices: currentDevices.filter(
        (d) => d.trustLevel === "new" || d.trustLevel === "watch"
      ).length,
    };

    // Add to scan history
    const newScanEntry: ScanHistoryEntry = {
      id: `scan-${Date.now()}`,
      startedAt: new Date(startTime).toISOString(),
      finishedAt: new Date().toISOString(),
      devicesFound: currentDevices.length,
      newDevices: currentDevices.filter((d) => d.trustLevel === "new").length,
      offlineDevices: currentDevices.filter((d) => d.status === "offline").length,
      flaggedDevices: currentDevices.filter(
        (d) => d.trustLevel === "new" || d.trustLevel === "watch"
      ).length,
      durationMs: duration,
      scanMode: mode,
    };

    scanHistory = [newScanEntry, ...scanHistory].slice(0, 20);
  }

  /**
   * Stop an in-progress scan
   *
   * FUTURE: Signal native scanner to abort
   */
  async stopNetworkScan(): Promise<void> {
    this.isScanning = false;
    this.scanProgress = 0;

    currentNetworkStatus = {
      ...currentNetworkStatus,
      scanState: "idle",
    };
  }

  /**
   * Get list of discovered devices
   *
   * FUTURE: Return cached results from native scanner
   */
  async getDiscoveredDevices(): Promise<DiscoveredDevice[]> {
    return [...currentDevices];
  }

  /**
   * Get details for a specific device
   *
   * FUTURE: Perform additional probing on demand
   * - TCP port scan
   * - Service identification
   * - Vendor lookup
   */
  async getDeviceDetails(deviceId: string): Promise<DiscoveredDevice | null> {
    const device = currentDevices.find((d) => d.id === deviceId);
    return device ? { ...device } : null;
  }

  /**
   * Get router/gateway status
   *
   * FUTURE: Connect to router management API
   * - UPnP IGD
   * - Vendor-specific REST APIs
   * - SNMP (if supported)
   */
  async getRouterStatus(): Promise<RouterStatus> {
    return { ...MOCK_ROUTER_STATUS };
  }

  async getRouterCapabilities(): Promise<RouterCapability[]> {
    return createRouterCapabilities("demo", new Date().toISOString());
  }

  async getRouterControlMode(): Promise<RouterControlMode> {
    return "demo";
  }

  async executeRouterAction(
    action: RouterActionResult["action"],
    _payload?: { enabled?: boolean }
  ): Promise<RouterActionResult> {
    return {
      action,
      status: "queued-demo",
      message: "Demo adapter queued action. No real router change was executed.",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Execute a network action
   *
   * FUTURE: Route to the appropriate native or optional connector handler
   * - Wake-on-LAN: Send magic packet via native code
   * - Router reboot: API call to router
   * - Block device: Router API or firewall rules
   */
  async runNetworkAction(
    action: Omit<NetworkAction, "id" | "createdAt" | "status">
  ): Promise<NetworkAction> {
    const newAction: NetworkAction = {
      ...action,
      id: `action-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: "queued",
    };

    // Simulate action execution
    setTimeout(() => {
      const index = actionHistory.findIndex((a) => a.id === newAction.id);
      if (index !== -1) {
        actionHistory[index] = {
          ...actionHistory[index],
          status: "running",
        };
      }
    }, 500);

    setTimeout(() => {
      const index = actionHistory.findIndex((a) => a.id === newAction.id);
      if (index !== -1) {
        // Demo mode: actions always "succeed" but are simulated
        actionHistory[index] = {
          ...actionHistory[index],
          status: "success",
          message: `${actionHistory[index].message} [DEMO - Simulated]`,
        };

        // Apply simulated effect for trust level changes
        if (action.deviceId) {
          const deviceIndex = currentDevices.findIndex((d) => d.id === action.deviceId);
          if (deviceIndex !== -1) {
            switch (action.type) {
              case "trust":
                currentDevices[deviceIndex] = {
                  ...currentDevices[deviceIndex],
                  trustLevel: "trusted",
                };
                break;
              case "watch":
                currentDevices[deviceIndex] = {
                  ...currentDevices[deviceIndex],
                  trustLevel: "watch",
                };
                break;
              case "block":
                currentDevices[deviceIndex] = {
                  ...currentDevices[deviceIndex],
                  trustLevel: "blocked",
                };
                break;
            }
          }
        }
      }
    }, 2000);

    actionHistory = [newAction, ...actionHistory].slice(0, 50);

    return newAction;
  }

  /**
   * Get action history
   */
  async getActionHistory(): Promise<NetworkAction[]> {
    return [...actionHistory];
  }

  /**
   * Get scan history
   */
  async getScanHistory(): Promise<ScanHistoryEntry[]> {
    return [...scanHistory];
  }

  /**
   * Save a note for a device
   */
  async saveDeviceNote(deviceId: string, note: string): Promise<void> {
    const index = currentDevices.findIndex((d) => d.id === deviceId);
    if (index !== -1) {
      currentDevices[index] = {
        ...currentDevices[index],
        notes: note,
      };
    }
  }

  /**
   * Update network settings
   */
  async updateNetworkSettings(settings: Partial<NetworkSettings>): Promise<NetworkSettings> {
    currentSettings = {
      ...currentSettings,
      ...settings,
    };
    return { ...currentSettings };
  }

  /**
   * Get current network settings
   */
  async getNetworkSettings(): Promise<NetworkSettings> {
    return { ...currentSettings };
  }

  /**
   * Get security insights
   */
  async getSecurityInsights(): Promise<SecurityInsight[]> {
    return [...MOCK_SECURITY_INSIGHTS];
  }

  /**
   * Get topology graph for future 3D map consumers.
   *
   * Demo mode returns a clearly marked demo graph. Non-demo scan-derived data is still
   * marked estimated until a native plugin or connector source confirms real physical relations.
   */
  async getNetworkTopology(): Promise<NetworkTopologyGraph> {
    return currentSettings.demoMode
      ? createDemoTopologyGraph(currentDevices)
      : buildTopologyGraphFromDevices(currentDevices, "estimated");
  }

  /**
   * Get compact topology summary without requiring map components to inspect nodes.
   */
  async getTopologySummary(): Promise<NetworkTopologyGraph["summary"]> {
    const topology = await this.getNetworkTopology();
    return { ...topology.summary };
  }

  /**
   * Reset demo topology inputs to the original mock dataset.
   */
  regenerateDemoTopology(): NetworkTopologyGraph {
    currentDevices = [...MOCK_DEVICES];
    currentNetworkStatus = { ...MOCK_NETWORK_STATUS };
    return createDemoTopologyGraph(currentDevices);
  }

  /**
   * Get current scan progress (0-100)
   */
  getScanProgress(): number {
    return this.scanProgress;
  }

  /**
   * Check if currently scanning
   */
  getIsScanning(): boolean {
    return this.isScanning;
  }
}

class NativeNetworkAdapter implements NetworkAdapterInterface {
  private isScanning = false;
  private scanProgress = 0;
  private scanStartedAt = 0;
  private scanDurationMs = 6000;
  private actionHistory: NetworkAction[] = [];
  private settings: NetworkSettings = { ...DEFAULT_NETWORK_SETTINGS, demoMode: false };
  private lastNativeScan: NativeScanResult | null = null;
  private lastScanFailed = false;

  private get bridge(): NativeNetworkDiscoveryBridge | null {
    return getNativeBridge();
  }

  private updateProgressFromClock(): number {
    if (!this.isScanning) return this.scanProgress;
    const elapsed = Date.now() - this.scanStartedAt;
    this.scanProgress = Math.min((elapsed / this.scanDurationMs) * 100, 95);
    return this.scanProgress;
  }

  private nativeScanToDevices(nativeScan: NativeScanResult): DiscoveredDevice[] {
    return nativeScan.hosts.map((host) => ({
      id: `native-${host.ipAddress}`,
      name: host.hostname ?? host.ipAddress,
      hostname: host.hostname ?? host.ipAddress,
      ipAddress: host.ipAddress,
      macAddress: host.macAddress ?? "Unavailable",
      vendor: host.vendor ?? "Unavailable",
      deviceType: host.ipAddress === nativeScan.localContext?.gatewayIp ? "router" : "unknown",
      status: "online",
      trustLevel: "new",
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      openPorts: host.openPorts ?? [],
      services: host.services ?? [],
      notes: host.dataLimited ? "LIMITED DATA" : "LIVE ANDROID DISCOVERY",
      latencyMs: host.latencyMs,
      discoverySources: host.discoverySources ?? ["tcp-probe"],
      confidence: host.confidence ?? "low",
      dataLimited: host.dataLimited,
      lastScanSource: host.lastScanSource ?? "tcp-probe",
    }));
  }

  async getAdapterStatus(): Promise<NetworkAdapterStatus> {
    if (await isAndroidNativeNetworkPluginAvailable()) {
      return resolveNetworkAdapterStatus({
        demoMode: false,
        nativePluginAvailable: true,
      });
    }

    throw new BackendUnavailableError(
      "Android NeoNetwork plugin is unavailable; falling back to labeled demo data."
    );
  }

  async getNetworkStatus(): Promise<NetworkStatus> {
    const nativeContext = await getNativeLocalNetworkContext();
    if (nativeContext) {
      const nativeDevices = this.lastNativeScan ? this.nativeScanToDevices(this.lastNativeScan) : [];
      return {
        networkName: nativeContext.networkName ?? "Unavailable",
        gatewayIp: nativeContext.gatewayIp ?? "Unavailable",
        localIp: nativeContext.localIp ?? "Unavailable",
        subnet: nativeContext.subnet ?? "Unavailable",
        connectionType: nativeContext.connectionType ?? "unknown",
        scanState: this.isScanning ? "scanning" : this.lastScanFailed ? "failed" : this.lastNativeScan ? "complete" : "idle",
        lastScanAt: this.lastNativeScan ? new Date().toISOString() : null,
        devicesFound: nativeDevices.length,
        onlineDevices: nativeDevices.filter((device) => device.status === "online").length,
        unknownDevices: nativeDevices.filter((device) => device.deviceType === "unknown").length,
        flaggedDevices: nativeDevices.filter((device) => device.trustLevel !== "trusted").length,
      };
    }

    throw new Error("Native Android discovery plugin unavailable.");
  }

  async startNetworkScan(mode: ScanMode): Promise<void> {
    const durations: Record<ScanMode, number> = {
      quick: 3000,
      balanced: 6000,
      deep: 12000,
    };

    this.isScanning = true;
    this.scanProgress = 0;
    this.scanStartedAt = Date.now();
    this.scanDurationMs = durations[mode];

    void runNativeSubnetScan({ scanMode: mode })
      .then((nativeScan) => {
        if (nativeScan) {
          this.lastNativeScan = nativeScan;
          this.lastScanFailed = false;
          this.scanProgress = 100;
          this.isScanning = false;
          this.scanStartedAt = Date.now();
        }
      })
      .catch(() => {
        this.scanProgress = 0;
        this.isScanning = false;
        this.lastScanFailed = true;
      });

  }

  async stopNetworkScan(): Promise<void> {
    await (this.bridge?.stopNetworkScan?.() ??
      requestBackendJson<void>("/scan/stop", { method: "POST" }));
    this.isScanning = false;
    this.scanProgress = 0;
  }

  async getDiscoveredDevices(): Promise<DiscoveredDevice[]> {
    if (this.lastNativeScan) {
      return this.nativeScanToDevices(this.lastNativeScan);
    }

    return [];
  }

  async getDeviceDetails(deviceId: string): Promise<DiscoveredDevice | null> {
    return (
      this.bridge?.getDeviceDetails?.(deviceId) ??
      requestBackendJson<DiscoveredDevice | null>(`/devices/${encodeURIComponent(deviceId)}`)
    );
  }

  async getRouterStatus(): Promise<RouterStatus> {
    const nativeGateway = await getNativeGatewayInfo();
    if (nativeGateway) {
      return {
        name: "Local Gateway",
        model: "Unavailable",
        gatewayIp: nativeGateway.gatewayIp ?? "Unavailable",
        firmwareVersion: "Unavailable",
        connectionStatus: nativeGateway.reachable ? "connected" : "unknown",
        uptime: "Unavailable",
        wanIp: "Unavailable",
        dnsServers: [],
        guestNetworkEnabled: false,
        qosEnabled: false,
        firewallEnabled: true,
        rebootAvailable: false,
        readOnlyMode: true,
      };
    }

    return this.bridge?.getRouterStatus?.() ?? requestBackendJson<RouterStatus>("/router");
  }

  async getRouterCapabilities(): Promise<RouterCapability[]> {
    return createRouterCapabilities(await this.getRouterControlMode(), new Date().toISOString());
  }

  async getRouterControlMode(): Promise<RouterControlMode> {
    return "read-only";
  }

  async executeRouterAction(
    action: RouterActionResult["action"],
    _payload?: { enabled?: boolean }
  ): Promise<RouterActionResult> {
    if (action === "refresh-status") {
      return {
        action,
        status: "success",
        message: "Router status refresh executed from current adapter context.",
        timestamp: new Date().toISOString(),
      };
    }

    return {
      action,
      status: "requires-connector",
      message:
        "Router control action requires a vendor/connector-backed integration and was not executed.",
      timestamp: new Date().toISOString(),
    };
  }

  async runNetworkAction(
    action: Omit<NetworkAction, "id" | "createdAt" | "status">
  ): Promise<NetworkAction> {
    const result = createReadOnlyActionResult(action);
    this.actionHistory = [result, ...this.actionHistory].slice(0, 50);
    return result;
  }

  async getActionHistory(): Promise<NetworkAction[]> {
    return [...this.actionHistory];
  }

  async getScanHistory(): Promise<ScanHistoryEntry[]> {
    return [];
  }

  async saveDeviceNote(deviceId: string, note: string): Promise<void> {
    const action = createReadOnlyActionResult({
      type: "note",
      label: "Note not saved",
      deviceId,
      message: `Native discovery note save skipped: ${note.slice(0, 48)}`,
    });
    this.actionHistory = [action, ...this.actionHistory].slice(0, 50);
    throw new Error("Native discovery adapter is read-only; note writes are disabled.");
  }

  async updateNetworkSettings(settings: Partial<NetworkSettings>): Promise<NetworkSettings> {
    this.settings = { ...this.settings, ...settings, demoMode: false };
    return { ...this.settings };
  }

  async getNetworkSettings(): Promise<NetworkSettings> {
    return { ...this.settings };
  }

  async getSecurityInsights(): Promise<SecurityInsight[]> {
    return [];
  }

  async getNetworkTopology(): Promise<NetworkTopologyGraph> {
    const devices = await this.getDiscoveredDevices();
    return buildTopologyGraphFromDevices(devices, "estimated");
  }

  async getTopologySummary(): Promise<NetworkTopologyGraph["summary"]> {
    const topology = await this.getNetworkTopology();
    return { ...topology.summary };
  }

  getScanProgress(): number {
    return this.updateProgressFromClock();
  }

  getIsScanning(): boolean {
    return this.isScanning;
  }
}

class NetworkDiscoveryAdapter implements NetworkAdapterInterface {
  private activeMode: NetworkAdapterStatus["mode"] = "demo-browser";
  private fallbackReason: string | null = null;
  private nativeOverrideResolved: boolean | null = null;

  constructor(
    private readonly demoAdapter: DemoNetworkAdapter,
    private readonly nativeNetworkAdapter: NativeNetworkAdapter
  ) {}

  private async nativePluginCanOverrideDemo(): Promise<boolean> {
    if (this.nativeOverrideResolved !== null) return this.nativeOverrideResolved;
    this.nativeOverrideResolved = await isAndroidNativeNetworkPluginAvailable();
    return this.nativeOverrideResolved;
  }

  private async shouldUseDemo(): Promise<boolean> {
    const settings = await this.demoAdapter.getNetworkSettings();
    return settings.demoMode;
  }

  private async withFallback<T>(
    operation: (adapter: NativeNetworkAdapter) => Promise<T>,
    fallback: (adapter: DemoNetworkAdapter) => Promise<T>
  ): Promise<T> {
    if (await this.shouldUseDemo()) {
      this.activeMode = "demo-browser";
      this.fallbackReason = null;
      return fallback(this.demoAdapter);
    }

    try {
      const result = await operation(this.nativeNetworkAdapter);
      this.activeMode = "native-android";
      this.fallbackReason = null;
      return result;
    } catch (error) {
      this.activeMode = "native-unavailable";
      this.fallbackReason = getErrorMessage(error);
      throw error;
    }
  }

  async getAdapterStatus(): Promise<NetworkAdapterStatus> {
    if (await this.shouldUseDemo()) {
      this.activeMode = "demo-browser";
      this.fallbackReason = null;
      return this.demoAdapter.getAdapterStatus();
    }

    try {
      const status = await this.nativeNetworkAdapter.getAdapterStatus();
      this.activeMode = "native-android";
      this.fallbackReason = null;
      return status;
    } catch (error) {
      this.activeMode = "native-unavailable";
      this.fallbackReason = getErrorMessage(error);
      return resolveNetworkAdapterStatus({
        demoMode: false,
        nativePluginAvailable: false,
        fallbackReason: this.fallbackReason,
      });
    }
  }

  async getNetworkStatus(): Promise<NetworkStatus> {
    return this.withFallback(
      (adapter) => adapter.getNetworkStatus(),
      (adapter) => adapter.getNetworkStatus()
    );
  }

  async startNetworkScan(mode: ScanMode): Promise<void> {
    return this.withFallback(
      (adapter) => adapter.startNetworkScan(mode),
      (adapter) => adapter.startNetworkScan(mode)
    );
  }

  async stopNetworkScan(): Promise<void> {
    return this.withFallback(
      (adapter) => adapter.stopNetworkScan(),
      (adapter) => adapter.stopNetworkScan()
    );
  }

  async getDiscoveredDevices(): Promise<DiscoveredDevice[]> {
    return this.withFallback(
      (adapter) => adapter.getDiscoveredDevices(),
      (adapter) => adapter.getDiscoveredDevices()
    );
  }

  async getDeviceDetails(deviceId: string): Promise<DiscoveredDevice | null> {
    return this.withFallback(
      (adapter) => adapter.getDeviceDetails(deviceId),
      (adapter) => adapter.getDeviceDetails(deviceId)
    );
  }

  async getRouterStatus(): Promise<RouterStatus> {
    return this.withFallback(
      (adapter) => adapter.getRouterStatus(),
      (adapter) => adapter.getRouterStatus()
    );
  }

  async getRouterCapabilities(): Promise<RouterCapability[]> {
    return this.withFallback(
      (adapter) => adapter.getRouterCapabilities(),
      (adapter) => adapter.getRouterCapabilities()
    );
  }

  async getRouterControlMode(): Promise<RouterControlMode> {
    return this.withFallback(
      (adapter) => adapter.getRouterControlMode(),
      (adapter) => adapter.getRouterControlMode()
    );
  }

  async executeRouterAction(
    action: RouterActionResult["action"],
    payload?: { enabled?: boolean }
  ): Promise<RouterActionResult> {
    return this.withFallback(
      (adapter) => adapter.executeRouterAction(action, payload),
      (adapter) => adapter.executeRouterAction(action, payload)
    );
  }

  async runNetworkAction(
    action: Omit<NetworkAction, "id" | "createdAt" | "status">
  ): Promise<NetworkAction> {
    if (await this.shouldUseDemo()) {
      this.activeMode = "demo-browser";
      this.fallbackReason = null;
      return this.demoAdapter.runNetworkAction(action);
    }

    try {
      const result = await this.nativeNetworkAdapter.runNetworkAction(action);
      this.activeMode = "native-android";
      this.fallbackReason = null;
      return result;
    } catch (error) {
      this.activeMode = "native-unavailable";
      this.fallbackReason = getErrorMessage(error);
      return createReadOnlyActionResult(action, this.fallbackReason ?? "Native discovery unavailable.");
    }
  }

  async getActionHistory(): Promise<NetworkAction[]> {
    return this.withFallback(
      (adapter) => adapter.getActionHistory(),
      (adapter) => adapter.getActionHistory()
    );
  }

  async getScanHistory(): Promise<ScanHistoryEntry[]> {
    return this.withFallback(
      (adapter) => adapter.getScanHistory(),
      (adapter) => adapter.getScanHistory()
    );
  }

  async saveDeviceNote(deviceId: string, note: string): Promise<void> {
    if (await this.shouldUseDemo()) {
      this.activeMode = "demo-browser";
      this.fallbackReason = null;
      return this.demoAdapter.saveDeviceNote(deviceId, note);
    }

    try {
      await this.nativeNetworkAdapter.saveDeviceNote(deviceId, note);
      this.activeMode = "native-android";
      this.fallbackReason = null;
    } catch (error) {
      this.activeMode = "native-unavailable";
      this.fallbackReason = getErrorMessage(error);
      throw error;
    }
  }

  async updateNetworkSettings(settings: Partial<NetworkSettings>): Promise<NetworkSettings> {
    const updated = await this.demoAdapter.updateNetworkSettings(settings);

    if (!updated.demoMode) {
      try {
        await this.nativeNetworkAdapter.updateNetworkSettings(updated);
        this.activeMode = "native-android";
        this.fallbackReason = null;
      } catch (error) {
        this.activeMode = "native-unavailable";
        this.fallbackReason = getErrorMessage(error);
      }
    } else {
      this.activeMode = "demo-browser";
      this.fallbackReason = null;
    }

    return updated;
  }

  async getNetworkSettings(): Promise<NetworkSettings> {
    await this.shouldUseDemo();
    return this.demoAdapter.getNetworkSettings();
  }

  async getSecurityInsights(): Promise<SecurityInsight[]> {
    return this.withFallback(
      (adapter) => adapter.getSecurityInsights(),
      (adapter) => adapter.getSecurityInsights()
    );
  }

  async getNetworkTopology(): Promise<NetworkTopologyGraph> {
    return this.withFallback(
      (adapter) => adapter.getNetworkTopology(),
      (adapter) => adapter.getNetworkTopology()
    );
  }

  async getTopologySummary(): Promise<NetworkTopologyGraph["summary"]> {
    const topology = await this.getNetworkTopology();
    return { ...topology.summary };
  }

  getScanProgress(): number {
    return this.activeMode === "native-android"
      ? this.nativeNetworkAdapter.getScanProgress()
      : this.demoAdapter.getScanProgress();
  }

  getIsScanning(): boolean {
    return this.activeMode === "native-android"
      ? this.nativeNetworkAdapter.getIsScanning()
      : this.demoAdapter.getIsScanning();
  }
}

export const demoNetworkAdapter = new DemoNetworkAdapter();
export const nativeNetworkAdapter = new NativeNetworkAdapter();

// Export singleton facade. Plugin available does not mean native mode is active:
// demoMode overrides native availability, and real discovery is attempted only when demo is off.
export const networkAdapter = new NetworkDiscoveryAdapter(demoNetworkAdapter, nativeNetworkAdapter);

// Export type for future real adapter implementations
export type { NetworkAdapterInterface };
