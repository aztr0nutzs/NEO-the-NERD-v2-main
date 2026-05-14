"use client"

import { motion } from "framer-motion"
import { Bookmark, Copy, Volume2 } from "lucide-react"
import type { ChatMessage } from "@/lib/types"
import { MOOD_COLORS, MOOD_LABELS } from "@/lib/data"

const CATEGORY_COLOR: Record<string, string> = {
  Helpful: "#00f0ff",
  Funny: "#ff2d9c",
  Prank: "#b829ff",
  Game: "#ff7a00",
  System: "#39ff14",
  Advice: "#00f0ff",
}

interface Props {
  msg: ChatMessage
  onCopy?: (m: ChatMessage) => void
  onSave?: (m: ChatMessage) => void
  onPlay?: (m: ChatMessage) => void
  showMetadata?: boolean
}

export function MessageBubble({
  msg,
  onCopy,
  onSave,
  onPlay,
  showMetadata = true,
}: Props) {
  const isUser = msg.role === "user"
  const moodColor = msg.mood ? MOOD_COLORS[msg.mood] : "#00f0ff"
  const catColor = msg.category ? CATEGORY_COLOR[msg.category] : "#00f0ff"

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 10, y: 4 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        className="flex justify-end"
      >
        <div
          className="max-w-[80%] rounded-2xl rounded-br-sm px-3.5 py-2.5 ps-glass"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,240,255,0.18), rgba(0,240,255,0.08))",
            boxShadow:
              "inset 0 0 0 1px rgba(0,240,255,0.45), 0 0 16px rgba(0,240,255,0.18)",
          }}
        >
          <p className="text-[14px] leading-relaxed text-white text-pretty">
            {msg.text}
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10, y: 4 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      className="flex items-end gap-2"
    >
      {/* Robot avatar */}
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

      <div className="min-w-0 max-w-[80%]">
        <div
          className="rounded-2xl rounded-bl-sm px-3.5 py-2.5 ps-glass"
          style={{
            background:
              "linear-gradient(180deg, rgba(184,41,255,0.14), rgba(0,0,0,0.6))",
            boxShadow:
              "inset 0 0 0 1px rgba(184,41,255,0.4), 0 0 16px rgba(184,41,255,0.18)",
          }}
        >
          <p className="text-[14px] leading-relaxed text-white/95 text-pretty">
            {msg.text}
          </p>
        </div>

        {/* Tag row */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {showMetadata && msg.category && (
            <span
              className="rounded-full px-2 py-0.5 ps-mono text-[9px] tracking-[0.2em]"
              style={{
                color: catColor,
                background: `${catColor}1A`,
                boxShadow: `inset 0 0 0 1px ${catColor}55`,
              }}
            >
              {msg.category.toUpperCase()}
            </span>
          )}
          {showMetadata && msg.mood && (
            <span
              className="rounded-full px-2 py-0.5 ps-mono text-[9px] tracking-[0.2em]"
              style={{
                color: moodColor,
                background: `${moodColor}1A`,
                boxShadow: `inset 0 0 0 1px ${moodColor}55`,
              }}
            >
              {MOOD_LABELS[msg.mood].toUpperCase()}
            </span>
          )}
          <button
            type="button"
            onClick={() => onPlay?.(msg)}
            aria-label="Play voice"
            className="grid h-6 w-6 place-items-center rounded-full text-white/70 hover:text-white"
            style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)" }}
          >
            <Volume2 className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onCopy?.(msg)}
            aria-label="Copy"
            className="grid h-6 w-6 place-items-center rounded-full text-white/70 hover:text-white"
            style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)" }}
          >
            <Copy className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onSave?.(msg)}
            aria-label="Save response"
            className="grid h-6 w-6 place-items-center rounded-full text-white/70 hover:text-white"
            style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)" }}
          >
            <Bookmark className="h-3 w-3" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
