"use client"

import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Clock,
  Copy as CopyIcon,
  Hammer,
  Layers,
  Music2,
  Play,
  Plus,
  Search,
  Star,
  StopCircle,
  Trash2,
  X,
} from "lucide-react"
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useApp } from "@/lib/store"
import { NeonPanel } from "../neon-panel"
import {
  PRANKSTAR_SOUNDS,
  getCategoryCounts,
  getSoundById,
  isPlayableSoundId,
} from "@/lib/prankstar/soundCatalog"
import { prankAudioRuntime } from "@/lib/prankstar/prankAudioRuntime"
import {
  SOUND_FORGE_DEFAULT_GAP_MS,
  SOUND_FORGE_GAP_PRESETS,
  SOUND_FORGE_MAX_STEPS,
  SOUND_FORGE_MIN_STEPS,
  SOUND_FORGE_NAME_MAX_LENGTH,
  clampGapMs,
  estimateSequenceDurationMs,
  formatDurationMs,
  newSequenceId,
  newStepId,
  soundForgeManager,
  validateSequenceSteps,
} from "@/lib/prankstar/soundForge"
import { useSoundForge } from "@/lib/prankstar/useSoundForge"
import type {
  PrankCategory,
  PrankSound,
} from "@/lib/prankstar/types"
import type {
  SoundForgePlaybackStatus,
  SoundForgeSequence,
  SoundForgeStep,
} from "@/lib/types"

const ALL_CATEGORY_ID = "__all__"

function makeDraftStep(sound: PrankSound, delayAfterMs: number): SoundForgeStep {
  return {
    id: newStepId(),
    soundId: sound.id,
    soundName: sound.name,
    category: sound.category,
    delayAfterMs,
  }
}

function statusLabel(status: SoundForgePlaybackStatus): string {
  switch (status) {
    case "idle":
      return "IDLE"
    case "previewing":
      return "PREVIEWING"
    case "stopped":
      return "STOPPED"
    case "complete":
      return "COMPLETE"
    case "failed":
      return "FAILED"
  }
}

