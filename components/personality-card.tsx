"use client"

import { motion } from "framer-motion"
import { Check, Eye } from "lucide-react"
import type { Personality } from "@/lib/types"

const ACCENT_HEX: Record<Personality["accent"], string> = {
  cyan: "#00f0ff",
  purple: "#b829ff",
  pink: "#ff2d9c",
  green: "#39ff14",
  orange: "#ff7a00",
}

interface Props {
  personality: Personality
  selected?: boolean
  onSelect?: (id: string) => void
  onPreview?: (id: string) => void
}

export function PersonalityCard({ personality: p, selected, onSelect, onPreview }: Props) {
  const c = ACCENT_HEX[p.accent]
  return (
    <motion.div
      whileTap={{ scale: 0.99 }}
      className="rounded-xl ps-glass p-3"
      style={{
        boxShadow: selected
          ? `inset 0 0 0 1px ${c}, 0 0 22px ${c}66, 0 0 60px ${c}22`
          : `inset 0 0 0 1px ${c}33`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className="ps-heading text-lg leading-none"
              style={{ color: c, textShadow: `0 0 8px ${c}` }}
            >
              {p.name}
            </h3>
            {selected && (
              <span
                className="grid h-5 w-5 place-items-center rounded-full"
                style={{ background: `${c}33`, boxShadow: `inset 0 0 0 1px ${c}` }}
              >
                <Check className="h-3 w-3" style={{ color: c }} />
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12px] leading-snug text-white/75 text-pretty">
            {p.description}
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {p.traits.map((t) => (
          <span
            key={t}
            className="rounded-full px-2 py-0.5 ps-mono text-[9px] tracking-[0.2em] text-white/70"
            style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }}
          >
            {t.toUpperCase()}
          </span>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Stat label="HUMOR" v={p.humor} c={c} />
        <Stat label="HELP" v={p.helpfulness} c={c} />
        <Stat label="ENERGY" v={p.energy} c={c} />
        <Stat label="RANDOM" v={p.randomness} c={c} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onPreview?.(p.id)}
          className="flex items-center justify-center gap-2 rounded-lg py-2 ps-mono text-[10px] tracking-[0.25em] text-white/85"
          style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)" }}
        >
          <Eye className="h-3.5 w-3.5" />
          PREVIEW
        </button>
        <button
          type="button"
          onClick={() => onSelect?.(p.id)}
          className="rounded-lg py-2 ps-mono text-[10px] tracking-[0.3em]"
          style={{
            color: selected ? "#000" : c,
            background: selected
              ? `linear-gradient(180deg, ${c}, ${c}AA)`
              : `${c}14`,
            boxShadow: selected
              ? `inset 0 0 0 1px ${c}, 0 0 14px ${c}AA`
              : `inset 0 0 0 1px ${c}66`,
          }}
        >
          {selected ? "ACTIVE" : "SELECT"}
        </button>
      </div>
    </motion.div>
  )
}

function Stat({ label, v, c }: { label: string; v: number; c: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="ps-mono text-[8px] tracking-[0.2em] text-white/55">{label}</span>
        <span className="ps-mono text-[8px] tracking-widest" style={{ color: c }}>
          {v}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${v}%`, background: c, boxShadow: `0 0 8px ${c}` }}
        />
      </div>
    </div>
  )
}
