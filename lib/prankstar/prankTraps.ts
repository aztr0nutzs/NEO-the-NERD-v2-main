"use client"

/**
 * NEO Prankstar — Timer Traps runtime.
 *
 * In-session, module-level scheduler that owns the lifetime of armed
 * delayed-prank triggers. Lives outside React state so a trap continues
 * counting down while the user navigates between NEO screens. Persistence
 * across full app reload is intentionally NOT implemented — closed-app /
 * background execution requires native scheduler integration that is out
 * of scope for this phase, and silently "resuming" past-due timers would
 * fire stale traps at boot. The UI surfaces this limitation explicitly.
 */

import type {
  PrankTrap,
  PrankTrapKind,
  PrankTrapStatus,
  VoiceQualityPreference,
} from "@/lib/types"
import { getSafeRandomSound, getSoundById } from "./soundCatalog"
import { prankAudioRuntime } from "./prankAudioRuntime"
import { previewVoice } from "@/lib/voice/voice-runtime"
import { getVoiceProfile } from "@/lib/voice/voiceProfiles"
import { voiceProfileToParams } from "@/lib/voice/voicePresets"

export interface CreatePrankTrapInput {
  kind: PrankTrapKind
  delayMs: number
  label?: string
  soundId?: string
  messageText?: string
  voiceId?: string
  voiceQualityPreference?: VoiceQualityPreference
  personalityId?: string
}

export type PrankTrapsListener = (snapshot: PrankTrapsSnapshot) => void

export interface PrankTrapsSnapshot {
  active: readonly PrankTrap[]
  recent: readonly PrankTrap[]
}

export const TRAP_DELAY_PRESETS_MS: readonly { label: string; ms: number }[] = [
  { label: "5s", ms: 5_000 },
  { label: "10s", ms: 10_000 },
  { label: "30s", ms: 30_000 },
  { label: "1m", ms: 60_000 },
  { label: "5m", ms: 300_000 },
]

const RECENT_CAP = 30
const MIN_DELAY_MS = 1_000
const MAX_DELAY_MS = 6 * 60 * 60 * 1_000 // 6h cap — sanity bound, not a feature.

