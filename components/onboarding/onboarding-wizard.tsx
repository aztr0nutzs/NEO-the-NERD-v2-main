"use client"

import { AnimatePresence, motion } from "framer-motion"
import {
  Bell,
  Bot,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Mic,
  Palette,
  Play,
  Radar,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
  Wifi,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import type { CapabilityId, CapabilityState } from "@/lib/types"
import { useApp } from "@/lib/store"
import { PERSONALITIES, VOICES } from "@/lib/data"
import { networkAdapter } from "@/lib/network/networkDiscoveryAdapter"
import { isAndroidNativeNetworkPluginAvailable } from "@/lib/network/native-network-bridge"
import { NeonPanel } from "../neon-panel"

type StepId =
  | "welcome"
  | "personality"
  | "voice"
  | "network"
  | "demo-vs-live"
  | "permissions"
  | "first-scan"
  | "review-unknown"
  | "monitoring"
  | "complete"

const STEP_ORDER: StepId[] = [
  "welcome",
  "personality",
  "voice",
  "network",
  "demo-vs-live",
  "permissions",
  "first-scan",
  "review-unknown",
  "monitoring",
  "complete",
]

const ACCENT_PALETTE = ["cyan", "purple", "pink", "green", "orange"] as const
type Accent = (typeof ACCENT_PALETTE)[number]
const ACCENT_HEX: Record<Accent, string> = {
  cyan: "#00f0ff",
  purple: "#b829ff",
  pink: "#ff2d9c",
  green: "#39ff14",
  orange: "#ff7a00",
}

interface OnboardingWizardProps {
  open: boolean
  onClose: () => void
  /** When true, the wizard cannot be skipped via close (used in true first-run). */
  initial?: boolean
}

export function OnboardingWizard({ open, onClose, initial = false }: OnboardingWizardProps) {
  const {
    setAccentColor,
    accentColor,
    setPersonalityId,
    personalityId,
    setVoiceId,
    voiceId,
    settings,
    updateSettings,
    requestPermission,
    capabilityPlatform,
    networkConnected,
    networkAssistantSnapshot,
    persistedNetworkSettings,
    setPersistedNetworkSettings,
  } = useApp()

  const [stepIndex, setStepIndex] = useState(0)
  const [nativeLive, setNativeLive] = useState<boolean | null>(null)
  const [scanRequested, setScanRequested] = useState(false)
  const [scanStartError, setScanStartError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setStepIndex(0)
    setScanRequested(false)
    setScanStartError(null)
  }, [open])

  useEffect(() => {
    let cancelled = false
    if (!open) return
    isAndroidNativeNetworkPluginAvailable()
      .then((available) => {
        if (!cancelled) setNativeLive(available)
      })
      .catch(() => {
        if (!cancelled) setNativeLive(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const currentStep = STEP_ORDER[stepIndex]
  const totalSteps = STEP_ORDER.length

  const goNext = useCallback(() => {
    setStepIndex((index) => Math.min(index + 1, STEP_ORDER.length - 1))
  }, [])

  const goBack = useCallback(() => {
    setStepIndex((index) => Math.max(index - 1, 0))
  }, [])

  const finish = useCallback(
    (skipped: boolean) => {
      updateSettings({
        onboarding: {
          ...settings.onboarding,
          completed: true,
          skipped,
          completedAt: new Date().toISOString(),
        },
      })
      onClose()
    },
    [onClose, settings.onboarding, updateSettings],
  )

  const liveScanAvailable = nativeLive === true
  const adapterDemoMode = persistedNetworkSettings?.demoMode ?? true

  const unknownDevices = useMemo(
    () =>
      networkAssistantSnapshot?.devices.filter(
        (device) =>
          device.trustLevel === "new" ||
          device.deviceType === "unknown" ||
          device.isNewIdentity,
      ) ?? [],
    [networkAssistantSnapshot],
  )

  const handleRunFirstScan = useCallback(async () => {
    setScanStartError(null)
    setScanRequested(true)
    updateSettings({
      onboarding: { ...settings.onboarding, initialScanRequested: true },
    })
    try {
      const baseSettings = persistedNetworkSettings ?? {
        scanMode: "balanced" as const,
        autoScanEnabled: false,
        autoScanIntervalMinutes: 30,
        notifyNewDevices: true,
        notifyOfflineDevices: false,
        safeMode: true,
        allowControlActions: false,
        demoMode: !liveScanAvailable,
      }
      if (liveScanAvailable && baseSettings.demoMode) {
        const updated = { ...baseSettings, demoMode: false }
        setPersistedNetworkSettings(updated)
      }
      await networkAdapter.startNetworkScan(baseSettings.scanMode ?? "balanced")
    } catch (error) {
      setScanStartError(
        error instanceof Error ? error.message : "Network scan failed to start.",
      )
    }
  }, [
    liveScanAvailable,
    persistedNetworkSettings,
    setPersistedNetworkSettings,
    settings.onboarding,
    updateSettings,
  ])

  const enableMonitoring = useCallback(
    (enabled: boolean) => {
      updateSettings({
        onboarding: {
          ...settings.onboarding,
          monitoringOptIn: enabled,
        },
      })
      if (enabled && persistedNetworkSettings) {
        setPersistedNetworkSettings({
          ...persistedNetworkSettings,
          autoScanEnabled: true,
          notifyNewDevices: true,
        })
      }
    },
    [persistedNetworkSettings, setPersistedNetworkSettings, settings.onboarding, updateSettings],
  )

  if (!open || typeof document === "undefined") return null

  const stepHeader = STEP_LABELS[currentStep]

  return createPortal(
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/85 px-3 py-5 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="neo-onboarding-title"
    >
      {/* Background scanlines mesh for depth */}
      <div className="pointer-events-none absolute inset-0 ps-scanlines opacity-30" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 18, filter: "blur(8px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative flex max-h-[94dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl"
      >
        <NeonPanel accent="cyan" glow="strong" scanlines className="flex max-h-[94dvh] flex-col">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div className="min-w-0">
              <p className="ps-mono text-[10px] tracking-[0.35em] ps-text-cyan">
                NEO // FIRST_BOOT_SEQUENCE
              </p>
              <h2
                id="neo-onboarding-title"
                className="ps-heading text-xl leading-tight text-white"
              >
                {stepHeader.title}
              </h2>
            </div>
            {!initial && (
              <button
                type="button"
                onClick={() => finish(true)}
                aria-label="Skip onboarding"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/70 hover:text-white"
                style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)" }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-2.5">
            <div className="flex flex-wrap gap-1.5">
              {STEP_ORDER.map((id, index) => {
                const active = index === stepIndex
                const done = index < stepIndex
                return (
                  <span
                    key={id}
                    aria-hidden="true"
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: active ? 28 : 10,
                      background: done || active ? "#00f0ff" : "rgba(255,255,255,0.18)",
                      boxShadow: active ? "0 0 10px #00f0ff" : "none",
                    }}
                  />
                )
              })}
            </div>
            <p className="ps-mono text-[10px] tracking-[0.25em] text-white/55">
              {String(stepIndex + 1).padStart(2, "0")} / {String(totalSteps).padStart(2, "0")}
            </p>
          </div>

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
                className="space-y-4"
              >
                {currentStep === "welcome" && <StepWelcome />}
                {currentStep === "personality" && (
                  <StepPersonality
                    accentColor={accentColor}
                    setAccentColor={setAccentColor}
                    personalityId={personalityId}
                    setPersonalityId={setPersonalityId}
                  />
                )}
                {currentStep === "voice" && (
                  <StepVoice voiceId={voiceId} setVoiceId={setVoiceId} />
                )}
                {currentStep === "network" && <StepNetwork />}
                {currentStep === "demo-vs-live" && (
                  <StepDemoVsLive
                    liveScanAvailable={liveScanAvailable}
                    capabilityPlatform={capabilityPlatform}
                    adapterDemoMode={adapterDemoMode}
                  />
                )}
                {currentStep === "permissions" && (
                  <StepPermissions
                    permissions={settings.permissions}
                    request={requestPermission}
                    networkConnected={networkConnected}
                  />
                )}
                {currentStep === "first-scan" && (
                  <StepFirstScan
                    liveScanAvailable={liveScanAvailable}
                    scanRequested={scanRequested}
                    scanStartError={scanStartError}
                    onRunScan={handleRunFirstScan}
                  />
                )}
                {currentStep === "review-unknown" && (
                  <StepReviewUnknown
                    unknownCount={unknownDevices.length}
                    firstUnknownName={unknownDevices[0]?.name}
                  />
                )}
                {currentStep === "monitoring" && (
                  <StepMonitoring
                    enabled={settings.onboarding.monitoringOptIn}
                    onChange={enableMonitoring}
                  />
                )}
                {currentStep === "complete" && <StepComplete />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 border-t border-white/10 bg-black/50 px-4 py-3">
            <button
              type="button"
              onClick={goBack}
              disabled={stepIndex === 0}
              className="flex h-10 items-center gap-1.5 rounded-lg px-3 ps-mono text-[10px] tracking-[0.25em] disabled:opacity-30"
              style={{
                color: "#9ad7ff",
                boxShadow: "inset 0 0 0 1px rgba(0,240,255,0.28)",
              }}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              BACK
            </button>
            <div className="flex items-center gap-2">
              {!initial && (
                <button
                  type="button"
                  onClick={() => finish(true)}
                  className="h-10 rounded-lg px-3 ps-mono text-[10px] tracking-[0.25em] text-white/55 hover:text-white/85"
                  style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }}
                >
                  SKIP
                </button>
              )}
              {stepIndex < STEP_ORDER.length - 1 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="flex h-10 items-center gap-1.5 rounded-lg px-4 ps-mono text-[10px] tracking-[0.25em]"
                  style={{
                    color: "#001218",
                    background: "#00f0ff",
                    boxShadow:
                      "0 0 18px rgba(0,240,255,0.55), inset 0 0 0 1px rgba(0,240,255,0.85)",
                  }}
                >
                  NEXT
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => finish(false)}
                  className="flex h-10 items-center gap-1.5 rounded-lg px-4 ps-mono text-[10px] tracking-[0.25em]"
                  style={{
                    color: "#001218",
                    background: "#39ff14",
                    boxShadow:
                      "0 0 20px rgba(57,255,20,0.55), inset 0 0 0 1px rgba(57,255,20,0.85)",
                  }}
                >
                  LAUNCH NEO
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </NeonPanel>
      </motion.div>
    </div>,
    document.body,
  )
}

const STEP_LABELS: Record<StepId, { title: string }> = {
  welcome: { title: "Welcome to N.E.O." },
  personality: { title: "Pick a personality" },
  voice: { title: "Preview a voice" },
  network: { title: "Network Discovery" },
  "demo-vs-live": { title: "Demo vs Live mode" },
  permissions: { title: "Permissions" },
  "first-scan": { title: "Your first scan" },
  "review-unknown": { title: "Review unknown devices" },
  monitoring: { title: "Background monitoring" },
  complete: { title: "All systems nominal" },
}

function StepWelcome() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <FeatureBadge icon={Bot} accent="cyan" />
        <p className="text-[13px] leading-relaxed text-white/85">
          NEO is your cyberpunk companion: a chat assistant, a network watchdog, and a
          playable arcade — all built into one interface. What&apos;s live depends on your
          runtime — the chip on the top bar tells you which mode is active right now.
        </p>
      </div>
      <FeatureList
        items={[
          {
            icon: Sparkles,
            color: "#b829ff",
            title: "Talk + arcade",
            body: "Smart assistant when a remote backend is configured; otherwise an on-device fallback engine answers. Arcade games and persona switching always work locally.",
          },
          {
            icon: Radar,
            color: "#39ff14",
            title: "Network Discovery",
            body: "Live local Wi-Fi scan after the Android app's permission grant. Browser preview shows simulated data so nothing leaves your machine.",
          },
          {
            icon: ShieldCheck,
            color: "#ff7a00",
            title: "Local-first",
            body: "Settings, library, and history live on this device. Nothing is uploaded by default.",
          },
        ]}
      />
      <p className="ps-mono text-[10px] tracking-[0.3em] ps-text-cyan">
        This setup takes about 90 seconds. You can skip and return from Settings.
      </p>
    </div>
  )
}

function StepPersonality({
  accentColor,
  setAccentColor,
  personalityId,
  setPersonalityId,
}: {
  accentColor: Accent
  setAccentColor: (c: Accent) => void
  personalityId: string
  setPersonalityId: (id: string) => void
}) {
  const personality = PERSONALITIES.find((p) => p.id === personalityId) ?? PERSONALITIES[0]
  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-relaxed text-white/85">
        NEO can take on different personas. Each affects tone, humor, and how the
        assistant frames its replies. Pick one to start — you can change it anytime
        on the Personalities screen.
      </p>

      <div>
        <p className="ps-mono mb-2 text-[10px] tracking-[0.3em] text-white/55">
          PERSONALITY
        </p>
        <div className="grid max-h-[36dvh] grid-cols-2 gap-2 overflow-y-auto pr-1">
          {PERSONALITIES.map((option) => {
            const active = option.id === personalityId
            const hex = ACCENT_HEX[option.accent]
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setPersonalityId(option.id)}
                className="flex flex-col items-start gap-1 rounded-lg p-2.5 text-left transition-colors"
                style={{
                  background: active ? `${hex}1f` : "rgba(0,0,0,0.45)",
                  boxShadow: active
                    ? `inset 0 0 0 1px ${hex}, 0 0 16px ${hex}55`
                    : "inset 0 0 0 1px rgba(255,255,255,0.08)",
                }}
              >
                <span
                  className="ps-mono text-[10px] tracking-[0.22em]"
                  style={{ color: hex }}
                >
                  {option.name.toUpperCase()}
                </span>
                <span className="text-[11px] leading-snug text-white/75">
                  {option.description}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="ps-mono mb-2 text-[10px] tracking-[0.3em] text-white/55">
          ACCENT_COLOR
        </p>
        <div className="flex gap-2">
          {ACCENT_PALETTE.map((color) => {
            const hex = ACCENT_HEX[color]
            const active = accentColor === color
            return (
              <button
                key={color}
                type="button"
                onClick={() => setAccentColor(color)}
                aria-label={color}
                aria-pressed={active}
                className="h-9 w-9 rounded-full"
                style={{
                  background: hex,
                  boxShadow: active
                    ? `0 0 0 2px #fff, 0 0 12px ${hex}`
                    : `0 0 0 1px rgba(255,255,255,0.2), 0 0 6px ${hex}66`,
                }}
              />
            )
          })}
        </div>
      </div>

      <div
        className="rounded-lg bg-black/55 p-3"
        style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}
      >
        <p className="ps-mono text-[10px] tracking-[0.22em] text-white/55">SAMPLE</p>
        <p className="mt-1 text-[13px] italic leading-relaxed text-white/90">
          “{personality.sample}”
        </p>
      </div>
    </div>
  )
}

function StepVoice({
  voiceId,
  setVoiceId,
}: {
  voiceId: string
  setVoiceId: (id: string) => void
}) {
  const voice = VOICES.find((v) => v.id === voiceId) ?? VOICES[0]
  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-relaxed text-white/85">
        Pick a default voice for NEO. Tone, pace and pitch are tuned by profile.
        Full per-voice uniqueness requires a configured cloud TTS backend; otherwise
        every profile plays through your device&apos;s text-to-speech engine with the
        profile&apos;s pitch and rate applied on top. The Voices screen banner shows
        which mode is live right now.
      </p>

      <div className="grid max-h-[40dvh] grid-cols-1 gap-2 overflow-y-auto pr-1">
        {VOICES.map((option) => {
          const active = option.id === voiceId
          const hex = ACCENT_HEX[option.accent]
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setVoiceId(option.id)}
              className="flex items-start gap-3 rounded-lg p-2.5 text-left"
              style={{
                background: active ? `${hex}1f` : "rgba(0,0,0,0.45)",
                boxShadow: active
                  ? `inset 0 0 0 1px ${hex}, 0 0 14px ${hex}55`
                  : "inset 0 0 0 1px rgba(255,255,255,0.08)",
              }}
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md"
                style={{
                  background: `${hex}1f`,
                  boxShadow: `inset 0 0 0 1px ${hex}66`,
                }}
              >
                <Mic className="h-4 w-4" style={{ color: hex }} />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className="ps-mono block text-[10px] tracking-[0.22em]"
                  style={{ color: hex }}
                >
                  {option.name.toUpperCase()}
                </span>
                <span className="block text-[11px] leading-snug text-white/75">
                  {option.description}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <p className="ps-mono text-[10px] tracking-[0.25em] text-white/55">
        ACTIVE // {voice.name.toUpperCase()}
      </p>
    </div>
  )
}

function StepNetwork() {
  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-relaxed text-white/85">
        The Network screen is NEO&apos;s mission-control panel for your local Wi-Fi.
        It can:
      </p>
      <FeatureList
        items={[
          {
            icon: Radar,
            color: "#00f0ff",
            title: "Discover devices",
            body: "Scan the local subnet to find phones, laptops, IoT gear, and other devices.",
          },
          {
            icon: ShieldQuestion,
            color: "#ff7a00",
            title: "Flag unknowns",
            body: "Newly seen devices land in a review queue so you decide what is trusted.",
          },
          {
            icon: Wifi,
            color: "#39ff14",
            title: "Track health",
            body: "Watch online/offline transitions, alerts, and the latest scan summary.",
          },
        ]}
      />
      <div
        className="rounded-lg bg-black/55 p-3"
        style={{ boxShadow: "inset 0 0 0 1px rgba(0,240,255,0.25)" }}
      >
        <p className="ps-mono text-[10px] tracking-[0.25em] ps-text-cyan">SAFETY</p>
        <p className="mt-1 text-[12px] leading-snug text-white/80">
          NEO only scans your own LAN. It never performs aggressive probes, port
          floods, or external reconnaissance.
        </p>
      </div>
    </div>
  )
}

function StepDemoVsLive({
  liveScanAvailable,
  capabilityPlatform,
  adapterDemoMode,
}: {
  liveScanAvailable: boolean
  capabilityPlatform: string
  adapterDemoMode: boolean
}) {
  const live = liveScanAvailable
  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-relaxed text-white/85">
        NEO is transparent about what is real. The Network module runs in one of two
        modes depending on your environment:
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <ModePanel
          accent="orange"
          title="DEMO MODE"
          active={!live || adapterDemoMode}
          bullets={[
            "Pre-seeded mock devices",
            "No packets sent to your LAN",
            "Used in browser / preview",
          ]}
        />
        <ModePanel
          accent="green"
          title="LIVE MODE"
          active={live && !adapterDemoMode}
          bullets={[
            "Reads your subnet via the native plugin",
            "Android build, on-device only",
            "Discoveries become real review items",
          ]}
        />
      </div>

      <div
        className="rounded-lg bg-black/55 p-3"
        style={{
          boxShadow: live
            ? "inset 0 0 0 1px rgba(57,255,20,0.4)"
            : "inset 0 0 0 1px rgba(255,122,0,0.4)",
        }}
      >
        <p className="ps-mono text-[10px] tracking-[0.25em] text-white/55">
          DETECTED PLATFORM
        </p>
        <p
          className="mt-1 ps-mono text-[12px] tracking-[0.2em]"
          style={{ color: live ? "#39ff14" : "#ff7a00" }}
        >
          {capabilityPlatform.toUpperCase()}
          {" ·· "}
          {live ? "LIVE DISCOVERY AVAILABLE" : "DEMO MODE WILL BE USED"}
        </p>
        {!live && (
          <p className="mt-1.5 text-[11px] leading-snug text-white/70">
            Live scan needs the Android build with the NeoNetwork plugin. The web
            preview always uses simulated data so nothing leaves your machine.
          </p>
        )}
      </div>
    </div>
  )
}

