"use client"

/**
 * NEO Prankstar — Sound Forge engine.
 *
 * Module-level singleton that previews user-built audio sequences against the
 * existing `prankAudioRuntime`. Lives outside React state so a preview survives
 * the user navigating away from the Sound Forge screen (the manager cancels
 * the preview itself on explicit stop; navigation away from Prankstar should
 * stop it via the screen).
 *
 * Sound Forge does NOT generate new audio files. It composes existing playable
 * Prankstar sounds into ordered sequences with inter-step delays.
 */

import type {
  SoundForgePlaybackStatus,
  SoundForgeSequence,
  SoundForgeStep,
} from "@/lib/types"
import { getSoundById, isPlayableSoundId } from "./soundCatalog"
import { prankAudioRuntime } from "./prankAudioRuntime"

export const SOUND_FORGE_MIN_STEPS = 2
export const SOUND_FORGE_MAX_STEPS = 8
export const SOUND_FORGE_MIN_GAP_MS = 0
export const SOUND_FORGE_MAX_GAP_MS = 10_000
export const SOUND_FORGE_DEFAULT_GAP_MS = 600
export const SOUND_FORGE_AUDIO_SETTLE_TIMEOUT_MS = 12_000
export const SOUND_FORGE_NAME_MAX_LENGTH = 60
export const SOUND_FORGE_SEQUENCES_CAP = 40

export const SOUND_FORGE_GAP_PRESETS: ReadonlyArray<{ label: string; ms: number }> = [
  { label: "0s", ms: 0 },
  { label: "0.3s", ms: 300 },
  { label: "0.6s", ms: 600 },
  { label: "1.0s", ms: 1_000 },
  { label: "2.0s", ms: 2_000 },
  { label: "4.0s", ms: 4_000 },
]

export interface SoundForgePreviewState {
  status: SoundForgePlaybackStatus
  sequenceId: string | null
  activeStepIndex: number | null
  activeStepId: string | null
  totalSteps: number
  startedAt: number | null
  error: string | null
}

type Listener = (state: SoundForgePreviewState) => void

const IDLE_STATE: SoundForgePreviewState = {
  status: "idle",
  sequenceId: null,
  activeStepIndex: null,
  activeStepId: null,
  totalSteps: 0,
  startedAt: null,
  error: null,
}

export interface SoundForgeValidation {
  ok: boolean
  reason?: string
  missingStepIds: string[]
}

export function validateSequenceSteps(
  steps: readonly SoundForgeStep[],
): SoundForgeValidation {
  if (steps.length < SOUND_FORGE_MIN_STEPS) {
    return {
      ok: false,
      reason: `Add at least ${SOUND_FORGE_MIN_STEPS} steps.`,
      missingStepIds: [],
    }
  }
  if (steps.length > SOUND_FORGE_MAX_STEPS) {
    return {
      ok: false,
      reason: `Sequence is capped at ${SOUND_FORGE_MAX_STEPS} steps.`,
      missingStepIds: [],
    }
  }
  const missingStepIds: string[] = []
  for (const step of steps) {
    if (!isPlayableSoundId(step.soundId)) missingStepIds.push(step.id)
  }
  if (missingStepIds.length > 0) {
    return {
      ok: false,
      reason: `${missingStepIds.length} step${
        missingStepIds.length === 1 ? "" : "s"
      } use a sound that is no longer playable.`,
      missingStepIds,
    }
  }
  return { ok: true, missingStepIds: [] }
}

export function clampGapMs(ms: number): number {
  if (!Number.isFinite(ms)) return SOUND_FORGE_DEFAULT_GAP_MS
  return Math.min(SOUND_FORGE_MAX_GAP_MS, Math.max(SOUND_FORGE_MIN_GAP_MS, Math.round(ms)))
}

