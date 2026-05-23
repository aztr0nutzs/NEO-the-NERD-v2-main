"use client"

import { AI_LEVELS } from "./knxt4-core"
import { LEVELS, type Knxt4Save, TOKENS, winRate, xpProgress } from "./knxt4-meta"
import { BackBtn, NeoAppBar, NeoChip, NeoDifficulty, NeoIcon, NeoPhone, TokenChip } from "./knxt4-phone"
import { NeoAvatarVideo } from "@/components/avatar/neo-avatar-video"

type GoTarget =
  | "hub"
  | "modes"
  | "settings"
  | "stats"
  | "garage"
  | "ladder"
  | "challenge-select"
  | { name: "play"; cfg: Knxt4Config }
  | { name: "coming"; title: string; sub: string; color?: string }

export interface Knxt4Config {
  mode: "classic" | "quick" | "timed" | "challenge" | "training" | "ladder"
  aiLevel: 1 | 2 | 3 | 4 | 5
  aiName?: string
  opponent?: "ai" | "local"
  powerUps?: boolean
  timer?: number
  level?: (typeof LEVELS)[number]
}

interface ScreenProps {
  save: Knxt4Save
  go: (s: GoTarget) => void
  onBack?: () => void
  onClose?: () => void
}

export const HubScreen = ({ save, go, onClose }: ScreenProps) => {
  const nextLadder = LEVELS.find((l) => l.id === save.currentLadder) || LEVELS[0]
  const xp = xpProgress(save)
  const wr = winRate(save)
  const selectedSkin = TOKENS.find((t) => t.id === save.selectedToken) || TOKENS[0]

  return (
    <NeoPhone>
      <div className="neo-bg" />
      <div className="hub-depth">
        <div className="hub-depth__floor" />
        <div className="hub-depth__horizon" />
        <div className="hub-depth__stars hub-depth__stars--far" />
        <div className="hub-depth__stars hub-depth__stars--mid" />
        <div className="hub-depth__grid" />
      </div>
      <NeoAppBar
        title=" CONNECT"
        sub={`LV ${String(save.level).padStart(2, "0")} · ${save.xp} XP`}
        left={<button className="neo-icon-btn" style={{ width: 36, height: 36 }} onClick={() => go("settings")}><NeoIcon name="menu" size={16} /></button>}
        right={<>
          <button className="neo-icon-btn" style={{ width: 36, height: 36 }} onClick={() => go("stats")}><NeoIcon name="trophy" size={16} color="var(--yellow)" /></button>
          <button className="neo-icon-btn" style={{ width: 36, height: 36 }} onClick={() => go("garage")}><NeoIcon name="palette" size={16} /></button>
          {onClose && <button className="neo-icon-btn" style={{ width: 36, height: 36 }} onClick={onClose}><NeoIcon name="close" size={16} /></button>}
        </>}
      />

      <div style={{ flex: 1, padding: "0 16px 16px", overflow: "hidden", position: "relative" }}>
        <div className="hub-hero">
          <div className="hub-hero__platform">
            <div className="hub-hero__ring hub-hero__ring--outer" />
            <div className="hub-hero__ring hub-hero__ring--mid" />
            <div className="hub-hero__ring hub-hero__ring--inner" />
          </div>
          <div className="hub-hero__robot">
            <NeoAvatarVideo
              className="knxt4-hub-neo-avatar"
              variant="stage"
              active
              ariaLabel="NEO robot avatar in Knxt 4"
            />
          </div>
          <div className="hub-hero__info">
            <div className="hub-hero__eyebrow">▶ OPERATOR.YOU · ONLINE</div>
            <div className="hub-hero__name">{(save.name || "COMMANDER").toUpperCase()}</div>
            <div className="hub-hero__chips">
              <NeoChip variant="" dot>LV{String(save.level).padStart(2, "0")}</NeoChip>
              <NeoChip variant="lime" icon="bolt">{save.xp} XP</NeoChip>
              <NeoChip variant="yel" icon="flame">{save.streak}</NeoChip>
            </div>
            <div className="neo-bar hub-hero__bar"><div className="neo-bar__fill" style={{ width: `${xp.pct}%` }} /></div>
            <div className="hub-hero__bar-meta neo-mono">XP {xp.into}/{xp.span} · NEXT LV{String(save.level + 1).padStart(2, "0")}</div>
          </div>
        </div>

        <div className={`neo-panel neo-panel--glow${nextLadder.color === "magenta" ? "-mag" : ""}`} style={{ marginTop: 10, padding: 14, position: "relative", overflow: "hidden", cursor: "pointer" }} onClick={() => go("ladder")}>
          <div className="neo-circuit" style={{ opacity: 0.5 }} />
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
            <div className="neo-aibadge" style={{ color: `var(--${nextLadder.color})`, background: "rgba(255,255,255,0.04)", width: 52, height: 52, fontSize: 13 }}>L{String(nextLadder.id).padStart(2, "0")}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="neo-eyebrow" style={{ color: `var(--${nextLadder.color})` }}>▶ NEXT LADDER · TIER 0{nextLadder.id}</div>
              <div className="neo-h2" style={{ fontSize: 18, color: "#fff", textShadow: `0 0 12px var(--${nextLadder.color})`, marginTop: 2, lineHeight: 1 }}>{nextLadder.name}</div>
              <div className="neo-mono" style={{ fontSize: 9, color: "var(--ink-mute)", marginTop: 4 }}>vs {nextLadder.ai} · {AI_LEVELS[nextLadder.aiLevel].name}</div>
            </div>
            <NeoDifficulty level={nextLadder.aiLevel} color={`var(--${nextLadder.color})`} />
          </div>
          <div style={{ position: "relative", display: "flex", gap: 8, marginTop: 12 }}>
            <button className={`neo-btn neo-btn--sm neo-btn--block${nextLadder.color === "magenta" ? " neo-btn--mag" : nextLadder.color === "lime" ? " neo-btn--lime" : nextLadder.color === "yellow" ? " neo-btn--yellow" : ""}`} onClick={(e) => { e.stopPropagation(); go({ name: "play", cfg: { mode: "ladder", level: nextLadder, aiLevel: nextLadder.aiLevel, aiName: nextLadder.ai, opponent: "ai", powerUps: true } }) }}>
              <NeoIcon name="play" size={12} /> ENGAGE
            </button>
            <button className={`neo-btn neo-btn--sm neo-btn--ghost neo-btn--block${nextLadder.color === "magenta" ? " neo-btn--mag" : ""}`} style={{ color: `var(--${nextLadder.color})` }} onClick={(e) => { e.stopPropagation(); go("ladder") }}>
              ALL TIERS
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
          <button className="neo-btn neo-btn--lime neo-btn--block neo-btn--sm" style={{ padding: "12px 10px", fontSize: 12 }} onClick={() => go({ name: "play", cfg: { mode: "quick", aiLevel: 2, aiName: "N.E.O.", opponent: "ai", powerUps: false } })}>
            <NeoIcon name="bolt" size={12} color="#0d1a00" /> QUICK MATCH
          </button>
          <button className="neo-btn neo-btn--ghost neo-btn--block neo-btn--sm" style={{ padding: "12px 10px", fontSize: 12 }} onClick={() => go("modes")}>
            <NeoIcon name="grid" size={12} /> ALL MODES
          </button>
        </div>

        <div className="neo-tick" style={{ marginTop: 14 }}>SYSTEM STATUS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 6 }}>
          {[
            { l: "WINS", v: String(save.wins).padStart(2, "0"), c: "cyan" },
            { l: "STREAK", v: String(save.streak).padStart(2, "0"), c: "yellow" },
            { l: "RATE", v: `${wr}%`, c: "lime" },
            { l: "TIERS", v: `${save.laddersBeaten.length}/6`, c: "magenta" },
          ].map((s, i) => <div key={i} className="neo-stat" style={{ padding: "8px 8px" }}><div className="neo-stat__label" style={{ fontSize: 8 }}>{s.l}</div><div className="neo-stat__value" style={{ fontSize: 18, color: `var(--${s.c})` }}>{s.v}</div></div>)}
        </div>

        <div className="neo-tick neo-tick--mag" style={{ marginTop: 12 }}>RECENT</div>
        {(save.recent && save.recent.length > 0) ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6 }}>
            {save.recent.slice(0, 3).map((r, i) => (
              <div key={i} className="neo-row" style={{ padding: "8px 10px" }}>
                <div style={{ width: 22, height: 22, borderRadius: 4, background: r.result === "win" ? "rgba(0,232,255,0.12)" : r.result === "loss" ? "rgba(255,46,186,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${r.result === "win" ? "var(--cyan)" : r.result === "loss" ? "var(--magenta)" : "var(--ink-mute)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 900, fontSize: 10, color: r.result === "win" ? "var(--cyan)" : r.result === "loss" ? "var(--magenta)" : "var(--ink-mute)" }}>{r.result === "win" ? "W" : r.result === "loss" ? "L" : "D"}</div>
                <div style={{ flex: 1, fontSize: 11 }}>{(r.mode || "CLASSIC").toUpperCase()}{r.opponent ? ` · ${r.opponent}` : ""}</div>
                <div className="neo-mono" style={{ fontSize: 9, color: "var(--ink-mute)" }}>{r.moves}M</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="neo-panel" style={{ padding: 14, marginTop: 6, textAlign: "center" }}>
            <div className="neo-mono" style={{ fontSize: 10, color: "var(--ink-mute)", letterSpacing: "0.16em" }}>NO MATCHES LOGGED</div>
            <div className="neo-mono" style={{ fontSize: 9, color: "var(--ink-dim)", marginTop: 4 }}>PLAY YOUR FIRST GAME ▸</div>
          </div>
        )}
        <div style={{ position: "absolute", right: 18, bottom: 18, opacity: 0.28 }}><TokenChip skinId={selectedSkin.id} player={1} size={34} /></div>
      </div>
    </NeoPhone>
  )
}

