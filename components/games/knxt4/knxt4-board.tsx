"use client"

import { useEffect, useMemo, useState } from "react"
import type { Board, Player } from "./knxt4-core"
import { COLS, ROWS } from "./knxt4-core"
import { tokenAnim, tokenColors } from "./knxt4-meta"

interface BoardProps {
  board: Board
  curPlayer: Player
  myPlayer?: Player
  hotCol: number | null
  setHotCol: (c: number | null) => void
  onDrop: (c: number) => void
  winCells: { r: number; c: number }[]
  showWinLine?: boolean | number
  disabled: boolean
  skinId?: string
  peekCol: number | null
  bombMode?: boolean
  onTokenTarget?: (r: number, c: number) => void
  threatCells?: { r: number; c: number }[]
  lastDrop?: { r: number; c: number } | null
  tilt?: "normal" | "flat" | "high"
}

const SkinIcon = ({ skinId }: { skinId: string }) => {
  const v = { viewBox: "-10 -10 20 20", width: "74%", height: "74%" }
  switch (skinId) {
    case "pulse":
      return <svg {...v}><ellipse rx="7.5" ry="2.5" stroke="currentColor" strokeWidth="0.9" fill="none" opacity="0.8" /><ellipse rx="7.5" ry="2.5" stroke="currentColor" strokeWidth="0.9" fill="none" opacity="0.8" transform="rotate(60)" /><ellipse rx="7.5" ry="2.5" stroke="currentColor" strokeWidth="0.9" fill="none" opacity="0.8" transform="rotate(120)" /><circle r="1.8" fill="currentColor" /></svg>
    case "chrome":
      return <svg {...v}><g stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round"><path d="M -7 -5 L -3 -5 L -3 -2" /><path d="M 7 5 L 3 5 L 3 2" /><path d="M -7 4 L 0 4 L 0 7" /><path d="M 7 -3 L 2 -3" /><path d="M -3 -2 L 3 -2" /><path d="M -3 2 L 3 2" /></g><rect x="-2" y="-2" width="4" height="4" fill="currentColor" opacity="0.9" /><circle cx="-3" cy="-5" r="1.2" fill="currentColor" /><circle cx="3" cy="5" r="1.2" fill="currentColor" /><circle cx="0" cy="4" r="0.8" fill="currentColor" /></svg>
    case "aurora":
      return <svg {...v}><g stroke="currentColor" strokeWidth="0.7" strokeLinejoin="round"><path d="M -7 6 L -4 -6 L -1 5 Z" fill="currentColor" fillOpacity="0.35" /><path d="M -2 6 L 1 -7 L 4 6 Z" fill="currentColor" fillOpacity="0.6" /><path d="M 3 6 L 6 -4 L 8 6 Z" fill="currentColor" fillOpacity="0.3" /></g><circle r="0.7" fill="#fff" cx="1" cy="-3" /><circle r="0.4" fill="#fff" cx="-4" cy="0" opacity="0.7" /></svg>
    case "void":
      return <svg {...v}><circle r="6.8" stroke="currentColor" strokeWidth="0.4" fill="none" opacity="0.25" /><path d="M -7 0 Q -2 -5 0 0 Q 2 5 7 0" stroke="currentColor" strokeWidth="1.3" fill="none" opacity="0.85" strokeLinecap="round" /><path d="M 0 -7 Q 5 -2 0 0 Q -5 2 0 7" stroke="currentColor" strokeWidth="1.3" fill="none" opacity="0.85" strokeLinecap="round" /><circle r="1.6" fill="currentColor" /><circle r="0.5" fill="#fff" cx="5" cy="-3" /><circle r="0.4" fill="#fff" cx="-4" cy="4" /><circle r="0.3" fill="#fff" cx="6" cy="3" /><circle r="0.3" fill="#fff" cx="-6" cy="-1" /></svg>
    case "inferno":
      return <svg {...v}><path d="M 0 7 C -5 4 -4 -1 -1.5 -3 C -2 0 0 -1 0.5 -7 C 3.5 -3 5.5 1 4.5 5 C 3.5 6.5 1.5 7.5 0 7 Z" fill="currentColor" stroke="currentColor" strokeWidth="0.4" strokeLinejoin="round" /><path d="M 0 5 C -2 3 -1.5 0 0 -2 C 0.5 0 1.5 1.5 1.5 3.5 C 1.5 4.5 0.8 5.2 0 5 Z" fill="#fff" opacity="0.55" /></svg>
    case "glitch":
      return <svg {...v}><g fill="currentColor"><rect x="-7" y="-4" width="3" height="3" /><rect x="-3" y="-7" width="3" height="3" opacity="0.7" /><rect x="1" y="-5" width="3" height="3" /><rect x="4" y="-2" width="3" height="3" opacity="0.6" /><rect x="-6" y="0" width="3" height="3" opacity="0.7" /><rect x="-2" y="2" width="3" height="3" /><rect x="2" y="0" width="3" height="3" opacity="0.6" /><rect x="-5" y="4" width="3" height="3" /><rect x="0" y="5" width="3" height="3" opacity="0.55" /><rect x="4" y="4" width="3" height="3" opacity="0.85" /></g></svg>
    case "neo":
      return <svg {...v}><path d="M -7 5 L -7 -2 L -3.5 1.5 L 0 -6 L 3.5 1.5 L 7 -2 L 7 5 Z" fill="currentColor" stroke="currentColor" strokeWidth="0.5" strokeLinejoin="round" /><circle cx="0" cy="-6" r="1.2" fill="#fff" /><circle cx="-7" cy="-2" r="1" fill="#fff" opacity="0.85" /><circle cx="7" cy="-2" r="1" fill="#fff" opacity="0.85" /><rect x="-7" y="5" width="14" height="1.6" fill="currentColor" opacity="0.6" /></svg>
    default:
      return <svg {...v}><circle r="2.5" fill="currentColor" /><path d="M -7 0 A 7 7 0 0 1 0 -7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /><path d="M 7 0 A 7 7 0 0 1 0 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /><path d="M -4.5 0 A 4.5 4.5 0 0 1 0 -4.5" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7" strokeLinecap="round" /><path d="M 4.5 0 A 4.5 4.5 0 0 1 0 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7" strokeLinecap="round" /></svg>
  }
}