export function PrankSoundForgeScreen() {
  const {
    setScreen,
    prankSoundForgeSequences,
    saveSoundForgeSequence,
    deleteSoundForgeSequence,
    duplicateSoundForgeSequence,
    toggleSoundForgeFavorite,
    markSoundForgeSequencePlayed,
    soundForgeIntent,
    setSoundForgeIntent,
  } = useApp()
  const preview = useSoundForge()

  const [draftSteps, setDraftSteps] = useState<SoundForgeStep[]>([])
  const [draftName, setDraftName] = useState("")
  const [editingSequenceId, setEditingSequenceId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pickerQuery, setPickerQuery] = useState("")
  const deferredQuery = useDeferredValue(pickerQuery)
  const [pickerCategory, setPickerCategory] = useState<PrankCategory | typeof ALL_CATEGORY_ID>(
    ALL_CATEGORY_ID,
  )

  // Apply incoming intent (e.g., Sound Library "Add to Sound Forge").
  useEffect(() => {
    if (!soundForgeIntent) return
    if (soundForgeIntent.loadSequenceId) {
      const seq = prankSoundForgeSequences.find(
        (s) => s.id === soundForgeIntent.loadSequenceId,
      )
      if (seq) {
        setEditingSequenceId(seq.id)
        setDraftName(seq.name)
        setDraftSteps(seq.steps.map((s) => ({ ...s })))
      }
    } else if (soundForgeIntent.soundId) {
      const sound = getSoundById(soundForgeIntent.soundId)
      if (sound) {
        setDraftSteps((current) => {
          if (current.length >= SOUND_FORGE_MAX_STEPS) return current
          return [...current, makeDraftStep(sound, SOUND_FORGE_DEFAULT_GAP_MS)]
        })
      }
    }
    setSoundForgeIntent(null)
  }, [
    prankSoundForgeSequences,
    setSoundForgeIntent,
    soundForgeIntent,
  ])

  // Stop preview & free audio when leaving the screen so we never leak audio
  // into the next screen.
  useEffect(() => {
    return () => {
      soundForgeManager.stop()
      prankAudioRuntime.stop()
    }
  }, [])

  const categoryCounts = useMemo(() => getCategoryCounts(), [])

  const filteredSounds = useMemo<PrankSound[]>(() => {
    let pool: PrankSound[] = [...PRANKSTAR_SOUNDS]
    if (pickerCategory !== ALL_CATEGORY_ID) {
      pool = pool.filter((s) => s.category === pickerCategory)
    }
    const q = deferredQuery.trim().toLowerCase()
    if (q) {
      pool = pool.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }
    pool.sort((a, b) => a.name.localeCompare(b.name))
    return pool
  }, [deferredQuery, pickerCategory])

  const validation = useMemo(() => validateSequenceSteps(draftSteps), [draftSteps])
  const estimatedDurationMs = useMemo(
    () => estimateSequenceDurationMs(draftSteps),
    [draftSteps],
  )

  const isPreviewingDraft =
    preview.status === "previewing" && preview.sequenceId === editingSequenceId

  const stepCount = draftSteps.length
  const canAddMoreSteps = stepCount < SOUND_FORGE_MAX_STEPS
  const trimmedName = draftName.trim()
  const canSave =
    validation.ok &&
    trimmedName.length > 0 &&
    trimmedName.length <= SOUND_FORGE_NAME_MAX_LENGTH

  const addSound = useCallback(
    (sound: PrankSound) => {
      setDraftSteps((current) => {
        if (current.length >= SOUND_FORGE_MAX_STEPS) {
          setNotice(`Sequence is capped at ${SOUND_FORGE_MAX_STEPS} steps.`)
          return current
        }
        setNotice(null)
        return [...current, makeDraftStep(sound, SOUND_FORGE_DEFAULT_GAP_MS)]
      })
    },
    [],
  )

  const removeStep = useCallback((id: string) => {
    setDraftSteps((current) => current.filter((s) => s.id !== id))
  }, [])

  const moveStep = useCallback((id: string, dir: -1 | 1) => {
    setDraftSteps((current) => {
      const idx = current.findIndex((s) => s.id === id)
      if (idx < 0) return current
      const target = idx + dir
      if (target < 0 || target >= current.length) return current
      const next = current.slice()
      const [item] = next.splice(idx, 1)
      next.splice(target, 0, item)
      return next
    })
  }, [])

  const updateStepDelay = useCallback((id: string, ms: number) => {
    const clamped = clampGapMs(ms)
    setDraftSteps((current) =>
      current.map((s) => (s.id === id ? { ...s, delayAfterMs: clamped } : s)),
    )
  }, [])

  const resetDraft = useCallback(() => {
    soundForgeManager.stop()
    setDraftSteps([])
    setDraftName("")
    setEditingSequenceId(null)
    setNotice(null)
  }, [])

  const loadSequence = useCallback((sequence: SoundForgeSequence) => {
    soundForgeManager.stop()
    setEditingSequenceId(sequence.id)
    setDraftName(sequence.name)
    setDraftSteps(sequence.steps.map((s) => ({ ...s })))
    const missing = sequence.steps.filter((s) => !isPlayableSoundId(s.soundId))
    if (missing.length > 0) {
      setNotice(
        `${missing.length} step${missing.length === 1 ? "" : "s"} reference a sound that is no longer playable. Remove or swap them before previewing.`,
      )
    } else {
      setNotice(null)
    }
  }, [])

  const buildDraftSequence = useCallback((): SoundForgeSequence => {
    const now = Date.now()
    const id = editingSequenceId ?? newSequenceId()
    const previous = editingSequenceId
      ? prankSoundForgeSequences.find((s) => s.id === editingSequenceId)
      : undefined
    return {
      id,
      name: trimmedName || "Untitled Sequence",
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
      steps: draftSteps.map((s) => ({ ...s })),
      estimatedDurationMs,
      favorite: previous?.favorite ?? false,
      lastPlayedAt: previous?.lastPlayedAt,
    }
  }, [
    draftSteps,
    editingSequenceId,
    estimatedDurationMs,
    prankSoundForgeSequences,
    trimmedName,
  ])

  const onPreviewDraft = useCallback(() => {
    if (preview.status === "previewing") {
      setNotice("A preview is already running. Stop it first.")
      return
    }
    if (!validation.ok) {
      setNotice(validation.reason ?? "Sequence is not ready to preview.")
      return
    }
    setNotice(null)
    const draft: SoundForgeSequence = {
      id: editingSequenceId ?? "draft",
      name: trimmedName || "Draft Sequence",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      steps: draftSteps.map((s) => ({ ...s })),
      estimatedDurationMs,
    }
    void soundForgeManager.preview(draft)
  }, [
    draftSteps,
    editingSequenceId,
    estimatedDurationMs,
    preview.status,
    trimmedName,
    validation,
  ])

  const onPreviewSaved = useCallback(
    (sequence: SoundForgeSequence) => {
      if (preview.status === "previewing") {
        soundForgeManager.stop()
      }
      const validationResult = validateSequenceSteps(sequence.steps)
      if (!validationResult.ok) {
        setNotice(validationResult.reason ?? "Saved sequence is not playable.")
        return
      }
      setNotice(null)
      markSoundForgeSequencePlayed(sequence.id)
      void soundForgeManager.preview(sequence)
    },
    [markSoundForgeSequencePlayed, preview.status],
  )

  const onStopPreview = useCallback(() => {
    soundForgeManager.stop()
  }, [])

  const onSaveDraft = useCallback(() => {
    if (!canSave) {
      setNotice(
        trimmedName.length === 0
          ? "Give the sequence a name before saving."
          : validation.reason ?? "Sequence is not ready to save.",
      )
      return
    }
    const duplicateName = prankSoundForgeSequences.find(
      (s) => s.id !== editingSequenceId && s.name.toLowerCase() === trimmedName.toLowerCase(),
    )
    if (duplicateName) {
      setNotice(
        `A sequence named "${duplicateName.name}" already exists. Choose a different name.`,
      )
      return
    }
    const sequence = buildDraftSequence()
    saveSoundForgeSequence(sequence)
    setEditingSequenceId(sequence.id)
    setNotice(
      editingSequenceId
        ? `Saved updates to "${sequence.name}".`
        : `Saved "${sequence.name}".`,
    )
  }, [
    buildDraftSequence,
    canSave,
    editingSequenceId,
    prankSoundForgeSequences,
    saveSoundForgeSequence,
    trimmedName,
    validation.reason,
  ])

  const onDeleteSaved = useCallback(
    (id: string) => {
      if (preview.sequenceId === id) {
        soundForgeManager.stop()
      }
      deleteSoundForgeSequence(id)
      if (editingSequenceId === id) {
        setEditingSequenceId(null)
        setDraftSteps([])
        setDraftName("")
      }
    },
    [deleteSoundForgeSequence, editingSequenceId, preview.sequenceId],
  )

  const onDuplicateSaved = useCallback(
    (id: string) => {
      const copy = duplicateSoundForgeSequence(id)
      if (copy) setNotice(`Duplicated as "${copy.name}".`)
    },
    [duplicateSoundForgeSequence],
  )

  return (
    <div className="space-y-4 pb-2">
      <header className="px-1 pt-1">
        <button
          type="button"
          onClick={() => {
            soundForgeManager.stop()
            prankAudioRuntime.stop()
            setScreen("prank")
          }}
          className="mb-2 inline-flex items-center gap-1.5 ps-mono text-[10px] tracking-[0.3em] text-white/65 hover:text-white"
          aria-label="Back to Prankstar Protocol"
        >
          <ArrowLeft className="h-3 w-3" />
          BACK
        </button>
        <p className="ps-mono text-[10px] tracking-[0.4em] text-white/50">
          PRANKSTAR // SOUND_FORGE
        </p>
        <h1 className="ps-heading text-2xl leading-[1.05]">
          <span className="ps-text-green">SOUND</span>{" "}
          <span className="text-white/90">FORGE</span>
        </h1>
        <p className="mt-1 ps-mono text-[10px] tracking-widest text-white/50">
          COMPOSE · PREVIEW · SAVE CUSTOM PRANK SEQUENCES
        </p>
      </header>

      <NeonPanel accent="orange" glow="soft" className="p-3">
        <p className="ps-mono text-[10px] tracking-[0.25em] ps-text-orange">
          RUNTIME_TRUTH
        </p>
        <p className="mt-1 ps-mono text-[10px] leading-relaxed tracking-[0.15em] text-white/75">
          Sound Forge composes existing playable Prankstar sounds into ordered
          sequences with timed gaps. It does NOT generate new audio files or
          render to an exportable file — that is reserved for a later phase.
        </p>
      </NeonPanel>

      <NeonPanel accent="cyan" glow="soft" className="p-3">
        <p className="ps-mono text-[10px] tracking-[0.3em] ps-text-cyan">
          SOUND_PICKER · {filteredSounds.length}
        </p>
        <label className="mt-2 flex items-center gap-2 rounded-lg border border-white/10 bg-black/45 px-3 py-2">
          <Search className="h-4 w-4 ps-text-cyan" aria-hidden="true" />
          <input
            type="search"
            inputMode="search"
            value={pickerQuery}
            onChange={(e) => setPickerQuery(e.target.value)}
            placeholder="Search by name, category, tag…"
            aria-label="Search prank sounds"
            className="w-full bg-transparent text-sm text-white/90 placeholder:text-white/35 focus:outline-none"
          />
          {pickerQuery && (
            <button
              type="button"
              onClick={() => setPickerQuery("")}
              aria-label="Clear search"
              className="text-white/40 hover:text-white/80"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        <div
          className="mt-3 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Category filter"
        >
          <CategoryChip
            label="ALL"
            count={PRANKSTAR_SOUNDS.length}
            active={pickerCategory === ALL_CATEGORY_ID}
            onClick={() => setPickerCategory(ALL_CATEGORY_ID)}
          />
          {categoryCounts.map((c) => (
            <CategoryChip
              key={c.category}
              label={c.category}
              count={c.count}
              active={pickerCategory === c.category}
              onClick={() => setPickerCategory(c.category)}
            />
          ))}
        </div>

        {filteredSounds.length === 0 ? (
          <EmptyPicker
            onReset={() => {
              setPickerQuery("")
              setPickerCategory(ALL_CATEGORY_ID)
            }}
          />
        ) : (
          <ul className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {filteredSounds.slice(0, 60).map((sound) => (
              <li key={sound.id}>
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/55 p-2">
                  <button
                    type="button"
                    onClick={() => void prankAudioRuntime.play(sound)}
                    aria-label={`Preview ${sound.name}`}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#00f0ff]/50 bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20"
                  >
                    <Play className="h-3.5 w-3.5 ps-text-cyan" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white/90">{sound.name}</p>
                    <p className="ps-mono text-[9px] tracking-[0.22em] text-white/45">
                      {sound.category}
                      {sound.durationMs > 0
                        ? ` · ${(sound.durationMs / 1000).toFixed(1)}s`
                        : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addSound(sound)}
                    disabled={!canAddMoreSteps}
                    aria-label={`Add ${sound.name} to sequence`}
                    className="inline-flex items-center gap-1 rounded-full border border-[#39ff14]/50 bg-[#39ff14]/10 px-2.5 py-1 ps-mono text-[10px] tracking-[0.22em] text-[#39ff14] hover:bg-[#39ff14]/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="h-3 w-3" /> ADD
                  </button>
                </div>
              </li>
            ))}
            {filteredSounds.length > 60 && (
              <li className="px-1 py-1 ps-mono text-[9px] tracking-[0.18em] text-white/40">
                + {filteredSounds.length - 60} more — refine search to narrow the list.
              </li>
            )}
          </ul>
        )}
      </NeonPanel>

      <NeonPanel accent="green" glow="strong" scanlines className="p-3">
        <div className="flex items-center justify-between">
          <p className="ps-mono text-[10px] tracking-[0.3em] ps-text-green">
            SEQUENCE · {stepCount}/{SOUND_FORGE_MAX_STEPS}
          </p>
          <p className="ps-mono text-[9px] tracking-[0.22em] text-white/55">
            EST {formatDurationMs(estimatedDurationMs)}
          </p>
        </div>

        {stepCount === 0 ? (
          <div className="mt-3 flex flex-col items-center gap-2 rounded-lg border border-dashed border-white/15 bg-black/40 px-3 py-6 text-center">
            <Layers className="h-6 w-6 text-white/40" />
            <p className="ps-mono text-[10px] leading-relaxed tracking-[0.18em] text-white/65">
              ADD AT LEAST {SOUND_FORGE_MIN_STEPS} SOUNDS FROM THE PICKER ABOVE.
            </p>
          </div>
        ) : (
          <ol className="mt-3 space-y-2">
            {draftSteps.map((step, idx) => {
              const isMissing = !isPlayableSoundId(step.soundId)
              const isActive =
                isPreviewingDraft && preview.activeStepIndex === idx
              const accent = isMissing
                ? "#ff7a00"
                : isActive
                  ? "#39ff14"
                  : "#00f0ff"
              return (
                <li
                  key={step.id}
                  className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/55 p-2.5"
                  style={{ boxShadow: `inset 0 0 0 1px ${accent}33` }}
                >
                  <div
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
                    style={{
                      background: `${accent}1f`,
                      boxShadow: `inset 0 0 0 1px ${accent}88`,
                    }}
                  >
                    {isMissing ? (
                      <AlertTriangle className="h-4 w-4" style={{ color: accent }} />
                    ) : (
                      <Music2 className="h-4 w-4" style={{ color: accent }} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="ps-mono text-[9px] tracking-[0.2em]"
                      style={{ color: accent }}
                    >
                      STEP {idx + 1} · {step.category.toUpperCase()}
                      {isMissing ? " · MISSING" : ""}
                      {isActive ? " · ACTIVE" : ""}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-white/90">
                      {step.soundName}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <span className="ps-mono text-[9px] tracking-[0.18em] text-white/45">
                        GAP AFTER
                      </span>
                      {SOUND_FORGE_GAP_PRESETS.map((preset) => {
                        const active = step.delayAfterMs === preset.ms
                        return (
                          <button
                            key={preset.ms}
                            type="button"
                            onClick={() => updateStepDelay(step.id, preset.ms)}
                            aria-pressed={active}
                            className="rounded-full px-2 py-0.5 ps-mono text-[9px] tracking-[0.18em]"
                            style={{
                              background: active
                                ? "rgba(57,255,20,0.18)"
                                : "rgba(255,255,255,0.04)",
                              boxShadow: active
                                ? "inset 0 0 0 1px rgba(57,255,20,0.7)"
                                : "inset 0 0 0 1px rgba(255,255,255,0.12)",
                              color: active ? "#39ff14" : "rgba(255,255,255,0.7)",
                            }}
                          >
                            {preset.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => moveStep(step.id, -1)}
                      disabled={idx === 0}
                      aria-label={`Move step ${idx + 1} up`}
                      className="grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-black/55 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5 text-white/80" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStep(step.id, 1)}
                      disabled={idx === draftSteps.length - 1}
                      aria-label={`Move step ${idx + 1} down`}
                      className="grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-black/55 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5 text-white/80" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStep(step.id)}
                      aria-label={`Remove step ${idx + 1}`}
                      className="grid h-7 w-7 place-items-center rounded-full border border-[#ff2d9c]/40 bg-[#ff2d9c]/10 hover:bg-[#ff2d9c]/20"
                    >
                      <Trash2 className="h-3.5 w-3.5 ps-text-pink" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ol>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onPreviewDraft}
            disabled={!validation.ok || preview.status === "previewing"}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#39ff14]/55 bg-[#39ff14]/15 px-3 py-2.5 ps-mono text-[11px] tracking-[0.25em] text-[#39ff14] hover:bg-[#39ff14]/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Play className="h-4 w-4" />
            PREVIEW
          </button>
          <button
            type="button"
            onClick={onStopPreview}
            disabled={preview.status !== "previewing"}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-black/55 px-3 py-2.5 ps-mono text-[11px] tracking-[0.25em] text-white/85 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <StopCircle className="h-4 w-4" />
            STOP
          </button>
        </div>

        <div className="mt-3 rounded-lg border border-white/10 bg-black/45 p-2.5">
          <p className="ps-mono text-[9px] tracking-[0.22em] text-white/55">
            STATUS · {statusLabel(preview.status)}
            {preview.status === "previewing" && preview.activeStepIndex !== null
              ? ` · STEP ${preview.activeStepIndex + 1}/${preview.totalSteps}`
              : ""}
          </p>
          {preview.status === "failed" && preview.error && (
            <p className="mt-1 ps-mono text-[10px] leading-tight tracking-[0.15em] ps-text-orange">
              {preview.error}
            </p>
          )}
        </div>

        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/45 px-3 py-2">
            <Hammer className="h-4 w-4 ps-text-green" aria-hidden="true" />
            <input
              type="text"
              value={draftName}
              maxLength={SOUND_FORGE_NAME_MAX_LENGTH}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Name this sequence…"
              aria-label="Sequence name"
              className="w-full bg-transparent text-sm text-white/90 placeholder:text-white/35 focus:outline-none"
            />
            {draftName && (
              <span className="ps-mono text-[9px] tracking-[0.18em] text-white/40">
                {draftName.length}/{SOUND_FORGE_NAME_MAX_LENGTH}
              </span>
            )}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={!canSave}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#b829ff]/55 bg-[#b829ff]/15 px-3 py-2.5 ps-mono text-[11px] tracking-[0.25em] ps-text-purple hover:bg-[#b829ff]/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CheckCircle2 className="h-4 w-4" />
              {editingSequenceId ? "UPDATE" : "SAVE"}
            </button>
            <button
              type="button"
              onClick={resetDraft}
              disabled={stepCount === 0 && !editingSequenceId && draftName.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-black/55 px-3 py-2.5 ps-mono text-[11px] tracking-[0.25em] text-white/85 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              NEW_DRAFT
            </button>
          </div>
        </div>

        {!validation.ok && stepCount > 0 && (
          <p className="mt-2 ps-mono text-[10px] leading-tight tracking-[0.15em] ps-text-orange">
            {validation.reason}
          </p>
        )}
        {notice && (
          <p
            role="alert"
            className="mt-2 ps-mono text-[10px] leading-tight tracking-[0.15em] text-white/75"
          >
            {notice}
          </p>
        )}
      </NeonPanel>

      <NeonPanel accent="purple" glow="soft" className="p-3">
        <div className="flex items-center justify-between">
          <p className="ps-mono text-[10px] tracking-[0.3em] ps-text-purple">
            SAVED · {prankSoundForgeSequences.length}
          </p>
        </div>
        {prankSoundForgeSequences.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-white/15 bg-black/40 px-3 py-4 text-center ps-mono text-[10px] tracking-[0.18em] text-white/55">
            NO SAVED SEQUENCES YET. BUILD ONE ABOVE AND TAP {editingSequenceId ? "UPDATE" : "SAVE"}.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {prankSoundForgeSequences.map((seq) => (
              <SavedSequenceRow
                key={seq.id}
                sequence={seq}
                isEditing={editingSequenceId === seq.id}
                isPreviewing={
                  preview.status === "previewing" && preview.sequenceId === seq.id
                }
                onPreview={() => onPreviewSaved(seq)}
                onLoad={() => loadSequence(seq)}
                onDelete={() => onDeleteSaved(seq.id)}
                onDuplicate={() => onDuplicateSaved(seq.id)}
                onToggleFavorite={() => toggleSoundForgeFavorite(seq.id)}
              />
            ))}
          </ul>
        )}
      </NeonPanel>
    </div>
  )
}

interface SavedSequenceRowProps {
  sequence: SoundForgeSequence
  isEditing: boolean
  isPreviewing: boolean
  onPreview: () => void
  onLoad: () => void
  onDelete: () => void
  onDuplicate: () => void
  onToggleFavorite: () => void
}

function SavedSequenceRow({
  sequence,
  isEditing,
  isPreviewing,
  onPreview,
  onLoad,
  onDelete,
  onDuplicate,
  onToggleFavorite,
}: SavedSequenceRowProps) {
  const missingCount = useMemo(
    () => sequence.steps.filter((s) => !isPlayableSoundId(s.soundId)).length,
    [sequence.steps],
  )
  const durationLabel = sequence.estimatedDurationMs
    ? formatDurationMs(sequence.estimatedDurationMs)
    : formatDurationMs(estimateSequenceDurationMs(sequence.steps))
  const accent = isPreviewing ? "#39ff14" : isEditing ? "#b829ff" : "#00f0ff"
  return (
    <li>
      <div
        className="rounded-lg border border-white/10 bg-black/55 p-2.5"
        style={{ boxShadow: `inset 0 0 0 1px ${accent}33` }}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm text-white/90">{sequence.name}</p>
              {sequence.favorite && (
                <Star className="h-3.5 w-3.5" style={{ color: "#ffd84d", fill: "#ffd84d" }} />
              )}
              {isEditing && (
                <span className="rounded-full border border-[#b829ff]/55 px-1.5 py-0.5 ps-mono text-[8px] tracking-[0.18em] ps-text-purple">
                  EDITING
                </span>
              )}
              {isPreviewing && (
                <span className="rounded-full border border-[#39ff14]/55 px-1.5 py-0.5 ps-mono text-[8px] tracking-[0.18em] text-[#39ff14]">
                  PLAYING
                </span>
              )}
            </div>
            <p className="mt-0.5 ps-mono text-[9px] tracking-[0.2em] text-white/55">
              {sequence.steps.length} STEPS · {durationLabel}
              {missingCount > 0 ? ` · ${missingCount} MISSING` : ""}
              {sequence.lastPlayedAt
                ? ` · LAST ${new Date(sequence.lastPlayedAt).toLocaleDateString()}`
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={sequence.favorite === true}
            aria-label={sequence.favorite ? "Unpin sequence" : "Pin sequence"}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
            style={{
              background: sequence.favorite
                ? "rgba(255,216,77,0.15)"
                : "rgba(255,255,255,0.04)",
              boxShadow: sequence.favorite
                ? "inset 0 0 0 1px rgba(255,216,77,0.7)"
                : "inset 0 0 0 1px rgba(255,255,255,0.12)",
            }}
          >
            <Star
              className="h-3.5 w-3.5"
              style={{
                color: sequence.favorite ? "#ffd84d" : "rgba(255,255,255,0.6)",
                fill: sequence.favorite ? "#ffd84d" : "none",
              }}
            />
          </button>
        </div>
        {missingCount > 0 && (
          <div className="mt-2 flex items-start gap-2 rounded-md border border-[#ff7a00]/40 bg-[#ff7a00]/10 px-2 py-1.5">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 ps-text-orange" />
            <p className="ps-mono text-[10px] leading-tight tracking-[0.12em] text-white/80">
              {missingCount} step{missingCount === 1 ? "" : "s"} reference a sound that is no longer in the playable catalog. Load and fix before previewing.
            </p>
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={onPreview}
            disabled={missingCount > 0 || sequence.steps.length < SOUND_FORGE_MIN_STEPS}
            className="inline-flex items-center gap-1 rounded-full border border-[#39ff14]/55 bg-[#39ff14]/10 px-2.5 py-1 ps-mono text-[10px] tracking-[0.22em] text-[#39ff14] hover:bg-[#39ff14]/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Play className="h-3 w-3" /> PLAY
          </button>
          <button
            type="button"
            onClick={onLoad}
            className="inline-flex items-center gap-1 rounded-full border border-[#b829ff]/55 bg-[#b829ff]/10 px-2.5 py-1 ps-mono text-[10px] tracking-[0.22em] ps-text-purple hover:bg-[#b829ff]/20"
          >
            <Clock className="h-3 w-3" /> LOAD
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/55 px-2.5 py-1 ps-mono text-[10px] tracking-[0.22em] text-white/80 hover:bg-white/10"
          >
            <CopyIcon className="h-3 w-3" /> COPY
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto inline-flex items-center gap-1 rounded-full border border-[#ff2d9c]/40 bg-[#ff2d9c]/10 px-2.5 py-1 ps-mono text-[10px] tracking-[0.22em] ps-text-pink hover:bg-[#ff2d9c]/20"
          >
            <Trash2 className="h-3 w-3" /> DELETE
          </button>
        </div>
      </div>
    </li>
  )
}

interface CategoryChipProps {
  label: string
  count: number
  active: boolean
  onClick: () => void
}

function CategoryChip({ label, count, active, onClick }: CategoryChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className="shrink-0 rounded-md px-2.5 py-1.5 ps-mono text-[9px] tracking-[0.22em]"
      style={{
        background: active ? "rgba(0,240,255,0.18)" : "rgba(255,255,255,0.04)",
        boxShadow: active
          ? "inset 0 0 0 1px rgba(0,240,255,0.7), 0 0 10px rgba(0,240,255,0.4)"
          : "inset 0 0 0 1px rgba(255,255,255,0.12)",
        color: active ? "#00f0ff" : "rgba(255,255,255,0.7)",
      }}
    >
      {String(label).toUpperCase()}
      <span className="ml-1 text-white/40">{count}</span>
    </button>
  )
}

function EmptyPicker({ onReset }: { onReset: () => void }) {
  return (
    <div className="mt-3 flex flex-col items-center gap-2 rounded-lg border border-dashed border-white/15 bg-black/40 px-4 py-6 text-center">
      <Music2 className="h-6 w-6 text-white/40" />
      <p className="ps-mono text-[10px] leading-relaxed tracking-[0.18em] text-white/65">
        NO PLAYABLE SOUNDS MATCH THESE FILTERS.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="rounded-full border border-white/20 px-3 py-1 ps-mono text-[10px] tracking-[0.22em] text-white/80 hover:bg-white/10"
      >
        RESET_FILTERS
      </button>
    </div>
  )
}
