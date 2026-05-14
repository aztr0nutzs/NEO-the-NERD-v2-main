import type { ScanMode } from "./types";

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
