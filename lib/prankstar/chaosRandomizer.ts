"use client"

/**
 * NEO Prankstar — Chaos Console engine.
 *
 * Module-level singleton that generates and executes randomized prank actions
 * (sound / message / spoken / combo / sequence) against the existing
 * Prankstar Sound Library, Prank Messages template engine, and NEO voice
 * runtime. Lives outside React state so an in-flight chaos action survives
 * screen navigation while the app session is alive. Persistence across full
 * reload is intentionally limited to a short recent-history slice — closed-
 * app execution would require native scheduling and is out of scope here.
 */

import type {
  ChaosActionKind,
  ChaosExecutionStatus,
  ChaosHistoryEntry,
  ChaosIntensity,
  ChaosPoolFilter,
  VoiceQualityPreference,
} from "@/lib/types"
import type { PrankSound } from "./types"
import {
  PRANKSTAR_SOUNDS,
  getSafeRandomSound,
  getSoundById,
} from "./soundCatalog"
import { prankAudioRuntime } from "./prankAudioRuntime"
import {
  PRANK_MESSAGE_CATEGORIES,
  generatePrankMessage,
  type PrankMessageToneId,
} from "./prankMessages"
import { previewVoice, stopVoicePreview } from "@/lib/voice/voice-runtime"
import { getVoiceProfile } from "@/lib/voice/voiceProfiles"
import { voiceProfileToParams } from "@/lib/voice/voicePresets"

export interface ChaosStep {
  // `text-message` is intentionally distinct from `spoken-message`: it carries
  // a generated mischief line but is NEVER routed through the NEO voice
  // runtime. It exists so Random Message mode can stage a real action that
  // surfaces text without faking playback.
  kind: "sound" | "spoken-message" | "text-message"
  soundId?: string
  soundName?: string
  messageText?: string
  messageCategoryId?: string
  messageToneId?: PrankMessageToneId
}

export interface ChaosAction {
  id: string
  kind: ChaosActionKind
  createdAt: number
  intensity: ChaosIntensity
  pool: ChaosPoolFilter
  steps: ChaosStep[]
  status: ChaosExecutionStatus
  error?: string
  completedAt?: number
  summary: string
}

export interface ChaosGenerateInput {
  kind: ChaosActionKind
  intensity: ChaosIntensity
  pool: ChaosPoolFilter
  seedSoundId?: string
  seedMessageText?: string
  // Allows the screen to bias toward / lock to a specific kind without
  // re-implementing tone gating here.
  voiceId?: string
  voiceQualityPreference?: VoiceQualityPreference
  personalityId?: string
}

export interface ChaosSnapshot {
  current: ChaosAction | null
  history: readonly ChaosHistoryEntry[]
}

type Listener = (snap: ChaosSnapshot) => void

