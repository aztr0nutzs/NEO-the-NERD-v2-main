import type { RobotSource } from "@/lib/types"

export type RobotAssetStatus = "available" | "missing" | "unavailable" | "checking"

export interface RobotAssetDefinition {
  source: RobotSource
  path: "/robot.png" | "/robot.gif" | "/robot.mp4" | "/robot.json" | "/robot-sprite.png"
  label: string
  kind: "image" | "gif" | "video" | "lottie" | "sprite"
}

export const ROBOT_SPRITE_FRAMES = 8

export const ROBOT_ASSETS: Record<RobotSource, RobotAssetDefinition> = {
  image: {
    source: "image",
    path: "/robot.png",
    label: "IMAGE",
    kind: "image",
  },
  gif: {
    source: "gif",
    path: "/robot.gif",
    label: "GIF",
    kind: "gif",
  },
  mp4: {
    source: "mp4",
    path: "/robot.mp4",
    label: "MP4",
    kind: "video",
  },
  lottie: {
    source: "lottie",
    path: "/robot.json",
    label: "LOTTIE",
    kind: "lottie",
  },
  sprite: {
    source: "sprite",
    path: "/robot-sprite.png",
    label: "SPRITE",
    kind: "sprite",
  },
}

const assetAvailability = new Map<string, boolean>()

export function getRobotAsset(source: RobotSource) {
  return ROBOT_ASSETS[source]
}

export async function validateRobotAsset(source: RobotSource) {
  if (typeof window === "undefined") return false
  const asset = ROBOT_ASSETS[source]
  const cached = assetAvailability.get(asset.path)
  if (typeof cached === "boolean") return cached

  try {
    const response = await fetch(asset.path, {
      method: "HEAD",
      cache: "no-store",
    })
    const available = response.ok
    assetAvailability.set(asset.path, available)
    return available
  } catch {
    try {
      const response = await fetch(asset.path, {
        method: "GET",
        cache: "no-store",
        headers: { Range: "bytes=0-0" },
      })
      const available = response.ok
      assetAvailability.set(asset.path, available)
      return available
    } catch {
      assetAvailability.set(asset.path, false)
      return false
    }
  }
}

export async function validateAllRobotAssets() {
  const entries = await Promise.all(
    (Object.keys(ROBOT_ASSETS) as RobotSource[]).map(async (source) => [
      source,
      (await validateRobotAsset(source)) ? "available" : "missing",
    ]),
  )
  return Object.fromEntries(entries) as Record<RobotSource, RobotAssetStatus>
}