export function estimateSequenceDurationMs(
  steps: readonly SoundForgeStep[],
): number {
  let total = 0
  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i]
    const sound = getSoundById(step.soundId)
    // If durationMs is unknown (0), fall back to a small placeholder so the
    // estimate does not drop to zero for the whole sequence.
    const stepMs = sound && sound.durationMs > 0 ? sound.durationMs : 800
    total += stepMs
    if (i < steps.length - 1) total += clampGapMs(step.delayAfterMs)
  }
  return total
}

export function newStepId(): string {
  return `sf-step-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

export function newSequenceId(): string {
  return `sf-seq-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

class SoundForgeManager {
  private state: SoundForgePreviewState = IDLE_STATE
  private listeners = new Set<Listener>()
  private cancelRequested = false
  private activeSequenceId: string | null = null
  private pendingTimer: ReturnType<typeof setTimeout> | null = null

  getState(): SoundForgePreviewState {
    return this.state
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private setState(patch: Partial<SoundForgePreviewState>) {
    this.state = { ...this.state, ...patch }
    for (const l of this.listeners) l(this.state)
  }

  private clearPendingTimer() {
    if (this.pendingTimer !== null) {
      clearTimeout(this.pendingTimer)
      this.pendingTimer = null
    }
  }

  isPreviewing(): boolean {
    return this.state.status === "previewing"
  }

  /**
   * Previews the given sequence. Returns when playback settles. Concurrent
   * calls while a preview is in flight are rejected — callers should `stop()`
   * first if they want to start a new preview.
   */
  async preview(sequence: SoundForgeSequence): Promise<SoundForgePreviewState> {
    if (this.state.status === "previewing") {
      return this.state
    }
    const validation = validateSequenceSteps(sequence.steps)
    if (!validation.ok) {
      this.settle("failed", validation.reason ?? "Sequence is invalid.", sequence.id)
      return this.state
    }
    this.cancelRequested = false
    this.activeSequenceId = sequence.id
    this.setState({
      status: "previewing",
      sequenceId: sequence.id,
      activeStepIndex: 0,
      activeStepId: sequence.steps[0]?.id ?? null,
      totalSteps: sequence.steps.length,
      startedAt: Date.now(),
      error: null,
    })

    try {
      for (let i = 0; i < sequence.steps.length; i += 1) {
        if (this.cancelRequested || this.activeSequenceId !== sequence.id) {
          this.settle("stopped", undefined, sequence.id)
          return this.state
        }
        const step = sequence.steps[i]
        this.setState({
          activeStepIndex: i,
          activeStepId: step.id,
        })
        const sound = getSoundById(step.soundId)
        if (!sound) {
          throw new Error(
            `Step ${i + 1}: sound "${step.soundName}" is no longer in the playable catalog.`,
          )
        }
        await prankAudioRuntime.play(sound)
        await this.waitForAudioSettle(sound.id)
        if (this.cancelRequested || this.activeSequenceId !== sequence.id) {
          this.settle("stopped", undefined, sequence.id)
          return this.state
        }
        if (i < sequence.steps.length - 1) {
          const gap = clampGapMs(step.delayAfterMs)
          if (gap > 0) {
            const stopped = await this.delay(gap)
            if (stopped || this.cancelRequested || this.activeSequenceId !== sequence.id) {
              this.settle("stopped", undefined, sequence.id)
              return this.state
            }
          }
        }
      }
      this.settle("complete", undefined, sequence.id)
      return this.state
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sequence preview failed."
      this.settle("failed", message, sequence.id)
      return this.state
    }
  }

  /**
   * Stops the in-flight preview. Tears down audio playback, clears the
   * inter-step delay timer, and flips the cancel flag so the preview loop
   * exits at its next boundary.
   */
  stop() {
    if (this.state.status !== "previewing") {
      // Reset transient post-run statuses so the UI can return to idle. We
      // explicitly do not touch sequenceId on idle/complete/failed/stopped
      // because the screen wants to keep showing which sequence was last
      // previewed — only the running pipeline is torn down here.
      this.clearPendingTimer()
      this.activeSequenceId = null
      return
    }
    this.cancelRequested = true
    this.activeSequenceId = null
    this.clearPendingTimer()
    prankAudioRuntime.stop()
  }

  /**
   * Resets the preview state back to idle. Useful when the screen unmounts or
   * the user clears a transient error.
   */
  reset() {
    this.stop()
    this.setState({ ...IDLE_STATE })
  }

  private settle(
    status: Exclude<SoundForgePlaybackStatus, "idle" | "previewing">,
    error: string | undefined,
    sequenceId: string,
  ) {
    this.clearPendingTimer()
    this.activeSequenceId = null
    this.setState({
      status,
      sequenceId,
      activeStepIndex: null,
      activeStepId: null,
      error: error ?? null,
    })
  }

  private waitForAudioSettle(soundId: string): Promise<void> {
    return new Promise<void>((resolve) => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        unsubscribe()
        if (timeoutHandle !== null) clearTimeout(timeoutHandle)
        resolve()
      }
      const unsubscribe = prankAudioRuntime.subscribe((state) => {
        if (state.currentSoundId !== soundId) {
          finish()
          return
        }
        if (state.status === "idle" || state.status === "error") {
          finish()
        }
      })
      const timeoutHandle =
        typeof window === "undefined"
          ? null
          : window.setTimeout(finish, SOUND_FORGE_AUDIO_SETTLE_TIMEOUT_MS)
    })
  }

  private delay(ms: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.clearPendingTimer()
      this.pendingTimer = setTimeout(() => {
        this.pendingTimer = null
        resolve(this.cancelRequested)
      }, ms)
    })
  }
}

