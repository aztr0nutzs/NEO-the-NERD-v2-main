"use client"

import { useEffect, useState } from "react"
import { AI_LEVELS } from "./knxt4-core"
import { LEVELS, type Knxt4Save, type Knxt4Recent, type TokenSkin, TOKENS, winRate, xpProgress } from "./knxt4-meta"
import { BackBtn, NeoAppBar, NeoChip, NeoIcon, NeoPhone, TokenChip } from "./knxt4-phone"
import { NeoRobot } from "./knxt4-robot"

export type GoTarget =
  | "hub"
  | "modes"
  | "settings"
  | "stats"
  | "garage"
  | { name: "play"; cfg: Knxt4Config }

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

interface MutableScreenProps extends ScreenProps {
  setSave: (next: Knxt4Save | ((prev: Knxt4Save) => Knxt4Save)) => void
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
          <div className="hub-hero__robot"><NeoRobot size={124} variant="full" emote="idle" /></div>
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

        <div className={`neo-panel neo-panel--glow${nextLadder.color === "magenta" ? "-mag" : ""}`} style={{ marginTop: 10, padding: 14, position: "relative", overflow: "hidden" }}>
          <div className="neo-circuit" style={{ opacity: 0.5 }} />
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
            <div className="neo-aibadge" style={{ color: `var(--${nextLadder.color})`, background: "rgba(255,255,255,0.04)", width: 52, height: 52, fontSize: 13 }}>L{String(nextLadder.id).padStart(2, "0")}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="neo-eyebrow" style={{ color: `var(--${nextLadder.color})` }}>▶ FEATURED OPPONENT</div>
              <div className="neo-h2" style={{ fontSize: 18, color: "#fff", textShadow: `0 0 12px var(--${nextLadder.color})`, marginTop: 2, lineHeight: 1 }}>{nextLadder.ai}</div>
              <div className="neo-mono" style={{ fontSize: 9, color: "var(--ink-mute)", marginTop: 4 }}>{AI_LEVELS[nextLadder.aiLevel].name} · DEPTH {AI_LEVELS[nextLadder.aiLevel].depth}</div>
            </div>
          </div>
          <div style={{ position: "relative", marginTop: 12 }}>
            <button className={`neo-btn neo-btn--sm neo-btn--block${nextLadder.color === "magenta" ? " neo-btn--mag" : nextLadder.color === "lime" ? " neo-btn--lime" : nextLadder.color === "yellow" ? " neo-btn--yellow" : ""}`} onClick={() => go({ name: "play", cfg: { mode: "classic", level: nextLadder, aiLevel: nextLadder.aiLevel, aiName: nextLadder.ai, opponent: "ai", powerUps: true } })}>
              <NeoIcon name="play" size={12} /> ENGAGE
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
  // CHALLENGE + AI LADDER + TRAINING modes are intentionally hidden from the
  // tile grid: their gameplay loops are not wired in this build (puzzle bank
  // navigator, tier-progression, lesson scripts). The data and game-screen
  // hooks are preserved in `knxt4-meta.ts` so they can be turned on later
  // without resurrecting a Coming Soon stub.
  const modes = [
    { id: "classic", title: "CLASSIC", sub: "Standard 7x6. Choose your AI tier.", color: "cyan", icon: "grid", tag: "CORE" },
    { id: "quick", title: "QUICK MATCH", sub: "Auto setup. Drop-in vs Normal AI.", color: "lime", icon: "bolt", tag: "INSTANT" },
    { id: "timed", title: "TIMED MATCH", sub: "20s per turn. Lose turn on timeout.", color: "yellow", icon: "wave", tag: "PRESSURE" },
  ]

