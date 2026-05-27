"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import "./knxt4-styles.css"
import {
  AI_LEVELS,
  COLS,
  ROWS,
  aiMove,
  cloneBoard,
  dropRow,
  findWin,
  isFull,
  makeBoard,
} from "./knxt4-core"
import type { Board, Player } from "./knxt4-core"
import {
  type Knxt4Save,
  type PowerId,
  POWERS,
  type Puzzle,
  defaultSave,
  movesToBoard,
} from "./knxt4-meta"
import { NeoChip, NeoIcon, NeoPhone } from "./knxt4-phone"
import { Knxt4Board } from "./knxt4-board"
import {
  ComingSoonScreen,
  HubScreen,
  type Knxt4Config,
  ModesScreen,
} from "./knxt4-hub"
import { useApp } from "@/lib/store"
import { NeoAvatarVideo } from "@/components/avatar/neo-avatar-video"

type Phase =
  | "idle"
  | "ai"
  | "animating"
  | "over"
  | "power-bomb"
  | "power-shift"
  | "power-gravity"

interface ToastState {
  msg: string
  variant: string
  id: number
}

/* ─────────────────────────────────────────────────────────────────
   GAME SCREEN — verbatim port of game-screen.jsx (markup + behaviour).
   ───────────────────────────────────────────────────────────────── */
