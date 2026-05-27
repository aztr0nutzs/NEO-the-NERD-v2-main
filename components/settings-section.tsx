"use client"

import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { NeonPanel } from "./neon-panel"

interface Props {
  title: string
  description?: string
  icon?: LucideIcon
  accent?: "cyan" | "purple" | "pink" | "green" | "orange"
  children: ReactNode
}

const COLOR: Record<NonNullable<Props["accent"]>, string> = {
  cyan: "#00f0ff",
  purple: "#b829ff",
  pink: "#ff2d9c",
  green: "#39ff14",
  orange: "#ff7a00",
}

export function SettingsSection({
  title,
  description,
  icon: Icon,
  accent = "cyan",
  children,
}: Props) {
  const c = COLOR[accent]
  return (
    <NeonPanel accent={accent} glow="soft" className="p-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <div
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
            style={{
              background: `${c}14`,
              boxShadow: `inset 0 0 0 1px ${c}66`,
            }}
          >
            <Icon className="h-4 w-4" style={{ color: c }} />
          </div>
        )}
        <div className="min-w-0">
          <p
            className="ps-mono text-[10px] tracking-[0.3em]"
            style={{ color: c }}
          >
            {title.toUpperCase()}
          </p>
          {description && (
            <p className="mt-0.5 text-[12px] text-white/60 text-pretty">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 space-y-2.5">{children}</div>
    </NeonPanel>
  )
}

export function Toggle({
  label,
  description,
  value,
  onChange,
  color = "#00f0ff",
  planned = false,
}: {
  label: string
  description?: string
  value: boolean
  onChange: (v: boolean) => void
  color?: string
  /**
   * When true, render a "PLANNED" pill next to the label. The toggle still
   * persists the user's choice via the store, but the consumer of the flag
   * is not implemented yet. Communicates "we'll remember your preference"
   * vs "this changes behavior right now" honestly to the user.
   */
  planned?: boolean
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg bg-black/40 px-3 py-2"
      style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="ps-mono text-[11px] tracking-[0.2em] text-white/85">
            {label.toUpperCase()}
          </p>
          {planned && <PlannedPill />}
        </div>
        {description && (
          <p className="text-[11px] text-white/45 text-pretty">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        aria-pressed={value}
        aria-label={planned ? `${label} (planned)` : label}
        className="relative h-7 w-12 shrink-0 rounded-full transition-colors touch-manipulation"
        style={{
          background: value ? `${color}33` : "rgba(255,255,255,0.08)",
          boxShadow: value
            ? `inset 0 0 0 1px ${color}, 0 0 10px ${color}AA`
            : "inset 0 0 0 1px rgba(255,255,255,0.15)",
        }}
      >
        <span
          className="absolute top-0.5 h-6 w-6 rounded-full transition-all"
          style={{
            left: value ? "22px" : "2px",
            background: value ? color : "#888",
            boxShadow: value ? `0 0 8px ${color}` : "none",
          }}
        />
      </button>
    </div>
  )
}

export function SegmentedSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  color = "#00f0ff",
  planned = false,
}: {
  label: string
  value: T
  options: T[]
  onChange: (v: T) => void
  color?: string
  /** See Toggle.planned — same semantics for selectors. */
  planned?: boolean
}) {
  return (
    <div className="rounded-lg bg-black/40 px-3 py-2"
      style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <p className="ps-mono text-[10px] tracking-[0.25em] text-white/65">
          {label.toUpperCase()}
        </p>
        {planned && <PlannedPill />}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = o === value
          return (
            <button
              key={o}
              type="button"
              onClick={() => onChange(o)}
              className="min-h-10 rounded-full px-4 py-2 ps-mono text-[10px] tracking-[0.25em] touch-manipulation"
              style={{
                color: active ? color : "rgba(255,255,255,0.65)",
                background: active ? `${color}1A` : "rgba(255,255,255,0.04)",
                boxShadow: active
                  ? `inset 0 0 0 1px ${color}, 0 0 12px ${color}66`
                  : "inset 0 0 0 1px rgba(255,255,255,0.1)",
              }}
            >
              {o.toUpperCase()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PlannedPill() {
  return (
    <span
      className="ps-mono shrink-0 rounded-full px-1.5 py-[1px] text-[8px] tracking-[0.25em] text-white/70"
      style={{
        background: "rgba(255,255,255,0.06)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)",
      }}
      title="Setting persists, but the feature that consumes it is not yet active"
    >
      PLANNED
    </span>
  )
}
