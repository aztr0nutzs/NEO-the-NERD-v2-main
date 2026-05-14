/**
 * N.E.O. the N.E.R.D. - Network Discovery + Control Feature
 * Network Action Helpers
 *
 * Helper functions for creating and managing network actions.
 * These wrap the adapter layer for common UI operations.
 */

import type {
  NetworkAction,
  ActionType,
  DiscoveredDevice,
  ScanMode,
} from "./types";
import { networkAdapter } from "./networkDiscoveryAdapter";

function toActionStatus(resultStatus: "success" | "queued-demo" | "unsupported" | "requires-connector" | "failed"): NetworkAction["status"] {
  if (resultStatus === "success") return "success";
  if (resultStatus === "queued-demo") return "queued";
  return "failed";
}

/**
 * Create a scan action
 */
export async function createScanAction(mode: ScanMode): Promise<NetworkAction> {
  return networkAdapter.runNetworkAction({
    type: "scan",
    label: `Network Scan (${mode})`,
    message: `Starting ${mode} network scan...`,
  });
}

/**
 * Create a device trust action
 */
export async function trustDevice(device: DiscoveredDevice): Promise<NetworkAction> {
  return networkAdapter.runNetworkAction({
    type: "trust",
    label: `Trust ${device.name}`,
    deviceId: device.id,
    message: `Marking ${device.name} as trusted device`,
  });
}

/**
 * Create a device watch action
 */
export async function watchDevice(device: DiscoveredDevice): Promise<NetworkAction> {
  return networkAdapter.runNetworkAction({
    type: "watch",
    label: `Watch ${device.name}`,
    deviceId: device.id,
    message: `Adding ${device.name} to watch list`,
  });
}

/**
 * Create a device block action
 */
export async function blockDevice(device: DiscoveredDevice): Promise<NetworkAction> {
  return networkAdapter.runNetworkAction({
    type: "block",
    label: `Block ${device.name}`,
    deviceId: device.id,
    message: `Blocking ${device.name} from network access`,
  });
}

/**
 * Create a wake device action (Wake-on-LAN)
 */
export async function wakeDevice(device: DiscoveredDevice): Promise<NetworkAction> {
  return networkAdapter.runNetworkAction({
    type: "wake",
    label: `Wake ${device.name}`,
    deviceId: device.id,
    message: `Sending Wake-on-LAN packet to ${device.macAddress}`,
  });
}

/**
 * Create an identify device action
 */
export async function identifyDevice(device: DiscoveredDevice): Promise<NetworkAction> {
  return networkAdapter.runNetworkAction({
    type: "identify",
    label: `Identify ${device.name}`,
    deviceId: device.id,
    message: `Probing ${device.ipAddress} for identification`,
  });
}

/**
 * Create a rename device action
 */
export async function renameDevice(
  device: DiscoveredDevice,
  newName: string
): Promise<NetworkAction> {
  return networkAdapter.runNetworkAction({
    type: "rename",
    label: `Rename to ${newName}`,
    deviceId: device.id,
    message: `Renaming device from ${device.name} to ${newName}`,
  });
}

/**
 * Create a note action
 */
export async function addDeviceNote(
  device: DiscoveredDevice,
  note: string
): Promise<NetworkAction> {
  await networkAdapter.saveDeviceNote(device.id, note);
  return networkAdapter.runNetworkAction({
    type: "note",
    label: `Note added`,
    deviceId: device.id,
    message: `Added note to ${device.name}`,
  });
}

/**
 * Create a router reboot action
 */
export async function rebootRouter(): Promise<NetworkAction> {
  const result = await networkAdapter.executeRouterAction("reboot");
  return {
    id: `router-reboot-${Date.now()}`,
    createdAt: result.timestamp,
    status: toActionStatus(result.status),
    type: "router_reboot",
    label: "Reboot Router",
    message: `[${result.status.toUpperCase()}] ${result.message}`,
  };
}

/**
 * Toggle guest network action
 */
export async function toggleGuestNetwork(enable: boolean): Promise<NetworkAction> {
  const result = await networkAdapter.executeRouterAction("toggle-guest", { enabled: enable });
  return {
    id: `router-guest-${Date.now()}`,
    createdAt: result.timestamp,
    status: toActionStatus(result.status),
    type: "toggle_guest",
    label: enable ? "Enable Guest Network" : "Disable Guest Network",
    message: `[${result.status.toUpperCase()}] ${result.message}`,
  };
}

/**
 * Toggle QoS action
 */
export async function toggleQoS(enable: boolean): Promise<NetworkAction> {
  const result = await networkAdapter.executeRouterAction("toggle-qos", { enabled: enable });
  return {
    id: `router-qos-${Date.now()}`,
    createdAt: result.timestamp,
    status: toActionStatus(result.status),
    type: "toggle_qos",
    label: enable ? "Enable QoS" : "Disable QoS",
    message: `[${result.status.toUpperCase()}] ${result.message}`,
  };
}

/**
 * Get action type icon name (for lucide-react)
 */
export function getActionTypeIcon(type: ActionType): string {
  const icons: Record<ActionType, string> = {
    scan: "Radar",
    identify: "Search",
    rename: "Edit",
    trust: "ShieldCheck",
    watch: "Eye",
    block: "Ban",
    wake: "Power",
    router_reboot: "RefreshCcw",
    toggle_guest: "Wifi",
    toggle_qos: "Activity",
    note: "StickyNote",
  };
  return icons[type];
}

/**
 * Get action status color class
 */
export function getActionStatusColor(status: NetworkAction["status"]): string {
  const colors: Record<NetworkAction["status"], string> = {
    queued: "text-yellow-400",
    running: "text-cyan-400",
    success: "text-emerald-400",
    failed: "text-red-400",
  };
  return colors[status];
}