const HISTORY_CAP = 25
const SEQUENCE_GAP_MS_BY_INTENSITY: Record<ChaosIntensity, [number, number]> = {
  mild: [900, 1500],
  goofy: [700, 1300],
  chaotic: [500, 1000],
  maximum: [350, 800],
}
const SEQUENCE_LENGTH_BY_INTENSITY: Record<ChaosIntensity, [number, number]> = {
  // Mild + Goofy = 2; Chaotic = 2–3; Maximum = 3–4. Bounded so a "sequence"
  // never becomes an uncontrolled noise spammer.
  mild: [2, 2],
  goofy: [2, 2],
  chaotic: [2, 3],
  maximum: [3, 4],
}
const TONES_BY_INTENSITY: Record<ChaosIntensity, PrankMessageToneId[]> = {
  mild: ["mild"],
  goofy: ["mild", "goofy"],
  chaotic: ["mild", "goofy", "chaotic"],
  maximum: ["mild", "goofy", "chaotic", "dramatic", "savage_lite"],
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function pickOne<T>(arr: readonly T[]): T | undefined {
  if (!arr.length) return undefined
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomIntInclusive(lo: number, hi: number): number {
  if (hi <= lo) return lo
  return Math.floor(Math.random() * (hi - lo + 1)) + lo
}

function pickSoundForIntensity(
  intensity: ChaosIntensity,
  pool: ChaosPoolFilter,
  excludeIds: readonly string[] = [],
): PrankSound | undefined {
  // Mild always uses the safe pool regardless of UI pool selection — the
  // intensity contract is "no edgy stuff". Higher intensities respect the
  // pool filter.
  const safeOnly =
    intensity === "mild" || pool === "safe-only"
  const base = safeOnly
    ? PRANKSTAR_SOUNDS.filter((s) => s.isSafeForRandomMode)
    : PRANKSTAR_SOUNDS
  const filtered = base.filter((s) => !excludeIds.includes(s.id))
  if (filtered.length > 0) return pickOne(filtered)
  if (base.length > 0) return pickOne(base)
  // Last-resort fallback to the catalog-wide safe random helper.
  return getSafeRandomSound() ?? undefined
}

function generateRandomMessage(
  intensity: ChaosIntensity,
  personalityId?: string,
): { text: string; categoryId: string; toneId: PrankMessageToneId } | undefined {
  const tones = TONES_BY_INTENSITY[intensity]
  const tone = pickOne(tones) ?? "goofy"
  const category = pickOne(PRANK_MESSAGE_CATEGORIES)
  if (!category) return undefined
  const message = generatePrankMessage({
    categoryId: category.id,
    toneId: tone,
    personalityId,
  })
  return {
    text: message.text,
    categoryId: message.categoryId,
    toneId: message.toneId,
  }
}

function summaryFor(kind: ChaosActionKind, steps: ChaosStep[]): string {
  if (steps.length === 0) return labelForKind(kind)
  if (steps.length === 1) {
    const step = steps[0]
    if (step.kind === "sound") return `Sound · ${step.soundName ?? "?"}`
    const head = (step.messageText ?? "").slice(0, 60)
    const trailing = (step.messageText?.length ?? 0) > 60 ? "…" : ""
    if (step.kind === "text-message") {
      return `Message · ${head}${trailing}`
    }
    return `Speak · ${head}${trailing}`
  }
  return `${labelForKind(kind)} · ${steps.length} steps`
}

function labelForKind(kind: ChaosActionKind): string {
  switch (kind) {
    case "random-sound":
      return "Random Sound"
    case "safe-random-sound":
      return "Safe Random Sound"
    case "random-message":
      return "Random Message"
    case "spoken-message":
      return "Spoken Message"
    case "sound-plus-message":
      return "Sound + Message"
    case "sequence":
      return "Chaos Sequence"
  }
}

function clampIntensityForKind(
  kind: ChaosActionKind,
  intensity: ChaosIntensity,
): ChaosIntensity {
  // Combos and sequences require at least Goofy. If the user is on Mild and
  // picks a combo/sequence we silently promote so the action actually does
  // something coherent — the generated action still records the original
  // *displayed* intensity via the action.intensity field, but for tone-gating
  // we treat it as goofy. To keep the contract honest we instead promote the
  // recorded intensity too, so the history reflects what actually happened.
  if (
    intensity === "mild" &&
    (kind === "sound-plus-message" || kind === "sequence")
  ) {
    return "goofy"
  }
  return intensity
}

class ChaosManager {
  private current: ChaosAction | null = null
  private history: ChaosHistoryEntry[] = []
  private listeners = new Set<Listener>()
  private cancelRequested = false

  getSnapshot(): ChaosSnapshot {
    return { current: this.current, history: this.history }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.getSnapshot())
    return () => {
      this.listeners.delete(listener)
    }
  }

  hydrateHistory(entries: readonly ChaosHistoryEntry[]) {
    this.history = entries.slice(0, HISTORY_CAP)
    this.emit()
  }

  clearHistory() {
    this.history = []
    this.emit()
  }

  private emit() {
    const snap = this.getSnapshot()
    for (const l of this.listeners) l(snap)
  }

  private pushHistory(entry: ChaosHistoryEntry) {
    this.history = [entry, ...this.history.filter((h) => h.id !== entry.id)].slice(
      0,
      HISTORY_CAP,
    )
  }

  private update(patch: Partial<ChaosAction>) {
    if (!this.current) return
    this.current = { ...this.current, ...patch }
    this.emit()
  }

  /**
   * Generates a planned but not-yet-executed action and stages it as `current`
   * with status `"ready"`. Replaces any previously-staged ready/idle action.
   * Does NOT cancel a currently executing action.
   */
  generate(input: ChaosGenerateInput): ChaosAction {
    const intensity = clampIntensityForKind(input.kind, input.intensity)
    const steps = this.buildSteps(input.kind, intensity, input.pool, {
      seedSoundId: input.seedSoundId,
      seedMessageText: input.seedMessageText,
      personalityId: input.personalityId,
    })
    const action: ChaosAction = {
      id: makeId("chaos"),
      kind: input.kind,
      intensity,
      pool: input.pool,
      createdAt: Date.now(),
      steps,
      status: steps.length === 0 ? "failed" : "ready",
      error:
        steps.length === 0
          ? "Could not build a chaos action — no playable assets available."
          : undefined,
      summary: summaryFor(input.kind, steps),
    }
    // If a previous action is running, we don't preempt it: the new generation
    // simply replaces the staged "ready" preview after the live one settles.
    // In practice the screen disables Generate while running, so this is just
    // a safety net.
    if (
      this.current &&
      (this.current.status === "playing" ||
        this.current.status === "speaking" ||
        this.current.status === "running-sequence")
    ) {
      // Stage the new ready action but only after the live one ends. We can't
      // safely replace `current` mid-flight, so we just return the planned
      // action; caller should wait for the live one. To keep semantics simple
      // we leave `current` untouched and let the caller decide.
      return action
    }
    this.current = action
    this.cancelRequested = false
    this.emit()
    return action
  }

  private buildSteps(
    kind: ChaosActionKind,
    intensity: ChaosIntensity,
    pool: ChaosPoolFilter,
    opts: {
      seedSoundId?: string
      seedMessageText?: string
      personalityId?: string
    },
  ): ChaosStep[] {
    switch (kind) {
      case "random-sound": {
        const seed = opts.seedSoundId ? getSoundById(opts.seedSoundId) : undefined
        const sound = seed ?? pickSoundForIntensity(intensity, pool)
        if (!sound) return []
        return [{ kind: "sound", soundId: sound.id, soundName: sound.name }]
      }
      case "safe-random-sound": {
        // Force-safe pool. Honor a valid safe-eligible seed.
        const seed = opts.seedSoundId ? getSoundById(opts.seedSoundId) : undefined
        const sound =
          seed && seed.isSafeForRandomMode
            ? seed
            : pickSoundForIntensity(intensity, "safe-only")
        if (!sound) return []
        return [{ kind: "sound", soundId: sound.id, soundName: sound.name }]
      }
      case "random-message": {
        // Random message is text-only: the generated line IS the result.
        // Uses the `text-message` step kind so the execute pipeline never
        // hands it to the NEO voice runtime. Spoken Message remains the
        // distinct audible mode.
        const generated = generateRandomMessage(intensity, opts.personalityId)
        if (!generated) return []
        return [
          {
            kind: "text-message",
            messageText: generated.text,
            messageCategoryId: generated.categoryId,
            messageToneId: generated.toneId,
          },
        ]
      }
      case "spoken-message": {
        const text = opts.seedMessageText?.trim()
        if (text) {
          return [{ kind: "spoken-message", messageText: text }]
        }
        const generated = generateRandomMessage(intensity, opts.personalityId)
        if (!generated) return []
        return [
          {
            kind: "spoken-message",
            messageText: generated.text,
            messageCategoryId: generated.categoryId,
            messageToneId: generated.toneId,
          },
        ]
      }
      case "sound-plus-message": {
        const sound =
          (opts.seedSoundId ? getSoundById(opts.seedSoundId) : undefined) ??
          pickSoundForIntensity(intensity, pool)
        const generated = opts.seedMessageText?.trim()
          ? {
              text: opts.seedMessageText.trim(),
              categoryId: "custom",
              toneId: "goofy" as PrankMessageToneId,
            }
          : generateRandomMessage(intensity, opts.personalityId)
        if (!sound || !generated) return []
        // Setup → punchline pattern: sound first, then spoken message.
        return [
          { kind: "sound", soundId: sound.id, soundName: sound.name },
          {
            kind: "spoken-message",
            messageText: generated.text,
            messageCategoryId: generated.categoryId,
            messageToneId: generated.toneId,
          },
        ]
      }
      case "sequence": {
        const [lo, hi] = SEQUENCE_LENGTH_BY_INTENSITY[intensity]
        const target = randomIntInclusive(lo, hi)
        const steps: ChaosStep[] = []
        const usedSoundIds: string[] = []
        for (let i = 0; i < target; i += 1) {
          // Alternate biased toward sounds (60%) so even short sequences feel
          // audio-led, with spoken-message moments mixed in for texture.
          const isSound = Math.random() < 0.6
          if (isSound) {
            const sound = pickSoundForIntensity(intensity, pool, usedSoundIds)
            if (sound) {
              usedSoundIds.push(sound.id)
              steps.push({
                kind: "sound",
                soundId: sound.id,
                soundName: sound.name,
              })
              continue
            }
          }
          const generated = generateRandomMessage(intensity, opts.personalityId)
          if (generated) {
            steps.push({
              kind: "spoken-message",
              messageText: generated.text,
              messageCategoryId: generated.categoryId,
              messageToneId: generated.toneId,
            })
            continue
          }
          // If both branches failed, fall back to one safe sound and stop.
          const fallback = getSafeRandomSound()
          if (fallback) {
            steps.push({
              kind: "sound",
              soundId: fallback.id,
              soundName: fallback.name,
            })
          }
        }
        // Guarantee at least one step.
        if (steps.length === 0) {
          const fallback = pickSoundForIntensity(intensity, "safe-only")
          if (fallback) {
            steps.push({
              kind: "sound",
              soundId: fallback.id,
              soundName: fallback.name,
            })
          }
        }
        return steps
      }
    }
  }

  /**
   * Executes the currently staged action. Returns when execution settles
   * (complete / cancelled / failed). Concurrent calls while already
   * executing are no-ops.
   */
  async execute(opts: {
    voiceId?: string
    voiceQualityPreference?: VoiceQualityPreference
    personalityId?: string
  }): Promise<void> {
    const action = this.current
    if (!action) return
    if (
      action.status === "playing" ||
      action.status === "speaking" ||
      action.status === "running-sequence"
    ) {
      return
    }
    if (action.status === "failed") return
    this.cancelRequested = false

    // Text-only actions (Random Message mode) are complete the moment they
    // are generated — there is no audio / voice runtime to invoke. We settle
    // as `complete` immediately so the action is honestly recorded in history
    // without ever calling `previewVoice` or the sound runtime.
    if (action.steps.every((s) => s.kind === "text-message")) {
      this.settle("complete")
      return
    }

    const [gapLo, gapHi] = SEQUENCE_GAP_MS_BY_INTENSITY[action.intensity]
    const startStatus: ChaosExecutionStatus =
      action.steps.length > 1
        ? "running-sequence"
        : action.steps[0]?.kind === "sound"
          ? "playing"
          : "speaking"
    this.update({ status: startStatus, error: undefined })

    try {
      for (let i = 0; i < action.steps.length; i += 1) {
        if (this.cancelRequested) {
          this.settle("cancelled")
          return
        }
        const step = action.steps[i]
        if (action.steps.length > 1) {
          this.update({
            status: step.kind === "sound" ? "playing" : "speaking",
          })
        }
        if (step.kind === "sound") {
          await this.runSoundStep(step)
        } else if (step.kind === "spoken-message") {
          await this.runSpokenStep(step, opts)
        }
        // text-message steps are display-only; the loop intentionally
        // skips them and never touches the voice runtime.
        if (this.cancelRequested) {
          this.settle("cancelled")
          return
        }
        if (i < action.steps.length - 1) {
          // Restore the running-sequence label between steps so the user
          // sees the sequence is mid-way rather than stuck on one mode.
          if (action.steps.length > 1) {
            this.update({ status: "running-sequence" })
          }
          await this.delay(randomIntInclusive(gapLo, gapHi))
          if (this.cancelRequested) {
            this.settle("cancelled")
            return
          }
        }
      }
      this.settle("complete")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Chaos action failed."
      this.settle("failed", message)
    }
  }

  private async runSoundStep(step: ChaosStep): Promise<void> {
    if (!step.soundId) throw new Error("Sound step missing id.")
    const sound = getSoundById(step.soundId)
    if (!sound) throw new Error("Sound no longer available.")
    await prankAudioRuntime.play(sound)
    // Wait for the sound to actually end (or error) so sequence timing is
    // perceptual, not just a fire-and-forget.
    await this.waitForAudioSettle(sound.id)
  }

  private async waitForAudioSettle(soundId: string): Promise<void> {
    return new Promise<void>((resolve) => {
      const unsubscribe = prankAudioRuntime.subscribe((state) => {
        // Resolve once the runtime moves off this sound (idle / error / new
        // playback) so we don't block forever if the audio errored silently.
        if (state.currentSoundId !== soundId) {
          unsubscribe()
          resolve()
          return
        }
        if (state.status === "idle" || state.status === "error") {
          unsubscribe()
          resolve()
        }
      })
      // Safety timeout — never block a sequence longer than 12s on a single
      // sound. Real prank assets are short; if something stalls we move on.
      window.setTimeout(() => {
        unsubscribe()
        resolve()
      }, 12_000)
    })
  }

  private async runSpokenStep(
    step: ChaosStep,
    opts: {
      voiceId?: string
      voiceQualityPreference?: VoiceQualityPreference
      personalityId?: string
    },
  ): Promise<void> {
    if (!step.messageText) throw new Error("Spoken step missing text.")
    const profile = getVoiceProfile(opts.voiceId ?? "")
    const result = await previewVoice({
      profile,
      text: step.messageText,
      params: voiceProfileToParams(opts.voiceId ?? profile.id),
      mode: "auto",
      qualityPreference: opts.voiceQualityPreference ?? "prefer-high-quality",
      personalityId: opts.personalityId,
      intent: "humorous-aside",
    })
    if (!result.ok) {
      throw new Error(result.error ?? "Speech preview failed.")
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      window.setTimeout(() => resolve(), ms)
    })
  }

  /**
   * Cancels the currently executing or staged action. Stops audio and
   * voice runtime and records a cancelled history entry.
   */
  cancel() {
    if (!this.current) return
    this.cancelRequested = true
    if (this.current.status === "playing") {
      prankAudioRuntime.stop()
    }
    if (this.current.status === "speaking") {
      stopVoicePreview()
    }
    if (this.current.status === "running-sequence") {
      prankAudioRuntime.stop()
      stopVoicePreview()
    }
    if (
      this.current.status === "ready" ||
      this.current.status === "idle"
    ) {
      // Nothing was running, just drop the staged action.
      this.current = null
      this.emit()
      return
    }
    // For running statuses, the execute loop will observe `cancelRequested`
    // and call `settle("cancelled")` itself. We've already torn down the
    // underlying audio/voice runtimes above.
  }

  private settle(
    status: "complete" | "cancelled" | "failed",
    error?: string,
  ) {
    const action = this.current
    if (!action) return
    const completedAt = Date.now()
    const finalAction: ChaosAction = {
      ...action,
      status,
      error,
      completedAt,
    }
    this.current = finalAction
    this.pushHistory({
      id: action.id,
      kind: action.kind,
      intensity: action.intensity,
      summary: action.summary,
      status,
      createdAt: action.createdAt,
      completedAt,
      error,
    })
    this.emit()
  }
}