function StepPermissions({
  permissions,
  request,
  networkConnected,
}: {
  permissions: Record<CapabilityId, CapabilityState>
  request: (id: CapabilityId) => Promise<void>
  networkConnected: boolean | null
}) {
  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-relaxed text-white/85">
        Only what NEO actually needs — and only when you ask for it. You can change
        any of these later from Settings or the OS.
      </p>
      <div className="space-y-2">
        <PermissionRow
          id="notifications"
          icon={Bell}
          color="#b829ff"
          label="Notifications"
          rationale="Alerts when a new device joins or a scan finds an issue. Disabled by default; everything stays in-app without this."
          state={permissions.notifications}
          onRequest={() => request("notifications")}
        />
        <PermissionRow
          id="microphone"
          icon={Mic}
          color="#ff2d9c"
          label="Microphone"
          rationale="Optional. Powers voice dictation on the Chat screen. Audio is never sent over the network from this build."
          state={permissions.microphone}
          onRequest={() => request("microphone")}
        />
        <PermissionRow
          id="network"
          icon={Wifi}
          color="#39ff14"
          label="Network access"
          rationale="Lets NEO confirm whether you are online and lets the live scanner reach your local subnet."
          state={
            permissions.network === "unknown" && networkConnected !== null
              ? networkConnected
                ? "granted"
                : "denied"
              : permissions.network
          }
          onRequest={() => request("network")}
        />
      </div>
      <p className="ps-mono text-[10px] tracking-[0.25em] text-white/45">
        Permissions are evaluated locally. We never request them silently.
      </p>
    </div>
  )
}