export const soundForgeManager = new SoundForgeManager()

/**
 * Sanitises stored sequences on hydrate so the UI never crashes on stale
 * persisted data. Steps that reference unplayable sounds are kept on the
 * sequence (with a flag in `missingStepIds` from `validateSequenceSteps`)
 * so the screen can show a recoverable warning, but malformed entries —
 * those missing required fields — are dropped entirely.
 */
export function normalizeStoredSequences(
  raw: readonly SoundForgeSequence[],
): SoundForgeSequence[] {
  const out: SoundForgeSequence[] = []
  for (const seq of raw) {
    if (!seq || typeof seq.id !== "string" || !Array.isArray(seq.steps)) continue
    const steps: SoundForgeStep[] = []
    for (const step of seq.steps) {
      if (!step || typeof step.id !== "string" || typeof step.soundId !== "string") {
        continue
      }
      steps.push({
        id: step.id,
        soundId: step.soundId,
        soundName: typeof step.soundName === "string" ? step.soundName : step.soundId,
        category: typeof step.category === "string" ? step.category : "UNKNOWN",
        delayAfterMs: clampGapMs(
          typeof step.delayAfterMs === "number" ? step.delayAfterMs : SOUND_FORGE_DEFAULT_GAP_MS,
        ),
        note: typeof step.note === "string" ? step.note : undefined,
      })
    }
    if (steps.length === 0) continue
    out.push({
      id: seq.id,
      name: typeof seq.name === "string" && seq.name.trim() ? seq.name : "Untitled Sequence",
      createdAt: typeof seq.createdAt === "number" ? seq.createdAt : Date.now(),
      updatedAt: typeof seq.updatedAt === "number" ? seq.updatedAt : Date.now(),
      steps,
      estimatedDurationMs: estimateSequenceDurationMs(steps),
      favorite: seq.favorite === true,
      lastPlayedAt: typeof seq.lastPlayedAt === "number" ? seq.lastPlayedAt : undefined,
    })
  }
  return out.slice(0, SOUND_FORGE_SEQUENCES_CAP)
}

export function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0.0s"
  const totalSeconds = ms / 1000
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`
  const m = Math.floor(totalSeconds / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${m}m ${s.toString().padStart(2, "0")}s`
}
