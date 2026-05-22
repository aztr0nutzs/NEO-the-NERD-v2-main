"use client"

type Emote = "idle" | "thinking" | "alert" | "happy" | "sad" | "smug" | "combo"
type Variant = "full" | "bust" | "head"

export const NeoRobot = ({
  emote = "idle",
  quip = null,
  size = 160,
  variant = "full",
}: {
  emote?: Emote
  quip?: string | null
  size?: number
  variant?: Variant
  intensity?: number
}) => {
  const palette = {
    idle: { eyeL: "#3CFF6B", eyeR: "#FF3CB5", rim: "#00B8FF", palm: "#00E8FF", accent: "#B36BFF" },
    thinking: { eyeL: "#FFE600", eyeR: "#FFE600", rim: "#FFE600", palm: "#FFE600", accent: "#FF9A2E" },
    alert: { eyeL: "#FF3556", eyeR: "#FF3556", rim: "#FF3556", palm: "#FF3556", accent: "#FF2EBA" },
    happy: { eyeL: "#BFFF1A", eyeR: "#3CFF6B", rim: "#BFFF1A", palm: "#3CFF6B", accent: "#00E8FF" },
    sad: { eyeL: "#5A7A99", eyeR: "#5A7A99", rim: "#5A7A99", palm: "#5A7A99", accent: "#3a4860" },
    smug: { eyeL: "#FF2EBA", eyeR: "#B36BFF", rim: "#FF2EBA", palm: "#FF2EBA", accent: "#FFE600" },
    combo: { eyeL: "#FF9A2E", eyeR: "#FFE600", rim: "#FF9A2E", palm: "#FFE600", accent: "#FF3556" },
  }[emote]

  const vbox = variant === "head" ? "-100 -160 200 220"
    : variant === "bust" ? "-100 -160 200 290"
      : "-110 -170 220 380"
  const aspect = variant === "head" ? 1.1 : variant === "bust" ? 1.45 : 1.73

  return (
    <div className={`neo-robot neo-robot--${emote} neo-robot--${variant}`} style={{ width: size, height: size * aspect }}>
      <svg viewBox={vbox} className="neo-robot__svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="rb-helmet" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#3a3f4d" />
            <stop offset="30%" stopColor="#1a1c25" />
            <stop offset="100%" stopColor="#08090c" />
          </linearGradient>
          <radialGradient id="rb-helmet-shine" cx="0.5" cy="0.15" r="0.6">
            <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
            <stop offset="60%" stopColor="rgba(255,255,255,0.02)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <linearGradient id="rb-armor" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2a2e3c" />
            <stop offset="50%" stopColor="#14161e" />
            <stop offset="100%" stopColor="#05060a" />
          </linearGradient>
          <radialGradient id="rb-visor-bg" cx="0.5" cy="0.5" r="0.7">
            <stop offset="0%" stopColor="#0d1024" />
            <stop offset="100%" stopColor="#020308" />
          </radialGradient>
          <radialGradient id="rb-eyeL" cx="0.5" cy="0.5">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="40%" stopColor={palette.eyeL} />
            <stop offset="100%" stopColor={palette.eyeL} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="rb-eyeR" cx="0.5" cy="0.5">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="40%" stopColor={palette.eyeR} />
            <stop offset="100%" stopColor={palette.eyeR} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="rb-orb" cx="0.4" cy="0.4">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="40%" stopColor={palette.palm} />
            <stop offset="100%" stopColor={palette.palm} stopOpacity="0" />
          </radialGradient>
        </defs>

        {variant === "full" && <ellipse cx="0" cy="200" rx="90" ry="14" fill="#000" opacity="0.55" />}

        {variant !== "head" && (
          <g className="neo-robot__body">
            {variant === "full" && (
              <g>
                <path d="M -38 110 L -42 180 Q -42 196 -28 198 L -8 198 Q -6 196 -10 188 L -10 116 Z" fill="url(#rb-armor)" stroke="#3a3f4d" strokeWidth="1" />
                <path d="M 38 110 L 42 180 Q 42 196 28 198 L 8 198 Q 6 196 10 188 L 10 116 Z" fill="url(#rb-armor)" stroke="#3a3f4d" strokeWidth="1" />
                <ellipse cx="-26" cy="150" rx="14" ry="8" fill="#1a1c25" stroke="#4a5060" strokeWidth="0.8" />
                <ellipse cx="26" cy="150" rx="14" ry="8" fill="#1a1c25" stroke="#4a5060" strokeWidth="0.8" />
                <path d="M -42 188 L -46 200 L -2 200 L -2 188 Z" fill="#0a0c12" stroke="#3a3f4d" strokeWidth="0.8" />
                <path d="M 42 188 L 46 200 L 2 200 L 2 188 Z" fill="#0a0c12" stroke="#3a3f4d" strokeWidth="0.8" />
              </g>
            )}
            <path d="M -56 30 L -64 80 Q -64 108 -40 116 L 40 116 Q 64 108 64 80 L 56 30 Z" fill="url(#rb-armor)" stroke="#3a3f4d" strokeWidth="1.2" />
            <line x1="0" y1="30" x2="0" y2="58" stroke="#3a3f4d" strokeWidth="0.7" opacity="0.7" />
            <ellipse cx="-58" cy="38" rx="22" ry="18" fill="url(#rb-armor)" stroke="#4a5060" strokeWidth="1" />
            <ellipse cx="58" cy="38" rx="22" ry="18" fill="url(#rb-armor)" stroke="#4a5060" strokeWidth="1" />
            <ellipse cx="-58" cy="34" rx="18" ry="6" fill="rgba(255,255,255,0.05)" />
            <ellipse cx="58" cy="34" rx="18" ry="6" fill="rgba(255,255,255,0.05)" />
            <g className="neo-robot__arm-left">
              <path d="M -74 44 Q -90 60 -94 88 Q -94 100 -82 102 Q -74 100 -68 84 L -64 50 Z" fill="url(#rb-armor)" stroke="#3a3f4d" strokeWidth="1" />
              <path d="M -94 88 Q -110 92 -116 76 Q -120 60 -108 50 Q -94 44 -82 56 Z" fill="url(#rb-armor)" stroke="#3a3f4d" strokeWidth="1" />
              <ellipse cx="-108" cy="56" rx="12" ry="14" fill="#0a0c12" stroke="#3a3f4d" strokeWidth="0.8" />
              <path d="M -118 50 Q -122 44 -116 42 L -114 48 M -114 46 Q -116 38 -110 38 L -110 46 M -106 44 Q -106 36 -100 38 L -102 48" stroke="#3a3f4d" strokeWidth="1.2" fill="#0a0c12" strokeLinejoin="round" />
              <circle cx="-108" cy="58" r="11" fill="none" stroke={palette.palm} strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 4px ${palette.palm})` }}><animate attributeName="r" values="9;12;9" dur="2.6s" repeatCount="indefinite" /></circle>
              <circle cx="-108" cy="58" r="7" fill="url(#rb-orb)"><animate attributeName="r" values="5;8;5" dur="2.6s" repeatCount="indefinite" /></circle>
              <circle cx="-108" cy="58" r="2.5" fill="#fff" opacity="0.9"><animate attributeName="opacity" values="0.6;1;0.6" dur="1.4s" repeatCount="indefinite" /></circle>
              <line x1="-100" y1="56" x2="-94" y2="60" stroke={palette.palm} strokeWidth="0.8" opacity="0.8" />
              <line x1="-100" y1="64" x2="-94" y2="68" stroke={palette.palm} strokeWidth="0.8" opacity="0.6" />
            </g>
            <g className="neo-robot__arm-right">
              <path d="M 74 44 Q 88 64 90 96 Q 90 108 78 112 Q 68 110 64 92 L 60 50 Z" fill="url(#rb-armor)" stroke="#3a3f4d" strokeWidth="1" />
              <ellipse cx="78" cy="106" rx="14" ry="12" fill="#0a0c12" stroke="#3a3f4d" strokeWidth="0.8" />
              <circle cx="72" cy="116" r="2" fill="#3a3f4d" />
              <circle cx="78" cy="118" r="2" fill="#3a3f4d" />
              <circle cx="84" cy="116" r="2" fill="#3a3f4d" />
            </g>
            <g className="neo-robot__reactor">
              <path d="M 0 28 L 32 44 L 32 86 L 0 102 L -32 86 L -32 44 Z" fill="#04050a" stroke="#3a3f4d" strokeWidth="1.4" />
              <path d="M 0 32 L 28 46 L 28 84 L 0 98 L -28 84 L -28 46 Z" fill="#0a0a14" stroke="#2a2e3c" strokeWidth="0.8" opacity="0.7" />
              <g className="neo-robot__ring1"><circle cx="0" cy="65" r="26" fill="none" stroke={palette.accent} strokeWidth="2.2" strokeDasharray="3 2" style={{ filter: `drop-shadow(0 0 3px ${palette.accent})` }} /><circle cx="0" cy="65" r="26" fill="none" stroke="#FF2EBA" strokeWidth="0.4" opacity="0.5" /></g>
              <g className="neo-robot__ring2"><circle cx="0" cy="65" r="20" fill="none" stroke="#3CFF6B" strokeWidth="1.8" strokeDasharray="5 3" style={{ filter: "drop-shadow(0 0 3px #3CFF6B)" }} /></g>
              <g className="neo-robot__ring3"><circle cx="0" cy="65" r="14" fill="none" stroke="#00E8FF" strokeWidth="1.6" strokeDasharray="2 1" style={{ filter: "drop-shadow(0 0 4px #00E8FF)" }} /></g>
              <circle cx="0" cy="65" r="8" fill="#0a1228" stroke="#00E8FF" strokeWidth="1.2" style={{ filter: "drop-shadow(0 0 6px #00E8FF)" }} />
              <text x="0" y="69" textAnchor="middle" fontSize="11" fontWeight="900" fontStyle="italic" fill="#00E8FF" fontFamily="'Orbitron','Chakra Petch',sans-serif" style={{ filter: "drop-shadow(0 0 3px #00E8FF)" }}>N</text>
              {[0, 90, 180, 270].map((deg) => <rect key={deg} x="-1" y="38" width="2" height="4" fill="#FF2EBA" transform={`rotate(${deg} 0 65)`} />)}
              <circle cx="0" cy="65" r="26" fill="none" stroke={palette.accent} strokeWidth="1" opacity="0.6"><animate attributeName="r" values="26;36;26" dur="3s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.5;0;0.5" dur="3s" repeatCount="indefinite" /></circle>
            </g>
            <rect x="-16" y="14" width="32" height="20" rx="3" fill="#1a1c25" stroke="#3a3f4d" strokeWidth="0.8" />
            <line x1="-12" y1="22" x2="12" y2="22" stroke={palette.rim} strokeWidth="0.6" opacity="0.7" />
          </g>
        )}

        <g className="neo-robot__head">
          <path d="M -68 -10 Q -82 -50 -76 -100 Q -64 -148 0 -150 Q 64 -148 76 -100 Q 82 -50 68 -10 Q 50 14 0 16 Q -50 14 -68 -10 Z" fill="url(#rb-helmet)" stroke="#5a6070" strokeWidth="1.5" />
          <path d="M -68 -10 Q -82 -50 -76 -100 Q -64 -148 0 -150 Q 64 -148 76 -100 Q 82 -50 68 -10 Q 50 14 0 16 Q -50 14 -68 -10 Z" fill="url(#rb-helmet-shine)" />
          <path d="M 0 -150 Q 0 -100 0 -55" stroke="#3a3f4d" strokeWidth="1" fill="none" opacity="0.7" />
          <path d="M -52 -136 Q -68 -100 -68 -50 Q -64 -25 -56 -10" stroke="#3a3f4d" strokeWidth="0.8" fill="none" opacity="0.6" />
          <path d="M 52 -136 Q 68 -100 68 -50 Q 64 -25 56 -10" stroke="#3a3f4d" strokeWidth="0.8" fill="none" opacity="0.6" />
          <path d="M -62 -62 Q 0 -78 62 -62" stroke="#3a3f4d" strokeWidth="0.8" fill="none" opacity="0.5" />
          <ellipse cx="-72" cy="-30" rx="8" ry="14" fill="#1a1c25" stroke="#3a3f4d" strokeWidth="0.8" />
          <ellipse cx="72" cy="-30" rx="8" ry="14" fill="#1a1c25" stroke="#3a3f4d" strokeWidth="0.8" />
          <circle cx="-76" cy="-30" r="2" fill="#FF3556" opacity="0.85" />
          <circle cx="76" cy="-30" r="2" fill="#FF3556" opacity="0.85" />
          <path d="M -58 -58 Q -62 -38 -56 -28 Q 0 -22 56 -28 Q 62 -38 58 -58 Q 0 -68 -58 -58 Z" fill="url(#rb-visor-bg)" stroke="rgba(0,0,0,0.6)" strokeWidth="0.5" />
          <ellipse cx="-26" cy="-44" rx="22" ry="10" fill="url(#rb-eyeL)" opacity="0.95" />
          <ellipse cx="26" cy="-44" rx="22" ry="10" fill="url(#rb-eyeR)" opacity="0.95" />
          <rect x="-50" y="-48" width="34" height="6" rx="2" fill={palette.eyeL} style={{ filter: `drop-shadow(0 0 5px ${palette.eyeL}) drop-shadow(0 0 10px ${palette.eyeL})` }}>
            {emote === "thinking" && <animate attributeName="opacity" values="1;0.4;1" dur="1.4s" repeatCount="indefinite" />}
          </rect>
          <rect x="16" y="-48" width="34" height="6" rx="2" fill={palette.eyeR} style={{ filter: `drop-shadow(0 0 5px ${palette.eyeR}) drop-shadow(0 0 10px ${palette.eyeR})` }}>
            {emote === "thinking" && <animate attributeName="opacity" values="0.4;1;0.4" dur="1.4s" repeatCount="indefinite" />}
          </rect>
          {emote === "thinking" && (
            <>
              <rect x="-50" y="-48" width="8" height="6" fill="#fff" opacity="0.85"><animate attributeName="x" values="-50;-24;-50" dur="1.6s" repeatCount="indefinite" /></rect>
              <rect x="16" y="-48" width="8" height="6" fill="#fff" opacity="0.85"><animate attributeName="x" values="16;42;16" dur="1.6s" repeatCount="indefinite" /></rect>
            </>
          )}
          <path d="M -56 -60 Q 0 -68 56 -60" fill="none" stroke={palette.rim} strokeWidth="1.6" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 3px ${palette.rim})` }} />
          <path d="M -28 -54 L 0 -50 L 28 -54" fill="none" stroke="#00E8FF" strokeWidth="1.5" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 3px #00E8FF)" }} />
          <path d="M -56 -26 Q -64 -10 -56 6" fill="none" stroke="#00B8FF" strokeWidth="1.8" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 3px #00B8FF)" }} />
          <path d="M 56 -26 Q 64 -10 56 6" fill="none" stroke={palette.accent} strokeWidth="1.8" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 3px ${palette.accent})` }} />
          <line x1="0" y1="-150" x2="0" y2="-160" stroke="#3a3f4d" strokeWidth="2" />
          <circle cx="0" cy="-162" r="3" fill={palette.rim}><animate attributeName="r" values="2.5;3.5;2.5" dur="1.4s" repeatCount="indefinite" /></circle>
          <circle cx="0" cy="-162" r="6" fill={palette.rim} opacity="0.35"><animate attributeName="r" values="5;9;5" dur="1.4s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.35;0;0.35" dur="1.4s" repeatCount="indefinite" /></circle>
        </g>

        {variant === "full" && (
          <g opacity="0.7">
            <circle cx="-90" cy="-120" r="1.2" fill={palette.rim}><animate attributeName="cy" values="-100;-160;-100" dur="6s" repeatCount="indefinite" /><animate attributeName="opacity" values="0;1;0" dur="6s" repeatCount="indefinite" /></circle>
            <circle cx="92" cy="-110" r="1.2" fill={palette.accent}><animate attributeName="cy" values="-90;-150;-90" dur="5.4s" repeatCount="indefinite" /><animate attributeName="opacity" values="0;1;0" dur="5.4s" repeatCount="indefinite" /></circle>
            <circle cx="-60" cy="100" r="1" fill="#3CFF6B"><animate attributeName="cy" values="120;40;120" dur="7s" repeatCount="indefinite" /><animate attributeName="opacity" values="0;1;0" dur="7s" repeatCount="indefinite" /></circle>
            <circle cx="70" cy="120" r="1" fill="#FF2EBA"><animate attributeName="cy" values="140;60;140" dur="5.8s" repeatCount="indefinite" /><animate attributeName="opacity" values="0;1;0" dur="5.8s" repeatCount="indefinite" /></circle>
          </g>
        )}
      </svg>
      {quip && <div className={`neo-robot__bubble neo-robot__bubble--${emote}`}><span>{quip}</span></div>}
    </div>
  )
}