  const pickMode = (id: string) => {
    if (id === "quick") go({ name: "play", cfg: { mode: "quick", aiLevel: 2, aiName: "N.E.O.", opponent: "ai", powerUps: false } })
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

/* ──────────────────────────────────────────────────────────────────────
   GARAGE — token skin selection. Reads TOKENS from knxt4-meta; persists
   the active skin in save.selectedToken via setSave. Locked skins are
   greyed with a lock icon and the unlock-requirement label from source.
   ────────────────────────────────────────────────────────────────────── */
const RARITY_COLOR: Record<string, string> = {
  STANDARD: "var(--cyan)",
  RARE: "var(--lime)",
  EPIC: "var(--magenta)",
  LEGEND: "var(--yellow)",
}

function unlockHint(skin: TokenSkin): string | null {
  // Source data tags rarity but not specific unlock conditions. Synthesize a
  // truthful, deterministic hint from the rarity bucket so locked cards can
  // tell the player *why* the skin is locked without inventing a system that
  // doesn't exist.
  switch (skin.rarity) {
    case "RARE":   return "UNLOCK: WIN 5 MATCHES"
    case "EPIC":   return "UNLOCK: WIN 15 MATCHES"
    case "LEGEND": return "UNLOCK: WIN 30 MATCHES"
    default: return null
  }
}

export const GarageScreen = ({ save, setSave, onBack }: MutableScreenProps) => {
  const equip = (id: string) => {
    if (!save.unlockedTokens.includes(id) && !TOKENS.find((t) => t.id === id)?.unlocked) return
    setSave((s) => ({ ...s, selectedToken: id }))
  }

  return (
    <NeoPhone>
      <div className="neo-bg" />
      <NeoAppBar title=" / GARAGE" sub="TOKEN SKINS" left={onBack ? <BackBtn onBack={onBack} /> : undefined} />
      <div style={{ flex: 1, padding: "0 16px 16px", overflow: "auto" }}>
        <div className="neo-tick" style={{ marginTop: 6 }}>SELECT YOUR CHIP</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          {TOKENS.map((skin) => {
            const isUnlocked = skin.unlocked || save.unlockedTokens.includes(skin.id)
            const isEquipped = save.selectedToken === skin.id
            const rarityColor = RARITY_COLOR[skin.rarity] || "var(--cyan)"
            const hint = !isUnlocked ? unlockHint(skin) : null
            return (
              <div
                key={skin.id}
                className="neo-panel"
                style={{
                  padding: 12,
                  position: "relative",
                  overflow: "hidden",
                  cursor: isUnlocked ? "pointer" : "not-allowed",
                  opacity: isUnlocked ? 1 : 0.5,
                  borderColor: isEquipped ? rarityColor : undefined,
                  boxShadow: isEquipped ? `0 0 16px ${rarityColor}55, inset 0 0 0 1px ${rarityColor}` : undefined,
                }}
                onClick={() => isUnlocked && equip(skin.id)}
                role="button"
                tabIndex={isUnlocked ? 0 : -1}
                onKeyDown={(e) => { if (isUnlocked && (e.key === "Enter" || e.key === " ")) equip(skin.id) }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div className="neo-h2" style={{ fontSize: 13, color: "#fff" }}>{skin.name}</div>
                  <NeoChip variant={skin.rarity === "EPIC" ? "mag" : skin.rarity === "RARE" ? "lime" : skin.rarity === "LEGEND" ? "yel" : "off"} dot>
                    {skin.rarity}
                  </NeoChip>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center", padding: "8px 0 10px" }}>
                  <TokenChip skinId={skin.id} player={1} size={38} />
                  <TokenChip skinId={skin.id} player={2} size={38} />
                </div>
                {isUnlocked ? (
                  <button
                    type="button"
                    className={`neo-btn neo-btn--sm neo-btn--block${isEquipped ? " neo-btn--ghost" : ""}`}
                    style={isEquipped ? { color: rarityColor, boxShadow: `inset 0 0 0 1px ${rarityColor}66` } : undefined}
                    onClick={(e) => { e.stopPropagation(); equip(skin.id) }}
                  >
                    {isEquipped ? "EQUIPPED" : "EQUIP"}
                  </button>
                ) : (
                  <div className="neo-mono" style={{ fontSize: 9, color: "var(--ink-mute)", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 0" }}>
                    <NeoIcon name="lock" size={10} color="var(--ink-mute)" />
                    {hint || "LOCKED"}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </NeoPhone>
  )
}

/* ──────────────────────────────────────────────────────────────────────
   STATS — match history. Reads save totals + recent[] (last 12 entries).
   ────────────────────────────────────────────────────────────────────── */
export const StatsScreen = ({ save, onBack }: ScreenProps) => {
  const wr = winRate(save)
  const entries: Knxt4Recent[] = save.recent.slice(0, 12)
  return (
    <NeoPhone>
      <div className="neo-bg" />
      <NeoAppBar title=" / STATS" sub="MATCH HISTORY" left={onBack ? <BackBtn onBack={onBack} /> : undefined} />
      <div style={{ flex: 1, padding: "0 16px 16px", overflow: "auto" }}>
        <div className="neo-tick" style={{ marginTop: 6 }}>TOTALS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 6 }}>
          {[
            { l: "GAMES", v: String(save.games).padStart(2, "0"), c: "cyan" },
            { l: "WINS", v: String(save.wins).padStart(2, "0"), c: "lime" },
            { l: "LOSSES", v: String(save.losses).padStart(2, "0"), c: "magenta" },
            { l: "DRAWS", v: String(save.draws).padStart(2, "0"), c: "yellow" },
          ].map((s, i) => (
            <div key={i} className="neo-stat" style={{ padding: "8px 8px" }}>
              <div className="neo-stat__label" style={{ fontSize: 8 }}>{s.l}</div>
              <div className="neo-stat__value" style={{ fontSize: 18, color: `var(--${s.c})` }}>{s.v}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 8 }}>
          {[
            { l: "STREAK", v: String(save.streak).padStart(2, "0"), c: "yellow" },
            { l: "BEST", v: String(save.bestStreak).padStart(2, "0"), c: "magenta" },
            { l: "RATE", v: `${wr}%`, c: "cyan" },
          ].map((s, i) => (
            <div key={i} className="neo-stat" style={{ padding: "8px 8px" }}>
              <div className="neo-stat__label" style={{ fontSize: 8 }}>{s.l}</div>
              <div className="neo-stat__value" style={{ fontSize: 18, color: `var(--${s.c})` }}>{s.v}</div>
            </div>
          ))}
        </div>

        <div className="neo-tick neo-tick--mag" style={{ marginTop: 14 }}>RECENT · LAST {entries.length}</div>
        {entries.length === 0 ? (
          <div className="neo-panel" style={{ padding: 14, marginTop: 6, textAlign: "center" }}>
            <div className="neo-mono" style={{ fontSize: 10, color: "var(--ink-mute)", letterSpacing: "0.16em" }}>NO MATCHES LOGGED</div>
            <div className="neo-mono" style={{ fontSize: 9, color: "var(--ink-dim)", marginTop: 4 }}>PLAY YOUR FIRST MATCH ▸</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6 }}>
            {entries.map((r, i) => {
              const color = r.result === "win" ? "var(--cyan)" : r.result === "loss" ? "var(--magenta)" : "var(--ink-mute)"
              const bg = r.result === "win" ? "rgba(0,232,255,0.12)" : r.result === "loss" ? "rgba(255,46,186,0.12)" : "rgba(255,255,255,0.04)"
              const label = r.result === "win" ? "W" : r.result === "loss" ? "L" : "D"
              const timestamp = r.ts ? new Date(r.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"
              return (
                <div key={i} className="neo-row" style={{ padding: "8px 10px" }}>
                  <div
                    style={{
                      width: 24, height: 24, borderRadius: 4,
                      background: bg, border: `1px solid ${color}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 900, fontSize: 11, color,
                    }}
                  >
                    {label}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "#fff" }}>
                      {(r.mode || "CLASSIC").toUpperCase()}
                      {r.opponent ? ` · ${r.opponent}` : ""}
                    </div>
                    <div className="neo-mono" style={{ fontSize: 9, color: "var(--ink-mute)", marginTop: 1 }}>
                      {r.moves}M · {timestamp}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </NeoPhone>
  )
}

/* ──────────────────────────────────────────────────────────────────────
   SETTINGS — three toggles wired to host useApp() settings. No
   Knxt-4-specific persistence; sound and reduced-motion mirror the host
   app so the user only has one source of truth.
   ────────────────────────────────────────────────────────────────────── */
export interface Knxt4SettingsBridge {
  soundEffects: boolean
  reducedMotion: boolean
  onToggleSound: () => void
}

export const SettingsScreen = ({ bridge, onBack }: { bridge: Knxt4SettingsBridge; onBack?: () => void }) => {
  const [osReducedMotion, setOsReducedMotion] = useState(false)
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)")
    if (!media) return
    const apply = () => setOsReducedMotion(media.matches)
    apply()
    media.addEventListener?.("change", apply)
    return () => media.removeEventListener?.("change", apply)
  }, [])

  const effectiveReducedMotion = bridge.reducedMotion || osReducedMotion

  return (
    <NeoPhone>
      <div className="neo-bg" />
      <NeoAppBar title=" / SETTINGS" sub="SOUND · INPUT · DISPLAY" left={onBack ? <BackBtn onBack={onBack} /> : undefined} />
      <div style={{ flex: 1, padding: "0 16px 16px", overflow: "auto" }}>
        <div className="neo-tick" style={{ marginTop: 6 }}>ADJUST</div>

        <SettingRow
          label="SOUND"
          sub="Game effects · mirrors app sound setting"
          value={bridge.soundEffects}
          onToggle={bridge.onToggleSound}
        />
        <SettingRow
          label="HAPTIC"
          sub="ANDROID ONLY · web has no haptic API"
          value={false}
          disabled
        />
        <SettingRow
          label="REDUCED MOTION"
          sub={`${bridge.reducedMotion ? "App setting on" : "App setting off"} · OS preference ${osReducedMotion ? "on" : "off"} · effective: ${effectiveReducedMotion ? "ON" : "OFF"}`}
          value={effectiveReducedMotion}
          readOnly
        />

        <div className="neo-mono" style={{ fontSize: 9, color: "var(--ink-mute)", marginTop: 16, letterSpacing: "0.18em" }}>
          Knxt 4 shares its settings with the host app. Open Settings → Display to change the reduced-motion preference globally.
        </div>
      </div>
    </NeoPhone>
  )
}

function SettingRow({
  label,
  sub,
  value,
  onToggle,
  disabled = false,
  readOnly = false,
}: {
  label: string
  sub: string
  value: boolean
  onToggle?: () => void
  disabled?: boolean
  readOnly?: boolean
}) {
  const interactive = !disabled && !readOnly
  return (
    <div className="neo-row" style={{ padding: "10px 12px", marginTop: 8, opacity: disabled ? 0.55 : 1 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="neo-h2" style={{ fontSize: 12, color: "#fff" }}>{label}</div>
        <div className="neo-mono" style={{ fontSize: 9, color: "var(--ink-mute)", marginTop: 2 }}>{sub}</div>
      </div>
      <button
        type="button"
        aria-pressed={value}
        aria-label={`Toggle ${label}`}
        disabled={!interactive}
        onClick={interactive ? onToggle : undefined}
        className={`neo-toggle${value ? "" : " neo-toggle--off"}`}
        style={interactive ? undefined : { cursor: readOnly ? "default" : "not-allowed" }}
      />
    </div>
  )
}
