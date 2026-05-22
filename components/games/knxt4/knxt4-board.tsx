"use client"

import { useMemo } from "react"
import type { Board, Player } from "./knxt4-core"
import { COLS, ROWS } from "./knxt4-core"

const CYAN = "#00e8ff"
const MAGENTA = "#ff2eba"

function tokenColors(player: Player): { c1: string; c2: string; c3: string } {
  return player === 1
    ? { c1: "#B5F8FF", c2: CYAN, c3: "#003540" }
    : { c1: "#FFC2EE", c2: MAGENTA, c3: "#3A0028" }
}

function Token({ player, win = false, ghost = false }: { player: Player; win?: boolean; ghost?: boolean }) {
  const { c1, c2, c3 } = tokenColors(player)
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        background: `radial-gradient(circle at 36% 28%, ${c1} 0%, ${c2} 38%, ${c3} 85%, #000 100%)`,
        boxShadow: `
          0 0 ${win ? 18 : 9}px ${c2},
          0 0 0 1.5px rgba(255,255,255,0.5),
          inset 0 0 0 1px rgba(255,255,255,0.45),
          inset 0 -3px 5px rgba(0,0,0,0.5),
          inset 0 2px 3px rgba(255,255,255,0.25)
        `,
        opacity: ghost ? 0.32 : 1,
        transition: "transform .25s ease",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "22%",
          borderRadius: "50%",
          background: "radial-gradient(circle at 50% 45%, #06070d 0%, #02030a 80%, #000 100%)",
          boxShadow: `inset 0 0 0 1px ${c2}cc, inset 0 0 8px ${c2}77`,
        }}
      />
      {win && (
        <div
          style={{
            position: "absolute",
            inset: -3,
            borderRadius: "50%",
            border: `2px solid ${c2}`,
            opacity: 0.8,
            animation: "knxt4-pulse 0.9s ease-in-out infinite",
          }}
        />
      )}
    </div>
  )
}

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

  const portalColor = curPlayer === 1 ? CYAN : MAGENTA

  return (
    <div className="knxt4-stage">
      {/* Top portal pipe */}
      <div className="knxt4-toppipe" style={{ color: portalColor }}>
        <svg viewBox="0 0 56 32" width="56" height="32" aria-hidden>
          <ellipse cx="28" cy="6" rx="14" ry="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <ellipse cx="28" cy="6" rx="9" ry="2.5" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.7" />
          <path
            d="M 14 6 L 24 24 L 32 24 L 42 6"
            fill="currentColor"
            fillOpacity="0.18"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Drop arrows */}
      <div className="knxt4-arrows">
        {Array.from({ length: COLS }, (_, c) => {
          const isValid = validCols.includes(c)
          const isHot = c === hotCol && !disabled
          const isPeek = peekCol === c
          const arrowDisabled = disabled || !isValid || bombMode
          return (
            <button
              type="button"
              key={c}
              disabled={arrowDisabled}
              onMouseEnter={() => !arrowDisabled && setHotCol(c)}
              onMouseLeave={() => !arrowDisabled && setHotCol(null)}
              onFocus={() => !arrowDisabled && setHotCol(c)}
              onBlur={() => !arrowDisabled && setHotCol(null)}
              onClick={() => !arrowDisabled && onDrop(c)}
              className="knxt4-arrow"
              style={{
                color: isValid ? portalColor : "rgba(255,255,255,0.18)",
                opacity: isValid ? (isHot ? 1 : 0.7) : 0.3,
                transform: isHot ? "translateY(2px)" : "translateY(0)",
              }}
              aria-label={`Drop column ${c + 1}`}
            >
              <svg width="18" height="14" viewBox="0 0 22 18">
                <path d="M3 3 L11 13 L19 3" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {isPeek && (
                <div className="knxt4-peek" style={{ color: "#ffe600" }}>
                  <svg width="12" height="12" viewBox="0 0 14 14">
                    <path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Reactor frame */}
      <div className="knxt4-frame">
        <div className="knxt4-grid">
          {board.flatMap((row, r) =>
            row.map((cell, c) => {
              const isWin = cell !== 0 && winSet.has(`${r},${c}`)
              const showGhost = !disabled && !bombMode && hotCol === c && dropRows[c] === r && cell === 0
              const isBombTarget = bombMode && cell === 2 && !!onTokenTarget
              return (
                <div className="knxt4-cell" key={`${r}-${c}`}>
                  {isBombTarget ? (
                    <button
                      type="button"
                      className="knxt4-socket knxt4-socket--bomb"
                      onClick={() => onTokenTarget?.(r, c)}
                      aria-label={`Vaporize token at row ${r + 1}, column ${c + 1}`}
                    >
                      <Token player={cell as Player} win={isWin} />
                    </button>
                  ) : (
                    <div className="knxt4-socket">
                      {cell !== 0 && <Token player={cell as Player} win={isWin} />}
                      {cell === 0 && showGhost && <Token player={curPlayer} ghost />}
                    </div>
                  )}
                </div>
              )
            }),
          )}
        </div>
        {/* base pedestal */}
        <div className="knxt4-pedestal" />
      </div>
    </div>
  )
}