const TokenDisc = ({ player, skinId = "core", dropping, dropFrom, win, ghost, small }: {
  player: Player
  skinId?: string
  dropping?: boolean
  dropFrom?: number
  win?: boolean
  ghost?: boolean
  small?: boolean
}) => {
  const [c1, c2, c3] = tokenColors(skinId, player)
  const anim = tokenAnim(skinId)
  const animClass = anim ? `skin-anim-${anim}` : ""
  return (
    <div className={`neo3d-token ${dropping ? "neo3d-token--dropping" : ""} ${animClass}`} style={{ "--drop-from": dropFrom ? `${dropFrom}px` : "-360px", opacity: ghost ? 0.32 : 1 } as React.CSSProperties}>
      <div className="neo3d-token__face" style={{ background: `radial-gradient(circle at 36% 28%, ${c1} 0%, ${c2} 38%, ${c3} 85%, #000 100%)`, boxShadow: `0 0 ${win ? 24 : small ? 7 : 14}px ${c2}, 0 0 0 1.5px rgba(255,255,255,0.45), inset 0 0 0 1.5px rgba(255,255,255,0.55), inset 0 -3px 6px rgba(0,0,0,0.45), inset 0 2px 4px rgba(255,255,255,0.25)`, color: c2 }} />
      <div className="neo3d-token__medal" style={{ background: "radial-gradient(circle at 50% 45%, #06070d 0%, #02030a 80%, #000 100%)", boxShadow: `inset 0 0 0 1px ${c2}bb, inset 0 0 10px ${c2}66, inset 0 1px 2px rgba(0,0,0,0.8)` }} />
      {!ghost && <div className="neo3d-token__icon" style={{ color: "#fff", filter: `drop-shadow(0 0 2px ${c2}) drop-shadow(0 0 6px ${c2}) drop-shadow(0 0 12px ${c2}aa)` }}><SkinIcon skinId={skinId} /></div>}
      {win && <div style={{ position: "absolute", inset: -4, borderRadius: "50%", border: `2px solid ${c2}`, opacity: 0.7, animation: "threat-pulse 0.8s ease-in-out infinite" }} />}
    </div>
  )
}

