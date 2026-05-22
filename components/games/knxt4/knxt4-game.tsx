"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import "./knxt4-styles.css"
import {
  AI_LEVELS,
  COLS,
  MODES,
  POWERS,
  ROWS,
  aiMove,
  cloneBoard,
  drop as dropToken,
  findWin,
  isFull,
  makeBoard,
  vaporize,
} from "./knxt4-core"
import type { Board, ModeDef, ModeId, Player, PowerId } from "./knxt4-core"
import { Knxt4Board } from "./knxt4-board"
import type { ArcadeGameComponentProps, Difficulty } from "../types"

type Phase = "hub" | "play" | "over"
type EndReason = "win" | "lose" | "draw"

const difficultyToMode = (d: Difficulty): ModeId =>
  d === "EASY" ? "quick" : d === "HARD" ? "challenge" : "classic"

interface PowerState {
  energy: number
  armed: PowerId | null
  doublePending: boolean
  peekCol: number | null
}

const INITIAL_POWERS: PowerState = { energy: 6, armed: null, doublePending: false, peekCol: null }

export function Knxt4Game({ difficulty, update }: ArcadeGameComponentProps) {
  const [phase, setPhase] = useState<Phase>("hub")
  const [mode, setMode] = useState<ModeDef>(() => {
    const fallback = MODES.find((m) => m.id === difficultyToMode(difficulty)) ?? MODES[0]
    return fallback
  })
  const [board, setBoard] = useState<Board>(() => makeBoard())
  const [turn, setTurn] = useState<Player>(1)
  const [winCells, setWinCells] = useState<{ r: number; c: number }[]>([])
  const [hotCol, setHotCol] = useState<number | null>(null)
  const [endReason, setEndReason] = useState<EndReason | null>(null)
  const [moves, setMoves] = useState(0)
  const [startedAt, setStartedAt] = useState<number>(() => Date.now())
  const [status, setStatus] = useState("YOUR TURN — DROP A CHIP")
  const [powers, setPowers] = useState<PowerState>(INITIAL_POWERS)
  const [toast, setToast] = useState<string | null>(null)
  const recordedRef = useRef(false)
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = useCallback(() => {
    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current)
      aiTimerRef.current = null
    }
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
      toastTimerRef.current = null
    }
  }, [])

  useEffect(() => () => clearTimers(), [clearTimers])

  const flash = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 1800)
  }, [])

  const startMode = useCallback((m: ModeDef) => {
    clearTimers()
    setMode(m)
    setBoard(makeBoard())
    setTurn(1)
    setWinCells([])
    setEndReason(null)
    setMoves(0)
    setStartedAt(Date.now())
    setStatus(`MODE: ${m.name} · AI ${AI_LEVELS[m.ai].name}`)
    setPowers(INITIAL_POWERS)
    setToast(null)
    recordedRef.current = false
    setPhase("play")
  }, [clearTimers])

  const finishMatch = useCallback(
    (result: EndReason, finalBoard: Board) => {
      if (recordedRef.current) return
      recordedRef.current = true
      const elapsed = Date.now() - startedAt
      setEndReason(result)
      setPhase("over")
      const aiName = AI_LEVELS[mode.ai].name
      const summary =
        result === "win"
          ? `REACTOR LOCKED · BEAT ${aiName} · ${moves + 1} MOVES`
          : result === "lose"
            ? `${aiName} WINS THE CORE · ${moves + 1} MOVES`
            : `GRID FULL · STANDOFF · ${moves + 1} MOVES`
      // Score: faster + fewer moves wins more. Loss still logs base run.
      const score =
        result === "win"
          ? Math.max(10, 240 - moves * 5 - Math.floor(elapsed / 2000))
          : result === "draw"
            ? 25
            : 5
      update(result, summary, {
        score: result === "win" ? score : 0,
        neoScore: result === "lose" ? 1 : 0,
        completionTimeMs: elapsed,
        forceProgression: true,
      })
      // Compute win cells for UI
      const w = findWin(finalBoard)
      if (w) setWinCells(w.cells)
    },
    [mode.ai, moves, startedAt, update],
  )

  // AI turn
  useEffect(() => {
    if (phase !== "play") return
    if (turn !== 2) return
    aiTimerRef.current = setTimeout(() => {
      const col = aiMove(board, mode.ai, 2)
      if (col == null) return
      const nb = cloneBoard(board)
      const placed = dropToken(nb, col, 2)
      if (!placed) return
      const w = findWin(nb)
      setBoard(nb)
      setMoves((m) => m + 1)
      if (w) {
        finishMatch("lose", nb)
        return
      }
      if (isFull(nb)) {
        finishMatch("draw", nb)
        return
      }
      setTurn(1)
      setStatus("YOUR TURN — DROP A CHIP")
      // Tick energy back up over time
      setPowers((p) => ({ ...p, energy: Math.min(9, p.energy + 1), peekCol: null }))
    }, 500)
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    }
  }, [phase, turn, board, mode.ai, finishMatch])

  const playerDrop = useCallback(
    (c: number) => {
      if (phase !== "play" || turn !== 1) return
      const nb = cloneBoard(board)
      const placed = dropToken(nb, c, 1)
      if (!placed) return
      setMoves((m) => m + 1)
      const w = findWin(nb)
      if (w) {
        setBoard(nb)
        finishMatch("win", nb)
        return
      }
      if (isFull(nb)) {
        setBoard(nb)
        finishMatch("draw", nb)
        return
      }
      // Double-drop power: stay on your turn for one more drop
      if (powers.doublePending) {
        setBoard(nb)
        setPowers((p) => ({ ...p, doublePending: false }))
        setStatus("DOUBLE DROP — ONE MORE")
        return
      }
      setBoard(nb)
      setTurn(2)
      setStatus(`${AI_LEVELS[mode.ai].name} IS THINKING…`)
    },
    [board, finishMatch, mode.ai, phase, powers.doublePending, turn],
  )

  const armPower = useCallback(
    (id: PowerId) => {
      if (phase !== "play" || turn !== 1) return
      const cost = POWERS[id].cost
      if (powers.energy < cost) {
        flash("LOW ENERGY")
        return
      }
      if (id === "peek") {
        const col = aiMove(board, mode.ai, 2)
        setPowers((p) => ({ ...p, energy: p.energy - cost, peekCol: col }))
        flash(col != null ? `THREAT VECTOR · C-${col + 1}` : "NO TARGET")
        return
      }
      if (id === "double") {
        setPowers((p) => ({ ...p, energy: p.energy - cost, doublePending: true }))
        flash("DOUBLE DROP ARMED")
        return
      }
      if (id === "bomb") {
        // bomb: vaporize next click — for compact integration, take first enemy token if any.
        let found: { r: number; c: number } | null = null
        for (let r = 0; r < ROWS && !found; r++) {
          for (let c = 0; c < COLS && !found; c++) {
            if (board[r][c] === 2) found = { r, c }
          }
        }
        if (!found) {
          flash("NO TARGET TOKEN")
          return
        }
        const nb = vaporize(board, found.r, found.c)
        setBoard(nb)
        setPowers((p) => ({ ...p, energy: p.energy - cost }))
        flash("TOKEN VAPORIZED")
      }
    },
    [board, flash, mode.ai, phase, powers.energy, turn],
  )

  const renderHub = () => (
    <div className="space-y-2">
      <p className="knxt4-hub-title">N.E.O. CONNECT 4</p>
      <p className="knxt4-hub-sub">REACTOR DUEL · CHOOSE MODE</p>
      <div className="knxt4-mode-grid">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className="knxt4-mode"
            onClick={() => startMode(m)}
          >
            <div className="knxt4-mode__name">{m.name}</div>
            <div className="knxt4-mode__sub">{m.subtitle} · AI {AI_LEVELS[m.ai].name}</div>
          </button>
        ))}
      </div>
    </div>
  )

  const sideDot = (player: Player) => (
    <span
      className="knxt4-dot"
      style={{
        background: player === 1 ? "#00e8ff" : "#ff2eba",
        boxShadow: `0 0 8px ${player === 1 ? "#00e8ff" : "#ff2eba"}`,
      }}
    />
  )

  const renderPlay = () => (
    <div>
      <div className="knxt4-hud">
        <div className="knxt4-side">
          {sideDot(1)}
          <span>YOU</span>
        </div>
        <div className="knxt4-status">
          {endReason
            ? endReason === "win"
              ? "REACTOR LOCKED"
              : endReason === "lose"
                ? "CORE BREACHED"
                : "STANDOFF"
            : status}
        </div>
        <div className="knxt4-side knxt4-side--right">
          <span>{AI_LEVELS[mode.ai].name}</span>
          {sideDot(2)}
        </div>
      </div>

      <Knxt4Board
        board={board}
        curPlayer={turn}
        hotCol={hotCol}
        setHotCol={setHotCol}
        onDrop={playerDrop}
        winCells={winCells}
        disabled={phase !== "play" || turn !== 1 || endReason !== null}
        peekCol={powers.peekCol}
      />

      <div className="knxt4-powers">
        {(Object.keys(POWERS) as PowerId[]).map((id) => {
          const p = POWERS[id]
          const armed = powers.armed === id || (id === "double" && powers.doublePending)
          const disabled = phase !== "play" || turn !== 1 || endReason !== null || powers.energy < p.cost
          return (
            <button
              key={id}
              type="button"
              className={`knxt4-power${armed ? " knxt4-power--armed" : ""}`}
              disabled={disabled}
              onClick={() => armPower(id)}
              style={{ borderColor: armed ? p.color : undefined }}
              title={p.desc}
            >
              <span style={{ color: p.color }}>{p.name}</span>
              <span style={{ marginLeft: 4, color: "rgba(255,255,255,0.55)" }}>·{p.cost}E</span>
            </button>
          )
        })}
      </div>

      <p className="ps-mono" style={{ marginTop: 6, fontSize: 9, letterSpacing: "0.25em", color: "rgba(255,255,255,0.5)" }}>
        ENERGY {powers.energy}/9 · MOVES {moves}
      </p>

      {toast && <div className="knxt4-toast">{toast}</div>}

      {endReason !== null && (
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <button
            type="button"
            className="knxt4-mode"
            onClick={() => startMode(mode)}
          >
            <div className="knxt4-mode__name" style={{ textAlign: "center" }}>REPLAY</div>
          </button>
          <button
            type="button"
            className="knxt4-mode"
            onClick={() => {
              clearTimers()
              setPhase("hub")
            }}
          >
            <div className="knxt4-mode__name" style={{ textAlign: "center", color: "#ff2eba" }}>MODES</div>
          </button>
        </div>
      )}
    </div>
  )

  return useMemo(
    () => (
      <div className="knxt4-root">{phase === "hub" ? renderHub() : renderPlay()}</div>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, board, turn, endReason, hotCol, powers, status, toast, winCells, moves],
  )
}
