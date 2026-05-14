"use client"

import { useRef, useState } from "react"
import { motion } from "framer-motion"
import {
  Palette,
  Bot,
  Mic,
  Brain,
  Gamepad2,
  MessageSquare,
  Smartphone,
  Shield,
  Code2,
  Trash2,
  RotateCcw,
  FileDown,
  Info,
} from "lucide-react"
import { useApp } from "@/lib/store"
import { useBackendRuntime } from "@/hooks/use-backend-runtime"
import { SettingsSection, Toggle, SegmentedSelect } from "../settings-section"
import { NeonPanel } from "../neon-panel"
import { VOICES, PERSONALITIES } from "@/lib/data"
import { NeoFeatureShowcase } from "../info/neo-feature-showcase"

type Accent = "cyan" | "purple" | "pink" | "green" | "orange"

const ACCENT_HEX: Record<Accent, string> = {
  cyan: "#00f0ff",
  purple: "#b829ff",
  pink: "#ff2d9c",
  green: "#39ff14",
  orange: "#ff7a00",
}

const ACCENT_OPTIONS: Accent[] = ["cyan", "purple", "pink", "green", "orange"]

export function SettingsScreen() {
  const {
    accentColor,
    setAccentColor,
    voiceId,
    setVoiceId,
    personalityId,
    setPersonalityId,
    clearMessages,
    settings,
    updateSettings,
    exportSettings,
    importSettings,
    resetApp,
    capabilityPlatform,
    networkConnected,
  } = useApp()
  const importRef = useRef<HTMLInputElement>(null)
  const [showFeatureShowcase, setShowFeatureShowcase] = useState(false)
  const backendRuntime = useBackendRuntime()

  return (
    <div className="space-y-3">
      <header className="px-1">
        <p className="ps-mono text-[10px] tracking-[0.4em] text-white/50">
          NEO // SYSTEM_SETTINGS
        </p>
        <h2 className="ps-heading text-2xl">
          <span className="ps-text-cyan">CONFIG</span>{" "}
          <span className="text-white/80">PANEL</span>
        </h2>
      </header>

      <SettingsSection
        title="Appearance"
        description="Theme + accent neon"
        icon={Palette}
        accent="cyan"
      >
        <div
          className="rounded-lg bg-black/40 px-3 py-2.5"
          style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
        >
          <p className="ps-mono text-[10px] tracking-[0.25em] text-white/55 mb-2">
            ACCENT COLOR
          </p>
          <div className="flex gap-2">
            {ACCENT_OPTIONS.map((c) => {
              const hex = ACCENT_HEX[c]
              const active = accentColor === c
              return (
                <motion.button
                  key={c}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setAccentColor(c)}
                  className="h-9 w-9 rounded-full"
                  aria-label={c}
                  aria-pressed={active}
                  style={{
                    background: hex,
                    boxShadow: active
                      ? `0 0 0 2px #fff, 0 0 12px ${hex}, inset 0 0 6px rgba(0,0,0,0.4)`
                      : `0 0 0 1px rgba(255,255,255,0.2), 0 0 6px ${hex}66`,
                  }}
                />
              )
            })}
          </div>
        </div>
        <SegmentedSelect
          label="Theme"
          value={settings.theme}
          options={["NEO_BLACK", "VOID", "PRANK"]}
          onChange={(theme) => updateSettings({ theme })}
          color={ACCENT_HEX[accentColor]}
          planned
        />
      </SettingsSection>

      <SettingsSection
        title="Avatar System"
        description="Cinematic NEO video avatar"
        icon={Bot}
        accent="purple"
      >
        <div
          className="rounded-lg bg-black/40 px-3 py-2.5"
          style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
        >
          <p className="ps-mono text-[10px] tracking-[0.25em] text-white/55 mb-1.5">
            ACTIVE PIPELINE
          </p>
          <p className="text-[12px] leading-relaxed text-white/85">
            This build renders NEO through the dedicated MP4 avatar set —
            looping idle plus one-shot reaction clips (wakeup, thinking,
            happy, ecstatic, surprised, angry, shutdown). Boot uses a
            separate cinematic intro video.
          </p>
          <p className="mt-2 ps-mono text-[9px] tracking-[0.25em] text-white/45">
            AVATAR SOURCE CUSTOMIZATION // PLANNED
          </p>
        </div>
        <Row label="PIPELINE" value="MP4 VIDEO AVATAR" color="#b829ff" />
        <Row label="IDLE CLIP" value="LOOPING" color="#39ff14" />
        <Row label="REACTIONS" value="ONE-SHOT" color="#00f0ff" />
        <Toggle
          label="Reduced motion"
          value={settings.reducedMotion}
          onChange={(reducedMotion) => updateSettings({ reducedMotion })}
          color="#b829ff"
        />
      </SettingsSection>

      <SettingsSection
        title="Voice Settings"
        description="Default TTS routing"
        icon={Mic}
        accent="pink"
      >
        <RowSelect
          label="DEFAULT VOICE"
          value={VOICES.find((v) => v.id === voiceId)?.name ?? ""}
          options={VOICES.map((v) => v.name)}
          onChange={(name) => {
            const v = VOICES.find((x) => x.name === name)
            if (v) setVoiceId(v.id)
          }}
        />
        <Row
          label="TTS ENGINE"
          value={backendRuntime.engineLabel}
          color={backendRuntime.engineLabelColor}
        />
      </SettingsSection>

      <SettingsSection
        title="Personality Defaults"
        description="Persona on cold boot"
        icon={Brain}
        accent="green"
      >
        <RowSelect
          label="DEFAULT PERSONALITY"
          value={PERSONALITIES.find((p) => p.id === personalityId)?.name ?? ""}
          options={PERSONALITIES.map((p) => p.name)}
          onChange={(name) => {
            const p = PERSONALITIES.find((x) => x.name === name)
            if (p) setPersonalityId(p.id)
          }}
        />
      </SettingsSection>

      <SettingsSection
        title="Game Settings"
        icon={Gamepad2}
        accent="orange"
        description="Robot opponent behavior"
      >
        <SegmentedSelect
          label="Difficulty"
          value={settings.gameDifficulty}
          options={["EASY", "ADAPTIVE", "HARD"]}
          onChange={(gameDifficulty) => updateSettings({ gameDifficulty })}
          color="#ff7a00"
        />
        <Toggle
          label="Trash talk"
          description="Routes through robot responses in arcade games"
          value={settings.trashTalk}
          onChange={(trashTalk) => updateSettings({ trashTalk })}
          color="#ff7a00"
        />
      </SettingsSection>

      <SettingsSection
        title="Chat Settings"
        icon={MessageSquare}
        accent="cyan"
        description="Conversation rendering"
      >
        <Toggle
          label="Auto-scroll"
          value={settings.autoScroll}
          onChange={(autoScroll) => updateSettings({ autoScroll })}
          color="#00f0ff"
        />
        <Toggle
          label="Show mood tags"
          value={settings.showMoodTags}
          onChange={(showMoodTags) => updateSettings({ showMoodTags })}
          color="#00f0ff"
        />
      </SettingsSection>

      <SettingsSection
        title="Android App"
        icon={Smartphone}
        accent="purple"
        description="Native capability status"
      >
        <Row
          label="CAPACITOR PLATFORM"
          value={capabilityPlatform.toUpperCase()}
          color={capabilityPlatform === "android" ? "#39ff14" : "#ff7a00"}
        />
        <Row
          label="NETWORK"
          value={
            networkConnected === null
              ? "UNKNOWN"
              : networkConnected
                ? "ONLINE"
                : "OFFLINE"
          }
          color={networkConnected === false ? "#ff7a00" : "#39ff14"}
        />
        <Row label="BACKGROUND SERVICE" value="UNAVAILABLE" color="#ff7a00" />
      </SettingsSection>

      <SettingsSection
        title="Data &amp; Privacy"
        icon={Shield}
        accent="pink"
        description="Local data controls"
      >
        <ActionRow
          icon={<Trash2 className="h-4 w-4" />}
          label="CLEAR CONVERSATION"
          color="#ff2d9c"
          onClick={clearMessages}
        />
        <ActionRow
          icon={<FileDown className="h-4 w-4" />}
          label="EXPORT SETTINGS"
          color="#00f0ff"
          onClick={exportSettings}
        />
        <input
          ref={importRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (!file) return
            file.text().then((text) => {
              importSettings(text).then((ok) => {
                if (!ok && typeof window !== "undefined") {
                  window.alert("Could not import NEO settings JSON.")
                }
              })
            })
            event.target.value = ""
          }}
        />
        <ActionRow
          icon={<FileDown className="h-4 w-4" />}
          label="IMPORT SETTINGS"
          color="#39ff14"
          onClick={() => importRef.current?.click()}
        />
        <ActionRow
          icon={<RotateCcw className="h-4 w-4" />}
          label="RESET APP"
          color="#ff506e"
          onClick={() => {
            if (typeof window !== "undefined") {
              const ok = window.confirm("Reset all data? This clears messages.")
              if (ok) resetApp()
            }
          }}
        />
      </SettingsSection>

      <SettingsSection
        title="About N.E.O."
        description="Feature showcase posters"
        icon={Info}
        accent="cyan"
      >
        <ActionRow
          icon={<Info className="h-4 w-4" />}
          label="OPEN FEATURE SHOWCASE"
          color="#00f0ff"
          onClick={() => setShowFeatureShowcase(true)}
        />
      </SettingsSection>

      <SettingsSection
        title="Developer"
        icon={Code2}
        accent="green"
        description="Build + diagnostics"
      >
        <Row label="VERSION" value="v0.1.0-NEO" color="#39ff14" />
        <Row label="BUILD" value="NEO_NERD_PROTO_474" color="#00f0ff" />
        <Toggle
          label="Debug mode"
          description="Diagnostics overlay not yet active; choice is remembered"
          value={settings.debugMode}
          onChange={(debugMode) => updateSettings({ debugMode })}
          color="#39ff14"
          planned
        />
      </SettingsSection>

      <NeonPanel accent={accentColor} glow="soft" className="p-3 mb-2">
        <p className="ps-mono text-[10px] uppercase tracking-[0.4em] text-center text-white/50">
          NEO THE NERD // CYBERPUNK THEME
        </p>
      </NeonPanel>

      <NeoFeatureShowcase
        open={showFeatureShowcase}
        onOpenChange={setShowFeatureShowcase}
      />
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

function ActionRow({
  icon,
  label,
  color,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  color: string
  onClick: () => void
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="w-full h-11 rounded-lg flex items-center justify-center gap-2 ps-mono text-[11px] uppercase tracking-[0.25em]"
      style={{
        color,
        boxShadow: `inset 0 0 0 1px ${color}80, 0 0 10px ${color}33`,
        background: `${color}14`,
      }}
    >
      {icon}
      {label}
    </motion.button>
  )
}

