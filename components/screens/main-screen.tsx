"use client"

import { motion } from "framer-motion"
import {
  Dices,
  Keyboard,
  Mic,
  Sparkles,
  X,
  Gamepad2,
  Radar,
  ChevronRight,
} from "lucide-react"
import { useState } from "react"
import { useApp } from "@/lib/store"
import { MOOD_COLORS, PERSONALITIES, VOICES } from "@/lib/data"
import { NeonPanel } from "../neon-panel"
import { RobotStage } from "../robot-stage"
import { VoiceVisualizer } from "../voice-visualizer"
import { QuickCommandChips } from "../quick-command-chips"

const RESPONSE_TEMPLATES: Record<string, string> = {
  "Tell a joke":
    "I tried to tell a UDP joke, but you might not get it. Want a TCP one? It's reliable but takes longer.",
  "Start chat": "Channel open. Drop your first message — text or voice, your call.",
  "Change voice": "Voice deck is loaded. Cycle through them in the Voices tab.",
  "Play a game": "Pick your weapon: Tic Tac Toe or Rock Paper Scissors. I'm warmed up.",
  "Prank idea": "Reroute the doorbell to giggle for 3 seconds. Harmless. Mostly. Possibly.",
  "Daily briefing": "Briefing skeleton online. Persistent task feed and notification awareness are planned — for now, fire a prompt or pick a chip and I'll roll.",
  "Explain my network": "Network context is ready in Chat. I can summarize health, unknown devices, recent changes, and the last scan from real app data.",
  "Surprise me": "Random thought: if batteries dream, do they dream of full charge?",
}

