"use client"

import { useEffect, useState } from "react"
import { Capacitor } from "@capacitor/core"
import { getBackendConfigSync } from "@/lib/runtime/backend-config"

type RuntimeMode = "provider-online" | "offline-fallback" | "demo-preview"

interface ChipSpec {
  label: string
  detail: string
  color: string
  bg: string
  border: string
}

/**
 * Single-source-of-truth chip describing what the app can actually do for the
 * user right now. Source the value from the synchronous backend-config
 * resolver + Capacitor's platform detection — no network probes, no async.
 *
 *   - PROVIDER · ONLINE     → a backend is configured (same-origin or remote)
 *   - OFFLINE · LOCAL FALLBACK → native Android runtime with no backend env
 *   - DEMO PREVIEW          → browser preview with no backend configured
 */
export function RuntimeModeChip() {
  const [mode, setMode] = useState<RuntimeMode>(() => resolveModeSync())

  useEffect(() => {
    // Re-resolve once on mount — the cached config may have flipped between
    // the SSR snapshot and the hydrated runtime (Capacitor detection only
    // reliably reports the native flag after the platform script attaches).
    setMode(resolveModeSync())
  }, [])

  const spec = chipSpec(mode)
  return (
    <span
      className="ps-mono inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] tracking-[0.22em] whitespace-nowrap"
      style={{
        color: spec.color,
        background: spec.bg,
        boxShadow: `inset 0 0 0 1px ${spec.border}`,
        textShadow: `0 0 6px ${spec.color}`,
      }}
      title={spec.detail}
      aria-label={`Runtime mode: ${spec.label}. ${spec.detail}`}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: spec.color, boxShadow: `0 0 6px ${spec.color}` }}
      />
      {spec.label}
    </span>
  )
}

function resolveModeSync(): RuntimeMode {
  const config = getBackendConfigSync()
  const isNative = typeof Capacitor?.getPlatform === "function" && Capacitor.getPlatform() !== "web"

  if (config.mode === "remote" || config.mode === "same-origin") return "provider-online"
  if (isNative) return "offline-fallback"
  return "demo-preview"
}

function chipSpec(mode: RuntimeMode): ChipSpec {
  switch (mode) {
    case "provider-online":
      return {
        label: "PROVIDER · ONLINE",
        detail:
          "Remote backend is configured — neural TTS, smart assistant, and provider TTS are all reachable.",
        color: "#00f0ff",
        bg: "rgba(0,240,255,0.10)",
        border: "rgba(0,240,255,0.55)",
      }
    case "offline-fallback":
      return {
        label: "OFFLINE · LOCAL FALLBACK",
        detail:
          "No remote backend is configured. Voice plays through the device's text-to-speech engine; chat uses the on-device fallback.",
        color: "#ffd700",
        bg: "rgba(255,215,0,0.10)",
        border: "rgba(255,215,0,0.55)",
      }
    case "demo-preview":
      return {
        label: "DEMO PREVIEW",
        detail:
          "Browser preview. Network discovery returns simulated data; provider voices/chat require either an installed Android app or a configured backend.",
        color: "#ff2d9c",
        bg: "rgba(255,45,156,0.10)",
        border: "rgba(255,45,156,0.55)",
      }
  }
}
