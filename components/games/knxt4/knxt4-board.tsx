"use client"

import { useMemo } from "react"
import type { Board, Player } from "./knxt4-core"
import { COLS, ROWS } from "./knxt4-core"

interface BoardProps {
  board: Board
  curPlayer: Player
  hotCol: number | null
  setHotCol: (c: number | null) => void
  onDrop: (c: number) => void
  winCells: { r: number; c: number }[]
  disabled: boolean
  peekCol: number | null
  bombMode?: boolean
  onTokenTarget?: (r: number, c: number) => void
  lastDrop?: { r: number; c: number } | null
  p1Count: number
  p2Count: number
}

function Token({ player, win = false, ghost = false, dropping = false }: {
  player: Player
  win?: boolean
  ghost?: boolean
  dropping?: boolean
}) {
  const classes = [
    "k-token",
    player === 1 ? "k-token--p1" : "k-token--p2",
    win && "k-token--win",
    ghost && "k-token--ghost",
    dropping && "k-token--dropping",
  ]
    .filter(Boolean)
    .join(" ")
  return (
    <div className={classes}>
      <div className="k-token__core" />
    </div>
  )
}

/* Chip-stack visual inside the left tube — alternating cyan/magenta chips. */
function ChipStack() {
  return (
    <div className="k-tube__stack">
      {Array.from({ length: 11 }, (_, i) => {
        const p1 = i % 2 === 0
        const c1 = p1 ? "#B5F8FF" : "#FFC2EE"
        const c2 = p1 ? "#00E8FF" : "#FF2EBA"
        return (
          <div
            key={i}
            className="k-tube__chip"
            style={{
              background: `linear-gradient(180deg, ${c1} 0%, ${c2} 55%, #000 100%)`,
              boxShadow: `0 0 6px ${c2}, inset 0 -1px 2px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.4)`,
            }}
          />
        )
      })}
    </div>
  )
}

/* Right-side dual meters: green (p1 progress) + red (FUEL). */
function MeterColumn({ p1Pct, p2Pct }: { p1Pct: number; p2Pct: number }) {
  return (
    <div className="k-meters">
      <div className="k-meter k-meter--green">
        <div className="k-meter__fill" style={{ height: `${p1Pct}%` }} />
        <div className="k-meter__digits">
          10<br />11<br />00<br />10<br />01
        </div>
      </div>
      <div className="k-meter k-meter--red">
        <div className="k-meter__fill" style={{ height: `${p2Pct}%` }} />
        <div className="k-meter__label">FUEL</div>
      </div>
    </div>
  )
}