const ChipStackTube = ({ skinId = "core", count = 12 }: { skinId?: string; count?: number }) => (
  <div className="lab-tube">
    <div className="lab-tube__cap lab-tube__cap--top" />
    <div className="lab-tube__cyl">
      <div className="lab-tube__glass" />
      <div className="lab-tube__stack">
        {Array.from({ length: count }, (_, i) => {
          const player = i % 2 === 0 ? 1 : 2
          const [cc1, cc2] = tokenColors(skinId, player)
          return <div key={i} className="lab-tube__chip" style={{ background: `linear-gradient(180deg, ${cc1} 0%, ${cc2} 55%, #000 100%)`, boxShadow: `0 0 6px ${cc2}, inset 0 -1px 2px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.4)` }} />
        })}
      </div>
      <div className="lab-tube__highlight" />
    </div>
    <div className="lab-tube__cap lab-tube__cap--bot" />
  </div>
)

const StatusMeter = ({ player1Pct = 60, player2Pct = 35 }: { player1Pct?: number; player2Pct?: number }) => (
  <div className="lab-meters">
    <div className="lab-meter lab-meter--green">
      <div className="lab-meter__fill" style={{ height: `${player1Pct}%` }} />
      <div className="lab-meter__digits">01<br />10<br />11<br />00<br />10<br />01</div>
      <div className="lab-meter__cap lab-meter__cap--top" />
      <div className="lab-meter__cap lab-meter__cap--bot" />
    </div>
    <div className="lab-meter lab-meter--red">
      <div className="lab-meter__fill" style={{ height: `${player2Pct}%` }} />
      <div className="lab-meter__label">F<br />U<br />E<br />L</div>
      <div className="lab-meter__cap lab-meter__cap--top" />
      <div className="lab-meter__cap lab-meter__cap--bot" />
    </div>
  </div>
)

const TopPipes = ({ curPlayer }: { curPlayer: Player }) => {
  const portalColor = curPlayer === 1 ? "var(--cyan)" : "var(--magenta)"
  return (
    <div className="lab-toppipes">
      <div className="lab-portal" style={{ color: portalColor }}>
        <svg viewBox="0 0 56 32" width="56" height="32">
          <ellipse cx="28" cy="6" rx="14" ry="4" fill="none" stroke="currentColor" strokeWidth="1.8" opacity="0.95" />
          <ellipse cx="28" cy="6" rx="9" ry="2.5" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
          <path d="M 14 6 L 24 24 L 32 24 L 42 6" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="lab-pipe">
        <div className="lab-pipe__bend lab-pipe__bend--left" />
        <div className="lab-pipe__tube">
          <div className="lab-pipe__glass" />
          <div className="lab-pipe__shine" />
          <div className="lab-pipe__ring" style={{ left: "12%" }} />
          <div className="lab-pipe__ring" style={{ left: "38%" }} />
          <div className="lab-pipe__ring" style={{ left: "62%" }} />
          <div className="lab-pipe__ring" style={{ left: "88%" }} />
          <div className="lab-pipe__valve"><span /></div>
        </div>
        <div className="lab-pipe__bend lab-pipe__bend--right" />
      </div>
    </div>
  )
}

