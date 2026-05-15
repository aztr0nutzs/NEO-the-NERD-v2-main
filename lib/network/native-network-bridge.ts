import { Capacitor, registerPlugin } from "@capacitor/core";
import type {
  NativeGatewayInfo,
  NativeLocalNetworkContext,
  NativeScanOptions,
  NativeScanResult,
  NativeBackgroundMonitoringStatus,
} from "./native-network-types";

type NeoNetworkPlugin = {
  getLocalNetworkContext(): Promise<NativeLocalNetworkContext>;
  scanLocalSubnet(options: NativeScanOptions): Promise<NativeScanResult>;
  getGatewayInfo(): Promise<NativeGatewayInfo>;
  configureBackgroundMonitoring(options: { enabled: boolean; intervalMinutes: number; notifyOnChanges: boolean }): Promise<Record<string, unknown>>;
  getBackgroundMonitoringStatus(): Promise<NativeBackgroundMonitoringStatus>;
};

const neoNetwork = registerPlugin<NeoNetworkPlugin>("NeoNetwork");
const DEBUG_NATIVE_NETWORK = process.env.NEXT_PUBLIC_NEO_NETWORK_DIAGNOSTICS !== "false";

function logNativeDiagnostic(event: string, details?: Record<string, unknown>): void {
  if (!DEBUG_NATIVE_NETWORK) return;
  console.info(`[NeoNetworkBridge] ${event}`, details ?? {});
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
  logNativeDiagnostic("scan_started", { scanMode: options.scanMode });
  try {
    const result = await neoNetwork.scanLocalSubnet(options);
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
