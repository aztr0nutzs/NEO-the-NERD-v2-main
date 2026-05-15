import type { DiscoveryConfidence, DiscoverySource, ScanMode } from "./types";

export interface NativeLocalNetworkContext {
  localIp: string | null;
  gatewayIp: string | null;
  prefixLength: number | null;
  subnet: string | null;
  networkName: string | null;
  connectionType: string;
  adapterStatus: "active" | "unavailable";
  limitedData: boolean;
}

export interface NativeHostRecord {
  ipAddress: string;
  status: "online" | "unknown";
  hostname: string | null;
  macAddress: string | null;
  vendor: string | null;
  openPorts: number[];
  services: string[];
  latencyMs?: number;
  dataLimited: boolean;
  discoverySources: DiscoverySource[];
  confidence: DiscoveryConfidence;
  lastScanSource: DiscoverySource;
}

export interface NativeScanResult {
  scanMode: ScanMode;
  adapterStatus: "active" | "unavailable";
  limitedData: boolean;
  localContext?: NativeLocalNetworkContext;
  scannedHosts: number;
  discoveredHosts: number;
  hosts: NativeHostRecord[];
  message?: string;
}

export interface NativeGatewayInfo {
  gatewayIp: string | null;
  hostname: string | null;
  reachable: boolean;
  dataLimited: boolean;
}

export interface NativeScanOptions {
  scanMode: ScanMode;
  maxHosts?: number;
  timeoutMs?: number;
  commonPorts?: number[];
}

export interface NativeBackgroundMonitoringStatus {
  schedulerStatus: "idle" | "scheduled" | "running" | "error";
  backgroundCapability: "android-workmanager" | "in-app-only";
  lastResult?: string;
}
