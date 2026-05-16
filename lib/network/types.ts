/**
 * N.E.O. the N.E.R.D. - Network Discovery + Control Feature
 * Type Definitions
 *
 * These types define the data structures used throughout the network discovery module.
 * All real network functionality must go through the adapter layer.
 */

export type ScanState = "idle" | "scanning" | "complete" | "failed";

export type DeviceType =
  | "phone"
  | "computer"
  | "router"
  | "iot"
  | "tv"
  | "console"
  | "printer"
  | "unknown";

export type DeviceStatus = "online" | "offline" | "unknown";

export type TrustLevel = "trusted" | "new" | "watch" | "blocked";

export type DeviceIdentityTrustState =
  | "new"
  | "trusted"
  | "watch"
  | "requested-block"
  | "dismissed";

export type DeviceIdentityMatchType = "mac" | "ip-hostname" | "ip" | "device-id";

export type DeviceIdentityConfidence = "weak" | "medium" | "high";

export type ActionType =
  | "scan"
  | "identify"
  | "rename"
  | "trust"
  | "watch"
  | "block"
  | "wake"
  | "router_reboot"
  | "toggle_guest"
  | "toggle_qos"
  | "note";

export type ActionStatus = "queued" | "running" | "success" | "failed";

export type InsightSeverity = "info" | "low" | "medium" | "high";

export type NetworkEventType =
  | "scan_started"
  | "scan_completed"
  | "device_first_seen"
  | "device_returned"
  | "device_went_offline"
  | "device_trust_changed"
  | "device_renamed"
  | "device_flagged"
  | "router_status_changed"
  | "scan_failed"
  | "network_context_changed"
  | "speed_test_started"
  | "speed_test_completed"
  | "speed_test_failed";

export type ScanMode = "quick" | "balanced" | "deep";

export type DiscoverySource = "arp" | "tcp-probe" | "gateway" | "hostname" | "mdns" | "ssdp";

export type DiscoveryConfidence = "low" | "medium" | "high";

export type NetworkTopologyRole = "gateway" | "client" | "access-point" | "unknown";

export type NetworkTopologyEdgeRelation =
  | "gateway-link"
  | "wireless-estimate"
  | "wired-estimate"
  | "logical-estimate"
  | "unknown";

export type NetworkTopologyEdgeQuality = "strong" | "fair" | "weak" | "unknown";

export type NetworkTopologyMode = "demo" | "estimated" | "backend-confirmed";

export type NetworkAdapterMode = "demo-browser" | "native-android" | "native-unavailable" | "scan-failed";

export type NetworkMapViewMode =
  | "orbital-3d"
  | "top-down"
  | "focus-selected"
  | "alerts-only"
  | "recent-changes";

export type NetworkMapLabelMode = "off" | "name" | "ip" | "vendor" | "status";

export type NetworkMapOverlayMode =
  | "operational"
  | "alert-severity"
  | "trust-state"
  | "last-seen"
  | "latency"
  | "discovery-confidence";

export type NetworkMapFocusMode =
  | "all"
  | "unknown"
  | "flagged"
  | "offline-trusted"
  | "changed";

export interface NetworkMapNodeOperationalState {
  deviceId: string;
  isNew: boolean;
  isReturned: boolean;
  isTrustedOffline: boolean;
  isWatchOrFlagged: boolean;
  hasRecentAlert: boolean;
  changedSinceLastScan: boolean;
  alertSeverity: InsightSeverity | null;
  freshness: "fresh" | "recent" | "stale" | "unknown";
  latencyGrade: "good" | "watch" | "degraded" | "unknown";
  discoveryConfidence: DiscoveryConfidence;
  overlayColor: string;
  overlayLabel: string;
  reasons: string[];
}

export interface NetworkStatus {
  networkName: string;
  gatewayIp: string;
  localIp: string;
  subnet: string;
  connectionType: string;
  scanState: ScanState;
  lastScanAt: string | null;
  devicesFound: number;
  onlineDevices: number;
  unknownDevices: number;
  flaggedDevices: number;
}

