"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Mic, MicOff, Paperclip, Send } from "lucide-react"
import { useApp } from "@/lib/store"
import { useBackendRuntime } from "@/hooks/use-backend-runtime"
import { NeonPanel } from "../neon-panel"
import { MessageBubble } from "../message-bubble"
import type { ConversationMode } from "@/lib/types"
import type { ResponseCategory, LibraryResponseCategory } from "@/lib/types"
import { getAssistantPromptSuggestions } from "@/lib/assistant/assistantSuggestions"
import { getRecommendedGameInvites, getRecommendedResponses, getRecommendedVoiceProfiles } from "@/lib/assistant/assistantIntegrations"
import { previewVoice } from "@/lib/voice/voice-runtime"
import { getVoiceProfile } from "@/lib/voice/voiceProfiles"
import { voiceProfileToParams } from "@/lib/voice/voicePresets"
import { inferSpeechIntent } from "@/lib/voice/speechIntent"

const MODES: { id: ConversationMode; accent: string }[] = [
  { id: "Helpful Assistant", accent: "#00f0ff" },
  { id: "Funny Companion", accent: "#ff2d9c" },
  { id: "Prank Coach", accent: "#b829ff" },
  { id: "Game Buddy", accent: "#ff7a00" },
  { id: "Tech Helper", accent: "#39ff14" },
  { id: "Chill Mode", accent: "#2ea3ff" },
]

const SAVE_CATEGORY: Record<ResponseCategory, LibraryResponseCategory> = {
  Helpful: "Helpful answers",
  Funny: "Jokes",
  Prank: "Prank ideas",
  Game: "Game invites",
  System: "Robot reactions",
  Advice: "Helpful answers",
}