const GameScreen = ({
  config,
  save,
  onResult,
  onBack,
}: {
  config: Knxt4Config
  save: Knxt4Save
  onResult: (r: {
    result: "win" | "loss" | "draw"
    winner: 0 | Player
    moves: number
    winCells: { r: number; c: number }[]
    cfg: Knxt4Config
    finalBoard: Board
    durationMs: number
    energyLeft: number
    hintsLeft: number
    puzzle?: Puzzle
  }) => void
  onBack: () => void
}) => {
  const cfg = config
  const aiLevel = cfg.aiLevel || 3
  const aiName = cfg.aiName || "N.E.O."
  const opponent = cfg.opponent || "ai"
  const skinId = save.selectedToken || "core"
  const usePowerUps = cfg.powerUps !== false && cfg.mode !== "challenge" && cfg.mode !== "training"
  const isChallenge = cfg.mode === "challenge"
  const puzzle: Puzzle | undefined = (cfg as Knxt4Config & { puzzle?: Puzzle }).puzzle

  const initBoard = useMemo(() => puzzle ? movesToBoard(puzzle.moves) : makeBoard(), [puzzle])

  const [board, setBoard] = useState<Board>(initBoard)
  const [curPlayer, setCurPlayer] = useState<Player>(1)
  const [moves, setMoves] = useState<{ col: number; player: Player; r: number; special?: string | null }[]>([])
  const [hotCol, setHotCol] = useState<number | null>(null)
  const [lastDrop, setLastDrop] = useState<{ r: number; c: number } | null>(null)
  const [phase, setPhase] = useState<Phase>("idle")
  const [winInfo, setWinInfo] = useState<{ player: 0 | Player; cells: { r: number; c: number }[] } | null>(null)
  const [scores] = useState({ p1: 0, p2: 0 })
  const [round] = useState(1)
  const [energy, setEnergy] = useState(save.energy || 6)
  const [activePower, setActivePower] = useState<PowerId | null>(null)
  const [doubleArmed, setDoubleArmed] = useState(false)
  const [peekCol, setPeekCol] = useState<number | null>(null)
  const [threatCells, setThreatCells] = useState<{ r: number; c: number }[]>([])
  const [toast, setToast] = useState<ToastState | null>(null)
  const [combo, setCombo] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const [hintsLeft, setHintsLeft] = useState(save.hintsLeft || 3)
  const [highlightedHint, setHighlightedHint] = useState<number | null>(null)
  const [timer, setTimer] = useState<number | null>(cfg.timer || null)
  const [aiStatus, setAiStatus] = useState("")
  const [tilt, setTilt] = useState<"normal" | "flat" | "high">("normal")
  const startedAt = useRef(Date.now())

  const myPlayer: Player = 1

  const showToast = (msg: string, variant = "") => {
    setToast({ msg, variant, id: Date.now() })
    setTimeout(() => setToast(null), 1900)
  }

  const tryDrop = (col: number, asPlayer: Player = curPlayer, isPowerGravity = false) => {
    if (phase === "over" || phase === "animating") return false
    let r = -1
    if (isPowerGravity) {
      for (let i = 0; i < ROWS; i++) if (board[i][col] === 0) { r = i; break }
      if (r < 0) { showToast("COLUMN FULL", "red"); return false }
    } else {
      r = dropRow(board, col)
      if (r < 0) { showToast("COLUMN FULL", "red"); return false }
    }
    const nb = cloneBoard(board)
    nb[r][col] = asPlayer
    setBoard(nb)
    setMoves((m) => [...m, { col, player: asPlayer, r, special: isPowerGravity ? "gravity" : null }])
    setLastDrop({ r, c: col })
    setPhase("animating")
    const win = findWin(nb)
    if (!win) {
      let n = 0
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]] as [number, number][]) {
        let cnt = 1
        for (let k = 1; k < 4; k++) { const rr = r + dr * k, cc = col + dc * k; if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || nb[rr][cc] !== asPlayer) break; cnt++ }
        for (let k = 1; k < 4; k++) { const rr = r - dr * k, cc = col - dc * k; if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || nb[rr][cc] !== asPlayer) break; cnt++ }
        if (cnt > n) n = cnt
      }
      if (n >= 3 && asPlayer === myPlayer) { setCombo("+1 ENERGY"); setEnergy((e) => Math.min(e + 1, 10)); setTimeout(() => setCombo(null), 1200) }
    }
    return { row: r, win }
  }

  useEffect(() => {
    if (phase !== "animating") return
    const t = setTimeout(() => {
      const win = findWin(board)
      if (isChallenge) {
        const myMoves = moves.filter((m) => m.player === myPlayer)
        if (myMoves.length >= 1 && puzzle) {
          const correct = myMoves[0].col === puzzle.solCol
          setWinInfo(correct ? (win || { player: myPlayer, cells: [] }) : { player: 2, cells: [] })
          setPhase("over")
          return
        }
      }
      if (win) { setWinInfo(win); setPhase("over"); return }
      if (isFull(board)) { setPhase("over"); setWinInfo({ player: 0, cells: [] }); return }
      if (doubleArmed && curPlayer === myPlayer && moves[moves.length - 1]?.player === myPlayer) {
        setDoubleArmed(false); setPhase("idle"); showToast("DROP AGAIN", "lime"); return
      }
      setPeekCol(null)
      setThreatCells([])
      const next = (3 - curPlayer) as Player
      setCurPlayer(next)
      if (opponent === "ai" && next === 2) setPhase("ai"); else setPhase("idle")
    }, 580)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    if (phase !== "ai" || paused) return
    const messages = ["ANALYZING BOARD…", "TRACE.SCAN", "THREAT MAPPED", "COUNTERMOVE LOCKED"]
    setAiStatus(messages[0])
    let mi = 0
    const id = setInterval(() => { mi = (mi + 1) % messages.length; setAiStatus(messages[mi]) }, 350)
    const totalThink = cfg.mode === "quick" ? 400 : 800 + aiLevel * 100
    const t = setTimeout(() => {
      clearInterval(id); setAiStatus("")
      const col = aiMove(board, aiLevel, 2)
      if (col != null) tryDrop(col, 2)
    }, totalThink)
    return () => { clearInterval(id); clearTimeout(t) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, paused])

  useEffect(() => {
    if (!cfg.timer || phase === "over" || paused) return
    setTimer(cfg.timer)
    let t = cfg.timer
    const id = setInterval(() => {
      if (phase !== "idle" && phase !== "ai") return
      t -= 1
      setTimer(t)
      if (t <= 0) {
        clearInterval(id)
        showToast("TIMEOUT — TURN LOST", "red")
        setCurPlayer((p) => (3 - p) as Player)
        setPhase(opponent === "ai" && ((3 - curPlayer) as Player) === 2 ? "ai" : "idle")
      }
    }, 1000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, curPlayer, paused])

  const resultEmitted = useRef(false)
  useEffect(() => {
    if (phase !== "over" || resultEmitted.current) return
    resultEmitted.current = true
    const t = setTimeout(() => {
      const winner = (winInfo?.player ?? 0) as 0 | Player
      const youWon = winner === myPlayer
      const result: "win" | "loss" | "draw" = winner === 0 ? "draw" : youWon ? "win" : "loss"
      onResult({
        result,
        winner,
        moves: moves.length,
        winCells: winInfo?.cells || [],
        cfg,
        finalBoard: board,
        durationMs: Date.now() - startedAt.current,
        energyLeft: energy,
        hintsLeft,
        puzzle,
      })
    }, 1800)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const armPower = (pid: PowerId) => {
    if (phase !== "idle" || activePower) return
    const power = POWERS[pid]
    if (!power) return
    if (energy < power.cost) { showToast("LOW ENERGY", "red"); return }
    if (power.target === "none") {
      const r = power.exec(board, null, myPlayer)
      if (r.peekCol != null) setPeekCol(r.peekCol)
      setEnergy((e) => e - power.cost)
      showToast(r.message || "ARMED", "yellow")
      return
    }
    if (power.target === "self") {
      setDoubleArmed(true)
      setEnergy((e) => e - power.cost)
      showToast("DOUBLE DROP ARMED", "lime")
      return
    }
    setActivePower(pid)
    setPhase(`power-${pid}` as Phase)
    const labels: Record<string, string> = {
      bomb: "SELECT ENEMY TOKEN",
      shift: "SELECT COLUMN TO SHIFT",
      gravity: "SELECT COLUMN (DROPS AT TOP)",
    }
    showToast(labels[pid] || "TARGETING", power.color === "orange" ? "orange" : "cyan")
  }

  const cancelPower = () => { setActivePower(null); setPhase("idle"); setHotCol(null) }

  const onTokenTarget = (r: number, c: number) => {
    if (activePower !== "bomb") return
    const power = POWERS.bomb
    const result = power.exec(board, { r, c }, myPlayer)
    if (!result.ok) { showToast(result.message || "INVALID", "red"); return }
    setBoard(result.newBoard!)
    setLastDrop({ r, c })
    setEnergy((e) => e - power.cost)
    setActivePower(null)
    setPhase("animating")
    showToast(result.message || "TOKEN VAPORIZED", "orange")
  }

  const onShiftPick = (col: number, dir: -1 | 1) => {
    const power = POWERS.shift
    const result = power.exec(board, { c: col, dir }, myPlayer)
    if (!result.ok) { showToast(result.message || "INVALID", "red"); return }
    setBoard(result.newBoard!)
    setEnergy((e) => e - power.cost)
    setActivePower(null)
    setPhase("animating")
    showToast(result.message || "COLUMN SHIFTED", "cyan")
  }

  const onGravityPick = (col: number) => {
    const power = POWERS.gravity
    if (board[0][col] !== 0) { showToast("COLUMN FULL", "red"); return }
    tryDrop(col, myPlayer, true)
    setEnergy((e) => e - power.cost)
    setActivePower(null)
    showToast("GRAVITY INVERTED", "violet")
  }

  const useHint = () => {
    if (hintsLeft <= 0) { showToast("NO HINTS LEFT", "red"); return }
    setHintsLeft((h) => h - 1)
    const c = aiMove(board, 5, myPlayer)
    if (c == null) return
    setHighlightedHint(c)
    showToast(`OPTIMAL: COLUMN ${c + 1}`, "lime")
    setTimeout(() => setHighlightedHint(null), 2400)
  }

  const showTactical = () => {
    const threats: { r: number; c: number }[] = []
    for (let c = 0; c < COLS; c++) {
      const r = dropRow(board, c)
      if (r < 0) continue
      const nb = cloneBoard(board)
      nb[r][c] = (3 - myPlayer) as Player
      if (findWin(nb)?.player === ((3 - myPlayer) as Player)) threats.push({ r, c })
    }
    setThreatCells(threats)
    showToast(`${threats.length} THREAT VECTOR${threats.length === 1 ? "" : "S"}`, "orange")
    setTimeout(() => setThreatCells([]), 2200)
  }

  const undo = () => {
    if (moves.length === 0 || phase === "over" || phase === "animating" || cfg.mode === "challenge") return
    const m = [...moves]
    const nb = cloneBoard(board)
    for (let i = 0; i < 2; i++) {
      if (m.length === 0) break
      const last = m.pop()!
      nb[last.r][last.col] = 0
    }
    setBoard(nb)
    setMoves(m)
    setCurPlayer(myPlayer)
    setPhase("idle")
    showToast("MOVE REVERTED", "cyan")
  }

  const restart = () => {
    setBoard(initBoard)
    setMoves([])
    setCurPlayer(1)
    setHotCol(null)
    setLastDrop(null)
    setWinInfo(null)
    setPhase("idle")
    setDoubleArmed(false)
    setPeekCol(null)
    setThreatCells([])
    setActivePower(null)
    resultEmitted.current = false
    showToast("MATCH RESET", "cyan")
  }

  const turnLabel = phase === "over"
    ? (winInfo?.player === 0 ? "DRAW" : winInfo?.player === myPlayer ? "YOU WIN" : `${aiName} WINS`)
    : phase === "ai" ? "AI TURN" : curPlayer === myPlayer ? "YOUR MOVE" : opponent === "local" ? "P2 TURN" : "AI TURN"

  const headerChip = cfg.mode === "ladder" ? `LADDER · L${cfg.level?.id ?? "?"}`
    : cfg.mode === "challenge" ? `PUZZLE ${puzzle?.id ?? ""}`
    : cfg.mode === "timed" ? `TIMED · ${cfg.timer}s`
    : cfg.mode === "training" ? "TRAINING"
    : cfg.mode === "quick" ? "QUICK" : "CLASSIC"

  const bg = cfg.level?.bg ? `neo-bg-${cfg.level.bg}` : ""

  return (
    <NeoPhone>
      <div className={`neo-bg ${bg}`} />

      <div className="neo-appbar" style={{ paddingBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="neo-icon-btn" style={{ width: 32, height: 32 }} onClick={onBack}><NeoIcon name="back" size={14} /></button>
          <div className="neo-appbar__brand" style={{ fontSize: 13 }}><b>N.E.O.</b><span>CONNECT</span></div>
          <NeoChip variant={cfg.mode === "ladder" ? "mag" : cfg.mode === "timed" ? "yel" : cfg.mode === "challenge" ? "lime" : ""} dot>{headerChip}</NeoChip>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <NeoChip variant="yel" icon="flame">{save.streak}</NeoChip>
          <button className="neo-icon-btn" style={{ width: 32, height: 32 }} onClick={() => setPaused(true)}><NeoIcon name="pause" size={14} /></button>
        </div>
      </div>

      <div style={{ padding: "4px 12px 0", display: "grid", gridTemplateColumns: "1fr 64px 1fr", gap: 8 }}>
        <div className={`neo-player ${curPlayer === 1 && phase !== "over" ? "neo-player--active" : ""}`}>
          <div className="neo-player__avatar">YOU</div>
          <div>
            <div className="neo-player__name">PLAYER 1</div>
            <div className="neo-player__meta">CYAN · {save.wins}W</div>
          </div>
          <div className="neo-player__score" style={{ marginTop: 4 }}>{String(scores.p1).padStart(2, "0")}</div>
        </div>

        <div className="neo-vs">
          <div className="neo-vs__turn">{cfg.timer ? "TIMER" : "TURN"}</div>
          <div className="neo-vs__timer" style={{ color: curPlayer === 1 ? "var(--cyan)" : "var(--magenta)", fontSize: cfg.timer ? 22 : 16 }}>
            {cfg.timer ? `0:${String(timer || 0).padStart(2, "0")}` : (phase === "ai" ? "…" : "GO")}
          </div>
          <div className="neo-vs__turn" style={{ color: curPlayer === 1 ? "var(--cyan)" : "var(--magenta)" }}>{turnLabel}</div>
        </div>

        <div className={`neo-player neo-player--p2 ${curPlayer === 2 && phase !== "over" ? "neo-player--active" : ""}`}>
          <div className="neo-player__avatar neo-player__avatar--robot">
            {opponent === "ai" ?
              <NeoAvatarVideo
                className="knxt4-player-neo-avatar"
                  variant="screen"
                active
                ariaLabel="NEO robot opponent avatar"
              />
              : "P2"}
          </div>
          <div>
            <div className="neo-player__name">{opponent === "ai" ? aiName : "PLAYER 2"}</div>
            <div className="neo-player__meta">{opponent === "ai" ? `${AI_LEVELS[aiLevel].name} · ${phase === "ai" ? "THINKING" : "READY"}` : "MAGENTA · LOCAL"}</div>
          </div>
          <div className="neo-player__score" style={{ marginTop: 4 }}>{String(scores.p2).padStart(2, "0")}</div>
        </div>
      </div>

      <div style={{ padding: "6px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="neo-mono" style={{ fontSize: 9, color: "var(--ink-mute)", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ color: "var(--cyan)" }}>RND {String(round).padStart(2, "0")}</span>
          <span>·</span>
          <span>MOVE {String(moves.length + 1).padStart(2, "0")}</span>
          {phase === "ai" && <><span>·</span><span className="neo-thinking"><i /><i /><i /></span><span style={{ color: "var(--magenta)" }}>{aiStatus}</span></>}
        </div>
        <div className="neo-mono" style={{ fontSize: 9, color: "var(--ink-mute)" }}>HINT {String(hintsLeft).padStart(2, "0")}/03</div>
      </div>

      <div style={{ padding: "6px 6px 0", position: "relative" }}>
        <Knxt4Board
          board={board}
          curPlayer={curPlayer}
          myPlayer={myPlayer}
          onDrop={(c) => {
            if (activePower === "shift" || activePower === "gravity") return
            if (phase !== "idle" && phase !== "over") return
            if (phase === "over") return
            tryDrop(c)
          }}
          onTokenTarget={onTokenTarget}
          hotCol={hotCol}
          setHotCol={setHotCol}
          winCells={winInfo?.cells || []}
          showWinLine={phase === "over" && !!winInfo?.player}
          skinId={skinId}
          bombMode={activePower === "bomb"}
          peekCol={peekCol}
          threatCells={[
            ...threatCells,
            ...(highlightedHint != null ? [{ r: dropRow(board, highlightedHint), c: highlightedHint }] : []),
          ]}
          disabled={phase === "ai" || phase === "animating" || phase === "over" || paused}
          lastDrop={lastDrop}
          tilt={tilt}
        />

        {(activePower === "shift" || activePower === "gravity") && (
          <div style={{ position: "absolute", top: -2, left: 0, right: 0, padding: "0 14px" }}>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5,
              background: "rgba(0,0,0,0.6)", padding: 6, borderRadius: 8,
              border: `1px solid var(--${activePower === "shift" ? "cyan" : "violet"})`,
            }}>
              {Array.from({ length: COLS }, (_, c) => (
                <div key={c} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  {activePower === "shift" && (
                    <div style={{ display: "flex", gap: 2 }}>
                      <button className="neo-icon-btn" style={{ width: 18, height: 18, padding: 0 }} onClick={() => onShiftPick(c, -1)}><NeoIcon name="back" size={10} /></button>
                      <button className="neo-icon-btn" style={{ width: 18, height: 18, padding: 0 }} onClick={() => onShiftPick(c, 1)}><NeoIcon name="arrow-r" size={10} /></button>
                    </div>
                  )}
                  {activePower === "gravity" && (
                    <button className="neo-icon-btn neo-icon-btn--mag" style={{ width: 22, height: 22, padding: 0, borderColor: "var(--violet)", color: "var(--violet)" }} onClick={() => onGravityPick(c)}><NeoIcon name="arrow-d" size={12} /></button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {usePowerUps && (
        <div className="neo-energy" style={{ marginTop: 8 }}>
          <div className="neo-energy__label">⚡ {energy} / 10</div>
          <div className="neo-energy__bar"><div className="neo-energy__fill" style={{ width: `${(energy / 10) * 100}%` }} /></div>
          {doubleArmed && <NeoChip variant="lime" dot>×2 ARMED</NeoChip>}
        </div>
      )}

      {usePowerUps && (
        <div className="neo-tray">
          {Object.values(POWERS).filter((p) => save.unlockedPowers.includes(p.id)).map((p) => {
            const unlocked = save.unlockedPowers.includes(p.id)
            const affordable = energy >= p.cost
            const isActive = activePower === p.id
            return (
              <button key={p.id}
                className={`neo-power neo-power--${p.color} ${isActive ? "neo-power--active" : ""} ${!unlocked ? "neo-power--locked" : !affordable ? "neo-power--unaff" : ""}`}
                onClick={() => unlocked && affordable && (isActive ? cancelPower() : armPower(p.id))}
              >
                <span className="neo-power__cost">{p.cost}</span>
                <span className="neo-power__icon"><NeoIcon name={p.icon} size={20} /></span>
                <span className="neo-power__name">{p.name}</span>
                {!unlocked && <NeoIcon name="lock" size={10} color="var(--ink-mute)" />}
              </button>
            )
          })}
        </div>
      )}

      <div className="neo-dock">
        <button className="neo-dock__btn neo-dock__btn--cyan" onClick={undo} disabled={moves.length === 0 || cfg.mode === "challenge"}>
          <NeoIcon name="undo" size={16} /> <span>UNDO</span>
        </button>
        <button className="neo-dock__btn neo-dock__btn--lime" onClick={useHint} disabled={hintsLeft === 0 || phase !== "idle"}>
          <NeoIcon name="hint" size={16} /> <span>HINT {hintsLeft}</span>
        </button>
        <button className="neo-dock__btn neo-dock__btn--cyan" onClick={showTactical} disabled={phase !== "idle"}>
          <NeoIcon name="eye" size={16} /> <span>TACTIC</span>
        </button>
        <button className="neo-dock__btn neo-dock__btn--mag" onClick={() => setTilt((t) => t === "high" ? "normal" : t === "normal" ? "flat" : "high")}>
          <NeoIcon name="cpu" size={16} /> <span>{tilt.toUpperCase()}</span>
        </button>
        <button className="neo-dock__btn neo-dock__btn--cyan" onClick={restart}>
          <NeoIcon name="restart" size={16} /> <span>RESET</span>
        </button>
      </div>

      {toast && (
        <div key={toast.id} className={`neo-toast ${toast.variant ? "neo-toast--" + toast.variant : ""}`}>
          {toast.msg}
        </div>
      )}

      {combo && <div className="neo-combo">{combo}</div>}

      {paused && (
        <div className="neo-overlay">
          <div className="neo-overlay__panel">
            <div className="neo-circuit" />
            <div style={{ position: "relative", textAlign: "center" }}>
              <div className="neo-eyebrow">MATCH SUSPENDED</div>
              <div className="neo-h1" style={{ fontSize: 40, marginTop: 6 }}>PAUSED</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
                <button className="neo-btn neo-btn--lg neo-btn--block" onClick={() => setPaused(false)}><NeoIcon name="play" size={14} color="#001016" /> RESUME</button>
                <button className="neo-btn neo-btn--ghost neo-btn--block" onClick={() => { undo(); setPaused(false) }} disabled={moves.length === 0}><NeoIcon name="undo" size={14} /> UNDO MOVE</button>
                <button className="neo-btn neo-btn--ghost neo-btn--block neo-btn--lime" style={{ color: "var(--lime)", boxShadow: "inset 0 0 0 1px rgba(191,255,26,0.45)" }} onClick={() => { restart(); setPaused(false) }}><NeoIcon name="restart" size={14} /> RESTART</button>
                <button className="neo-btn neo-btn--ghost neo-btn--block" style={{ color: "var(--red)", boxShadow: "inset 0 0 0 1px rgba(255,53,86,0.4)" }} onClick={onBack}><NeoIcon name="close" size={14} /> FORFEIT</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </NeoPhone>
  )
}

/* ─────────────────────────────────────────────────────────────────
   HOST WRAPPER — hub → modes → play flow + persistent save mirror.
   ───────────────────────────────────────────────────────────────── */
type Route =
  | { name: "hub" }
  | { name: "modes" }
  | { name: "play"; cfg: Knxt4Config }
  | { name: "coming"; title: string; sub: string; color?: string }

export function Knxt4Game({ onClose }: { onClose?: () => void }) {
  const { settings, recordGameResult, playAvatarReaction } = useApp()
  const [route, setRoute] = useState<Route>({ name: "hub" })

  const [save, setSave] = useState<Knxt4Save>(() => {
    const d = defaultSave()
    d.name = "COMMANDER"
    if (settings?.gameDifficulty === "HARD") d.currentLadder = 4
    else if (settings?.gameDifficulty === "EASY") d.currentLadder = 1
    return d
  })

  const go = (target: unknown) => {
    if (typeof target === "string") {
      const titles: Record<string, { title: string; sub: string; color?: string }> = {
        settings: { title: "SETTINGS", sub: "AUDIO · INPUT · DISPLAY · COMING SOON" },
        stats: { title: "STATS", sub: "MATCH HISTORY · COMING SOON", color: "yellow" },
        garage: { title: "GARAGE", sub: "TOKEN SKINS · COMING SOON", color: "lime" },
        ladder: { title: "AI LADDER", sub: "TIER CLIMB · COMING SOON", color: "magenta" },
        "challenge-select": { title: "CHALLENGE", sub: "PUZZLE BANK · COMING SOON", color: "yellow" },
      }
      if (target in titles) { setRoute({ name: "coming", ...titles[target as keyof typeof titles] }); return }
      if (target === "modes") { setRoute({ name: "modes" }); return }
      if (target === "hub") { setRoute({ name: "hub" }); return }
      return
    }
    setRoute(target as Route)
  }

  const onResult = (r: {
    result: "win" | "loss" | "draw"
    winner: 0 | Player
    moves: number
    cfg: Knxt4Config
    durationMs: number
  }) => {
    setSave((s) => {
      const games = s.games + 1
      const wins = s.wins + (r.result === "win" ? 1 : 0)
      const losses = s.losses + (r.result === "loss" ? 1 : 0)
      const draws = s.draws + (r.result === "draw" ? 1 : 0)
      const streak = r.result === "win" ? s.streak + 1 : 0
      const bestStreak = Math.max(s.bestStreak, streak)
      const xp = s.xp + (r.result === "win" ? 25 : r.result === "draw" ? 8 : 4)
      const recent = [{ result: r.result, mode: r.cfg.mode, opponent: r.cfg.aiName, moves: r.moves, ts: Date.now() }, ...s.recent].slice(0, 12)
      return { ...s, games, wins, losses, draws, streak, bestStreak, xp, recent }
    })

    if (r.result === "win") playAvatarReaction("ecstatic")
    else if (r.result === "loss") playAvatarReaction("angry")
    else playAvatarReaction("surprised")

    const score = r.result === "win" ? Math.max(10, 240 - r.moves * 5 - Math.floor(r.durationMs / 2000)) : r.result === "draw" ? 25 : 5
    recordGameResult({
      game: "knxt4",
      result: r.result === "loss" ? "lose" : r.result,
      difficulty: settings.gameDifficulty,
      score: r.result === "win" ? score : undefined,
      completionTimeMs: r.durationMs,
    })

    setRoute({ name: "hub" })
  }

  return (
    <div className="knxt4-root">
      {route.name === "hub" && <HubScreen save={save} go={go} onClose={onClose} />}
      {route.name === "modes" && <ModesScreen save={save} go={go} onBack={() => setRoute({ name: "hub" })} />}
      {route.name === "coming" && (
        <ComingSoonScreen title={route.title} sub={route.sub} color={route.color || "cyan"} onBack={() => setRoute({ name: "modes" })} />
      )}
      {route.name === "play" && (
        <GameScreen config={route.cfg} save={save} onBack={() => setRoute({ name: "modes" })} onResult={onResult} />
      )}
    </div>
  )
}
