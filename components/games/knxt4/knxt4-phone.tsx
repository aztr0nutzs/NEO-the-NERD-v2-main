"use client"

import type { CSSProperties, ReactNode } from "react"
import { tokenColors } from "./knxt4-meta"

type IconName =
  | "play" | "pause" | "undo" | "redo" | "restart" | "hint" | "settings" | "menu" | "close" | "back"
  | "history" | "trophy" | "bolt" | "shield" | "brain" | "flame" | "target" | "grid" | "chip" | "wave"
  | "volume" | "haptic" | "palette" | "log" | "check" | "spark" | "eye" | "lock" | "arrow-r" | "arrow-d"
  | "plus" | "star" | "crown" | "cpu" | "wifi" | "cell" | "battery" | "home" | "sq" | "tri" | "flag" | "puzzle"

export const NeoIcon = ({ name, size = 18, color = "currentColor", stroke = 1.6 }: { name: IconName | string; size?: number; color?: string; stroke?: number }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round" } as const
  switch (name) {
    case "play": return (<svg {...p}><path d="M6 4l14 8-14 8z" fill={color} stroke="none" /></svg>)
    case "pause": return (<svg {...p}><rect x="6" y="4" width="4" height="16" fill={color} stroke="none" /><rect x="14" y="4" width="4" height="16" fill={color} stroke="none" /></svg>)
    case "undo": return (<svg {...p}><path d="M3 12a8 8 0 0 1 14-5l3-2v7h-7l3-2A5 5 0 0 0 7 12" /></svg>)
    case "redo": return (<svg {...p}><path d="M21 12a8 8 0 0 0-14-5L4 5v7h7L8 10A5 5 0 0 1 17 12" /></svg>)
    case "restart": return (<svg {...p}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>)
    case "hint": return (<svg {...p}><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.7.6 1 1.4 1 2.3v1h6v-1c0-.9.3-1.7 1-2.3A7 7 0 0 0 12 2z" /></svg>)
    case "settings": return (<svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4 16.9l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7.1 4.2l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>)
    case "menu": return (<svg {...p}><path d="M4 6h16M4 12h16M4 18h16" /></svg>)
    case "close": return (<svg {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>)
    case "back": return (<svg {...p}><path d="M15 18l-6-6 6-6" /></svg>)
    case "history": return (<svg {...p}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 7v5l3 2" /></svg>)
    case "trophy": return (<svg {...p}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 1 1-10 0V4z" /><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" /></svg>)
    case "bolt": return (<svg {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7z" fill={color} stroke="none" /></svg>)
    case "shield": return (<svg {...p}><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z" /></svg>)
    case "brain": return (<svg {...p}><path d="M12 4a3 3 0 0 0-3 3v.5a3 3 0 0 0-3 2.9V11a3 3 0 0 0 .5 1.7 3 3 0 0 0 0 3.5A3 3 0 0 0 6 18a3 3 0 0 0 6 0V4z" /><path d="M12 4a3 3 0 0 1 3 3v.5a3 3 0 0 1 3 2.9V11a3 3 0 0 1-.5 1.7 3 3 0 0 1 0 3.5A3 3 0 0 1 18 18a3 3 0 0 1-6 0V4z" /></svg>)
    case "flame": return (<svg {...p}><path d="M12 2c1 4 4 5 4 9a4 4 0 1 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3-1-3 0-6 0-8z" fill={color} stroke="none" /></svg>)
    case "target": return (<svg {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill={color} /></svg>)
    case "grid": return (<svg {...p}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>)
    case "chip": return (<svg {...p}><rect x="5" y="5" width="14" height="14" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /></svg>)
    case "wave": return (<svg {...p}><path d="M3 12c2 0 2-4 4-4s2 8 4 8 2-8 4-8 2 4 4 4" /></svg>)
    case "volume": return (<svg {...p}><path d="M11 5L6 9H2v6h4l5 4z" fill={color} stroke="none" /><path d="M15 8a5 5 0 0 1 0 8M18 5a9 9 0 0 1 0 14" /></svg>)
    case "haptic": return (<svg {...p}><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M2 9v6M22 9v6" /></svg>)
    case "palette": return (<svg {...p}><path d="M12 3a9 9 0 1 0 0 18c1.5 0 2.5-1 2.5-2.3 0-.6-.2-1.2-.6-1.6-.4-.4-.6-1-.6-1.6 0-1.3 1-2.3 2.3-2.3H17a4 4 0 0 0 4-4c0-3.3-4-6.2-9-6.2z" /><circle cx="7.5" cy="10.5" r="1" fill={color} /><circle cx="12" cy="7.5" r="1" fill={color} /><circle cx="16.5" cy="10.5" r="1" fill={color} /></svg>)
    case "log": return (<svg {...p}><path d="M4 4h12l4 4v12H4z" /><path d="M8 12h8M8 16h8M8 8h6" /></svg>)
    case "check": return (<svg {...p}><path d="M4 12l5 5L20 6" /></svg>)
    case "spark": return (<svg {...p}><path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4" /></svg>)
    case "eye": return (<svg {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>)
    case "lock": return (<svg {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>)
    case "arrow-r": return (<svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>)
    case "arrow-d": return (<svg {...p}><path d="M12 5v14M6 13l6 6 6-6" /></svg>)
    case "plus": return (<svg {...p}><path d="M12 5v14M5 12h14" /></svg>)
    case "star": return (<svg {...p}><path d="M12 2l3 7 7 .5-5.5 4.5L18 21l-6-4-6 4 1.5-7L2 9.5 9 9z" fill={color} stroke="none" /></svg>)
    case "crown": return (<svg {...p}><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z" fill={color} stroke="none" /></svg>)
    case "cpu": return (<svg {...p}><rect x="6" y="6" width="12" height="12" rx="1" /><rect x="9" y="9" width="6" height="6" /><path d="M9 2v2M12 2v2M15 2v2M9 20v2M12 20v2M15 20v2M2 9h2M2 12h2M2 15h2M20 9h2M20 12h2M20 15h2" /></svg>)
    case "wifi": return (<svg {...p}><path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 15.5a6 6 0 0 1 7 0M12 19h.01" /></svg>)
    case "cell": return (<svg {...p}><path d="M2 20l20-16v16z" fill={color} stroke="none" /></svg>)
    case "battery": return (<svg {...p}><rect x="2" y="7" width="18" height="10" rx="2" /><rect x="4" y="9" width="13" height="6" fill={color} stroke="none" /><path d="M22 10v4" /></svg>)
    case "home": return (<svg {...p}><path d="M3 12l9-9 9 9M5 10v10h14V10" /></svg>)
    case "sq": return (<svg {...p}><rect x="4" y="4" width="16" height="16" rx="2" /></svg>)
    case "tri": return (<svg {...p}><path d="M5 18L19 12L5 6Z" fill={color} stroke="none" /></svg>)
    case "flag": return (<svg {...p}><path d="M4 21V4h12l-2 4 2 4H4" /></svg>)
    case "puzzle": return (<svg {...p}><path d="M10 3v3a2 2 0 1 0 0 4v3h3a2 2 0 1 1 4 0h3v-4a2 2 0 1 0 0-4V3h-4a2 2 0 0 1-4 0z" /></svg>)
    default: return null
  }
}

const NeoStatusBar = () => (
  <div className="neo-status">
    <span>9:30</span>
    <div className="neo-status__dot" />
    <div className="neo-status__icons">
      <NeoIcon name="wifi" size={12} color="var(--cyan)" />
      <NeoIcon name="cell" size={12} color="var(--cyan)" />
      <NeoIcon name="battery" size={12} color="var(--cyan)" />
    </div>
  </div>
)

const NeoNavBar = () => (
  <div className="neo-nav">
    <div className="neo-nav__pill" />
  </div>
)

export const NeoPhone = ({ children }: { children: ReactNode; label?: string }) => (
  <div className="neo neo-phone">
    <div className="neo-phone__screen">
      <NeoStatusBar />
      <div className="neo-screen">{children}</div>
      <NeoNavBar />
    </div>
    <div className="neo-phone__bezel" />
  </div>
)

export const NeoAppBar = ({ title, sub, left, right }: { title?: string; sub?: string; left?: ReactNode; right?: ReactNode }) => (
  <div className="neo-appbar">
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {left || <button className="neo-icon-btn" style={{ width: 36, height: 36 }}><NeoIcon name="back" size={16} /></button>}
      <div>
        <div className="neo-appbar__brand">
          <b>N.E.O.</b><span style={{ color: "var(--ink)" }}>{title || "CONNECT"}</span>
        </div>
        {sub && <div className="neo-eyebrow" style={{ marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
    <div className="neo-appbar__right">{right}</div>
  </div>
)

export const NeoChip = ({ children, variant = "", icon, dot }: { children: ReactNode; variant?: string; icon?: IconName | string; dot?: boolean }) => (
  <span className={`neo-chip ${variant ? "neo-chip--" + variant : ""}`}>
    {dot && <span className="neo-chip__dot" />}
    {icon && <NeoIcon name={icon} size={10} />} {children}
  </span>
)

export const NeoDifficulty = ({ level = 3, color = "var(--cyan)" }: { level?: number; color?: string }) => (
  <div className="neo-diff" style={{ color }}>
    {[1, 2, 3, 4, 5].map((i) => <span key={i} className={i > level ? "off" : ""} style={{ background: i <= level ? color : undefined }} />)}
  </div>
)

export const BackBtn = ({ onBack }: { onBack: () => void }) => (
  <button className="neo-icon-btn" style={{ width: 36, height: 36 }} onClick={onBack}><NeoIcon name="back" size={16} /></button>
)

export const TokenChip = ({ skinId, player = 1, size = 28 }: { skinId: string; player?: 1 | 2; size?: number }) => {
  const [c1, c2, c3] = tokenColors(skinId, player)
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `radial-gradient(circle at 35% 28%, ${c1} 0%, ${c2} 30%, ${c3} 85%, #000 100%)`,
      boxShadow: `0 0 ${size / 3}px ${c2}, inset 0 0 0 1.5px rgba(255,255,255,0.5)`,
      flexShrink: 0,
    }} />
  )
}

export type NeoStyle = CSSProperties