// Minimal subset of the Web Speech API surface we touch. We avoid pulling
// in the full DOM Speech types so this keeps building cleanly on Capacitor /
// older lib.dom targets where they may be missing.
interface SpeechRecognitionResultAlt {
  transcript: string
}
interface SpeechRecognitionResultLike {
  0: SpeechRecognitionResultAlt
  isFinal: boolean
}
interface SpeechRecognitionResultListLike {
  length: number
  [index: number]: SpeechRecognitionResultLike
}
interface SpeechRecognitionEventLike {
  resultIndex: number
  results: SpeechRecognitionResultListLike
}
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: unknown) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function ChatScreen() {
  const { messages, chatSendState, sendMessage, conversationMode, setConversationMode, addResponse, settings, personalityId, voiceId, setVoiceId, responses, useResponseInChat: sendVaultResponseToChat, setScreen } =
    useApp()
  const backendRuntime = useBackendRuntime()
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  // Voice input: Web Speech API (Chrome/Edge desktop, Chrome on Android, Safari iOS 14.5+).
  // Feature-detected once at mount; if not present, the mic button is disabled and
  // labeled truthfully. We never fake a recording state.
  const [speechSupported, setSpeechSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const inputBaselineRef = useRef("")
  const listeningRef = useRef(false)

  useEffect(() => {
    setSpeechSupported(getSpeechRecognitionCtor() !== null)
  }, [])

  useEffect(() => {
    listeningRef.current = listening
  }, [listening])

  useEffect(() => {
    return () => {
      // Abort any in-flight recognition session when leaving the chat screen so
      // the mic indicator releases and no result handler fires post-unmount.
      const rec = recognitionRef.current
      if (rec) {
        rec.onresult = null
        rec.onerror = null
        rec.onend = null
        try {
          rec.abort()
        } catch {
          // older webkit impls throw if abort() runs before start completes
        }
        recognitionRef.current = null
      }
    }
  }, [])

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current
    if (!rec) return
    try {
      rec.stop()
    } catch {
      // ignore — onend will still clear our state
    }
  }, [])

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      setSpeechError("Voice input is not supported in this browser.")
      return
    }
    setSpeechError(null)
    inputBaselineRef.current = input
    const rec = new Ctor()
    rec.lang = (typeof navigator !== "undefined" && navigator.language) || "en-US"
    rec.continuous = false
    rec.interimResults = true
    rec.onresult = (event) => {
      let transcript = ""
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript
      }
      const base = inputBaselineRef.current
      const joined = base ? `${base.replace(/\s+$/, "")} ${transcript}` : transcript
      setInput(joined)
    }
    rec.onerror = () => {
      // Most common cases: "not-allowed" (mic permission denied), "no-speech",
      // "audio-capture". We surface a short truthful note and clear listening.
      setSpeechError("Voice input stopped — check microphone permission.")
      setListening(false)
    }
    rec.onend = () => {
      setListening(false)
    }
    recognitionRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch {
      setListening(false)
      setSpeechError("Could not start voice input.")
    }
  }, [input])

  const handleMicClick = useCallback(() => {
    if (!speechSupported) return
    if (listeningRef.current) {
      stopListening()
    } else {
      startListening()
    }
  }, [speechSupported, startListening, stopListening])
  const lastAssistantMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant"),
    [messages],
  )
  const suggestions = useMemo(
    () =>
      getAssistantPromptSuggestions({
        personalityId,
        conversationMode,
        lastAssistantMessage,
        voiceId,
      }),
    [conversationMode, lastAssistantMessage, personalityId, voiceId],
  )
  const followUps = chatSendState !== "responding" ? lastAssistantMessage?.followUpSuggestions?.slice(0, 2) ?? [] : []
  const recommendedVoices = useMemo(() => getRecommendedVoiceProfiles(personalityId, 3), [personalityId])
  const recommendedResponses = useMemo(
    () => getRecommendedResponses({ responses, personalityId, voiceId, lastAssistantMessage, limit: 3 }),
    [lastAssistantMessage, personalityId, responses, voiceId],
  )
  const recommendedGames = useMemo(
    () => getRecommendedGameInvites(lastAssistantMessage, personalityId),
    [lastAssistantMessage, personalityId],
  )

  useEffect(() => {
    if (!settings.autoScroll) return
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [chatSendState, messages.length, settings.autoScroll])


  const speakChatMessage = useCallback(async (text: string, category?: ResponseCategory) => {
    if (!text.trim()) return
    const profile = getVoiceProfile(voiceId)
    const intent = inferSpeechIntent({ text, category, conversationMode })
    await previewVoice({
      profile,
      text,
      params: voiceProfileToParams(voiceId),
      mode: "auto",
      qualityPreference: settings.voiceQualityPreference,
      personalityId,
      intent,
    })
  }, [conversationMode, personalityId, settings.voiceQualityPreference, voiceId])

  const handleSend = (override?: string) => {
    const text = override ?? input
    if (!text.trim()) return
    sendMessage(text).catch(() => {})
    setInput("")
  }

  return (
    <div className="space-y-3">
      <header className="px-1">
        <div className="flex items-center justify-between gap-2">
          <p className="ps-mono text-[10px] tracking-[0.4em] text-white/50">
            NEO // CHANNEL_NEO
          </p>
          <span
            className="ps-mono text-[9px] uppercase tracking-[0.25em]"
            style={{
              color: backendRuntime.aiStatusColor,
              textShadow: `0 0 6px ${backendRuntime.aiStatusColor}55`,
            }}
            aria-label={`AI status: ${backendRuntime.aiStatusLabel}`}
            title={backendRuntime.health?.error ?? backendRuntime.health?.providerStatus?.message ?? undefined}
          >
            AI: {backendRuntime.aiStatusLabel}
          </span>
        </div>
        <h2 className="ps-heading text-2xl">
          <span className="ps-text-purple">CONVERSATION</span>{" "}
          <span className="text-white/80">/ LIVE</span>
        </h2>
        {chatSendState !== "idle" && (
          <p className="mt-1 ps-mono text-[10px] tracking-[0.25em] text-white/50">
            {chatSendState === "sending" && "NEO // SENDING"}
            {chatSendState === "responding" && "NEO // RESPONDING"}
            {chatSendState === "success" && "NEO // RESPONSE LOCKED"}
            {chatSendState === "error" && "NEO // AI UNAVAILABLE"}
          </p>
        )}
      </header>

      {/* Mode selector */}
      <div className="-mx-3 px-3 ps-no-scrollbar overflow-x-auto">
        <div className="flex w-max gap-1.5">
          {MODES.map((m) => {
            const active = m.id === conversationMode
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setConversationMode(m.id)}
                className="rounded-full px-3 py-1.5 ps-mono text-[10px] tracking-[0.2em] transition-colors"
                style={{
                  color: active ? m.accent : "rgba(255,255,255,0.7)",
                  background: active ? `${m.accent}1A` : "rgba(255,255,255,0.04)",
                  boxShadow: active
                    ? `inset 0 0 0 1px ${m.accent}AA, 0 0 14px ${m.accent}55`
                    : "inset 0 0 0 1px rgba(255,255,255,0.08)",
                }}
              >
                {m.id.toUpperCase()}
              </button>
            )
          })}
        </div>
      </div>

      {/* Messages panel */}
      <NeonPanel accent="cyan" glow="soft" className="p-2">
        <div
          ref={scrollRef}
          className="max-h-[55vh] space-y-3 overflow-y-auto px-2 py-2 ps-no-scrollbar"
        >
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              msg={m}
              onPlay={(msg) => {
                if (msg.role === "assistant") {
                  speakChatMessage(msg.text, msg.category).catch(() => {})
                }
              }}
              onCopy={(msg) => {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  navigator.clipboard.writeText(msg.text).catch(() => {})
                }
              }}
              onSave={(msg) => {
                addResponse({
                  title: msg.text.slice(0, 32) + (msg.text.length > 32 ? "…" : ""),
                  body: msg.text,
                  category: msg.category ? SAVE_CATEGORY[msg.category] : "Helpful answers",
                  mood: msg.mood ?? "speaking",
                  voiceCompat: [voiceId],
                  linkedVoiceProfileIds: [voiceId],
                  linkedPersonalityIds: [personalityId],
                  toneTags: msg.category === "Funny" ? ["funny", "chat"] : ["chat", "assistant"],
                  useCaseTags: ["chat-save"],
                  createdBy: "user",
                  createdAt: new Date().toISOString(),
                  safeForAutoUse: true,
                  timesUsed: 0,
                  favorite: false,
                })
              }}
              showMetadata={settings.showMoodTags}
            />
          ))}
          {chatSendState === "responding" && <TypingIndicator />}
        </div>
      </NeonPanel>

      {followUps.length > 0 && (
        <div className="-mx-3 px-3 ps-no-scrollbar overflow-x-auto">
          <div className="flex w-max gap-2 pb-1">
            {followUps.map((s) => (
              <motion.button
                key={s}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSend(s)}
                className="rounded-full border border-white/10 bg-black/60 px-3 py-1.5 ps-mono text-[10px] tracking-widest text-white/85"
                style={{ boxShadow: "inset 0 0 0 1px rgba(184,41,255,0.35)" }}
              >
                {s}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {(recommendedVoices.length > 0 || recommendedResponses.length > 0 || recommendedGames.length > 0) && (
        <NeonPanel accent="purple" glow="soft" className="p-3">
          <p className="mb-2 ps-mono text-[10px] uppercase tracking-[0.3em] text-white/50">
            CONTEXT LINKS
          </p>
          <div className="flex gap-2 overflow-x-auto ps-no-scrollbar">
            {recommendedVoices.map((voice) => (
              <button
                key={voice.id}
                type="button"
                onClick={() => {
                  setVoiceId(voice.id)
                  setScreen("voices")
                }}
                className="shrink-0 rounded-full px-3 py-1.5 ps-mono text-[10px] uppercase tracking-[0.18em] text-white/80"
                style={{ boxShadow: "inset 0 0 0 1px rgba(0,240,255,0.35)", background: "rgba(0,240,255,0.08)" }}
              >
                VOICE: {voice.name}
              </button>
            ))}
            {recommendedResponses.map((response) => (
              <button
                key={response.id}
                type="button"
                onClick={() => sendVaultResponseToChat(response.id)}
                className="shrink-0 rounded-full px-3 py-1.5 ps-mono text-[10px] uppercase tracking-[0.18em] text-white/80"
                style={{ boxShadow: "inset 0 0 0 1px rgba(57,255,20,0.35)", background: "rgba(57,255,20,0.08)" }}
              >
                VAULT: {response.title}
              </button>
            ))}
            {recommendedGames.map((game) => (
              <button
                key={game.id}
                type="button"
                onClick={() => setScreen("games")}
                className="shrink-0 rounded-full px-3 py-1.5 ps-mono text-[10px] uppercase tracking-[0.18em] text-white/80"
                style={{ boxShadow: "inset 0 0 0 1px rgba(255,122,0,0.35)", background: "rgba(255,122,0,0.08)" }}
              >
                GAME: {game.title}
              </button>
            ))}
          </div>
        </NeonPanel>
      )}

      {/* Suggestions */}
      <div className="-mx-3 px-3 ps-no-scrollbar overflow-x-auto">
        <div className="flex w-max gap-2 pb-1">
          {suggestions.map((s) => (
            <motion.button
              key={s}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSend(s)}
              className="rounded-full border border-white/10 bg-black/60 px-3 py-1.5 ps-mono text-[10px] tracking-widest text-white/85"
              style={{ boxShadow: "inset 0 0 0 1px rgba(0,240,255,0.25)" }}
            >
              {s}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Input bar */}
      <NeonPanel accent="pink" glow="strong" className="p-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Attach file (planned — not yet supported)"
            aria-disabled="true"
            disabled
            title="Attachments planned — current build does not process files."
            className="grid h-10 w-10 shrink-0 cursor-not-allowed place-items-center rounded-lg text-white/35"
            style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Message NEO…"
            className="h-10 min-w-0 flex-1 rounded-lg bg-black/60 px-3 text-[14px] text-white placeholder:text-white/40 outline-none"
            style={{ boxShadow: "inset 0 0 0 1px rgba(255,45,156,0.45)" }}
          />
          <button
            type="button"
            aria-label={
              !speechSupported
                ? "Voice input unavailable in this browser"
                : listening
                  ? "Stop voice input"
                  : "Start voice input"
            }
            aria-pressed={listening}
            aria-disabled={!speechSupported}
            disabled={!speechSupported}
            onClick={handleMicClick}
            title={
              !speechSupported
                ? "Voice input not supported in this browser/runtime."
                : listening
                  ? "Listening — tap to stop"
                  : "Tap to speak"
            }
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg"
            style={
              !speechSupported
                ? {
                    color: "rgba(255,255,255,0.35)",
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
                    cursor: "not-allowed",
                  }
                : listening
                  ? {
                      color: "#ff2d9c",
                      background: "rgba(255,45,156,0.12)",
                      boxShadow:
                        "inset 0 0 0 1px rgba(255,45,156,0.7), 0 0 16px rgba(255,45,156,0.55)",
                    }
                  : {
                      color: "#00f0ff",
                      boxShadow:
                        "inset 0 0 0 1px rgba(0,240,255,0.55), 0 0 12px rgba(0,240,255,0.35)",
                    }
            }
          >
            {speechSupported ? (
              <Mic className={`h-4 w-4 ${listening ? "animate-pulse" : ""}`} />
            ) : (
              <MicOff className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            aria-label="Send"
            onClick={() => handleSend()}
            disabled={chatSendState === "sending" || chatSendState === "responding"}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg"
            style={{
              color: "#000",
              background:
                "linear-gradient(180deg, #ff2d9c, #b829ff)",
              boxShadow:
                "inset 0 0 0 1px rgba(255,255,255,0.4), 0 0 16px rgba(255,45,156,0.6)",
            }}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        {speechError && (
          <p
            className="mt-1.5 px-1 ps-mono text-[10px] tracking-[0.2em] text-[#ff7a00]"
            role="status"
          >
            {speechError}
          </p>
        )}
      </NeonPanel>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(184,41,255,0.5), rgba(0,0,0,0.8) 70%)",
          boxShadow:
            "inset 0 0 0 1px rgba(184,41,255,0.65), 0 0 14px rgba(184,41,255,0.4)",
        }}
        aria-hidden="true"
      >
        <span
          className="ps-mono text-[10px] font-bold"
          style={{ color: "#ff2d9c", textShadow: "0 0 6px #ff2d9c" }}
        >
          NEO
        </span>
      </div>
      <div
        className="rounded-2xl rounded-bl-sm px-3.5 py-2.5 ps-glass"
        style={{
          background:
            "linear-gradient(180deg, rgba(184,41,255,0.14), rgba(0,0,0,0.6))",
          boxShadow:
            "inset 0 0 0 1px rgba(184,41,255,0.4), 0 0 16px rgba(184,41,255,0.18)",
        }}
      >
        <span className="ps-mono text-[10px] tracking-[0.25em] text-white/60">
          THINKING
        </span>
      </div>
    </div>
  )
}
