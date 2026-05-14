"use client"

interface Props {
  label: string
  value: number
  onChange: (v: number) => void
  color?: string
  min?: number
  max?: number
  unit?: string
}

export function ControlSlider({
  label,
  value,
  onChange,
  color = "#00f0ff",
  min = 0,
  max = 100,
  unit = "",
}: Props) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="ps-mono text-[10px] tracking-[0.25em] text-white/65">
          {label.toUpperCase()}
        </span>
        <span
          className="ps-mono text-[10px] tracking-widest"
          style={{ color, textShadow: `0 0 6px ${color}` }}
        >
          {value}
          {unit}
        </span>
      </div>
      <div
        className="relative h-2 rounded-full"
        style={{
          background: "rgba(255,255,255,0.08)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 10px ${color}`,
          }}
        />
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border"
          style={{
            left: `${pct}%`,
            background: "#000",
            borderColor: color,
            boxShadow: `0 0 10px ${color}`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  )
}