export interface DiscoveredDevice {
  id: string;
  name: string;
  hostname: string;
  ipAddress: string;
  macAddress: string;
  vendor: string;
  deviceType: DeviceType;
  status: DeviceStatus;
  trustLevel: TrustLevel;
  firstSeen: string;
  lastSeen: string;
  openPorts: number[];
  services: string[];
  notes: string;
  signalStrength?: number;
  latencyMs?: number;
  discoverySources: DiscoverySource[];
  confidence: DiscoveryConfidence;
  dataLimited: boolean;
  lastScanSource: DiscoverySource;
  identityKey?: string;
  identityMatchType?: DeviceIdentityMatchType;
  identityMatchConfidence?: DeviceIdentityConfidence;
  customName?: string;
  room?: string;
  ownerLabel?: string;
  trustedState?: DeviceIdentityTrustState;
  watchState?: boolean;
  requestedBlockState?: boolean;
  identityFirstSeenAt?: string;
  identityLastSeenAt?: string;
  seenCount?: number;
  identityNotes?: string;
  identityConfidence?: DeviceIdentityConfidence;
  manuallyVerified?: boolean;
  lastChangedAt?: string;
  lastChangedFields?: string[];
  rawName?: string;
  rawHostname?: string;
  rawIpAddress?: string;
  rawMacAddress?: string;
  rawVendor?: string;
  isNewIdentity?: boolean;
  dismissedForNow?: boolean;
}

export interface NetworkEvent {
  id: string;
  timestamp: string;
  type: NetworkEventType;
  severity: InsightSeverity;
  relatedDeviceId?: string;
  relatedRouterId?: string;
  title: string;
  detail: Record<string, string | number | boolean | string[] | null>;
  sourceScanId?: string;
}

export interface ScanComparisonSummary {
  scanId: string;
  generatedAt: string;
  newDeviceIds: string[];
  offlineDeviceIds: string[];
  returnedDeviceIds: string[];
  changedDeviceIds: string[];
  labelChangedDeviceIds: string[];
  statusChangedDeviceIds: string[];
  trustChangedDeviceIds: string[];
}

export type NetworkAlertStatus = "unread" | "read";

export type NetworkNotificationCapability =
  | "available"
  | "permission-required"
  | "unavailable"
  | "unsupported-platform";

export type NetworkHealthGrade = "Excellent" | "Good" | "Watch" | "Degraded" | "Critical";

export type DiagnosticProbeStatus = "passed" | "failed" | "unavailable" | "not-run";

export interface DiagnosticProbeResult {
  key: "gateway" | "internet" | "dns" | "jitter" | "packet-loss" | "throughput";
  label: string;
  status: DiagnosticProbeStatus;
  latencyMs?: number;
  value?: string;
  samples?: number[];
  detail: string;
  measuredAt: string;
  provider?: string;
}

export type SpeedTestMode = "internet" | "custom-endpoint" | "local-agent";
export type SpeedTestPhaseName = "preparing" | "latency" | "download" | "upload" | "complete" | "failed";

export interface SpeedTestConfig {
  mode: SpeedTestMode;
  provider: string;
  latencyUrl: string;
  downloadUrl: string;
  uploadUrl?: string;
  timeoutMs: number;
  downloadDurationMs: number;
  uploadBytes?: number;
  latencySampleCount?: number;
  environmentNotes?: string;
}

export interface ThroughputSample {
  phase: "download" | "upload";
  timestamp: string;
  bytesTransferred: number;
  elapsedMs: number;
  mbps: number;
}

export interface SpeedTestPhase {
  name: SpeedTestPhaseName;
  startedAt: string;
  completedAt: string;
  elapsedMs: number;
  success: boolean;
}

export interface SpeedTestResult {
  id: string;
  startedAt: string;
  completedAt: string;
  mode: SpeedTestMode;
  provider: string;
  source: string;
  downloadMbps: number;
  uploadMbps: number | null;
  latencyMs: number;
  jitterMs: number;
  testBytesDownloaded: number;
  testBytesUploaded: number;
  sampleCount: number;
  success: boolean;
  failureReason?: string;
  phases: SpeedTestPhase[];
  samples: ThroughputSample[];
  environmentNotes: string;
}

export interface NetworkHealthFactor {
  id: string;
  label: string;
  impact: number;
  severity: InsightSeverity;
  detail: string;
}

export interface NetworkHealthSnapshot {
  id: string;
  timestamp: string;
  score: number;
  grade: NetworkHealthGrade;
  headline: string;
  factors: NetworkHealthFactor[];
  diagnostics: DiagnosticProbeResult[];
  trend: "improving" | "stable" | "declining" | "unknown";
  source: "scan" | "diagnostic" | "manual";
}

export type NetworkAssistantIntent =
  | "explain-network"
  | "summarize-changes"
  | "suspicious-device"
  | "diagnose-slow-network"
  | "scan-status"
  | "device-identity-question"
  | "monitoring-status";

