"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import "./knxt4-styles.css"
import {
  AI_LEVELS,
  POWERS,
  aiMove,
  cloneBoard,
  drop as dropToken,
  findWin,
  isFull,
  makeBoard,
  vaporize,
} from "./knxt4-core"
import type { Board, Player, PowerId } from "./knxt4-core"
import { Knxt4Board } from "./knxt4-board"
import { ComingSoonScreen, HubScreen, ModesScreen, type Knxt4Config } from "./knxt4-hub"
import { defaultSave, type Knxt4Save } from "./knxt4-meta"
import { NeoAppBar, NeoChip, NeoIcon, NeoPhone } from "./knxt4-phone"
import { NeoRobot } from "./knxt4-robot"
import { useApp } from "@/lib/store"

type Screen =
  | { name: "hub" }
  | { name: "modes" }
  | { name: "play"; cfg: Knxt4Config }
  | { name: "coming"; title: string; sub: string; color?: string }

type EndReason = "win" | "lose" | "draw"

interface PowerState {
  energy: number
  armed: PowerId | null
  doublePending: boolean
  peekCol: number | null
}

const INITIAL_POWERS: PowerState = { energy: 6, armed: null, doublePending: false, peekCol: null }

const normalizeResult = (result: EndReason): "win" | "loss" | "draw" => result === "lose" ? "loss" : result

const headerChip = (cfg: Knxt4Config) =>
  cfg.mode === "ladder" && cfg.level ? `LADDER · L${cfg.level.id}` :
    cfg.mode === "timed" ? `TIMED · ${cfg.timer ?? 20}s` :
      cfg.mode === "training" ? "TRAINING" :
        cfg.mode === "quick" ? "QUICK" : "CLASSIC"

const pad2 = (n: number) => String(n).padStart(2, "0")

export function Knxt4Game({ onClose }: { onClose?: () => void }) {
  const { settings, recordGameResult, playAvatarReaction } = useApp()
  const [screen, setScreen] = useState<Screen>({ name: "hub" })
  const [save, setSave] = useState<Knxt4Save>(() => defaultSave())

  const updateSaveForResult = useCallback((result: EndReason, cfg: Knxt4Config, moves: number) => {
    setSave((prev) => {
      const r = normalizeResult(result)
      return {
        ...prev,
        games: prev.games + 1,
        wins: r === "win" ? prev.wins + 1 : prev.wins,
        losses: r === "loss" ? prev.losses + 1 : prev.losses,
        draws: r === "draw" ? prev.draws + 1 : prev.draws,
        streak: r === "win" ? prev.streak + 1 : 0,
        bestStreak: r === "win" ? Math.max(prev.bestStreak, prev.streak + 1) : prev.bestStreak,
        xp: prev.xp + (r === "win" ? 25 : r === "draw" ? 12 : 5),
        energy: Math.min(prev.energy + 2, 10),
        recent: [{ result: r, mode: cfg.mode, opponent: cfg.aiName || "N.E.O.", moves, ts: Date.now() }, ...prev.recent].slice(0, 5),
      }
    })
  }, [])

  const go = useCallback((s: Screen | Screen["name"] | "settings" | "stats" | "garage" | "ladder" | "challenge-select") => {
    if (typeof s === "string") {
      if (s === "modes") setScreen({ name: "modes" })
      else if (s === "hub") setScreen({ name: "hub" })
      else if (s === "ladder") setScreen({ name: "coming", title: "AI LADDER", sub: "TIER CLIMB · COMING SOON", color: "violet" })
      else if (s === "settings") setScreen({ name: "coming", title: "SETTINGS", sub: "GLOBAL CONFIG · HOST APP ACTIVE", color: "cyan" })
      else if (s === "stats") setScreen({ name: "coming", title: "STATS", sub: "LIFETIME RECORD · HOST APP ACTIVE", color: "cyan" })
      else if (s === "garage") setScreen({ name: "coming", title: "GARAGE", sub: "TOKEN ENERGY · COMING SOON", color: "lime" })
      else setScreen({ name: "coming", title: "CHALLENGE", sub: "PUZZLE BANK · COMING SOON", color: "yellow" })
      return
    }
    setScreen(s)
  }, [])

  return (
    <div className="knxt4-root">
      {screen.name === "hub" && <HubScreen save={save} go={go} onClose={onClose} />}
      {screen.name === "modes" && <ModesScreen save={save} go={go} onBack={() => go("hub")} onClose={onClose} />}
      {screen.name === "coming" && <ComingSoonScreen title={screen.title} sub={screen.sub} color={screen.color} onBack={() => go("modes")} />}
      {screen.name === "play" && (
        <Game
          config={screen.cfg}
          save={save}
          difficulty={settings.gameDifficulty}
          onBack={() => go("modes")}
          onResult={(result, finalBoard, moves) => {
            updateSaveForResult(result.reason, screen.cfg, moves)
            const elapsed = Date.now() - result.startedAt
            if (result.reason === "win") playAvatarReaction("ecstatic")
            else if (result.reason === "lose") playAvatarReaction("angry")
            else playAvatarReaction("surprised")
            recordGameResult({
              game: "knxt4",
              result: result.reason,
              difficulty: settings.gameDifficulty,
              score: result.reason === "win" ? Math.max(10, 240 - moves * 5 - Math.floor(elapsed / 2000)) : undefined,
              completionTimeMs: elapsed,
            })
            void finalBoard
          }}
        />
      )}
    </div>
  )
}

