import { Capacitor, registerPlugin } from "@capacitor/core";
import type {
  NativeGatewayInfo,
  NativeLocalNetworkContext,
  NativeScanOptions,
  NativeScanResult,
  NativeBackgroundMonitoringStatus,
} from "./native-network-types";

type NeoNetworkPlugin = {
  checkPermissions(): Promise<NativeNetworkPermissionStatus>;
  requestPermissions(): Promise<NativeNetworkPermissionStatus>;
  getLocalNetworkContext(): Promise<NativeLocalNetworkContext>;
  scanLocalSubnet(options: NativeScanOptions): Promise<NativeScanResult>;
  getGatewayInfo(): Promise<NativeGatewayInfo>;
  configureBackgroundMonitoring(options: { enabled: boolean; intervalMinutes: number; notifyOnChanges: boolean }): Promise<Record<string, unknown>>;
  getBackgroundMonitoringStatus(): Promise<NativeBackgroundMonitoringStatus>;
};

type NativePermissionState = "prompt" | "prompt-with-rationale" | "granted" | "denied";

export type NativeNetworkPermissionStatus = {
  location?: NativePermissionState;
  wifi?: NativePermissionState;
};

const neoNetwork = registerPlugin<NeoNetworkPlugin>("NeoNetwork");
const DEBUG_NATIVE_NETWORK = process.env.NEXT_PUBLIC_NEO_NETWORK_DIAGNOSTICS !== "false";
let networkPermissionsRequested = false;

const NATIVE_SCAN_BRIDGE_TIMEOUT_MS: Record<NativeScanOptions["scanMode"], number> = {
  quick: 45_000,
  balanced: 95_000,
  deep: 195_000,
};

function logNativeDiagnostic(event: string, details?: Record<string, unknown>): void {
  if (!DEBUG_NATIVE_NETWORK) return;
  console.info(`[NeoNetworkBridge] ${event}`, details ?? {});
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise
      .then(resolve, reject)
      .finally(() => clearTimeout(timer));
  });
}

export function isAndroidNativeNetworkAvailable(): boolean {
  return Capacitor.getPlatform() === "android";
}

export async function isAndroidNativeNetworkPluginAvailable(): Promise<boolean> {
  if (!isAndroidNativeNetworkAvailable()) {
    logNativeDiagnostic("plugin_unavailable_web_mode", { platform: Capacitor.getPlatform() });
    return false;
  }

  try {
    await neoNetwork.getLocalNetworkContext();
    logNativeDiagnostic("plugin_detected");
    return true;
  } catch (error) {
    logNativeDiagnostic("plugin_detection_failed", {
      message: error instanceof Error ? error.message : "Unknown native plugin probe error",
    });
    return false;
  }
}

function hasRequiredNetworkPermissions(status: NativeNetworkPermissionStatus | undefined | null): boolean {
  if (!status) return false;
  return status.location === "granted" && (status.wifi === undefined || status.wifi === "granted");
}

export async function requestNetworkPermissions(): Promise<boolean> {
  if (!isAndroidNativeNetworkAvailable()) return true;

  try {
    const current = await neoNetwork.checkPermissions();
    if (hasRequiredNetworkPermissions(current)) {
      networkPermissionsRequested = true;
      logNativeDiagnostic("permissions_already_granted", current as Record<string, unknown>);
      return true;
    }

    const requested = await neoNetwork.requestPermissions();
    const granted = hasRequiredNetworkPermissions(requested);
    networkPermissionsRequested = granted;
    logNativeDiagnostic(granted ? "permissions_granted" : "permissions_denied", requested as Record<string, unknown>);
    return granted;
  } catch (error) {
    networkPermissionsRequested = false;
    logNativeDiagnostic("permissions_request_failed", {
      message: error instanceof Error ? error.message : "Unknown network permission request error",
    });
    return false;
  }
}

export async function checkNetworkPermissions(): Promise<NativeNetworkPermissionStatus | null> {
  if (!isAndroidNativeNetworkAvailable()) return null;
  try {
    const status = await neoNetwork.checkPermissions();
    logNativeDiagnostic("permissions_checked", status as Record<string, unknown>);
    return status;
  } catch (error) {
    logNativeDiagnostic("permissions_check_failed", {
      message: error instanceof Error ? error.message : "Unknown network permission check error",
    });
    return null;
  }
}

export async function getLocalNetworkContext(): Promise<NativeLocalNetworkContext | null> {
  if (!isAndroidNativeNetworkAvailable()) return null;
  try {
    const context = await neoNetwork.getLocalNetworkContext();
    logNativeDiagnostic("local_context_success", {
      hasLocalIp: Boolean(context.localIp),
      hasGatewayIp: Boolean(context.gatewayIp),
      limitedData: context.limitedData,
    });
    return context;
  } catch (error) {
    logNativeDiagnostic("local_context_failed", {
      message: error instanceof Error ? error.message : "Unknown local context error",
    });
    throw error;
  }
}

export async function scanLocalSubnet(options: NativeScanOptions): Promise<NativeScanResult | null> {
  if (!isAndroidNativeNetworkAvailable()) return null;
  if (!networkPermissionsRequested) {
    const granted = await requestNetworkPermissions();
    if (!granted) {
      throw new Error("Android Wi-Fi/location permission denied. Grant permission to scan the local network.");
    }
  }
  logNativeDiagnostic("scan_started", { scanMode: options.scanMode });
  try {
    const timeoutMs = NATIVE_SCAN_BRIDGE_TIMEOUT_MS[options.scanMode] ?? NATIVE_SCAN_BRIDGE_TIMEOUT_MS.balanced;
    const result = await withTimeout(
      neoNetwork.scanLocalSubnet(options),
      timeoutMs,
      `Native ${options.scanMode} scan did not return within ${Math.round(timeoutMs / 1000)}s. Check Wi-Fi/LAN state, Android permissions, VPN/hotspot mode, and native plugin logs.`,
    );
    logNativeDiagnostic("scan_completed", {
      scanMode: result.scanMode,
      scannedHosts: result.scannedHosts,
      discoveredHosts: result.discoveredHosts,
      limitedData: result.limitedData,
    });
    return result;
  } catch (error) {
    logNativeDiagnostic("scan_failed", {
      scanMode: options.scanMode,
      message: error instanceof Error ? error.message : "Unknown native scan error",
    });
    throw error;
  }
}

export async function getGatewayInfo(): Promise<NativeGatewayInfo | null> {
  if (!isAndroidNativeNetworkAvailable()) return null;
  try {
    const gateway = await neoNetwork.getGatewayInfo();
    logNativeDiagnostic("gateway_info_success", {
      hasGatewayIp: Boolean(gateway.gatewayIp),
      reachable: gateway.reachable,
      dataLimited: gateway.dataLimited,
    });
    return gateway;
  } catch (error) {
    logNativeDiagnostic("gateway_info_failed", {
      message: error instanceof Error ? error.message : "Unknown gateway info error",
    });
    throw error;
  }
}

export async function configureAndroidBackgroundMonitoring(options: {
  enabled: boolean;
  intervalMinutes: number;
  notifyOnChanges: boolean;
}): Promise<boolean> {
  if (!isAndroidNativeNetworkAvailable()) return false;
  await neoNetwork.configureBackgroundMonitoring(options);
  return true;
}

export async function getAndroidBackgroundMonitoringStatus(): Promise<NativeBackgroundMonitoringStatus | null> {
  if (!isAndroidNativeNetworkAvailable()) return null;
  return neoNetwork.getBackgroundMonitoringStatus();
}