export function MainScreen() {
  const {
    setScreen,
    setMood,
    voiceId,
    personalityId,
    notificationOpen,
    acceptGameInvite,
    dismissGameInvite,
    playAvatarReaction,
    networkHealthSnapshots,
  } = useApp()

  const voice = VOICES.find((v) => v.id === voiceId)
  const personality = PERSONALITIES.find((p) => p.id === personalityId)
  const [response, setResponse] = useState<string>(
    "Boot sequence complete. NEO online. Tap my chest to greet, my head to switch personality, or hit a quick command below.",
  )
  const moodColor = MOOD_COLORS.idle
  const latestNetworkHealth = [...networkHealthSnapshots].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )[0]

  const handleChip = (label: string) => {
    setMood("speaking")
    playAvatarReaction(label === "Play a game" ? "ecstatic" : "happy")
    setResponse(RESPONSE_TEMPLATES[label] ?? "Locked in. What's next?")
    setTimeout(() => setMood("idle"), 1800)
    if (label === "Start chat") setTimeout(() => setScreen("chat"), 600)
    if (label === "Change voice") setTimeout(() => setScreen("voices"), 600)
    if (label === "Play a game") setTimeout(() => setScreen("games"), 600)
    if (label === "Explain my network") setTimeout(() => setScreen("chat"), 600)
  }

  const handleTalk = () => {
    setMood("listening")
    playAvatarReaction("thinking")
    setResponse("Mic capture lives on the Chat screen — tap TYPE to jump over, then hit the mic to dictate.")
    setTimeout(() => setMood("idle"), 2200)
  }

  const handleType = () => setScreen("chat")
  const handleRandom = () => {
    const labels = Object.keys(RESPONSE_TEMPLATES)
    const pick = labels[Math.floor(Math.random() * labels.length)]
    handleChip(pick)
  }

  const handleTapHead = () => {
    playAvatarReaction("surprised")
    setScreen("personalities")
  }
  const handleTapCore = () => {
    setMood("speaking")
    playAvatarReaction("happy")
    setResponse(
      `Greetings, Commander. ${personality?.name ?? "NEO"} online via ${voice?.name ?? "default"}. What's the move?`,
    )
    setTimeout(() => setMood("idle"), 2200)
  }
  const handleTapHand = () => {
    setMood("playful")
    playAvatarReaction("ecstatic")
    setResponse("Quick actions deployed. Pick a chip, or hit Talk to start.")
    setTimeout(() => setMood("idle"), 1800)
  }

  return (
    <div className="space-y-4">
      {/* Hero header */}
      <header className="px-1 pt-1">
        <p className="ps-mono text-[10px] tracking-[0.4em] text-white/50">
          NEO // CORE_STAGE_01
        </p>
        <h1 className="ps-heading text-3xl leading-[1.05]">
          <span className="ps-text-cyan">N.E.O.</span>{" "}
          <span className="text-white/90">the</span>{" "}
          <span className="ps-text-pink">N.E.R.D.</span>
        </h1>
        <p className="mt-1 ps-mono text-[10px] tracking-widest text-white/50">
          AI COMPANION // V-CORE 5 // {personality?.name?.toUpperCase()}
        </p>
      </header>

      {/* Robot stage panel */}
      <NeonPanel accent="cyan" glow="strong" scanlines className="p-4">
        <div className="flex items-center justify-between">
          <span className="ps-mono text-[10px] tracking-[0.3em] text-white/60">
            REACTOR // ONLINE
          </span>
          <span className="flex items-center gap-1.5 ps-mono text-[10px] tracking-[0.3em] ps-text-green">
            <span
              className="h-1.5 w-1.5 rounded-full bg-[#39ff14]"
              style={{ boxShadow: "0 0 8px #39ff14" }}
            />
            ALL SYSTEMS NOMINAL
          </span>
        </div>

        <div className="mt-2 flex justify-center">
          <RobotStage
            onTapHead={handleTapHead}
            onTapCore={handleTapCore}
            onTapHand={handleTapHand}
            size={300}
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 px-1">
          <Stat label="VOICE" value={voice?.name ?? "—"} color="#00f0ff" />
          <Stat label="MOOD" value="ONLINE" color={moodColor} />
          <Stat label="MODE" value={personality?.name?.split(" ")[0] ?? "—"} color="#ff2d9c" />
        </div>

        <div className="mt-3">
          <VoiceVisualizer />
        </div>
      </NeonPanel>

      {/* Game invite notification */}
      {notificationOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <NeonPanel accent="orange" glow="strong" className="p-3">
            <div className="flex items-center gap-3">
              <div
                className="grid h-9 w-9 place-items-center rounded-lg"
                style={{
                  background: "rgba(255,122,0,0.15)",
                  boxShadow: "inset 0 0 0 1px rgba(255,122,0,0.5)",
                }}
              >
                <Gamepad2 className="h-4 w-4 ps-text-orange" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="ps-mono text-[10px] tracking-[0.25em] ps-text-orange">
                  ROBOT CHALLENGE
                </p>
                <p className="text-sm text-white/90">
                  Want to play a quick game? I challenge you to{" "}
                  <span className="ps-text-orange font-semibold">Rock Paper Scissors</span>.
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => acceptGameInvite("rps")}
                  className="rounded-md px-3 py-1.5 ps-mono text-[10px] tracking-[0.2em] ps-glow-orange"
                  style={{
                    background: "rgba(255,122,0,0.18)",
                    color: "#ff7a00",
                    boxShadow: "inset 0 0 0 1px rgba(255,122,0,0.6)",
                  }}
                >
                  ACCEPT
                </button>
                <button
                  type="button"
                  onClick={dismissGameInvite}
                  aria-label="Dismiss invite"
                  className="grid h-7 w-7 place-items-center rounded-md text-white/60 hover:text-white"
                  style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)" }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </NeonPanel>
        </motion.div>
      )}

      {/* Quick chips */}
      <div className="space-y-2">
        <p className="ps-mono text-[10px] tracking-[0.3em] text-white/50 px-1">
          QUICK_COMMANDS
        </p>
        <QuickCommandChips onSelect={handleChip} />
      </div>

      {/* Assistant response card */}
      <NeonPanel accent="purple" glow="soft" className="p-4">
        <div className="flex items-center justify-between">
          <span className="ps-mono text-[10px] tracking-[0.3em] ps-text-purple">
            ASSISTANT_RESPONSE
          </span>
          <span className="ps-mono text-[10px] tracking-[0.25em] text-white/40">
            CH_01
          </span>
        </div>
        <p className="mt-2 text-[15px] leading-relaxed text-white/90 text-pretty">
          {response}
        </p>
      </NeonPanel>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2">
        <ActionBtn icon={Mic} label="TALK" accent="#00f0ff" onClick={handleTalk} />
        <ActionBtn icon={Keyboard} label="TYPE" accent="#b829ff" onClick={handleType} />
        <ActionBtn icon={Dices} label="RANDOM" accent="#ff2d9c" onClick={handleRandom} />
      </div>

      {/*
        Network shortcut card — gives the Network feature a guaranteed,
        impossible-to-miss entry point on the Main screen. The dock entry
        also exists, but on narrow phones it can scroll out of view; this
        card ensures the 3D Network Map is always one tap away from home.
      */}
      <button
        type="button"
        onClick={() => setScreen("network")}
        className="block w-full text-left"
        aria-label="Open Network — 3D Network Map and live device discovery"
      >
        <NeonPanel accent="green" glow="strong" scanlines className="p-4">
          <div className="flex items-center gap-3">
            <div
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
              style={{
                background: "rgba(57,255,20,0.12)",
                boxShadow:
                  "inset 0 0 0 1px rgba(57,255,20,0.55), 0 0 18px rgba(57,255,20,0.35)",
              }}
            >
              <Radar
                className="h-5 w-5"
                style={{
                  color: "#39ff14",
                  filter: "drop-shadow(0 0 6px #39ff14)",
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="ps-mono text-[10px] tracking-[0.3em] ps-text-green">
                NEURAL_MAP // 3D NETWORK TOPOLOGY
              </p>
              <p className="ps-mono mt-0.5 text-[12px] tracking-[0.18em] text-white/85">
                {latestNetworkHealth
                  ? `Health ${latestNetworkHealth.score}/100 · ${latestNetworkHealth.grade}`
                  : "Open the live device map & router scanner"}
              </p>
            </div>
            <ChevronRight
              className="h-5 w-5 shrink-0"
              style={{
                color: "#39ff14",
                filter: "drop-shadow(0 0 6px #39ff14)",
              }}
            />
          </div>
        </NeonPanel>
      </button>

      {/* Touch zone hint */}
      <NeonPanel accent="cyan" glow="soft" className="p-3">
        <div className="flex items-center gap-2 ps-mono text-[10px] tracking-[0.25em] text-white/70">
          <Sparkles className="h-3.5 w-3.5 ps-text-cyan" />
          <span>TAP HEAD · CORE · HAND FOR ROBOT INTERACTIONS</span>
        </div>
      </NeonPanel>
    </div>
  )
}

function Stat({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <div
      className="rounded-md border border-white/5 bg-black/50 px-2 py-1.5"
      style={{ boxShadow: `inset 0 0 0 1px ${color}33` }}
    >
      <p className="ps-mono text-[9px] tracking-[0.25em] text-white/50">{label}</p>
      <p
        className="ps-mono text-[12px] tracking-widest font-semibold"
        style={{ color, textShadow: `0 0 8px ${color}` }}
      >
        {value.toUpperCase()}
      </p>
    </div>
  )
}

function ActionBtn({
  icon: Icon,
  label,
  accent,
  onClick,
}: {
  icon: typeof Mic
  label: string
  accent: string
  onClick?: () => void
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="relative flex h-14 items-center justify-center gap-2 rounded-xl ps-glass border border-white/10"
      style={{
        boxShadow: `inset 0 0 0 1px ${accent}55, 0 0 18px ${accent}33`,
      }}
    >
      <Icon className="h-4 w-4" style={{ color: accent, filter: `drop-shadow(0 0 6px ${accent})` }} />
      <span className="ps-mono text-[11px] tracking-[0.3em]" style={{ color: accent }}>
        {label}
      </span>
    </motion.button>
  )
}