export const chaosManager = new ChaosManager()

export const CHAOS_ACTION_KINDS: ReadonlyArray<{
  id: ChaosActionKind
  label: string
  blurb: string
}> = [
  {
    id: "random-sound",
    label: "Random Sound",
    blurb: "Any playable Prankstar sound (respects pool filter).",
  },
  {
    id: "safe-random-sound",
    label: "Safe Random",
    blurb: "Curated safe-mode sound only.",
  },
  {
    id: "random-message",
    label: "Random Message",
    blurb: "A generated mischief line, text only.",
  },
  {
    id: "spoken-message",
    label: "Spoken Message",
    blurb: "Random line, spoken through NEO's voice runtime.",
  },
  {
    id: "sound-plus-message",
    label: "Sound + Message",
    blurb: "Sound first, then NEO speaks the payoff line.",
  },
  {
    id: "sequence",
    label: "Chaos Sequence",
    blurb: "2–4 sound/voice moments with short delays.",
  },
]

export const CHAOS_INTENSITIES: ReadonlyArray<{
  id: ChaosIntensity
  label: string
  hint: string
  accent: string
}> = [
  { id: "mild", label: "Mild", hint: "Safe-only, single-step", accent: "#00f0ff" },
  { id: "goofy", label: "Goofy", hint: "Light + combos", accent: "#39ff14" },
  { id: "chaotic", label: "Chaotic", hint: "Wider pool + sequences", accent: "#b829ff" },
  { id: "maximum", label: "Maximum", hint: "Full pool + long sequences", accent: "#ff2d9c" },
]

export const CHAOS_POOLS: ReadonlyArray<{
  id: ChaosPoolFilter
  label: string
  hint: string
}> = [
  {
    id: "playable-all",
    label: "Playable All",
    hint: "Any sound on disk",
  },
  { id: "safe-only", label: "Safe Only", hint: "Curated safe-mode sounds" },
]

export function describeChaosStep(step: ChaosStep): string {
  if (step.kind === "sound") return step.soundName ?? "Sound"
  const head = (step.messageText ?? "").slice(0, 60)
  return `“${head}${(step.messageText?.length ?? 0) > 60 ? "…" : ""}”`
}

/**
 * True when every step in the action is a text-only step. Used by the Chaos
 * Console UI to swap in text-appropriate controls (Copy / Save) instead of
 * the misleading EXECUTE_NOW playback button.
 */
export function isChaosActionTextOnly(action: ChaosAction | null): boolean {
  if (!action || action.steps.length === 0) return false
  return action.steps.every((s) => s.kind === "text-message")
}