function StepFirstScan({
  liveScanAvailable,
  scanRequested,
  scanStartError,
  onRunScan,
}: {
  liveScanAvailable: boolean
  scanRequested: boolean
  scanStartError: string | null
  onRunScan: () => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-relaxed text-white/85">
        Time to populate the Network screen. NEO will sweep the local subnet (or
        seed demo devices when running in the browser) so the rest of the app has
        something to talk about.
      </p>

      <div
        className="rounded-lg bg-black/55 p-3"
        style={{
          boxShadow: liveScanAvailable
            ? "inset 0 0 0 1px rgba(57,255,20,0.4)"
            : "inset 0 0 0 1px rgba(255,122,0,0.4)",
        }}
      >
        <p className="ps-mono text-[10px] tracking-[0.25em] text-white/55">
          {liveScanAvailable ? "LIVE SCAN AVAILABLE" : "LIVE SCAN UNAVAILABLE"}
        </p>
        <p className="mt-1 text-[12px] leading-snug text-white/80">
          {liveScanAvailable
            ? "Your build has the native plugin loaded. Run a real scan to discover devices currently on your Wi-Fi."
            : "Live discovery needs the Android build with the NeoNetwork plugin. You can still run the demo scan to see how the panels behave."}
        </p>
      </div>

      <button
        type="button"
        onClick={onRunScan}
        disabled={scanRequested}
        className="flex w-full items-center justify-center gap-2 rounded-lg py-3 ps-mono text-[11px] tracking-[0.25em] disabled:opacity-60"
        style={{
          color: liveScanAvailable ? "#001a02" : "#1c0d00",
          background: liveScanAvailable ? "#39ff14" : "#ff7a00",
          boxShadow: liveScanAvailable
            ? "0 0 22px rgba(57,255,20,0.55), inset 0 0 0 1px rgba(57,255,20,0.9)"
            : "0 0 22px rgba(255,122,0,0.45), inset 0 0 0 1px rgba(255,122,0,0.9)",
        }}
      >
        <Play className="h-4 w-4" />
        {scanRequested
          ? "SCAN_REQUESTED"
          : liveScanAvailable
            ? "RUN_FIRST_LIVE_SCAN"
            : "START_DEMO_SCAN"}
      </button>

      {scanStartError && (
        <p className="ps-mono text-[10px] tracking-[0.25em] ps-text-pink">
          ERROR // {scanStartError}
        </p>
      )}
      {scanRequested && !scanStartError && (
        <p className="ps-mono text-[10px] tracking-[0.25em] ps-text-green">
          SCAN QUEUED — RESULTS WILL APPEAR ON THE NETWORK SCREEN.
        </p>
      )}

      <p className="ps-mono text-[10px] tracking-[0.25em] text-white/45">
        You can also start scans later from the Home dashboard or Network panel.
      </p>
    </div>
  )
}

