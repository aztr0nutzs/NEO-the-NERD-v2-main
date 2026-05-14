"use client"

import { motion } from "framer-motion"
import { Copy, Download, Info, Pencil, Pin, Play, Send, Star, Trash2 } from "lucide-react"
import type { LibraryResponseCategory, SavedResponse } from "@/lib/types"
import { NeonPanel } from "./neon-panel"

interface Props {
  response: SavedResponse
  onToggleFavorite: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (response: SavedResponse) => void
  onDetails: (response: SavedResponse) => void
  onDuplicate: (response: SavedResponse) => void
  onTogglePinned: (id: string) => void
  onUseInChat: (response: SavedResponse) => void
  onSpeak: (response: SavedResponse) => void
  onGenerateAudio: (response: SavedResponse) => void
  onCopy: (response: SavedResponse) => void
  busy?: boolean
}

type Accent = "cyan" | "purple" | "pink" | "green" | "orange"

const CATEGORY_ACCENT: Record<LibraryResponseCategory, Accent> = {
  Jokes: "pink",
  Comebacks: "orange",
  "Helpful answers": "cyan",
  "Prank ideas": "purple",
  "Game invites": "green",
  Greetings: "cyan",
  "Random thoughts": "purple",
  "Motivational lines": "orange",
  "Tech help": "cyan",
  "Story starters": "pink",
  "Robot reactions": "green",
  "Celebration lines": "orange",
  "Status Quips": "cyan",
  "Loading / Thinking Lines": "purple",
}

const ACCENT_HEX: Record<Accent, string> = {
  cyan: "#00f0ff",
  purple: "#b829ff",
  pink: "#ff2d9c",
  green: "#39ff14",
  orange: "#ff7a00",
}

export function ResponseLibraryCard({
  response,
  onToggleFavorite,
  onDelete,
  onEdit,
  onDetails,
  onDuplicate,
  onTogglePinned,
  onUseInChat,
  onSpeak,
  onGenerateAudio,
  onCopy,
  busy,
}: Props) {
  const accent = CATEGORY_ACCENT[response.category] ?? "cyan"
  const color = ACCENT_HEX[accent]

  return (
    <NeonPanel accent={accent} glow="soft" className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="ps-mono text-[9px] uppercase tracking-[0.25em] px-2 py-0.5 rounded-full"
              style={{
                color,
                boxShadow: `inset 0 0 0 1px ${color}66`,
                background: `${color}14`,
              }}
            >
              {response.category}
            </span>
            <span className="ps-mono text-[10px] text-white/50 uppercase">{response.mood}</span>
            {response.pinned && <span className="ps-mono text-[10px] text-orange-300 uppercase">PINNED</span>}
          </div>
          <h3 className="ps-heading text-base text-white truncate">{response.title}</h3>
          <p className="text-xs text-white/65 mt-1 line-clamp-2 leading-relaxed">{response.body}</p>
          <p className="mt-1 ps-mono text-[9px] uppercase tracking-[0.2em] text-white/35">
            {response.createdBy ?? "system"}{" // "}used {response.timesUsed ?? 0}x
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {[...(response.toneTags ?? []), ...response.voiceCompat].slice(0, 4).map((v) => (
              <span
                key={v}
                className="ps-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/60"
              >
                {v}
              </span>
            ))}
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => onToggleFavorite(response.id)}
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
          aria-label={response.favorite ? "Unfavorite" : "Favorite"}
          style={{
            boxShadow: response.favorite
              ? "inset 0 0 0 1px #ff7a00, 0 0 12px #ff7a00AA"
              : "inset 0 0 0 1px rgba(255,255,255,0.15)",
            background: response.favorite ? "rgba(255,122,0,0.15)" : "rgba(255,255,255,0.04)",
          }}
        >
          <Star
            className="w-4 h-4"
            style={{
              color: response.favorite ? "#ff7a00" : "rgba(255,255,255,0.5)",
              fill: response.favorite ? "#ff7a00" : "transparent",
            }}
          />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => onTogglePinned(response.id)}
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
          aria-label={response.pinned ? "Unpin" : "Pin"}
          style={{
            boxShadow: response.pinned
              ? "inset 0 0 0 1px #39ff14, 0 0 12px #39ff14AA"
              : "inset 0 0 0 1px rgba(255,255,255,0.15)",
            background: response.pinned ? "rgba(57,255,20,0.15)" : "rgba(255,255,255,0.04)",
          }}
        >
          <Pin
            className="w-4 h-4"
            style={{ color: response.pinned ? "#39ff14" : "rgba(255,255,255,0.5)", fill: response.pinned ? "#39ff14" : "transparent" }}
          />
        </motion.button>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onSpeak(response)}
          disabled={busy}
          className="flex-1 h-9 rounded-lg ps-mono text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-2"
          style={{
            color,
            boxShadow: `inset 0 0 0 1px ${color}80, 0 0 10px ${color}33`,
            background: `${color}14`,
          }}
        >
          <Play className="w-3.5 h-3.5" />
          {busy ? "VOICE…" : "SPEAK"}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onUseInChat(response)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white/70"
          style={{ boxShadow: "inset 0 0 0 1px rgba(57,255,20,0.35)", background: "rgba(57,255,20,0.08)" }}
          aria-label="Use in chat"
        >
          <Send className="w-3.5 h-3.5" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onGenerateAudio(response)}
          disabled={busy}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white/70"
          style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}
          aria-label="Generate audio"
        >
          <Download className="w-3.5 h-3.5" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onCopy(response)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white/70"
          style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}
          aria-label="Copy"
        >
          <Copy className="w-3.5 h-3.5" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onDetails(response)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white/70"
          style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}
          aria-label="Details"
        >
          <Info className="w-3.5 h-3.5" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onEdit(response)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white/70"
          style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}
          aria-label="Edit"
        >
          <Pencil className="w-3.5 h-3.5" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onDuplicate(response)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white/70"
          style={{ boxShadow: "inset 0 0 0 1px rgba(184,41,255,0.3)", background: "rgba(184,41,255,0.08)" }}
          aria-label="Duplicate"
        >
          <Copy className="w-3.5 h-3.5" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onDelete(response.id)}
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          aria-label="Delete"
          style={{ boxShadow: "inset 0 0 0 1px rgba(255,40,80,0.45)", color: "rgb(255,80,110)" }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </motion.button>
      </div>
    </NeonPanel>
  )
}
