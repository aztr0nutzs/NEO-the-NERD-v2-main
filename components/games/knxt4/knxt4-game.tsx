"use client"

import { useCallback, useEffect, useRef, useState } from "react"
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
import { useApp } from "@/lib/store"

type Phase = "hub" | "play" | "over"
type EndReason = "win" | "lose" | "draw"

const difficultyToMode = (d: "EASY" | "ADAPTIVE" | "HARD"): ModeId =>
  d === "EASY" ? "quick" : d === "HARD" ? "challenge" : "classic"

interface PowerState {
  energy: number
  armed: PowerId | null
  doublePending: boolean
  peekCol: number | null
}

const INITIAL_POWERS: PowerState = { energy: 6, armed: null, doublePending: false, peekCol: null }

/* Mode-tile colour assignments mirror the screenshot. */
const MODE_TONE: Record<ModeId, "lime" | "yellow" | "mag" | "cyan"> = {
  classic: "cyan",
  quick: "lime",
  timed: "yellow",
  challenge: "mag",
}

const MODE_BADGE: Record<ModeId, { label: string; tone: "lime" | "yellow" | "mag" | "cyan" }> = {
  classic: { label: "CORE", tone: "cyan" },
  quick: { label: "INSTANT", tone: "lime" },
  timed: { label: "PRESSURE", tone: "yellow" },
  challenge: { label: "5 PZL", tone: "mag" },
}

function pad2(n: number) {
  return n.toString().padStart(2, "0")
}

