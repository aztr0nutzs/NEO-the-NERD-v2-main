"use client"

import { useEffect, useState } from "react"
import {
  checkBackendAvailability,
  type BackendHealthSnapshot,
} from "@/lib/runtime/backend-health"
import {
  detectRuntimeEnvironment,
  type RuntimeEnvironment,
} from "@/lib/runtime/runtime-environment"

export interface BackendRuntimeStatus {
  environment: RuntimeEnvironment | null
  health: BackendHealthSnapshot | null
  /** UI-friendly label for the engine row (TTS / VOICE ENGINE). */
  engineLabel: string
  /** Hex color for the badge to match existing palette. */
  engineLabelColor: string
  /** Compact label for the chat AI status pill: "CONNECTED" / "LOCAL FALLBACK" / "BACKEND UNAVAILABLE". */
  aiStatusLabel: string
  /** Hex color matching the AI status label for the chat pill. */
  aiStatusColor: string
  /** True when the active path is the in-browser local response engine. */
  fallbackActive: boolean
  refresh: () => void
}

const COLOR_GREEN = "#39ff14"
const COLOR_ORANGE = "#ff7a00"
const COLOR_PINK = "#ff2d9c"

function deriveEngineLabel(
  env: RuntimeEnvironment | null,
  health: BackendHealthSnapshot | null,
): { label: string; color: string; fallbackActive: boolean } {
  if (!env || !health) {
    return { label: "DETECTING", color: COLOR_ORANGE, fallbackActive: false }
  }

  if (health.state === "available" && health.providerStatus?.providerConfigured) {
    return {
      label: env.nativeRuntime ? "REMOTE PROVIDER" : "PROVIDER READY",
      color: COLOR_GREEN,
      fallbackActive: false,
    }
  }

  if (health.state === "available" || health.state === "available-no-provider") {
    return { label: "BROWSER + LOCAL ENGINE", color: COLOR_ORANGE, fallbackActive: false }
  }

  if (health.state === "unavailable-by-config") {
    return { label: "LOCAL ENGINE ONLY", color: COLOR_ORANGE, fallbackActive: true }
  }

  if (health.state === "unreachable") {
    return { label: "BACKEND UNREACHABLE", color: COLOR_PINK, fallbackActive: true }
  }

  return { label: "DETECTING", color: COLOR_ORANGE, fallbackActive: false }
}

function deriveAiStatus(
  health: BackendHealthSnapshot | null,
): { label: string; color: string } {
  if (!health) return { label: "DETECTING", color: COLOR_ORANGE }
  if (health.state === "available" && health.providerStatus?.providerConfigured) {
    return { label: "CONNECTED", color: COLOR_GREEN }
  }
  if (health.state === "available" || health.state === "available-no-provider") {
    return { label: "LOCAL FALLBACK", color: COLOR_ORANGE }
  }
  if (health.state === "unavailable-by-config") {
    return { label: "LOCAL FALLBACK", color: COLOR_ORANGE }
  }
  if (health.state === "unreachable") {
    return { label: "BACKEND UNAVAILABLE", color: COLOR_PINK }
  }
  return { label: "DETECTING", color: COLOR_ORANGE }
}

export function useBackendRuntime(): BackendRuntimeStatus {
  const [environment, setEnvironment] = useState<RuntimeEnvironment | null>(null)
  const [health, setHealth] = useState<BackendHealthSnapshot | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    detectRuntimeEnvironment().then((env) => {
      if (!cancelled) setEnvironment(env)
    })
    checkBackendAvailability().then((snapshot) => {
      if (!cancelled) setHealth(snapshot)
    })
    return () => {
      cancelled = true
    }
  }, [version])

  const derived = deriveEngineLabel(environment, health)
  const ai = deriveAiStatus(health)

  return {
    environment,
    health,
    engineLabel: derived.label,
    engineLabelColor: derived.color,
    aiStatusLabel: ai.label,
    aiStatusColor: ai.color,
    fallbackActive: derived.fallbackActive,
    refresh: () => setVersion((v) => v + 1),
  }
}