function StepReviewUnknown({
  unknownCount,
  firstUnknownName,
}: {
  unknownCount: number
  firstUnknownName?: string
}) {
  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-relaxed text-white/85">
        After every scan, NEO sorts devices into &quot;known&quot; and &quot;new.&quot;
        New ones land in a review queue so you can label them, trust them, or flag
        them.
      </p>
      <div
        className="rounded-lg bg-black/55 p-3"
        style={{
          boxShadow:
            unknownCount > 0
              ? "inset 0 0 0 1px rgba(255,122,0,0.5)"
              : "inset 0 0 0 1px rgba(57,255,20,0.4)",
        }}
      >
        <p className="ps-mono text-[10px] tracking-[0.25em] text-white/55">
          REVIEW QUEUE
        </p>
        {unknownCount > 0 ? (
          <>
            <p
              className="mt-1 ps-mono text-[12px] tracking-[0.2em]"
              style={{ color: "#ff7a00" }}
            >
              {unknownCount} UNKNOWN DEVICE{unknownCount === 1 ? "" : "S"} WAITING
            </p>
            {firstUnknownName && (
              <p className="mt-1 text-[12px] leading-snug text-white/80">
                First item to review:{" "}
                <span className="ps-mono ps-text-orange">{firstUnknownName}</span>.
                Open the Network screen to label it.
              </p>
            )}
          </>
        ) : (
          <>
            <p
              className="mt-1 ps-mono text-[12px] tracking-[0.2em]"
              style={{ color: "#39ff14" }}
            >
              QUEUE IS CLEAR
            </p>
            <p className="mt-1 text-[12px] leading-snug text-white/80">
              Once your first scan completes, anything unfamiliar will show up
              here so you never miss a new device on your LAN.
            </p>
          </>
        )}
      </div>
      <p className="ps-mono text-[10px] tracking-[0.25em] text-white/45">
        You can always reach the queue from Network → Identity Review.
      </p>
    </div>
  )
}