export const ModesScreen = ({ save, go, onBack }: ScreenProps) => {
  const modes = [
    { id: "classic", title: "CLASSIC", sub: "Standard 7x6. Choose your AI tier.", color: "cyan", icon: "grid", tag: "CORE" },
    { id: "quick", title: "QUICK MATCH", sub: "Auto setup. Drop-in vs Normal AI.", color: "lime", icon: "bolt", tag: "INSTANT" },
    { id: "timed", title: "TIMED MATCH", sub: "20s per turn. Lose turn on timeout.", color: "yellow", icon: "wave", tag: "PRESSURE" },
    { id: "challenge", title: "CHALLENGE", sub: "5 prebuilt puzzles. Win in one.", color: "mag", icon: "puzzle", tag: "5 PZL" },
    { id: "training", title: "TRAINING", sub: "Always-on hints. Free undo. Easy AI.", color: "cyan", icon: "brain", tag: "LEARN" },
    { id: "ladder", title: "AI LADDER", sub: "Climb 6 tiers to N.E.O. Master.", color: "violet", icon: "crown", tag: `T0${save.currentLadder}` },
  ]

  const pickMode = (id: string) => {
    if (id === "quick") go({ name: "play", cfg: { mode: "quick", aiLevel: 2, aiName: "N.E.O.", opponent: "ai", powerUps: false } })
    else if (id === "training") go({ name: "coming", title: "TRAINING", sub: "TACTICAL LESSONS · COMING SOON", color: "cyan" })
    else if (id === "ladder") go({ name: "coming", title: "AI LADDER", sub: "TIER CLIMB · COMING SOON", color: "violet" })
    else if (id === "challenge") go({ name: "coming", title: "CHALLENGE", sub: "PUZZLE BANK · COMING SOON", color: "yellow" })
    else if (id === "classic") go({ name: "play", cfg: { mode: "classic", aiLevel: 3, aiName: "N.E.O.", opponent: "ai", powerUps: true } })
    else if (id === "timed") go({ name: "play", cfg: { mode: "timed", aiLevel: 3, aiName: "N.E.O.", opponent: "ai", powerUps: true, timer: 20 } })
  }

  return (
    <NeoPhone>
      <div className="neo-bg" />
      <NeoAppBar title=" / MODES" sub="06 GAME MODES" left={onBack ? <BackBtn onBack={onBack} /> : undefined} />
      <div style={{ flex: 1, padding: "0 16px 16px", overflow: "hidden" }}>
        <div className="neo-tick" style={{ marginTop: 6 }}>SELECT GAME MODE</div>
        <div className="neo-mode neo-mode--cyan" style={{ marginTop: 10, padding: 14, minHeight: 122 }} onClick={() => pickMode("classic")}>
          <div className="neo-circuit" />
          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}><NeoChip variant="" dot>CORE</NeoChip><NeoChip variant="off">vs AI · LOCAL 2P</NeoChip></div>
              <div className="neo-mode__title" style={{ fontSize: 24, color: "var(--cyan)", textShadow: "0 0 14px rgba(0,232,255,0.55)" }}>CLASSIC</div>
              <div className="neo-mode__sub" style={{ marginTop: 2, fontSize: 11 }}>Standard 7x6 Connect 4 rules.<br />Choose your AI tier · Power-ups enabled.</div>
            </div>
            <div style={{ width: 70, height: 70, position: "relative", flexShrink: 0 }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: 44, height: 44 }}><TokenChip skinId={save.selectedToken} player={1} size={44} /></div>
              <div style={{ position: "absolute", bottom: 0, right: 0, width: 36, height: 36 }}><TokenChip skinId={save.selectedToken} player={2} size={36} /></div>
            </div>
          </div>
          <div style={{ position: "relative", marginTop: 10 }}><button className="neo-btn neo-btn--sm">CONFIGURE · PLAY <NeoIcon name="arrow-r" size={11} color="#001016" /></button></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          {modes.slice(1).map((m) => {
            const cv = m.color === "mag" ? "magenta" : m.color === "violet" ? "violet" : m.color === "yellow" ? "yellow" : m.color
            return (
              <div key={m.id} className={`neo-mode neo-mode--${m.color}`} style={{ padding: 12, minHeight: 116 }} onClick={() => pickMode(m.id)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <NeoIcon name={m.icon} size={20} color={`var(--${cv})`} />
                  <NeoChip variant={m.color === "mag" ? "mag" : m.color === "lime" ? "lime" : m.color === "yellow" ? "yel" : "off"}>{m.tag}</NeoChip>
                </div>
                <div className="neo-mode__title" style={{ marginTop: 12, fontSize: 13, color: `var(--${cv})` }}>{m.title}</div>
                <div className="neo-mode__sub" style={{ marginTop: 4 }}>{m.sub}</div>
              </div>
            )
          })}
        </div>
      </div>
    </NeoPhone>
  )
}

