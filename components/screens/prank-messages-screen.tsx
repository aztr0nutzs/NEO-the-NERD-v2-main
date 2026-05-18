"use client"

import {
  ArrowLeft,
  Copy,
  History,
  Loader2,
  MessageSquareWarning,
  RotateCw,
  Save,
  Share2,
  Sparkles,
  Star,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { useApp } from "@/lib/store"
import { NeonPanel } from "../neon-panel"
import {
  PRANK_MESSAGE_CATEGORIES,
  PRANK_MESSAGE_TONES,
  generatePrankMessage,
  getPrankMessageCategory,
  getPrankMessageTone,
  type GeneratedPrankMessage,
  type PrankMessageToneId,
} from "@/lib/prankstar/prankMessages"
import { previewVoice, stopVoicePreview } from "@/lib/voice/voice-runtime"
import { getVoiceProfile } from "@/lib/voice/voiceProfiles"
import { voiceProfileToParams } from "@/lib/voice/voicePresets"
import { PERSONALITIES } from "@/lib/data"

const HISTORY_LIMIT = 24
const FAVORITES_LIMIT = 64

type SpeakState = "idle" | "speaking" | "error"

export function PrankMessagesScreen() {
  const {
    setScreen,
    personalityId,
    voiceId,
    settings,
    prankMessageHistory,
    prankMessageFavorites,
    addPrankMessageToHistory,
    togglePrankMessageFavorite,
    removePrankMessageFromHistory,
    clearPrankMessageHistory,
  } = useApp()

  const [categoryId, setCategoryId] = useState<string>(PRANK_MESSAGE_CATEGORIES[0].id)
  const [toneId, setToneId] = useState<PrankMessageToneId>("goofy")
  const [seasonWithPersonality, setSeasonWithPersonality] = useState(true)
  const [current, setCurrent] = useState<GeneratedPrankMessage | null>(null)
  const [speakState, setSpeakState] = useState<SpeakState>("idle")
  const [speakError, setSpeakError] = useState<string | null>(null)
  const [shareNotice, setShareNotice] = useState<string | null>(null)
  const [tab, setTab] = useState<"history" | "favorites">("history")

  const category = useMemo(
    () => getPrankMessageCategory(categoryId) ?? PRANK_MESSAGE_CATEGORIES[0],
    [categoryId],
  )
  const tone = useMemo(
    () => getPrankMessageTone(toneId) ?? PRANK_MESSAGE_TONES[1],
    [toneId],
  )
  const personality = useMemo(
    () => PERSONALITIES.find((p) => p.id === personalityId),
    [personalityId],
  )

  const favoriteSet = useMemo(
    () => new Set(prankMessageFavorites.map((m) => m.id)),
    [prankMessageFavorites],
  )

  const recentTextsForCategory = useMemo(
    () =>
      prankMessageHistory
        .filter((m) => m.categoryId === categoryId)
        .slice(0, 4)
        .map((m) => m.text),
    [prankMessageHistory, categoryId],
  )

  const onGenerate = useCallback(() => {
    setShareNotice(null)
    const message = generatePrankMessage({
      categoryId,
      toneId,
      personalityId: seasonWithPersonality ? personalityId : undefined,
      recentTexts: recentTextsForCategory,
    })
    setCurrent(message)
    addPrankMessageToHistory({
      id: `pm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: message.text,
      categoryId: message.categoryId,
      toneId: message.toneId,
      personalityId: message.personalityId,
      createdAt: Date.now(),
    })
  }, [
    addPrankMessageToHistory,
    categoryId,
    personalityId,
    recentTextsForCategory,
    seasonWithPersonality,
    toneId,
  ])

  const onCopy = useCallback(async () => {
    if (!current) return
    try {
      await navigator.clipboard.writeText(current.text)
      setShareNotice("Copied to clipboard.")
    } catch {
      setShareNotice("Copy failed — long-press the message to copy manually.")
    }
  }, [current])

  const onShare = useCallback(async () => {
    if (!current) return
    const nav = navigator as Navigator & {
      share?: (data: { text: string; title?: string }) => Promise<void>
    }
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title: "NEO Mischief Message", text: current.text })
        setShareNotice("Shared.")
        return
      } catch {
        // fall through to copy fallback
      }
    }
    await onCopy()
  }, [current, onCopy])

  const onSpeak = useCallback(async () => {
    if (!current) return
    if (speakState === "speaking") {
      stopVoicePreview()
      setSpeakState("idle")
      return
    }
    setSpeakError(null)
    setSpeakState("speaking")
    try {
      const profile = getVoiceProfile(voiceId)
      const result = await previewVoice({
        profile,
        text: current.text,
        params: voiceProfileToParams(voiceId),
        mode: "auto",
        qualityPreference: settings.voiceQualityPreference,
        personalityId,
        intent: "humorous-aside",
      })
      if (!result.ok) {
        setSpeakState("error")
        setSpeakError(result.error ?? "Speech preview failed.")
      } else {
        setSpeakState("idle")
      }
    } catch (err) {
      setSpeakState("error")
      setSpeakError(err instanceof Error ? err.message : "Speech preview failed.")
    }
  }, [current, personalityId, settings.voiceQualityPreference, speakState, voiceId])

  const onSaveFavorite = useCallback(() => {
    if (!current) return
    const existing = prankMessageFavorites.find((m) => m.text === current.text)
    if (existing) {
      togglePrankMessageFavorite(existing.id)
      return
    }
    togglePrankMessageFavorite({
      id: `pmf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: current.text,
      categoryId: current.categoryId,
      toneId: current.toneId,
      personalityId: current.personalityId,
      createdAt: Date.now(),
    })
  }, [current, prankMessageFavorites, togglePrankMessageFavorite])

  const currentIsFavorite =
    current !== null && prankMessageFavorites.some((m) => m.text === current.text)

  return (
    <div className="space-y-4 pb-2">
      <header className="px-1 pt-1">
        <button
          type="button"
          onClick={() => {
            stopVoicePreview()
            setScreen("prank")
          }}
          className="mb-2 inline-flex items-center gap-1.5 ps-mono text-[10px] tracking-[0.3em] text-white/65 hover:text-white"
          aria-label="Back to Prankstar Protocol"
        >
          <ArrowLeft className="h-3 w-3" />
          BACK
        </button>
        <p className="ps-mono text-[10px] tracking-[0.4em] text-white/50">
          PRANKSTAR // MISCHIEF_MESSAGES
        </p>
        <h1 className="ps-heading text-2xl leading-[1.05]">
          <span className="ps-text-purple">PRANK</span>{" "}
          <span className="text-white/90">MESSAGES</span>
        </h1>
        <p className="mt-1 ps-mono text-[10px] tracking-widest text-white/50">
          GENERATE · TUNE · SPEAK · STASH
        </p>
      </header>

      <NeonPanel accent="purple" glow="soft" className="p-3">
        <p className="ps-mono text-[10px] tracking-[0.25em] ps-text-purple">CATEGORY</p>
        <div
          className="mt-2 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Message category"
        >
          {PRANK_MESSAGE_CATEGORIES.map((c) => {
            const active = c.id === categoryId
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategoryId(c.id)}
                className="shrink-0 rounded-md px-2.5 py-1.5 ps-mono text-[10px] tracking-[0.18em]"
                style={{
                  background: active ? `${c.accent}22` : "rgba(255,255,255,0.04)",
                  boxShadow: active
                    ? `inset 0 0 0 1px ${c.accent}aa, 0 0 12px ${c.accent}55`
                    : "inset 0 0 0 1px rgba(255,255,255,0.12)",
                  color: active ? c.accent : "rgba(255,255,255,0.78)",
                }}
              >
                {c.emoji ? `${c.emoji}  ` : ""}
                {c.label.toUpperCase()}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-white/65">{category.blurb}</p>

        <p className="mt-4 ps-mono text-[10px] tracking-[0.25em] ps-text-purple">TONE</p>
        <div className="mt-2 flex flex-wrap gap-1.5" role="tablist" aria-label="Tone intensity">
          {PRANK_MESSAGE_TONES.map((t) => {
            const active = t.id === toneId
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setToneId(t.id)}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ps-mono text-[10px] tracking-[0.22em]"
                style={{
                  background: active ? `${t.accent}22` : "rgba(255,255,255,0.04)",
                  boxShadow: active
                    ? `inset 0 0 0 1px ${t.accent}aa, 0 0 10px ${t.accent}55`
                    : "inset 0 0 0 1px rgba(255,255,255,0.12)",
                  color: active ? t.accent : "rgba(255,255,255,0.78)",
                }}
                title={t.hint}
              >
                {t.label.toUpperCase()}
                <span className="text-white/40">{t.intensity}</span>
              </button>
            )
          })}
        </div>

        <label className="mt-3 flex items-center gap-2 ps-mono text-[10px] tracking-[0.22em] text-white/75">
          <input
            type="checkbox"
            className="accent-[#b829ff]"
            checked={seasonWithPersonality}
            onChange={(e) => setSeasonWithPersonality(e.target.checked)}
          />
          SEASON WITH PERSONALITY{personality ? ` · ${personality.name.toUpperCase()}` : ""}
        </label>

        <button
          type="button"
          onClick={onGenerate}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#b829ff]/55 bg-[#b829ff]/15 px-3 py-2.5 ps-mono text-[11px] tracking-[0.25em] ps-text-purple hover:bg-[#b829ff]/25"
        >
          <Sparkles className="h-4 w-4" />
          {current ? "REGENERATE" : "GENERATE_MESSAGE"}
        </button>
      </NeonPanel>

      <NeonPanel accent="pink" glow="strong" scanlines className="p-4">
        <div className="flex items-center justify-between">
          <p className="ps-mono text-[10px] tracking-[0.3em] ps-text-pink">RESULT</p>
          {current && (
            <p className="ps-mono text-[9px] tracking-[0.2em] text-white/45">
              {category.label.toUpperCase()} · {tone.label.toUpperCase()}
            </p>
          )}
        </div>

        {current ? (
          <p className="mt-3 text-[15px] leading-relaxed text-white/95">
            {current.text}
          </p>
        ) : (
          <div className="mt-3 flex flex-col items-center gap-2 rounded-lg border border-dashed border-white/15 bg-black/40 px-3 py-6 text-center">
            <MessageSquareWarning className="h-6 w-6 text-white/40" />
            <p className="ps-mono text-[10px] leading-relaxed tracking-[0.18em] text-white/65">
              PICK A CATEGORY AND TONE, THEN TAP GENERATE.
            </p>
          </div>
        )}

        {current && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            <ActionBtn icon={RotateCw} label="REGEN" onClick={onGenerate} accent="#b829ff" />
            <ActionBtn icon={Copy} label="COPY" onClick={onCopy} accent="#00f0ff" />
            <ActionBtn icon={Share2} label="SHARE" onClick={onShare} accent="#39ff14" />
            <ActionBtn
              icon={currentIsFavorite ? Star : Save}
              label={currentIsFavorite ? "SAVED" : "SAVE"}
              onClick={onSaveFavorite}
              accent="#ffd84d"
              active={currentIsFavorite}
            />
          </div>
        )}

        {current && (
          <button
            type="button"
            onClick={onSpeak}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#ff2d9c]/55 bg-[#ff2d9c]/15 px-3 py-2.5 ps-mono text-[11px] tracking-[0.25em] ps-text-pink hover:bg-[#ff2d9c]/25"
            aria-pressed={speakState === "speaking"}
          >
            {speakState === "speaking" ? (
              <>
                <VolumeX className="h-4 w-4" />
                STOP_SPEAKING
              </>
            ) : speakState === "error" ? (
              <>
                <Volume2 className="h-4 w-4" />
                SPEAK_AGAIN
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4" />
                SPEAK_VIA_NEO
              </>
            )}
          </button>
        )}

        {speakError && (
          <p
            role="alert"
            className="mt-2 ps-mono text-[10px] leading-tight tracking-[0.15em] ps-text-orange"
          >
            {speakError}
          </p>
        )}
        {shareNotice && (
          <p
            role="status"
            className="mt-2 ps-mono text-[10px] leading-tight tracking-[0.15em] text-white/65"
          >
            {shareNotice}
          </p>
        )}
      </NeonPanel>

      <NeonPanel accent="cyan" glow="soft" className="p-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTab("history")}
            role="tab"
            aria-selected={tab === "history"}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ps-mono text-[10px] tracking-[0.22em]"
            style={{
              background: tab === "history" ? "rgba(0,240,255,0.18)" : "rgba(255,255,255,0.04)",
              boxShadow:
                tab === "history"
                  ? "inset 0 0 0 1px rgba(0,240,255,0.7), 0 0 10px rgba(0,240,255,0.4)"
                  : "inset 0 0 0 1px rgba(255,255,255,0.12)",
              color: tab === "history" ? "#00f0ff" : "rgba(255,255,255,0.75)",
            }}
          >
            <History className="h-3 w-3" />
            HISTORY ({prankMessageHistory.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("favorites")}
            role="tab"
            aria-selected={tab === "favorites"}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ps-mono text-[10px] tracking-[0.22em]"
            style={{
              background: tab === "favorites" ? "rgba(255,216,77,0.18)" : "rgba(255,255,255,0.04)",
              boxShadow:
                tab === "favorites"
                  ? "inset 0 0 0 1px rgba(255,216,77,0.7), 0 0 10px rgba(255,216,77,0.4)"
                  : "inset 0 0 0 1px rgba(255,255,255,0.12)",
              color: tab === "favorites" ? "#ffd84d" : "rgba(255,255,255,0.75)",
            }}
          >
            <Star className="h-3 w-3" />
            FAVORITES ({prankMessageFavorites.length})
          </button>
          {tab === "history" && prankMessageHistory.length > 0 && (
            <button
              type="button"
              onClick={clearPrankMessageHistory}
              className="ml-auto inline-flex items-center gap-1 ps-mono text-[9px] tracking-[0.22em] text-white/55 hover:text-white"
              aria-label="Clear history"
            >
              <Trash2 className="h-3 w-3" /> CLEAR
            </button>
          )}
        </div>

        <ul className="mt-3 space-y-2">
          {(tab === "history" ? prankMessageHistory : prankMessageFavorites)
            .slice(0, tab === "history" ? HISTORY_LIMIT : FAVORITES_LIMIT)
            .map((m) => {
              const cat = getPrankMessageCategory(m.categoryId)
              const isFav = favoriteSet.has(m.id) || (tab === "favorites")
              return (
                <li key={m.id}>
                  <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/50 p-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryId(m.categoryId)
                        setToneId(m.toneId as PrankMessageToneId)
                        setCurrent({
                          text: m.text,
                          categoryId: m.categoryId,
                          toneId: m.toneId as PrankMessageToneId,
                          personalityId: m.personalityId,
                        })
                      }}
                      className="min-w-0 flex-1 text-left"
                      aria-label="Restore message"
                    >
                      <p className="truncate text-sm text-white/90">{m.text}</p>
                      <p className="mt-0.5 ps-mono text-[9px] tracking-[0.2em] text-white/45">
                        {(cat?.label ?? m.categoryId).toUpperCase()} · {m.toneId.toUpperCase()}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePrankMessageFavorite(m)}
                      aria-pressed={isFav}
                      aria-label={isFav ? "Unfavorite message" : "Favorite message"}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
                      style={{
                        background: isFav ? "rgba(255,216,77,0.15)" : "rgba(255,255,255,0.04)",
                        boxShadow: isFav
                          ? "inset 0 0 0 1px rgba(255,216,77,0.7)"
                          : "inset 0 0 0 1px rgba(255,255,255,0.12)",
                      }}
                    >
                      <Star
                        className="h-3.5 w-3.5"
                        style={{
                          color: isFav ? "#ffd84d" : "rgba(255,255,255,0.55)",
                          fill: isFav ? "#ffd84d" : "none",
                        }}
                      />
                    </button>
                    {tab === "history" && (
                      <button
                        type="button"
                        onClick={() => removePrankMessageFromHistory(m.id)}
                        aria-label="Remove from history"
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 text-white/55 hover:text-white"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          {(tab === "history" ? prankMessageHistory : prankMessageFavorites).length === 0 && (
            <li className="rounded-lg border border-dashed border-white/15 bg-black/40 px-3 py-5 text-center ps-mono text-[10px] tracking-[0.18em] text-white/55">
              {tab === "history"
                ? "NO HISTORY YET. GENERATE A MESSAGE TO START."
                : "NO FAVORITES YET. TAP ☆ ON A MESSAGE TO STASH IT."}
            </li>
          )}
        </ul>
      </NeonPanel>
    </div>
  )
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
  accent,
  active = false,
  loading = false,
}: {
  icon: typeof Copy
  label: string
  onClick: () => void
  accent: string
  active?: boolean
  loading?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 ps-mono text-[9px] tracking-[0.22em]"
      style={{
        borderColor: active ? accent : "rgba(255,255,255,0.15)",
        background: active ? `${accent}22` : "rgba(0,0,0,0.4)",
        color: active ? accent : "rgba(255,255,255,0.8)",
        boxShadow: active ? `0 0 10px ${accent}55` : undefined,
      }}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      <span>{label}</span>
    </button>
  )
}