export interface NetworkAssistantContext {
  generatedAt: string;
  intent: NetworkAssistantIntent;
  status: {
    networkName: string;
    gatewayIp: string;
    localIp: string;
    scanState: ScanState;
    devicesFound: number;
    onlineDevices: number;
    unknownDevices: number;
    flaggedDevices: number;
    lastScanAt: string | null;
  } | null;
  latestScan: ScanComparisonSummary | null;
  health: Pick<NetworkHealthSnapshot, "score" | "grade" | "headline" | "trend"> & {
    topFactors: string[];
    diagnostics: string[];
  } | null;
  unknownDevices: Array<Pick<DiscoveredDevice, "id" | "name" | "ipAddress" | "deviceType" | "trustLevel">>;
  watchDevices: Array<Pick<DiscoveredDevice, "id" | "name" | "ipAddress" | "deviceType" | "trustLevel">>;
  offlineDevices: Array<Pick<DiscoveredDevice, "id" | "name" | "ipAddress" | "deviceType" | "trustLevel">>;
  recentEvents: Array<Pick<NetworkEvent, "id" | "timestamp" | "type" | "severity" | "title" | "relatedDeviceId">>;
  alerts: Array<Pick<NetworkAlert, "id" | "timestamp" | "title" | "severity" | "status" | "relatedDeviceId">>;
  router: {
    name: string;
    gatewayIp: string;
    controlMode: RouterControlMode;
    readOnlyMode: boolean;
    capabilities: Array<Pick<RouterCapability, "key" | "label" | "status" | "supported">>;
  } | null;
  monitoring: Pick<NetworkMonitorState, "enabled" | "nextRunAt" | "schedulerStatus" | "backgroundCapability" | "notificationCapability">;
}

export interface NetworkAssistantSnapshot {
  status: NetworkStatus | null;
  devices: DiscoveredDevice[];
  routerStatus: RouterStatus | null;
  routerCapabilities: RouterCapability[];
  routerControlMode: RouterControlMode;
}

export interface NetworkAlert {
  id: string;
  timestamp: string;
  eventId: string;
  title: string;
  message: string;
  severity: InsightSeverity;
  status: NetworkAlertStatus;
  relatedDeviceId?: string;
  notificationStatus: "sent" | "in-app-only" | "failed";
  notificationReason?: string;
}

export interface NetworkMonitorState {
  enabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastCompletedAt: string | null;
  lastIssue: string | null;
  schedulerStatus: "idle" | "scheduled" | "running" | "paused" | "error";
  backgroundCapability: "in-app-only" | "workmanager-unavailable";
  notificationCapability: NetworkNotificationCapability;
}

export interface DeviceIdentitySnapshot {
  name: string;
  hostname: string;
  ipAddress: string;
  macAddress: string;
  vendor: string;
  deviceType: DeviceType;
  discoverySources: DiscoverySource[];
  confidence: DiscoveryConfidence;
  lastScanSource: DiscoverySource;
  capturedAt: string;
}

export interface DeviceIdentityRecord {
  stableKey: string;
  matchKeys: string[];
  matchKeyType: DeviceIdentityMatchType;
  rawDeviceIds: string[];
  customName: string;
  room: string;
  ownerLabel: string;
  trustedState: DeviceIdentityTrustState;
  watchState: boolean;
  requestedBlockState: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  seenCount: number;
  notes: string;
  identityConfidence: DeviceIdentityConfidence;
  manuallyVerified: boolean;
  dismissedForNow: boolean;
  lastChangedAt: string;
  lastChangedFields: string[];
  rawIdentitySnapshot: DeviceIdentitySnapshot;
}

export type DeviceIdentityUpdate = Partial<
  Pick<
    DeviceIdentityRecord,
    | "customName"
    | "room"
    | "ownerLabel"
    | "trustedState"
    | "watchState"
    | "requestedBlockState"
    | "notes"
    | "manuallyVerified"
    | "dismissedForNow"
  >
>;

export interface NetworkTopologyPosition {
  x: number;
  y: number;
  z: number;
}

export interface NetworkTopologyNode {
  id: string;
  deviceId: string;
  label: string;
  deviceType: DeviceType;
  status: DeviceStatus;
  trustLevel: TrustLevel;
  role: NetworkTopologyRole;
  position?: NetworkTopologyPosition;
  signalStrength?: number;
  latencyMs?: number;
  isNew?: boolean;
  isFlagged?: boolean;
  isSelected?: boolean;
  services?: string[];
  vendor?: string;
  iconKey?: string;
  identityConfidence?: DeviceIdentityConfidence;
  ownerLabel?: string;
  room?: string;
  manuallyVerified?: boolean;
}

export interface NetworkTopologyEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relation: NetworkTopologyEdgeRelation;
  quality: NetworkTopologyEdgeQuality;
  latencyMs?: number;
  signalStrength?: number;
  animated?: boolean;
  isFlagged?: boolean;
  visibilityState?: "visible" | "dimmed" | "hidden";
}