export function Knxt4Board({
  board,
  myPlayer = 1,
  curPlayer = 1,
  onDrop,
  onTokenTarget,
  hotCol,
  setHotCol,
  winCells = [],
  showWinLine = false,
  skinId = "core",
  bombMode = false,
  peekCol = null,
  threatCells = [],
  disabled = false,
  lastDrop = null,
  tilt = "normal",
}: BoardProps) {
  const colorVar = curPlayer === 1 ? "var(--cyan)" : "var(--magenta)"
  const validColsList = useMemo(() => {
    const out: number[] = []
    for (let c = 0; c < COLS; c++) if (board[0][c] === 0) out.push(c)
    return out
  }, [board])

  const [dropFx, setDropFx] = useState<{ key: number; col: number | null; r: number | null; player: Player }>({ key: 0, col: null, r: null, player: 1 })
  useEffect(() => {
    if (lastDrop && board[lastDrop.r]?.[lastDrop.c]) {
      setDropFx({ key: Date.now(), col: lastDrop.c, r: lastDrop.r, player: board[lastDrop.r][lastDrop.c] as Player })
    }
  }, [lastDrop, board])

  let p1Count = 0
  let p2Count = 0
  for (const row of board) for (const cell of row) {
    if (cell === 1) p1Count++
    else if (cell === 2) p2Count++
  }
  const p1Pct = Math.max(8, Math.min(100, 30 + p1Count * 5))
  const p2Pct = Math.max(8, Math.min(100, 30 + p2Count * 5))

  const dropRows = useMemo(() => Array.from({ length: COLS }, (_, c) => {
    for (let r = ROWS - 1; r >= 0; r--) if (board[r][c] === 0) return r
    return -1
  }), [board])
  const ghostRow = hotCol != null ? dropRows[hotCol] : -1
  const ghostValid = hotCol != null && ghostRow >= 0 && !bombMode

  const winLine = useMemo(() => {
    if (!showWinLine || winCells.length < 2) return null
    const a = winCells[0]
    const b = winCells[winCells.length - 1]
    const cw = 100 / 7
    const ch = 100 / 6
    const x1 = (a.c + 0.5) * cw
    const y1 = (a.r + 0.5) * ch
    const x2 = (b.c + 0.5) * cw
    const y2 = (b.r + 0.5) * ch
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.sqrt(dx * dx + dy * dy)
    const ang = Math.atan2(dy, dx) * 180 / Math.PI
    const winColor = winCells.length && board[winCells[0].r][winCells[0].c] === 1 ? "var(--cyan)" : "var(--magenta)"
    return { left: `${x1}%`, top: `${y1}%`, width: `${len}%`, transform: `rotate(${ang}deg) translateY(-50%)`, "--win-color": winColor } as React.CSSProperties
  }, [showWinLine, winCells, board])

  const winKey = useMemo(() => showWinLine ? Date.now() : 0, [showWinLine])

  return (
    <div className="neo3d-stage lab-stage">
      <div className="lab-arc" />
      <TopPipes curPlayer={curPlayer} />
      <div className="neo3d-droparrows lab-droparrows">
        {Array.from({ length: COLS }, (_, c) => {
          const isValid = validColsList.includes(c)
          const isHot = c === hotCol && !disabled
          return (
            <div
              key={c}
              className={`neo3d-droparrow neo3d-droparrow--${curPlayer === 1 ? "p1" : "p2"} ${bombMode ? "neo3d-droparrow--bomb" : ""} ${isHot ? "neo3d-droparrow--hot" : ""} ${isValid ? "" : "neo3d-droparrow--invalid"}`}
              onMouseEnter={() => !disabled && isValid && setHotCol(c)}
              onMouseLeave={() => !disabled && setHotCol(null)}
              onClick={() => !disabled && isValid && !bombMode && onDrop(c)}
            >
              <svg width="20" height="16" viewBox="0 0 22 18" style={{ color: "currentColor" }}><path d="M3 3 L11 13 L19 3" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {peekCol === c && <div className="neo3d-peek"><svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" strokeWidth="2" /></svg></div>}
            </div>
          )
        })}
      </div>

      <div className="lab-mainrow">
        <div className="lab-side lab-side--left"><ChipStackTube skinId={skinId} count={12} /></div>
        <div className={`neo3d-board lab-frame ${tilt === "flat" ? "neo3d-board--flat" : tilt === "high" ? "neo3d-board--high" : ""}`}>
          <div className="lab-frame__rim">
            <div className="lab-frame__inner">
              <div className="lab-particles" aria-hidden>
                <i style={{ left: "8%", animationDelay: "-0.3s" }} /><i style={{ left: "22%", animationDelay: "-2.1s" }} /><i style={{ left: "38%", animationDelay: "-4.2s" }} /><i style={{ left: "52%", animationDelay: "-1.5s" }} /><i style={{ left: "68%", animationDelay: "-3.6s" }} /><i style={{ left: "84%", animationDelay: "-0.9s" }} /><i style={{ left: "92%", animationDelay: "-2.7s" }} />
              </div>
              {hotCol != null && !disabled && !bombMode && <div className={`lab-hotbeam lab-hotbeam--${curPlayer === 1 ? "p1" : "p2"}`} style={{ left: `${(hotCol + 0.5) * 100 / 7}%` }} />}
              {dropFx.col != null && <div key={`beam-${dropFx.key}`} className={`lab-dropbeam lab-dropbeam--${dropFx.player === 1 ? "p1" : "p2"}`} style={{ left: `${(dropFx.col + 0.5) * 100 / 7}%` }} />}
              <div className="neo3d-grid">
                {board.map((row, r) => row.map((cell, c) => {
                  const isHot = c === hotCol && !disabled
                  const isThreat = threatCells.some((t) => t.r === r && t.c === c)
                  const isGhostHere = ghostValid && r === ghostRow && c === hotCol && cell === 0
                  const winning = winCells.some((w) => w.r === r && w.c === c)
                  const justDropped = lastDrop && lastDrop.r === r && lastDrop.c === c
                  const canBomb = bombMode && cell === 3 - myPlayer
                  return (
                    <div
                      key={`${r}-${c}`}
                      className={`neo3d-cell lab-cell ${isHot && !bombMode ? `neo3d-col-hot ${curPlayer === 2 ? "neo3d-col--p2" : ""}` : ""} ${canBomb ? "neo3d-cell--target" : ""} ${justDropped ? "neo3d-flash" : ""}`}
                      style={canBomb ? { color: "var(--orange)" } : justDropped ? { color: cell === 1 ? "var(--cyan)" : "var(--magenta)" } : undefined}
                      onClick={() => {
                        if (disabled) return
                        if (bombMode && cell === 3 - myPlayer) onTokenTarget?.(r, c)
                        else if (!bombMode && validColsList.includes(c)) onDrop(c)
                      }}
                      onMouseEnter={() => {
                        if (disabled || bombMode) return
                        if (validColsList.includes(c)) setHotCol(c)
                      }}
                    >
                      {cell !== 0 && <TokenDisc player={cell as Player} skinId={skinId} win={winning} dropping={!!justDropped} dropFrom={justDropped ? -((ROWS - r) * 56 + 60) : 0} />}
                      {isGhostHere && <TokenDisc player={curPlayer} skinId={skinId} ghost />}
                      {isThreat && cell === 0 && <div className="neo3d-threat" style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }} />}
                    </div>
                  )
                }))}
                {winLine && <div className="neo3d-winline" style={winLine} />}
                {dropFx.col != null && dropFx.r != null && (
                  <div key={`sparks-${dropFx.key}`} className={`lab-sparks lab-sparks--${dropFx.player === 1 ? "p1" : "p2"}`} style={{ left: `${(dropFx.col + 0.5) * 100 / 7}%`, top: `${(dropFx.r + 0.5) * 100 / 6}%` }}>
                    {Array.from({ length: 10 }, (_, i) => <i key={i} style={{ "--ang": `${i * 36}deg`, "--dist": `${22 + (i % 3) * 4}px`, animationDelay: `${i * 0.012}s` } as React.CSSProperties} />)}
                    <span className="lab-sparks__ring" />
                  </div>
                )}
                {showWinLine && winCells.length > 0 && (
                  <div key={`shock-${winKey}`} className="lab-shockwave" style={{ "--shock-color": board[winCells[0].r][winCells[0].c] === 1 ? "var(--cyan)" : "var(--magenta)" } as React.CSSProperties}>
                    <span /><span /><span />
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="lab-base">
            <div className="lab-base__bar" />
            <div className="lab-base__foot lab-base__foot--left" />
            <div className="lab-base__foot lab-base__foot--right" />
          </div>
        </div>
        <div className="lab-side lab-side--right"><StatusMeter player1Pct={p1Pct} player2Pct={p2Pct} /></div>
      </div>

      <div className="neo3d-collabels lab-collabels">
        {Array.from({ length: 7 }, (_, c) => <span key={c} style={hotCol === c ? { color: colorVar } : undefined}>C-{String(c + 1).padStart(2, "0")}</span>)}
      </div>
    </div>
  )
}