export function Knxt4Board({
  board,
  curPlayer,
  hotCol,
  setHotCol,
  onDrop,
  winCells,
  disabled,
  peekCol,
  bombMode = false,
  onTokenTarget,
  lastDrop = null,
  p1Count,
  p2Count,
}: BoardProps) {
  const validCols = useMemo(() => {
    const out: number[] = []
    for (let c = 0; c < COLS; c++) if (board[0][c] === 0) out.push(c)
    return out
  }, [board])

  const dropRows = useMemo(() => {
    return Array.from({ length: COLS }, (_, c) => {
      for (let r = ROWS - 1; r >= 0; r--) if (board[r][c] === 0) return r
      return -1
    })
  }, [board])

  const winSet = useMemo(() => new Set(winCells.map((w) => `${w.r},${w.c}`)), [winCells])

  const p1Pct = Math.max(8, Math.min(100, 30 + p1Count * 5))
  const p2Pct = Math.max(8, Math.min(100, 30 + p2Count * 5))

  return (
    <div className="k-stage">
      {/* Side chip-reservoir tube (left) */}
      <div className="k-tube k-tube--left">
        <div className="k-tube__cap k-tube__cap--top" />
        <div className="k-tube__glass">
          <ChipStack />
        </div>
        <div className="k-tube__cap k-tube__cap--bot" />
      </div>

      {/* Right gauges */}
      <MeterColumn p1Pct={p1Pct} p2Pct={p2Pct} />

      {/* Glass reactor frame */}
      <div className="k-frame">
        {/* Top pipe with portal */}
        <div className="k-pipe">
          <div className="k-pipe__cap k-pipe__cap--l" />
          <div className="k-pipe__tube">
            <div className="k-pipe__ring" style={{ left: "12%" }} />
            <div className="k-pipe__ring" style={{ left: "38%" }} />
            <div className="k-pipe__ring" style={{ left: "62%" }} />
            <div className="k-pipe__ring" style={{ left: "88%" }} />
            <div className="k-pipe__valve" />
          </div>
          <div className="k-pipe__cap k-pipe__cap--r" />
        </div>
        <div className={`k-portal${curPlayer === 2 ? " k-portal--p2" : ""}`}>
          <div className="k-portal__halo" />
          <div className="k-portal__cone" />
        </div>

        {/* Drop arrows */}
        <div className="k-arrows">
          {Array.from({ length: COLS }, (_, c) => {
            const isValid = validCols.includes(c)
            const isHot = c === hotCol && !disabled && !bombMode
            const isPeek = peekCol === c
            const arrowDisabled = disabled || !isValid || bombMode
            return (
              <button
                key={c}
                type="button"
                disabled={arrowDisabled}
                className={`k-arrow k-arrow--${curPlayer === 1 ? "p1" : "p2"}${isHot ? " k-arrow--hot" : ""}`}
                onMouseEnter={() => !arrowDisabled && setHotCol(c)}
                onMouseLeave={() => !arrowDisabled && setHotCol(null)}
                onFocus={() => !arrowDisabled && setHotCol(c)}
                onBlur={() => !arrowDisabled && setHotCol(null)}
                onClick={() => !arrowDisabled && onDrop(c)}
                aria-label={`Drop column ${c + 1}`}
              >
                <svg width="18" height="14" viewBox="0 0 22 18" aria-hidden>
                  <path
                    d="M3 3 L11 13 L19 3"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {isPeek && (
                  <div style={{ position: "absolute", marginTop: 18, color: "#FFE600" }}>
                    <svg width="10" height="10" viewBox="0 0 14 14" aria-hidden>
                      <path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Recessed grid */}
        <div className="k-inner">
          <div className="k-grid" style={{ position: "relative" }}>
            {/* Hot-column scan beam */}
            {hotCol != null && !disabled && !bombMode && (
              <div
                className={`k-scan${curPlayer === 2 ? " k-scan--p2" : ""}`}
                style={{ left: `${((hotCol + 0.5) * 100) / 7}%` }}
              />
            )}
            {board.flatMap((row, r) =>
              row.map((cell, c) => {
                const isWin = cell !== 0 && winSet.has(`${r},${c}`)
                const showGhost = !disabled && !bombMode && hotCol === c && dropRows[c] === r && cell === 0
                const isBombTarget = bombMode && cell === 2 && !!onTokenTarget
                const isHotCol = hotCol === c && !disabled && !bombMode
                const justDropped = lastDrop?.r === r && lastDrop?.c === c
                const cellClass = [
                  "k-cell",
                  isHotCol && (curPlayer === 1 ? "k-cell--hot" : "k-cell--hot-p2"),
                  isBombTarget && "k-cell--bomb",
                ]
                  .filter(Boolean)
                  .join(" ")
                return (
                  <div
                    key={`${r}-${c}`}
                    className={cellClass}
                    onClick={() => {
                      if (isBombTarget) onTokenTarget?.(r, c)
                    }}
                    role={isBombTarget ? "button" : undefined}
                    tabIndex={isBombTarget ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (isBombTarget && (e.key === "Enter" || e.key === " ")) onTokenTarget?.(r, c)
                    }}
                  >
                    {cell !== 0 && <Token player={cell as Player} win={isWin} dropping={justDropped} />}
                    {cell === 0 && showGhost && <Token player={curPlayer} ghost />}
                  </div>
                )
              }),
            )}
          </div>
        </div>

        {/* Column labels */}
        <div className="k-collabels">
          {Array.from({ length: COLS }, (_, c) => (
            <span key={c} style={hotCol === c && !disabled ? { color: curPlayer === 1 ? "#00E8FF" : "#FF2EBA" } : undefined}>
              C-{String(c + 1).padStart(2, "0")}
            </span>
          ))}
        </div>
      </div>

      {/* Pedestal feet + glow strip */}
      <div className="k-base">
        <div className="k-foot k-foot--l" />
        <div className="k-foot k-foot--r" />
      </div>
      <div className="k-floor" />
    </div>
  )
}