function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${pad2(s)}`
}

export function Knxt4Game({ onClose }: { onClose?: () => void }) {
  const { settings, recordGameResult, playAvatarReaction } = useApp()
  const difficulty = settings.gameDifficulty
  const [phase, setPhase] = useState<Phase>("hub")
  const [mode, setMode] = useState<ModeDef>(
    () => MODES.find((m) => m.id === difficultyToMode(difficulty)) ?? MODES[0],
  )
  const [board, setBoard] = useState<Board>(() => makeBoard())
  const [turn, setTurn] = useState<Player>(1)
  const [winCells, setWinCells] = useState<{ r: number; c: number }[]>([])
  const [hotCol, setHotCol] = useState<number | null>(null)
  const [endReason, setEndReason] = useState<EndReason | null>(null)
  const [moves, setMoves] = useState(0)
  const [round] = useState(1)
  const [scores, setScores] = useState({ p1: 0, p2: 0 })
  const [startedAt, setStartedAt] = useState<number>(() => Date.now())
  const [aiStatus, setAiStatus] = useState("")
  const [powers, setPowers] = useState<PowerState>(INITIAL_POWERS)
  const [toast, setToast] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<{ you: number; neo: number } | null>(null)
  const [lastDrop, setLastDrop] = useState<{ r: number; c: number } | null>(null)
  const recordedRef = useRef(false)
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimers = useCallback(() => {
    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current)
      aiTimerRef.current = null
    }
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
      toastTimerRef.current = null
    }
    if (tickTimerRef.current) {
      clearInterval(tickTimerRef.current)
      tickTimerRef.current = null
    }
  }, [])

  useEffect(() => () => clearTimers(), [clearTimers])

  const flash = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 1700)
  }, [])

  const startMode = useCallback(
    (m: ModeDef) => {
      clearTimers()
      setMode(m)
      setBoard(makeBoard())
      setTurn(1)
      setWinCells([])
      setEndReason(null)
      setMoves(0)
      setScores({ p1: 0, p2: 0 })
      setStartedAt(Date.now())
      setAiStatus("")
      setPowers(INITIAL_POWERS)
      setToast(null)
      setLastDrop(null)
      if (m.timerMs) {
        const secs = Math.floor(m.timerMs / 1000)
        setTimeLeft({ you: secs, neo: secs })
      } else {
        setTimeLeft(null)
      }
      recordedRef.current = false
      setPhase("play")
    },
    [clearTimers],
  )

  const finishMatch = useCallback(
    (result: EndReason, finalBoard: Board) => {
      if (recordedRef.current) return
      recordedRef.current = true
      const elapsed = Date.now() - startedAt
      setEndReason(result)
      setPhase("over")
      if (result === "win") setScores((s) => ({ ...s, p1: s.p1 + 1 }))
      else if (result === "lose") setScores((s) => ({ ...s, p2: s.p2 + 1 }))
      const score =
        result === "win"
          ? Math.max(10, 240 - moves * 5 - Math.floor(elapsed / 2000))
          : result === "draw"
            ? 25
            : 5
      if (result === "win") playAvatarReaction("ecstatic")
      else if (result === "lose") playAvatarReaction("angry")
      else playAvatarReaction("surprised")
      recordGameResult({
        game: "knxt4",
        result,
        difficulty,
        score: result === "win" ? score : undefined,
        completionTimeMs: elapsed,
      })
      const w = findWin(finalBoard)
      if (w) setWinCells(w.cells)
    },
    [difficulty, moves, playAvatarReaction, recordGameResult, startedAt],
  )

  /* TIMED countdown */
  const timed = timeLeft !== null
  useEffect(() => {
    if (phase !== "play" || endReason !== null || !timed) return
    if (tickTimerRef.current) clearInterval(tickTimerRef.current)
    tickTimerRef.current = setInterval(() => {
      setTimeLeft((tl) => {
        if (!tl) return tl
        if (turn === 1) return { ...tl, you: Math.max(0, tl.you - 1) }
        return { ...tl, neo: Math.max(0, tl.neo - 1) }
      })
    }, 1000)
    return () => {
      if (tickTimerRef.current) {
        clearInterval(tickTimerRef.current)
        tickTimerRef.current = null
      }
    }
  }, [phase, turn, endReason, timed])

  useEffect(() => {
    if (phase !== "play" || endReason !== null || !timeLeft) return
    if (timeLeft.you === 0) finishMatch("lose", board)
    else if (timeLeft.neo === 0) finishMatch("win", board)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase, endReason])

  /* AI turn */
  useEffect(() => {
    if (phase !== "play" || endReason !== null) return
    if (turn !== 2) return
    setAiStatus(`${AI_LEVELS[mode.ai].name} COMPUTING`)
    aiTimerRef.current = setTimeout(() => {
      const col = aiMove(board, mode.ai, 2)
      if (col == null) return
      const nb = cloneBoard(board)
      const placed = dropToken(nb, col, 2)
      if (!placed) return
      const w = findWin(nb)
      setBoard(nb)
      setLastDrop(placed)
      setMoves((m) => m + 1)
      setAiStatus("")
      if (w) {
        finishMatch("lose", nb)
        return
      }
      if (isFull(nb)) {
        finishMatch("draw", nb)
        return
      }
      setTurn(1)
      setPowers((p) => ({ ...p, energy: Math.min(10, p.energy + 1), peekCol: null }))
    }, 600)
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    }
  }, [phase, turn, board, mode.ai, finishMatch, endReason])

  const playerDrop = useCallback(
    (c: number) => {
      if (phase !== "play" || turn !== 1 || endReason !== null) return
      const nb = cloneBoard(board)
      const placed = dropToken(nb, c, 1)
      if (!placed) return
      setMoves((m) => m + 1)
      setLastDrop(placed)
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
      if (powers.doublePending) {
        setBoard(nb)
        setPowers((p) => ({ ...p, doublePending: false }))
        flash("DROP AGAIN")
        return
      }
      setBoard(nb)
      setTurn(2)
    },
    [board, finishMatch, flash, phase, powers.doublePending, turn, endReason],
  )

  const armPower = useCallback(
    (id: PowerId) => {
      if (phase !== "play" || turn !== 1 || endReason !== null) return
      const cost = POWERS[id].cost
      if (id === "peek") {
        if (powers.energy < cost) {
          flash("LOW ENERGY")
          return
        }
        const col = aiMove(board, mode.ai, 2)
        setPowers((p) => ({ ...p, energy: p.energy - cost, peekCol: col }))
        flash(col != null ? `THREAT VECTOR · C-${col + 1}` : "NO TARGET")
        return
      }
      if (id === "double") {
        if (powers.energy < cost) {
          flash("LOW ENERGY")
          return
        }
        setPowers((p) => ({ ...p, energy: p.energy - cost, doublePending: true }))
        flash("DOUBLE DROP ARMED")
        return
      }
      if (id === "bomb") {
        if (powers.armed === "bomb") {
          setPowers((p) => ({ ...p, armed: null }))
          flash("BOMB DISARMED")
          return
        }
        if (powers.energy < cost) {
          flash("LOW ENERGY")
          return
        }
        let hasEnemy = false
        for (let r = 0; r < ROWS && !hasEnemy; r++) {
          for (let c = 0; c < COLS && !hasEnemy; c++) {
            if (board[r][c] === 2) hasEnemy = true
          }
        }
        if (!hasEnemy) {
          flash("NO ENEMY TOKENS")
          return
        }
        setPowers((p) => ({ ...p, armed: "bomb" }))
        flash("BOMB ARMED · PICK TARGET")
      }
    },
    [board, flash, mode.ai, phase, powers.armed, powers.energy, turn, endReason],
  )

  const onTokenTarget = useCallback(
    (r: number, c: number) => {
      if (phase !== "play" || turn !== 1 || endReason !== null) return
      if (powers.armed !== "bomb") return
      if (board[r][c] !== 2) return
      const cost = POWERS.bomb.cost
      if (powers.energy < cost) {
        flash("LOW ENERGY")
        return
      }
      const nb = vaporize(board, r, c)
      setBoard(nb)
      setPowers((p) => ({ ...p, energy: p.energy - cost, armed: null }))
      flash("TOKEN VAPORIZED")
    },
    [board, flash, phase, powers.armed, powers.energy, turn, endReason],
  )

  /* Counts for meter fills */
  let p1Count = 0
  let p2Count = 0
  for (const row of board) for (const cell of row) {
    if (cell === 1) p1Count++
    else if (cell === 2) p2Count++
  }

  const aiName = AI_LEVELS[mode.ai].name

  const renderHub = () => {
    const tile = (m: ModeDef) => {
      const tone = MODE_TONE[m.id]
      const badge = MODE_BADGE[m.id]
      return (
        <button key={m.id} type="button" className={`k-mode k-mode--${tone}`} onClick={() => startMode(m)}>
          <div className="k-mode__head">
            <span className={`k-chip k-chip--${badge.tone}`}>
              <span className="k-chip__dot" />
              {badge.label}
            </span>
          </div>
          <div className="k-mode__title">{m.name}</div>
          <div className="k-mode__sub">{m.subtitle}</div>
        </button>
      )
    }

    return (
      <>
        <div className="k-appbar">
          <div className="k-brand">
            <b>N.E.O.</b>
            <span>/ MODES</span>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span className="k-chip">
              <span className="k-chip__dot" />0{MODES.length} MODES
            </span>
            {onClose && (
              <button type="button" className="k-chip k-chip--mag" onClick={onClose} aria-label="Exit">
                <span className="k-chip__dot" />EXIT
              </button>
            )}
          </div>
        </div>

        {/* CLASSIC hero card */}
        <div className="k-hero">
          <div className="k-hero__chips">
            <span className="k-chip k-chip--lime">
              <span className="k-chip__dot" />
              CORE
            </span>
            <span className="k-chip">VS AI · LOCAL 2P</span>
          </div>
          <div className="k-hero__title">CLASSIC</div>
          <div className="k-hero__sub">Standard 7×6 Connect 4 rules. Choose your AI tier · Power-ups enabled.</div>
          <button type="button" className="k-hero__cta" onClick={() => startMode(MODES[0])}>
            CONFIGURE · PLAY
          </button>
          <div className="k-hero__orbs">
            <div className="k-hero__orb k-hero__orb--p1" />
            <div className="k-hero__orb k-hero__orb--p2" />
          </div>
        </div>

        {/* Other mode tiles */}
        <div className="k-mode-grid">
          {MODES.filter((m) => m.id !== "classic").map(tile)}
        </div>
      </>
    )
  }

  const renderPlay = () => (
    <>
      <div className="k-appbar">
        <div className="k-brand">
          <b>N.E.O.</b>
          <span>CONNECT</span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span className={`k-chip k-chip--${MODE_BADGE[mode.id].tone}`}>
            <span className="k-chip__dot" />
            {mode.name}
          </span>
          {onClose && (
            <button type="button" className="k-chip k-chip--mag" onClick={onClose} aria-label="Exit">
              <span className="k-chip__dot" />EXIT
            </button>
          )}
        </div>
      </div>

      {/* HUD */}
      <div className="k-hud">
        <div className={`k-player${turn === 1 && endReason === null ? " k-player--active" : ""}`}>
          <div className="k-player__avatar">YOU</div>
          <div className="k-player__name">PLAYER 1</div>
          <div className="k-player__meta">CYAN · {scores.p1}W</div>
          <div className="k-player__score">{pad2(scores.p1)}</div>
        </div>
        <div className="k-vs">
          <div className="k-vs__label">{timeLeft ? "TIMER" : "TURN"}</div>
          <div className="k-vs__timer" style={{ color: turn === 1 ? "var(--k-cyan)" : "var(--k-magenta)" }}>
            {timeLeft
              ? fmtTime(turn === 1 ? timeLeft.you : timeLeft.neo)
              : endReason !== null
                ? "END"
                : turn === 2
                  ? "…"
                  : "GO"}
          </div>
          <div className="k-vs__label" style={{ color: turn === 1 ? "var(--k-cyan)" : "var(--k-magenta)" }}>
            {turn === 1 ? "YOUR MOVE" : `${aiName}`}
          </div>
        </div>
        <div className={`k-player k-player--p2${turn === 2 && endReason === null ? " k-player--active" : ""}`}>
          <div className="k-player__avatar">N</div>
          <div className="k-player__name">{aiName}</div>
          <div className="k-player__meta">{AI_LEVELS[mode.ai].name} · {turn === 2 && endReason === null ? "THINKING" : "READY"}</div>
          <div className="k-player__score">{pad2(scores.p2)}</div>
        </div>
      </div>

      {/* Move tape */}
      <div className="k-tape">
        <span>
          <span className="k-tape__rnd">RND {pad2(round)}</span>{" "}
          <span>· MOVE {pad2(moves + 1)}</span>
          {aiStatus && (
            <>
              {" "}
              <span className="k-tape__thinking">
                <i />
                <i />
                <i />
              </span>{" "}
              <span style={{ color: "var(--k-magenta)" }}>{aiStatus}</span>
            </>
          )}
        </span>
        <span>ENERGY {powers.energy}/10</span>
      </div>

      {/* Board */}
      <Knxt4Board
        board={board}
        curPlayer={turn}
        hotCol={hotCol}
        setHotCol={setHotCol}
        onDrop={playerDrop}
        winCells={winCells}
        disabled={phase !== "play" || turn !== 1 || endReason !== null}
        peekCol={powers.peekCol}
        bombMode={powers.armed === "bomb" && turn === 1 && endReason === null}
        onTokenTarget={onTokenTarget}
        lastDrop={lastDrop}
        p1Count={p1Count}
        p2Count={p2Count}
      />

      {/* Energy bar */}
      <div className="k-energy">
        <div className="k-energy__label">⚡ {powers.energy} / 10</div>
        <div className="k-energy__bar">
          <div className="k-energy__fill" style={{ width: `${(powers.energy / 10) * 100}%` }} />
        </div>
        {powers.doublePending && (
          <span className="k-chip k-chip--lime">
            <span className="k-chip__dot" />×2 ARMED
          </span>
        )}
      </div>

      {/* Power tray */}
      <div className="k-tray">
        {(Object.keys(POWERS) as PowerId[]).map((id) => {
          const p = POWERS[id]
          const isArmed = (id === "bomb" && powers.armed === "bomb") || (id === "double" && powers.doublePending)
          const affordable = powers.energy >= p.cost
          const disabled = phase !== "play" || turn !== 1 || endReason !== null || (!affordable && !isArmed)
          const tone = id === "bomb" ? "orange" : id === "double" ? "lime" : "yellow"
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => armPower(id)}
              className={`k-power k-power--${tone}${isArmed ? " k-power--active" : ""}`}
              title={p.desc}
            >
              <span className="k-power__cost">⚡{p.cost}</span>
              <span className="k-power__icon">
                <PowerIcon id={id} />
              </span>
              <span className="k-power__name">{p.name}</span>
            </button>
          )
        })}
      </div>

      {/* Action dock — only buttons that are actually wired. */}
      <div className="k-dock">
        <button type="button" className="k-dock__btn k-dock__btn--cyan" onClick={() => startMode(mode)}>
          <RestartIcon />
          <span>RESTART</span>
        </button>
        <button type="button" className="k-dock__btn k-dock__btn--mag" onClick={() => { clearTimers(); setPhase("hub") }}>
          <BackIcon />
          <span>MODES</span>
        </button>
      </div>

      {endReason !== null && (
        <div className={`k-over k-over--${endReason}`}>
          <div className="k-over__title">
            {endReason === "win" ? "REACTOR LOCKED" : endReason === "lose" ? "CORE BREACHED" : "STANDOFF"}
          </div>
          <div className="k-over__sub">
            {endReason === "win"
              ? `BEAT ${aiName} · ${moves + 1} MOVES`
              : endReason === "lose"
                ? `${aiName} TOOK THE CORE · ${moves + 1} MOVES`
                : `GRID FULL · ${moves + 1} MOVES`}
          </div>
          <div className="k-over__row">
            <button type="button" className="k-dock__btn k-dock__btn--cyan" onClick={() => startMode(mode)}>
              <span>REPLAY</span>
            </button>
            <button type="button" className="k-dock__btn k-dock__btn--mag" onClick={() => { clearTimers(); setPhase("hub") }}>
              <span>MODES</span>
            </button>
          </div>
        </div>
      )}

      {toast && <div className="k-toast">{toast}</div>}
    </>
  )

  return <div className="knxt4-root">{phase === "hub" ? renderHub() : renderPlay()}</div>
}

/* ─── Inline glyph icons matching the source's iconography ─── */
function PowerIcon({ id }: { id: PowerId }) {
  if (id === "bomb") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
        <path
          d="M8 14c0-3.3 2.7-6 6-6 .6 0 1.2.1 1.7.3M17 6l3-3M17 9l4-1M21 3l-1 4"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="10" cy="16" r="5" stroke="currentColor" strokeWidth="2" fill="none" />
      </svg>
    )
  }
  if (id === "double") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    )
  }
  // peek = eye
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  )
}

function RestartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path d="M21 12a9 9 0 1 1-2.6-6.3M21 3v6h-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
