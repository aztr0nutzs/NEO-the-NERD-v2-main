"use client"

import {
  AudioWaveform,
  Bell,
  Bluetooth,
  Bot,
  HardDrive,
  Mic,
  Network,
  Radio,
  Shield,
  Sparkles,
  WifiOff,
} from "lucide-react"
import { useApp } from "@/lib/store"
import { useBackendRuntime } from "@/hooks/use-backend-runtime"
import type { CapabilityId, CapabilityState } from "@/lib/types"
import { PERSONALITIES, VOICES } from "@/lib/data"
import { NeonPanel } from "../neon-panel"
import { ControlSlider } from "../control-slider"
import { SegmentedSelect, SettingsSection, Toggle } from "../settings-section"

export function ControlsScreen() {
  const {
    settings,
    updateSettings,
    capabilityPlatform,
    networkConnected,
    refreshCapabilities,
    requestPermission,
    voiceId,
    setVoiceId,
    personalityId,
    setPersonalityId,
  } = useApp()
  const voice = VOICES.find((v) => v.id === voiceId)
  const personality = PERSONALITIES.find((p) => p.id === personalityId)
  const backendRuntime = useBackendRuntime()

  return (
    <div className="space-y-3">
      <header className="px-1">
        <p className="ps-mono text-[10px] tracking-[0.4em] text-white/50">
          NEO // CORE_CONTROLS
        </p>
        <h2 className="ps-heading text-2xl">
          <span className="ps-text-cyan">ASSISTANT</span>{" "}
          <span className="text-white/80">CONTROLS</span>
        </h2>
      </header>

      <SettingsSection
        title="Engine"
        description="Voice + personality routing"
        icon={Bot}
        accent="cyan"
      >
        <Row label="ASSISTANT MODE" value="ONLINE" color="#39ff14" />
        <Row
          label="VOICE ENGINE"
          value={backendRuntime.engineLabel}
          color={backendRuntime.engineLabelColor}
        />
        <RowSelect
          label="DEFAULT VOICE"
          value={voice?.name ?? ""}
          options={VOICES.map((v) => v.name)}
          onChange={(name) => {
            const v = VOICES.find((x) => x.name === name)
            if (v) setVoiceId(v.id)
          }}
        />
        <RowSelect
          label="PERSONALITY"
          value={personality?.name ?? ""}
          options={PERSONALITIES.map((p) => p.name)}
          onChange={(name) => {
            const p = PERSONALITIES.find((x) => x.name === name)
            if (p) setPersonalityId(p.id)
          }}
        />
      </SettingsSection>

      <SettingsSection
        title="Behavior"
        description="How NEO talks to you"
        icon={Sparkles}
        accent="purple"
      >
        <Toggle
          label="Memory enabled"
          description="Active: when on, the chat conversation is persisted across app restarts and reloaded on launch. When off, persistence is suppressed — saved messages are cleared on the next write and not restored from storage."
          value={settings.memoryEnabled}
          onChange={(v) => updateSettings({ memoryEnabled: v })}
          color="#00f0ff"
        />
        <Toggle
          label="Random game invites"
          description="Scheduler not yet running; choice is remembered"
          value={settings.randomGameInvites}
          onChange={(v) => updateSettings({ randomGameInvites: v })}
          color="#ff7a00"
          planned
        />
        <Toggle
          label="Random joke mode"
          description="Scheduler not yet running; choice is remembered"
          value={settings.randomJokes}
          onChange={(v) => updateSettings({ randomJokes: v })}
          color="#ff2d9c"
          planned
        />
        <Toggle
          label="Prank suggestion mode"
          description="Assistant routing pending; choice is remembered"
          value={settings.prankSuggestions}
          onChange={(v) => updateSettings({ prankSuggestions: v })}
          color="#b829ff"
          planned
        />
        <Toggle
          label="Auto-greeting"
          description="Startup hook pending; choice is remembered"
          value={settings.autoGreeting}
          onChange={(v) => updateSettings({ autoGreeting: v })}
          color="#39ff14"
          planned
        />
        <Toggle
          label="Sound effects"
          description="Audio bus pending; choice is remembered"
          value={settings.soundEffects}
          onChange={(v) => updateSettings({ soundEffects: v })}
          color="#00f0ff"
          planned
        />
      </SettingsSection>

      <SettingsSection
        title="Output tuning"
        description="Persisted preferences; generation hooks planned"
        icon={AudioWaveform}
        accent="pink"
      >
        <div className="rounded-lg bg-black/40 px-3 py-2.5"
          style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
        >
          <ControlSlider
            label="Animation intensity"
            value={settings.animationIntensity}
            onChange={(v) => updateSettings({ animationIntensity: v })}
            color="#ff2d9c"
          />
        </div>
        <SegmentedSelect
          label="Response length"
          value={settings.responseLength}
          options={["Short", "Balanced", "Detailed"]}
          onChange={(v) => updateSettings({ responseLength: v })}
          color="#00f0ff"
        />
        <SegmentedSelect
          label="Safety level"
          value={settings.safetyLevel}
          options={["Strict", "Standard", "Loose"]}
          onChange={(v) => updateSettings({ safetyLevel: v })}
          color="#39ff14"
        />
        <SegmentedSelect
          label="Notification style"
          value={settings.notificationStyle}
          options={["Banner", "Quiet", "Off"]}
          onChange={(v) => updateSettings({ notificationStyle: v })}
          color="#ff7a00"
        />
      </SettingsSection>

      <SettingsSection
        title="Wake + Offline"
        description="Persisted flags; native voice hooks planned"
        icon={Radio}
        accent="green"
      >
        <div className="rounded-lg bg-black/40 px-3 py-2"
          style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
        >
          <p className="ps-mono text-[10px] tracking-[0.25em] text-white/55 mb-1">
            WAKE PHRASE
          </p>
          <input
            value={settings.wakePhrase}
            onChange={(e) => updateSettings({ wakePhrase: e.target.value })}
            placeholder="Hey NEO"
            className="h-9 w-full rounded-md bg-black/60 px-3 text-[13px] text-white outline-none"
            style={{ boxShadow: "inset 0 0 0 1px rgba(57,255,20,0.4)" }}
          />
        </div>
        <Toggle
          label="Offline mode"
          description={
            networkConnected === false
              ? "Network check is offline"
              : "Manual local-only assistant mode"
          }
          value={settings.offlineMode}
          onChange={(v) => updateSettings({ offlineMode: v })}
          color="#39ff14"
        />
      </SettingsSection>

      <SettingsSection
        title="Permissions"
        description={`Live platform checks: ${capabilityPlatform.toUpperCase()}`}
        icon={Shield}
        accent="orange"
      >
        <PermRow
          icon={Mic}
          label="Microphone"
          state={settings.permissions.microphone}
          actionLabel="REQUEST"
          onAction={() => requestPermission("microphone")}
          color="#ff2d9c"
        />
        <PermRow
          icon={Bell}
          label="Notifications"
          state={settings.permissions.notifications}
          actionLabel="REQUEST"
          onAction={() => requestPermission("notifications")}
          color="#00f0ff"
        />
        <PermRow
          icon={HardDrive}
          label="Audio save/share"
          state={settings.permissions.storage}
          actionLabel="CHECK"
          onAction={() => requestPermission("storage")}
          color="#b829ff"
        />
        <PermRow
          icon={Bluetooth}
          label="Bluetooth"
          state={settings.permissions.bluetooth}
          actionLabel="UNAVAILABLE"
          disabled
          color="#ff7a00"
        />
        <PermRow
          icon={Network}
          label={networkConnected === false ? "Network offline" : "Network"}
          state={settings.permissions.network}
          actionLabel="CHECK"
          onAction={refreshCapabilities}
          color="#39ff14"
        />
      </SettingsSection>

      {settings.offlineMode && (
        <NeonPanel accent="orange" glow="soft" className="p-3">
          <div className="flex items-center gap-2 ps-mono text-[11px] tracking-[0.25em] ps-text-orange">
            <WifiOff className="h-4 w-4" />
            OFFLINE MODE ARMED · LOCAL RESPONSES ONLY
          </div>
        </NeonPanel>
      )}
    </div>
  )
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="flex items-center justify-between rounded-lg bg-black/40 px-3 py-2"
      style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
    >
      <p className="ps-mono text-[11px] tracking-[0.2em] text-white/85">{label}</p>
      <p
        className="ps-mono text-[10px] tracking-widest"
        style={{ color, textShadow: `0 0 6px ${color}` }}
      >
        {value}
      </p>
    </div>
  )
}

function RowSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <div
      className="rounded-lg bg-black/40 px-3 py-2"
      style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
    >
      <p className="ps-mono text-[10px] tracking-[0.25em] text-white/55 mb-1.5">
        {label}
      </p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md bg-black/70 px-2 text-[13px] text-white outline-none ps-mono tracking-widest"
        style={{ boxShadow: "inset 0 0 0 1px rgba(0,240,255,0.45)" }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  )
}

function PermRow({
  icon: Icon,
  label,
  state,
  actionLabel,
  onAction,
  disabled = false,
  color,
}: {
  icon: typeof Mic
  label: string
  state: CapabilityState
  actionLabel: string
  onAction?: (id?: CapabilityId) => void
  disabled?: boolean
  color: string
}) {
  const active = state === "granted"
  const blocked = disabled || state === "unavailable" || state === "checking"

  return (
    <div
      className="flex items-center justify-between rounded-lg bg-black/40 px-3 py-2"
      style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color, filter: `drop-shadow(0 0 6px ${color})` }} />
        <span className="ps-mono text-[11px] tracking-[0.2em] text-white/85">
          {label.toUpperCase()}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onAction?.()}
        disabled={blocked}
        aria-label={`${label} ${state}`}
        className="h-7 rounded-full px-3 ps-mono text-[9px] uppercase tracking-[0.18em] disabled:cursor-not-allowed"
        style={{
          color: active ? color : "rgba(255,255,255,0.72)",
          background: active ? `${color}22` : "rgba(255,255,255,0.08)",
          boxShadow: active
            ? `inset 0 0 0 1px ${color}, 0 0 10px ${color}AA`
            : "inset 0 0 0 1px rgba(255,255,255,0.15)",
          textShadow: active ? `0 0 6px ${color}` : "none",
          opacity: blocked && state !== "granted" ? 0.72 : 1,
        }}
      >
        {state === "checking" ? "CHECKING" : state === "granted" ? "GRANTED" : actionLabel}
      </button>
    </div>
  )
}
