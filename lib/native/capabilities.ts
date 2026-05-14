"use client"

import type { CapabilityId, CapabilityState } from "@/lib/types"

export type CapabilityPlatform = "web" | "android" | "ios" | "unknown"

export type CapabilitySnapshot = Record<CapabilityId, CapabilityState>

export interface CapabilityStatus {
  platform: CapabilityPlatform
  states: CapabilitySnapshot
  networkConnected: boolean | null
}

const DEFAULT_STATES: CapabilitySnapshot = {
  microphone: "unknown",
  notifications: "unknown",
  storage: "unknown",
  bluetooth: "unavailable",
  network: "unknown",
}

function permissionToState(value: string | undefined): CapabilityState {
  if (value === "granted") return "granted"
  if (value === "denied") return "denied"
  if (value === "prompt" || value === "prompt-with-rationale") return "unknown"
  return "unknown"
}

async function getPlatform(): Promise<CapabilityPlatform> {
  if (typeof window === "undefined") return "unknown"
  try {
    const { Capacitor } = await import("@capacitor/core")
    if (!Capacitor.isNativePlatform()) return "web"
    const platform = Capacitor.getPlatform()
    if (platform === "android" || platform === "ios") return platform
    return "unknown"
  } catch {
    return "web"
  }
}

async function checkMicrophone(): Promise<CapabilityState> {
  if (typeof navigator === "undefined") return "unavailable"
  if (!navigator.mediaDevices?.getUserMedia) return "unavailable"
  try {
    const permissions = navigator.permissions
    if (!permissions?.query) return "unknown"
    const result = await permissions.query({ name: "microphone" as PermissionName })
    return result.state === "granted"
      ? "granted"
      : result.state === "denied"
        ? "denied"
        : "unknown"
  } catch {
    return "unknown"
  }
}

async function requestMicrophone(): Promise<CapabilityState> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return "unavailable"
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((track) => track.stop())
    return "granted"
  } catch {
    return "denied"
  }
}

async function checkNotifications(platform: CapabilityPlatform): Promise<CapabilityState> {
  if (platform === "android") {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications")
      const status = await LocalNotifications.checkPermissions()
      return permissionToState(status.display)
    } catch {
      return "unavailable"
    }
  }

  if (typeof window === "undefined" || !("Notification" in window)) return "unavailable"
  return Notification.permission === "granted"
    ? "granted"
    : Notification.permission === "denied"
      ? "denied"
      : "unknown"
}

async function requestNotifications(platform: CapabilityPlatform): Promise<CapabilityState> {
  if (platform === "android") {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications")
      const status = await LocalNotifications.requestPermissions()
      return permissionToState(status.display)
    } catch {
      return "unavailable"
    }
  }

  if (typeof window === "undefined" || !("Notification" in window)) return "unavailable"
  const result = await Notification.requestPermission()
  return result === "granted" ? "granted" : "denied"
}

async function checkStorage(platform: CapabilityPlatform): Promise<CapabilityState> {
  if (platform === "android") {
    try {
      const { Filesystem, Directory } = await import("@capacitor/filesystem")
      await Filesystem.stat({ path: "", directory: Directory.Documents })
      return "granted"
    } catch {
      return "unknown"
    }
  }

  if (typeof window === "undefined") return "unavailable"
  return typeof Blob !== "undefined" && "URL" in window ? "granted" : "unavailable"
}

async function requestStorage(platform: CapabilityPlatform): Promise<CapabilityState> {
  if (platform === "android") {
    try {
      const { Filesystem, Directory } = await import("@capacitor/filesystem")
      const path = "neo-permission-check.txt"
      await Filesystem.writeFile({
        path,
        data: "NEO permission check",
        directory: Directory.Documents,
      })
      await Filesystem.deleteFile({ path, directory: Directory.Documents })
      return "granted"
    } catch {
      return "denied"
    }
  }
  return checkStorage(platform)
}

async function checkNetwork(): Promise<{ state: CapabilityState; connected: boolean | null }> {
  if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
    try {
      const { Network } = await import("@capacitor/network")
      const status = await Network.getStatus()
      return { state: status.connected ? "granted" : "denied", connected: status.connected }
    } catch {
      return {
        state: navigator.onLine ? "granted" : "denied",
        connected: navigator.onLine,
      }
    }
  }
  return { state: "unknown", connected: null }
}

export async function checkCapabilities(): Promise<CapabilityStatus> {
  const platform = await getPlatform()
  const states: CapabilitySnapshot = { ...DEFAULT_STATES }
  states.microphone = await checkMicrophone()
  states.notifications = await checkNotifications(platform)
  states.storage = await checkStorage(platform)
  states.bluetooth = "unavailable"
  const network = await checkNetwork()
  states.network = network.state
  return { platform, states, networkConnected: network.connected }
}

export async function requestCapability(id: CapabilityId): Promise<CapabilityState> {
  const platform = await getPlatform()
  if (id === "microphone") return requestMicrophone()
  if (id === "notifications") return requestNotifications(platform)
  if (id === "storage") return requestStorage(platform)
  if (id === "network") return (await checkNetwork()).state
  return "unavailable"
}