function StepMonitoring({
  enabled,
  onChange,
}: {
  enabled: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-relaxed text-white/85">
        Want NEO to keep watching while you do other things? Monitoring runs
        periodic scans and surfaces new arrivals on the Home dashboard.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <MonitoringChoice
          accent="green"
          label="ENABLE_MONITOR"
          selected={enabled}
          description="Run scheduled scans and surface new devices."
          onClick={() => onChange(true)}
        />
        <MonitoringChoice
          accent="cyan"
          label="LATER"
          selected={!enabled}
          description="Only scan when you tap Run Scan."
          onClick={() => onChange(false)}
        />
      </div>
      <div
        className="rounded-lg bg-black/55 p-3"
        style={{ boxShadow: "inset 0 0 0 1px rgba(184,41,255,0.4)" }}
      >
        <p className="ps-mono text-[10px] tracking-[0.25em] ps-text-purple">HOW IT WORKS</p>
        <p className="mt-1 text-[12px] leading-snug text-white/80">
          Background scans run every ~30 minutes when Android background work is
          permitted. On the browser preview the scheduler is in-app — closing the
          tab stops the loop. Notifications require the permission you saw earlier.
        </p>
      </div>
    </div>
  )
}

function StepComplete() {
  return (
    <div className="space-y-3">
      <FeatureBadge icon={Sparkles} accent="green" />
      <p className="text-[14px] leading-relaxed text-white/90">
        NEO is configured. Boot sequence complete.
      </p>
      <FeatureList
        items={[
          {
            icon: Bot,
            color: "#00f0ff",
            title: "Talk to NEO",
            body: "Tap the core, head, or use Type / Talk on the Home screen.",
          },
          {
            icon: Radar,
            color: "#39ff14",
            title: "Watch the Network",
            body: "Open the Network screen any time. On the Android app you'll see live scan results; the browser preview always shows the simulated map.",
          },
          {
            icon: CircleHelp,
            color: "#b829ff",
            title: "Replay this tour",
            body: "Settings → About → Replay first-run setup.",
          },
        ]}
      />
    </div>
  )
}