export interface NetworkTopologyGraph {
  nodes: NetworkTopologyNode[];
  edges: NetworkTopologyEdge[];
  generatedAt: string;
  topologyMode: NetworkTopologyMode;
  relationshipsConfirmed?: boolean;
  summary: {
    gatewayNodeId: string;
    totalNodes: number;
    totalEdges: number;
    flaggedNodes: number;
    unknownNodes: number;
  };
}

export interface NetworkMapFilterState {
  showTrusted: boolean;
  showNew: boolean;
  showWatch: boolean;
  showBlocked: boolean;
  showOffline: boolean;
  showUnknown: boolean;
  showOnlyFlagged: boolean;
}

export interface NetworkMapRuntimeState {
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  focusedNodeId: string | null;
  viewMode: NetworkMapViewMode;
  labelMode: NetworkMapLabelMode;
  autoRotate: boolean;
  showLinks: boolean;
  showParticles: boolean;
  reducedMotion: boolean;
  topologyGraph: NetworkTopologyGraph;
}

export interface RouterStatus {
  name: string;
  model: string;
  gatewayIp: string;
  firmwareVersion: string;
  connectionStatus: "connected" | "disconnected" | "unknown";
  uptime: string;
  wanIp: string;
  dnsServers: string[];
  guestNetworkEnabled: boolean;
  qosEnabled: boolean;
  firewallEnabled: boolean;
  rebootAvailable: boolean;
  readOnlyMode: boolean;
}

export type RouterCapabilityStatus =
  | "available"
  | "unsupported"
  | "requires-connector"
  | "demo-only"
  | "unknown";

export interface RouterCapability {
  key: "reboot" | "toggle-guest" | "toggle-qos" | "refresh-status";
  label: string;
  supported: boolean;
  status: RouterCapabilityStatus;
  reason?: string;
  lastCheckedAt?: string;
}

export type RouterControlMode = "read-only" | "demo" | "connector-backed";

export interface RouterActionResult {
  action: "reboot" | "toggle-guest" | "toggle-qos" | "refresh-status";
  status: "success" | "queued-demo" | "unsupported" | "requires-connector" | "failed";
  message: string;
  timestamp: string;
}

export interface NetworkAction {
  id: string;
  type: ActionType;
  label: string;
  deviceId?: string;
  status: ActionStatus;
  createdAt: string;
  message: string;
}

export interface SecurityInsight {
  id: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  relatedDeviceId?: string;
  recommendedAction: string;
}

export interface ScanHistoryEntry {
  id: string;
  startedAt: string;
  finishedAt: string;
  devicesFound: number;
  newDevices: number;
  offlineDevices: number;
  flaggedDevices: number;
  durationMs: number;
  scanMode: ScanMode;
}

export interface NetworkSettings {
  scanMode: ScanMode;
  autoScanEnabled: boolean;
  autoScanIntervalMinutes: number;
  notifyNewDevices: boolean;
  notifyOfflineDevices: boolean;
  safeMode: boolean;
  allowControlActions: boolean;
  demoMode: boolean;
}

export interface NetworkAdapterStatus {
  mode: NetworkAdapterMode;
  label: string;
  isDemo: boolean;
  message: string;
}

export interface NetworkAdapterInterface {
  getAdapterStatus(): Promise<NetworkAdapterStatus>;
  getNetworkStatus(): Promise<NetworkStatus>;
  startNetworkScan(mode: ScanMode): Promise<void>;
  stopNetworkScan(): Promise<void>;
  getDiscoveredDevices(): Promise<DiscoveredDevice[]>;
  getDeviceDetails(deviceId: string): Promise<DiscoveredDevice | null>;
  getRouterStatus(): Promise<RouterStatus>;
  getRouterCapabilities(): Promise<RouterCapability[]>;
  getRouterControlMode(): Promise<RouterControlMode>;
  executeRouterAction(
    action: RouterActionResult["action"],
    payload?: { enabled?: boolean }
  ): Promise<RouterActionResult>;
  runNetworkAction(action: Omit<NetworkAction, "id" | "createdAt" | "status">): Promise<NetworkAction>;
  getActionHistory(): Promise<NetworkAction[]>;
  getScanHistory(): Promise<ScanHistoryEntry[]>;
  saveDeviceNote(deviceId: string, note: string): Promise<void>;
  updateNetworkSettings(settings: Partial<NetworkSettings>): Promise<NetworkSettings>;
  getNetworkSettings(): Promise<NetworkSettings>;
  getSecurityInsights(): Promise<SecurityInsight[]>;
  getNetworkTopology(): Promise<NetworkTopologyGraph>;
  getTopologySummary(): Promise<NetworkTopologyGraph["summary"]>;
  getScanProgress(): number;
  getIsScanning(): boolean;
}