function Game({
  config,
  save,
  difficulty,
  onResult,
  onBack,
}: {
  config: Knxt4Config
  save: Knxt4Save
  difficulty: string
  onResult: (result: { reason: EndReason; startedAt: number }, finalBoard: Board, moves: number) => void
  onBack: () => void
}) {
  const cfg = config
  const aiLevel = cfg.aiLevel || 3
  const aiName = cfg.aiName || "N.E.O."
  const opponent = cfg.opponent || "ai"
  const skinId = save.selectedToken || "core"
  const usePowerUps = cfg.powerUps !== false && cfg.mode !== "training"
  const [board, setBoard] = useState<Board>(() => makeBoard())
  const [curPlayer, setCurPlayer] = useState<Player>(1)
  const [moves, setMoves] = useState<{ col: number; player: Player; r: number }[]>([])
  const [hotCol, setHotCol] = useState<number | null>(null)
  const [lastDrop, setLastDrop] = useState<{ r: number; c: number } | null>(null)
  const [phase, setPhase] = useState<"idle" | "ai" | "animating" | "over">("idle")
  const [winCells, setWinCells] = useState<{ r: number; c: number }[]>([])
  const [scores, setScores] = useState({ p1: 0, p2: 0 })
  const [round] = useState(1)
  const [powers, setPowers] = useState<PowerState>(() => ({ ...INITIAL_POWERS, energy: save.energy || 6 }))
  const [toast, setToast] = useState<{ msg: string; variant?: string; id: number } | null>(null)
  const [combo, setCombo] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const [hintsLeft, setHintsLeft] = useState(save.hintsLeft || 3)
  const [highlightedHint, setHighlightedHint] = useState<number | null>(null)
  const [timer, setTimer] = useState(cfg.timer || null)
  const [aiStatus, setAiStatus] = useState("")
  const [tilt, setTilt] = useState<"normal" | "flat" | "high">("normal")
  const startedAt = useRef(Date.now())
  const resultEmitted = useRef(false)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((msg: string, variant = "") => {
    setToast({ msg, variant, id: Date.now() })
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 1900)
  }, [])

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current) }, [])

  const finish = useCallback((reason: EndReason, finalBoard: Board) => {
    if (resultEmitted.current) return
    resultEmitted.current = true
    const w = findWin(finalBoard)
    setWinCells(w?.cells || [])
    setPhase("over")
    if (reason === "win") setScores((s) => ({ ...s, p1: s.p1 + 1 }))
    else if (reason === "lose") setScores((s) => ({ ...s, p2: s.p2 + 1 }))
    onResult({ reason, startedAt: startedAt.current }, finalBoard, moves.length + 1)
  }, [moves.length, onResult])

  const tryDrop = useCallback((col: number, asPlayer: Player = curPlayer) => {
    if (phase === "over" || phase === "animating" || paused) return false
    const nb = cloneBoard(board)
    const placed = dropToken(nb, col, asPlayer)
    if (!placed) {
      showToast("COLUMN FULL", "red")
      return false
    }
    setBoard(nb)
    setMoves((m) => [...m, { col, player: asPlayer, r: placed.r }])
    setLastDrop(placed)
    setPhase("animating")
    const win = findWin(nb)
    if (!win) {
      let longest = 1
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]] as const) {
        let cnt = 1
        for (let k = 1; k < 4; k++) {
          const rr = placed.r + dr * k
          const cc = col + dc * k
          if (rr < 0 || rr >= 6 || cc < 0 || cc >= 7 || nb[rr][cc] !== asPlayer) break
          cnt++
        }
        for (let k = 1; k < 4; k++) {
          const rr = placed.r - dr * k
          const cc = col - dc * k
          if (rr < 0 || rr >= 6 || cc < 0 || cc >= 7 || nb[rr][cc] !== asPlayer) break
          cnt++
        }
        longest = Math.max(longest, cnt)
      }
      if (longest >= 3 && asPlayer === 1) {
        setCombo("+1 ENERGY")
        setPowers((p) => ({ ...p, energy: Math.min(p.energy + 1, 10) }))
        setTimeout(() => setCombo(null), 1200)
      }
    }
    return true
  }, [board, curPlayer, paused, phase, showToast])

  useEffect(() => {
    if (phase !== "animating") return
    const t = setTimeout(() => {
      const win = findWin(board)
      if (win) {
        finish(win.player === 1 ? "win" : "lose", board)
        return
      }
      if (isFull(board)) {
        finish("draw", board)
        return
      }
      if (powers.doublePending && curPlayer === 1 && moves[moves.length - 1]?.player === 1) {
        setPowers((p) => ({ ...p, doublePending: false }))
        setPhase("idle")
        showToast("DROP AGAIN", "lime")
        return
      }
      setPowers((p) => ({ ...p, peekCol: null, energy: curPlayer === 2 ? Math.min(10, p.energy + 1) : p.energy }))
      const next = (3 - curPlayer) as Player
      setCurPlayer(next)
      setPhase(opponent === "ai" && next === 2 ? "ai" : "idle")
    }, 580)
    return () => clearTimeout(t)
  }, [phase, board, curPlayer, finish, moves, opponent, powers.doublePending, showToast])

  useEffect(() => {
    if (phase !== "ai" || paused) return
    const messages = ["ANALYZING BOARD...", "TRACE.SCAN", "THREAT MAPPED", "COUNTERMOVE LOCKED"]
    setAiStatus(messages[0])
    let mi = 0
    const id = setInterval(() => { mi = (mi + 1) % messages.length; setAiStatus(messages[mi]) }, 350)
    const t = setTimeout(() => {
      clearInterval(id)
      setAiStatus("")
      const col = aiMove(board, aiLevel, 2)
      if (col != null) tryDrop(col, 2)
    }, cfg.mode === "quick" ? 400 : 800 + aiLevel * 100)
    return () => { clearInterval(id); clearTimeout(t) }
  }, [phase, paused, board, aiLevel, tryDrop, cfg.mode])

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
        showToast("TIMEOUT - TURN LOST", "red")
        setCurPlayer((p) => (3 - p) as Player)
        setPhase(opponent === "ai" && curPlayer === 1 ? "ai" : "idle")
      }
    }, 1000)
    return () => clearInterval(id)
  }, [cfg.timer, curPlayer, opponent, paused, phase, showToast])

  const armPower = (id: PowerId) => {
    if (phase !== "idle" || curPlayer !== 1) return
    const cost = POWERS[id].cost
    if (powers.energy < cost) { showToast("LOW ENERGY", "red"); return }
    if (id === "peek") {
      const col = aiMove(board, aiLevel, 2)
      setPowers((p) => ({ ...p, energy: p.energy - cost, peekCol: col }))
      showToast(col != null ? `THREAT VECTOR: C-${col + 1}` : "NO TARGET", "yellow")
    } else if (id === "double") {
      setPowers((p) => ({ ...p, energy: p.energy - cost, doublePending: true }))
      showToast("DOUBLE DROP ARMED", "lime")
    } else {
      setPowers((p) => ({ ...p, armed: p.armed === "bomb" ? null : "bomb" }))
      showToast(powers.armed === "bomb" ? "BOMB DISARMED" : "SELECT ENEMY TOKEN", "orange")
    }
  }

  const onTokenTarget = (r: number, c: number) => {
    if (powers.armed !== "bomb" || board[r][c] !== 2) return
    if (powers.energy < POWERS.bomb.cost) { showToast("LOW ENERGY", "red"); return }
    const nb = vaporize(board, r, c)
    setBoard(nb)
    setLastDrop({ r, c })
    setPowers((p) => ({ ...p, energy: p.energy - POWERS.bomb.cost, armed: null }))
    setPhase("animating")
    showToast("TOKEN VAPORIZED", "orange")
  }

  const useHint = () => {
    if (hintsLeft <= 0) { showToast("NO HINTS LEFT", "red"); return }
    setHintsLeft((h) => h - 1)
    const c = aiMove(board, 5, 1)
    setHighlightedHint(c)
    showToast(c == null ? "NO HINT" : `OPTIMAL: COLUMN ${c + 1}`, "lime")
    setTimeout(() => setHighlightedHint(null), 2400)
  }

  const restart = () => {
    setBoard(makeBoard())
    setMoves([])
    setCurPlayer(1)
    setHotCol(null)
    setLastDrop(null)
    setWinCells([])
    setPhase("idle")
    setPowers({ ...INITIAL_POWERS, energy: save.energy || 6 })
    resultEmitted.current = false
    startedAt.current = Date.now()
    showToast("MATCH RESET", "cyan")
  }

  const threatCells = useMemo(() => highlightedHint != null ? [{ r: (() => {
    for (let r = 5; r >= 0; r--) if (board[r][highlightedHint] === 0) return r
    return -1
  })(), c: highlightedHint }].filter((x) => x.r >= 0) : [], [board, highlightedHint])

  const turnLabel = phase === "over" ? (winCells.length === 0 ? "DRAW" : board[winCells[0]?.r]?.[winCells[0]?.c] === 1 ? "YOU WIN" : `${aiName} WINS`) : phase === "ai" ? "AI TURN" : curPlayer === 1 ? "YOUR MOVE" : opponent === "local" ? "P2 TURN" : "AI TURN"

  return (
    <NeoPhone>
      <div className={`neo-bg ${cfg.level?.bg ? `neo-bg-${cfg.level.bg}` : "neo-bg"}`} />
      <div className="neo-appbar" style={{ paddingBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="neo-icon-btn" style={{ width: 32, height: 32 }} onClick={onBack}><NeoIcon name="back" size={14} /></button>
          <div className="neo-appbar__brand" style={{ fontSize: 13 }}><b>N.E.O.</b><span>CONNECT</span></div>
          <NeoChip variant={cfg.mode === "ladder" ? "mag" : cfg.mode === "timed" ? "yel" : ""} dot>{headerChip(cfg)}</NeoChip>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <NeoChip variant="yel" icon="flame">{save.streak}</NeoChip>
          <button className="neo-icon-btn" style={{ width: 32, height: 32 }} onClick={() => setPaused(true)}><NeoIcon name="pause" size={14} /></button>
        </div>
      </div>

      <div style={{ padding: "4px 12px 0", display: "grid", gridTemplateColumns: "1fr 64px 1fr", gap: 8 }}>
        <div className={`neo-player ${curPlayer === 1 && phase !== "over" ? "neo-player--active" : ""}`}>
          <div className="neo-player__avatar">YOU</div>
          <div><div className="neo-player__name">PLAYER 1</div><div className="neo-player__meta">CYAN · {save.wins}W</div></div>
          <div className="neo-player__score" style={{ marginTop: 4 }}>{pad2(scores.p1)}</div>
        </div>
        <div className="neo-vs">
          <div className="neo-vs__turn">{cfg.timer ? "TIMER" : "TURN"}</div>
          <div className="neo-vs__timer" style={{ color: curPlayer === 1 ? "var(--cyan)" : "var(--magenta)", fontSize: cfg.timer ? 22 : 16 }}>{cfg.timer ? `0:${pad2(timer || 0)}` : phase === "ai" ? "..." : phase === "over" ? "END" : "GO"}</div>
          <div className="neo-vs__turn" style={{ color: curPlayer === 1 ? "var(--cyan)" : "var(--magenta)" }}>{turnLabel}</div>
        </div>
        <div className={`neo-player neo-player--p2 ${curPlayer === 2 && phase !== "over" ? "neo-player--active" : ""}`}>
          <div className="neo-player__avatar neo-player__avatar--robot">{opponent === "ai" ? <NeoRobot variant="head" size={42} emote={phase === "ai" ? "thinking" : phase === "over" && winCells.length && board[winCells[0].r][winCells[0].c] === 2 ? "smug" : "idle"} /> : "P2"}</div>
          <div><div className="neo-player__name">{opponent === "ai" ? aiName : "PLAYER 2"}</div><div className="neo-player__meta">{opponent === "ai" ? `${AI_LEVELS[aiLevel].name} · ${phase === "ai" ? "THINKING" : "READY"}` : "MAGENTA · LOCAL"}</div></div>
          <div className="neo-player__score" style={{ marginTop: 4 }}>{pad2(scores.p2)}</div>
        </div>
      </div>

      <div style={{ padding: "6px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="neo-mono" style={{ fontSize: 9, color: "var(--ink-mute)", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ color: "var(--cyan)" }}>RND {pad2(round)}</span><span>·</span><span>MOVE {pad2(moves.length + 1)}</span>
          {phase === "ai" && <><span>·</span><span className="neo-thinking"><i /><i /><i /></span><span style={{ color: "var(--magenta)" }}>{aiStatus}</span></>}
        </div>
        <div className="neo-mono" style={{ fontSize: 9, color: "var(--ink-mute)" }}>HINT {pad2(hintsLeft)}/03</div>
      </div>

      <div style={{ padding: "6px 6px 0", position: "relative" }}>
        <Knxt4Board
          board={board}
          curPlayer={curPlayer}
          myPlayer={1}
          onDrop={(c) => { if (phase === "idle") tryDrop(c) }}
          onTokenTarget={onTokenTarget}
          hotCol={hotCol}
          setHotCol={setHotCol}
          winCells={winCells}
          showWinLine={phase === "over" && winCells.length > 0}
          skinId={skinId}
          bombMode={powers.armed === "bomb"}
          peekCol={powers.peekCol}
          threatCells={threatCells}
          disabled={phase === "ai" || phase === "animating" || phase === "over" || paused}
          lastDrop={lastDrop}
          tilt={tilt}
        />
      </div>

      {usePowerUps && (
        <div className="neo-energy" style={{ marginTop: 8 }}>
          <div className="neo-energy__label">⚡ {powers.energy} / 10</div>
          <div className="neo-energy__bar"><div className="neo-energy__fill" style={{ width: `${(powers.energy / 10) * 100}%` }} /></div>
          {powers.doublePending && <NeoChip variant="lime" dot>×2 ARMED</NeoChip>}
        </div>
      )}

      {usePowerUps && (
        <div className="neo-tray">
          {(Object.keys(POWERS) as PowerId[]).map((id) => {
            const p = POWERS[id]
            const affordable = powers.energy >= p.cost
            const isActive = powers.armed === id || (id === "double" && powers.doublePending)
            const icon = id === "bomb" ? "flame" : id === "double" ? "plus" : "eye"
            const color = id === "bomb" ? "orange" : id === "double" ? "lime" : "yellow"
            return (
              <button key={id} className={`neo-power neo-power--${color} ${isActive ? "neo-power--active" : ""} ${!affordable && !isActive ? "neo-power--unaff" : ""}`} onClick={() => affordable && armPower(id)}>
                <span className="neo-power__cost">{p.cost}</span>
                <span className="neo-power__icon"><NeoIcon name={icon} size={20} /></span>
                <span className="neo-power__name">{p.name}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="neo-dock">
        <button className="neo-dock__btn neo-dock__btn--cyan" onClick={restart}><NeoIcon name="restart" size={16} /><span>RESET</span></button>
        <button className="neo-dock__btn neo-dock__btn--lime" onClick={useHint} disabled={hintsLeft === 0 || phase !== "idle"}><NeoIcon name="hint" size={16} /><span>HINT {hintsLeft}</span></button>
        <button className="neo-dock__btn neo-dock__btn--cyan" onClick={() => setTilt((t) => t === "high" ? "normal" : t === "normal" ? "flat" : "high")}><NeoIcon name="cpu" size={16} /><span>{tilt.toUpperCase()}</span></button>
        <button className="neo-dock__btn neo-dock__btn--mag" onClick={onBack}><NeoIcon name="home" size={16} /><span>MODES</span></button>
      </div>

      {toast && <div key={toast.id} className={`neo-toast ${toast.variant ? "neo-toast--" + toast.variant : ""}`}>{toast.msg}</div>}
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
                <button className="neo-btn neo-btn--ghost neo-btn--block neo-btn--lime" style={{ color: "var(--lime)", boxShadow: "inset 0 0 0 1px rgba(191,255,26,0.45)" }} onClick={() => { restart(); setPaused(false) }}><NeoIcon name="restart" size={14} /> RESTART</button>
                <button className="neo-btn neo-btn--ghost neo-btn--block" style={{ color: "var(--red)", boxShadow: "inset 0 0 0 1px rgba(255,53,86,0.4)" }} onClick={onBack}><NeoIcon name="close" size={14} /> FORFEIT</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === "over" && (
        <div className="neo-overlay" style={{ background: "rgba(0,0,0,0.45)", pointerEvents: "none" }}>
          <div className="neo-overlay__panel" style={{ pointerEvents: "auto" }}>
            <div className="neo-circuit" />
            <div style={{ position: "relative", textAlign: "center" }}>
              <div className="neo-eyebrow">{winCells.length === 0 ? "// STALEMATE" : board[winCells[0].r][winCells[0].c] === 1 ? "// CONNECT.4 ACHIEVED" : "// N.E.O. DOMINANT"}</div>
              <div className="neo-h1" style={{ fontSize: 36, marginTop: 6 }}>{winCells.length === 0 ? "DRAW" : board[winCells[0].r][winCells[0].c] === 1 ? "VICTORY" : "DEFEATED"}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button className="neo-btn neo-btn--block" onClick={restart}><NeoIcon name="restart" size={14} color="#001016" /> REMATCH</button>
                <button className="neo-btn neo-btn--ghost neo-btn--block neo-btn--mag" onClick={onBack}><NeoIcon name="home" size={12} /> MODES</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <span style={{ display: "none" }}>{difficulty}</span>
    </NeoPhone>
  )
}