function FeatureBadge({ icon: Icon, accent }: { icon: LucideIcon; accent: Accent }) {
  const hex = ACCENT_HEX[accent]
  return (
    <span
      className="grid h-10 w-10 place-items-center rounded-xl"
      style={{
        background: `${hex}1f`,
        boxShadow: `inset 0 0 0 1px ${hex}, 0 0 16px ${hex}55`,
      }}
    >
      <Icon className="h-5 w-5" style={{ color: hex, filter: `drop-shadow(0 0 6px ${hex})` }} />
    </span>
  )
}

function FeatureList({
  items,
}: {
  items: Array<{ icon: LucideIcon; color: string; title: string; body: string }>
}) {
  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <li
            key={item.title}
            className="flex items-start gap-3 rounded-lg bg-black/45 p-2.5"
            style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
          >
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md"
              style={{
                background: `${item.color}1a`,
                boxShadow: `inset 0 0 0 1px ${item.color}55`,
              }}
            >
              <Icon
                className="h-4 w-4"
                style={{ color: item.color, filter: `drop-shadow(0 0 6px ${item.color})` }}
              />
            </span>
            <div className="min-w-0">
              <p
                className="ps-mono text-[10px] tracking-[0.22em]"
                style={{ color: item.color }}
              >
                {item.title.toUpperCase()}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-white/80">{item.body}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function ModePanel({
  accent,
  title,
  active,
  bullets,
}: {
  accent: Accent
  title: string
  active: boolean
  bullets: string[]
}) {
  const hex = ACCENT_HEX[accent]
  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: active ? `${hex}1f` : "rgba(0,0,0,0.45)",
        boxShadow: active
          ? `inset 0 0 0 1px ${hex}, 0 0 16px ${hex}55`
          : "inset 0 0 0 1px rgba(255,255,255,0.08)",
      }}
    >
      <p className="ps-mono text-[10px] tracking-[0.25em]" style={{ color: hex }}>
        {title} {active ? "(ACTIVE)" : ""}
      </p>
      <ul className="mt-1.5 space-y-1 text-[11px] leading-snug text-white/80">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex gap-1.5">
            <span className="ps-mono" style={{ color: hex }}>
              ›
            </span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PermissionRow({
  id,
  icon: Icon,
  color,
  label,
  rationale,
  state,
  onRequest,
}: {
  id: CapabilityId
  icon: LucideIcon
  color: string
  label: string
  rationale: string
  state: CapabilityState
  onRequest: () => void
}) {
  const stateLabel = STATE_LABELS[state]
  const stateColor = STATE_COLORS[state]
  const actionable =
    state === "unknown" || state === "denied" || state === "checking"
  return (
    <div
      className="rounded-lg bg-black/55 p-3"
      style={{ boxShadow: `inset 0 0 0 1px ${color}33` }}
    >
      <div className="flex items-start gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md"
          style={{
            background: `${color}1a`,
            boxShadow: `inset 0 0 0 1px ${color}55`,
          }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="ps-mono text-[10px] tracking-[0.22em]" style={{ color }}>
              {label.toUpperCase()}
            </p>
            <span
              className="ps-mono text-[10px] tracking-[0.22em]"
              style={{ color: stateColor }}
            >
              {stateLabel}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-white/75">{rationale}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onRequest}
              disabled={!actionable}
              data-permission-id={id}
              className="h-8 rounded-md px-3 ps-mono text-[10px] tracking-[0.22em] disabled:opacity-40"
              style={{
                color,
                boxShadow: `inset 0 0 0 1px ${color}66`,
              }}
            >
              {state === "granted" ? "GRANTED" : "REQUEST"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MonitoringChoice({
  accent,
  label,
  description,
  selected,
  onClick,
}: {
  accent: Accent
  label: string
  description: string
  selected: boolean
  onClick: () => void
}) {
  const hex = ACCENT_HEX[accent]
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full flex-col items-start gap-1 rounded-lg p-3 text-left"
      style={{
        background: selected ? `${hex}1f` : "rgba(0,0,0,0.45)",
        boxShadow: selected
          ? `inset 0 0 0 1px ${hex}, 0 0 16px ${hex}55`
          : "inset 0 0 0 1px rgba(255,255,255,0.08)",
      }}
    >
      <span className="ps-mono text-[10px] tracking-[0.25em]" style={{ color: hex }}>
        {label}
      </span>
      <span className="text-[11px] leading-snug text-white/80">{description}</span>
    </button>
  )
}

const STATE_LABELS: Record<CapabilityState, string> = {
  unknown: "NOT_REQUESTED",
  checking: "CHECKING",
  granted: "GRANTED",
  denied: "DENIED",
  unavailable: "UNAVAILABLE",
}

const STATE_COLORS: Record<CapabilityState, string> = {
  unknown: "#9ad7ff",
  checking: "#ff7a00",
  granted: "#39ff14",
  denied: "#ff2d9c",
  unavailable: "#888",
}