export const ComingSoonScreen = ({ title, sub, color = "cyan", onBack }: { title: string; sub: string; color?: string; onBack: () => void }) => (
  <NeoPhone>
    <div className="neo-bg" />
    <NeoAppBar title={` / ${title}`} sub={sub} left={<BackBtn onBack={onBack} />} />
    <div style={{ flex: 1, padding: "0 16px 16px", overflow: "hidden" }}>
      <div className={`neo-panel ${color === "magenta" ? "neo-panel--mag neo-panel--glow-mag" : "neo-panel--glow"}`} style={{ padding: 18, marginTop: 12, position: "relative", overflow: "hidden", textAlign: "center" }}>
        <div className="neo-circuit" />
        <div style={{ position: "relative" }}>
          <div className="neo-eyebrow" style={{ color: `var(--${color})` }}>MODULE STAGED</div>
          <div className="neo-h1" style={{ fontSize: 34, marginTop: 8, color: "#fff" }}>COMING SOON</div>
          <div className="neo-mono" style={{ fontSize: 10, color: "var(--ink-mute)", marginTop: 6, letterSpacing: "0.18em" }}>{sub}</div>
          <button className="neo-btn neo-btn--block neo-btn--lg" style={{ marginTop: 18 }} onClick={onBack}><NeoIcon name="back" size={14} color="#001016" /> BACK TO MODES</button>
        </div>
      </div>
    </div>
  </NeoPhone>
)