function makeId(): string {
  return `trap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function clampDelay(ms: number): number {
  if (!Number.isFinite(ms)) return MIN_DELAY_MS
  return Math.min(MAX_DELAY_MS, Math.max(MIN_DELAY_MS, Math.round(ms)))
}

class PrankTrapsManager {
  private active = new Map<string, PrankTrap>()
  private recent: PrankTrap[] = []
  private timers = new Map<string, ReturnType<typeof setTimeout>>()
  private listeners = new Set<PrankTrapsListener>()

  getSnapshot(): PrankTrapsSnapshot {
    return {
      active: Array.from(this.active.values()).sort((a, b) => a.triggerAt - b.triggerAt),
      recent: this.recent,
    }
  }

  subscribe(listener: PrankTrapsListener): () => void {
    this.listeners.add(listener)
    listener(this.getSnapshot())
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit() {
    const snap = this.getSnapshot()
    for (const l of this.listeners) l(snap)
  }

  hydrateRecent(recent: readonly PrankTrap[]) {
    this.recent = recent.slice(0, RECENT_CAP)
    this.emit()
  }

  arm(input: CreatePrankTrapInput): PrankTrap {
    const delayMs = clampDelay(input.delayMs)
    const id = makeId()
    const now = Date.now()

    let soundId = input.soundId
    let soundName: string | undefined
    let label = input.label ?? ""

    if (input.kind === "sound") {
      const sound = soundId ? getSoundById(soundId) : undefined
      if (!sound) {
        const failed: PrankTrap = {
          id,
          kind: input.kind,
          label: input.label ?? "Sound Trap",
          createdAt: now,
          triggerAt: now,
          delayMs,
          status: "failed",
          lastError: "Selected sound is not in the playable catalog.",
          firedAt: now,
        }
        this.pushRecent(failed)
        this.emit()
        return failed
      }
      soundName = sound.name
      if (!label) label = `Sound · ${sound.name}`
    } else if (input.kind === "random-safe-sound") {
      const pick = getSafeRandomSound()
      if (!pick) {
        const failed: PrankTrap = {
          id,
          kind: input.kind,
          label: input.label ?? "Random Safe Sound",
          createdAt: now,
          triggerAt: now,
          delayMs,
          status: "failed",
          lastError: "No playable safe sounds available to schedule.",
          firedAt: now,
        }
        this.pushRecent(failed)
        this.emit()
        return failed
      }
      soundId = pick.id
      soundName = pick.name
      if (!label) label = `Random Safe · ${pick.name}`
    } else if (input.kind === "spoken-message") {
      if (!input.messageText || !input.messageText.trim()) {
        const failed: PrankTrap = {
          id,
          kind: input.kind,
          label: input.label ?? "Spoken Message",
          createdAt: now,
          triggerAt: now,
          delayMs,
          status: "failed",
          lastError: "No prank message text provided.",
          firedAt: now,
        }
        this.pushRecent(failed)
        this.emit()
        return failed
      }
      if (!label) {
        const preview = input.messageText.slice(0, 48)
        label = `Speak · ${preview}${input.messageText.length > 48 ? "…" : ""}`
      }
    }

    const trap: PrankTrap = {
      id,
      kind: input.kind,
      label,
      createdAt: now,
      triggerAt: now + delayMs,
      delayMs,
      status: "counting-down",
      soundId,
      soundName,
      messageText: input.messageText,
      voiceId: input.voiceId,
      voiceQualityPreference: input.voiceQualityPreference,
      personalityId: input.personalityId,
    }

    this.active.set(id, trap)
    const timer = setTimeout(() => {
      void this.fire(id)
    }, delayMs)
    this.timers.set(id, timer)
    this.emit()
    return trap
  }

  cancel(id: string): boolean {
    const trap = this.active.get(id)
    if (!trap) return false
    const timer = this.timers.get(id)
    if (timer) clearTimeout(timer)
    this.timers.delete(id)
    this.active.delete(id)
    const cancelled: PrankTrap = {
      ...trap,
      status: "cancelled",
      firedAt: Date.now(),
    }
    this.pushRecent(cancelled)
    this.emit()
    return true
  }

  cancelAll() {
    const ids = Array.from(this.active.keys())
    for (const id of ids) this.cancel(id)
  }

  clearHistory() {
    this.recent = []
    this.emit()
  }

  private pushRecent(trap: PrankTrap) {
    this.recent = [trap, ...this.recent.filter((t) => t.id !== trap.id)].slice(0, RECENT_CAP)
  }

  private async fire(id: string) {
    const trap = this.active.get(id)
    if (!trap) return
    this.timers.delete(id)
    this.updateActive(id, { status: "triggering" })

    try {
      if (trap.kind === "sound" || trap.kind === "random-safe-sound") {
        if (!trap.soundId) throw new Error("Trap missing sound id.")
        const sound = getSoundById(trap.soundId)
        if (!sound) throw new Error("Sound no longer available.")
        await prankAudioRuntime.play(sound)
        this.completeFired(id, "fired")
        return
      }

      if (trap.kind === "spoken-message") {
        if (!trap.messageText) throw new Error("Trap missing message text.")
        const profile = getVoiceProfile(trap.voiceId ?? "")
        const result = await previewVoice({
          profile,
          text: trap.messageText,
          params: voiceProfileToParams(trap.voiceId ?? profile.id),
          mode: "auto",
          qualityPreference: trap.voiceQualityPreference ?? "prefer-high-quality",
          personalityId: trap.personalityId,
          intent: "humorous-aside",
        })
        if (!result.ok) {
          this.completeFired(id, "failed", result.error ?? "Speech preview failed.")
          return
        }
        this.completeFired(id, "fired")
        return
      }

      this.completeFired(id, "failed", `Unknown trap kind: ${trap.kind}`)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Trap firing failed."
      this.completeFired(id, "failed", message)
    }
  }

  private updateActive(id: string, patch: Partial<PrankTrap>) {
    const cur = this.active.get(id)
    if (!cur) return
    const next = { ...cur, ...patch }
    this.active.set(id, next)
    this.emit()
  }

  private completeFired(id: string, status: PrankTrapStatus, error?: string) {
    const cur = this.active.get(id)
    if (!cur) return
    this.active.delete(id)
    const done: PrankTrap = {
      ...cur,
      status,
      firedAt: Date.now(),
      lastError: error,
    }
    this.pushRecent(done)
    this.emit()
  }
}

export const prankTrapsManager = new PrankTrapsManager()

export function formatRemainingMs(ms: number): string {
  if (ms <= 0) return "0.0s"
  const totalSeconds = ms / 1000
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`
  const m = Math.floor(totalSeconds / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${m}m ${s.toString().padStart(2, "0")}s`
}
