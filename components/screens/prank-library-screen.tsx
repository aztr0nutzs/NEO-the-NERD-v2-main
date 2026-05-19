"use client"

import { motion } from "framer-motion"
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  Filter,
  Hammer,
  Loader2,
  Music2,
  Pause,
  Play,
  Search,
  Shuffle,
  Star,
  Timer as TimerIcon,
  X,
} from "lucide-react"
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useApp } from "@/lib/store"
import { NeonPanel } from "../neon-panel"
import {
  PRANKSTAR_CATALOG_DIAGNOSTICS,
  PRANKSTAR_SOUNDS,
  getCategoryCounts,
  getSafeRandomSound,
} from "@/lib/prankstar/soundCatalog"
import { prankAudioRuntime } from "@/lib/prankstar/prankAudioRuntime"
import { usePrankAudio } from "@/lib/prankstar/usePrankAudio"
import type { PrankCategory, PrankSound } from "@/lib/prankstar/types"

type FilterMode = "all" | "favorites" | "recent"

const ALL_CATEGORY_ID = "__all__"

export function PrankLibraryScreen() {
  const {
    setScreen,
    prankSoundFavoriteIds,
    togglePrankSoundFavorite,
    recentPrankSoundIds,
    recordPrankSoundPlay,
    setTrapIntent,
    setSoundForgeIntent,
  } = useApp()
  const audio = usePrankAudio()

  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const [category, setCategory] = useState<PrankCategory | typeof ALL_CATEGORY_ID>(
    ALL_CATEGORY_ID,
  )
  const [filterMode, setFilterMode] = useState<FilterMode>("all")

  // Snapshot of the recent-play order at the moment the Recent filter was
  // selected (or the screen mounted while Recent was already active). Without
  // this, playing a sound from the list would reshuffle the visible rows
  // mid-tap, which is jarring on touch. Cleared when the user leaves Recent.
  // Implemented as a "previous filter mode" comparator-state pattern so the
  // snapshot is captured during the render that flips into recent mode,
  // without breaking the no-side-effects-during-render rule.
  const [snapshotRecentIds, setSnapshotRecentIds] = useState<
    readonly string[] | null
  >(null)
  const [trackedFilterMode, setTrackedFilterMode] = useState<FilterMode>(filterMode)
  if (filterMode !== trackedFilterMode) {
    setTrackedFilterMode(filterMode)
    if (filterMode === "recent") {
      setSnapshotRecentIds(recentPrankSoundIds)
    } else if (snapshotRecentIds !== null) {
      setSnapshotRecentIds(null)
    }
  }

  // Stop any playing sound when leaving the screen so navigating away does
  // not leave audio bleeding into the next screen.
  useEffect(() => {
    return () => prankAudioRuntime.stop()
  }, [])

  const categoryCounts = useMemo(() => getCategoryCounts(), [])

  const favoriteSet = useMemo(
    () => new Set(prankSoundFavoriteIds),
    [prankSoundFavoriteIds],
  )

  const filteredSounds = useMemo<PrankSound[]>(() => {
    const recentSource =
      filterMode === "recent"
        ? (snapshotRecentIds ?? recentPrankSoundIds)
        : recentPrankSoundIds
    const recentOrder = new Map(
      recentSource.map((id, index) => [id, index] as const),
    )

    let pool: PrankSound[] = [...PRANKSTAR_SOUNDS]

    if (filterMode === "favorites") {
      pool = pool.filter((s) => favoriteSet.has(s.id))
    } else if (filterMode === "recent") {
      pool = pool.filter((s) => recentOrder.has(s.id))
    }

    if (category !== ALL_CATEGORY_ID) {
      pool = pool.filter((s) => s.category === category)
    }

    const q = deferredQuery.trim().toLowerCase()
    if (q) {
      pool = pool.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }

    if (filterMode === "recent") {
      pool.sort(
        (a, b) =>
          (recentOrder.get(a.id) ?? Infinity) -
          (recentOrder.get(b.id) ?? Infinity),
      )
    } else {
      pool.sort((a, b) => a.name.localeCompare(b.name))
    }

    return pool
  }, [
    category,
    deferredQuery,
    favoriteSet,
    filterMode,
    recentPrankSoundIds,
    snapshotRecentIds,
  ])

  const totalCatalog = PRANKSTAR_SOUNDS.length
  const favoriteCount = prankSoundFavoriteIds.length
  const recentCount = recentPrankSoundIds.length

  const onPlay = useCallback(
    (sound: PrankSound) => {
      if (audio.currentSoundId === sound.id && audio.status === "playing") {
        prankAudioRuntime.stop()
        return
      }
      void prankAudioRuntime.play(sound)
      recordPrankSoundPlay(sound.id)
    },
    [audio.currentSoundId, audio.status, recordPrankSoundPlay],
  )

  const onRandomSafe = useCallback(() => {
    const pick = getSafeRandomSound(audio.currentSoundId ? [audio.currentSoundId] : [])
    if (!pick) return
    void prankAudioRuntime.play(pick)
    recordPrankSoundPlay(pick.id)
  }, [audio.currentSoundId, recordPrankSoundPlay])

  return (
    <div className="space-y-4 pb-2">
      <header className="px-1 pt-1">
        <button
          type="button"
          onClick={() => setScreen("prank")}
          className="mb-2 inline-flex items-center gap-1.5 ps-mono text-[10px] tracking-[0.3em] text-white/65 hover:text-white"
          aria-label="Back to Prankstar Protocol"
        >
          <ArrowLeft className="h-3 w-3" />
          BACK
        </button>
        <p className="ps-mono text-[10px] tracking-[0.4em] text-white/50">
          PRANKSTAR // SOUND_LIBRARY
        </p>
        <h1 className="ps-heading text-2xl leading-[1.05]">
          <span className="ps-text-cyan">SOUND</span>{" "}
          <span className="text-white/90">LIBRARY</span>
        </h1>
        <p className="mt-1 ps-mono text-[10px] tracking-widest text-white/50">
          {totalCatalog} PLAYABLE · {favoriteCount} FAVORITED ·{" "}
          {recentCount} RECENT
          {PRANKSTAR_CATALOG_DIAGNOSTICS.totalDeferred > 0
            ? ` · +${PRANKSTAR_CATALOG_DIAGNOSTICS.totalDeferred} DEFERRED`
            : ""}
        </p>
      </header>

      <NeonPanel accent="cyan" glow="soft" className="p-3">
        <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/45 px-3 py-2">
          <Search className="h-4 w-4 ps-text-cyan" aria-hidden="true" />
          <input
            type="search"
            inputMode="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, tag, or category…"
            aria-label="Search prank sounds"
            className="w-full bg-transparent text-sm text-white/90 placeholder:text-white/35 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="text-white/40 hover:text-white/80"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>

        <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Filter mode">
          <FilterPill
            label="All"
            count={totalCatalog}
            active={filterMode === "all"}
            onClick={() => setFilterMode("all")}
            icon={Filter}
            accent="#00f0ff"
          />
          <FilterPill
            label="Favorites"
            count={favoriteCount}
            active={filterMode === "favorites"}
            onClick={() => setFilterMode("favorites")}
            icon={Star}
            accent="#ffd84d"
          />
          <FilterPill
            label="Recent"
            count={recentCount}
            active={filterMode === "recent"}
            onClick={() => setFilterMode("recent")}
            icon={Clock}
            accent="#b829ff"
          />
          <button
            type="button"
            onClick={onRandomSafe}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[#39ff14]/55 bg-[#39ff14]/10 px-3 py-1.5 ps-mono text-[10px] tracking-[0.22em] text-[#39ff14] hover:bg-[#39ff14]/20"
            aria-label="Play a random safe sound"
          >
            <Shuffle className="h-3.5 w-3.5" />
            RANDOM_SAFE
          </button>
        </div>

        <div
          className="mt-3 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Category filter"
        >
          <CategoryChip
            label="ALL"
            count={totalCatalog}
            active={category === ALL_CATEGORY_ID}
            onClick={() => setCategory(ALL_CATEGORY_ID)}
          />
          {categoryCounts.map((c) => (
            <CategoryChip
              key={c.category}
              label={c.category}
              count={c.count}
              active={category === c.category}
              onClick={() => setCategory(c.category)}
            />
          ))}
        </div>
      </NeonPanel>

      {audio.status === "error" && audio.error && (
        <NeonPanel accent="orange" glow="soft" className="p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 ps-text-orange" />
            <div className="min-w-0">
              <p className="ps-mono text-[10px] tracking-[0.25em] ps-text-orange">
                PLAYBACK_ERROR
              </p>
              <p className="mt-1 ps-mono text-[10px] leading-tight tracking-[0.12em] text-white/85 break-words">
                {audio.error}
              </p>
            </div>
          </div>
        </NeonPanel>
      )}

      <NeonPanel accent="pink" glow="strong" scanlines className="p-3">
        <div className="flex items-center justify-between">
          <p className="ps-mono text-[10px] tracking-[0.3em] ps-text-pink">
            RESULTS · {filteredSounds.length}
          </p>
          <button
            type="button"
            onClick={() => prankAudioRuntime.stop()}
            disabled={audio.status === "idle"}
            className="ps-mono text-[10px] tracking-[0.25em] text-white/70 disabled:text-white/25"
            aria-label="Stop all playback"
          >
            STOP_ALL
          </button>
        </div>

        {filteredSounds.length === 0 ? (
          <EmptyState
            filterMode={filterMode}
            hasQuery={query.length > 0}
            hasCategory={category !== ALL_CATEGORY_ID}
            onClear={() => {
              setQuery("")
              setCategory(ALL_CATEGORY_ID)
              setFilterMode("all")
            }}
          />
        ) : (
          <ul className="mt-3 space-y-2">
            {filteredSounds.map((sound) => {
              const isActive = audio.currentSoundId === sound.id
              const isPlaying = isActive && audio.status === "playing"
              const isLoading = isActive && audio.status === "loading"
              const isError = isActive && audio.status === "error"
              const isFavorite = favoriteSet.has(sound.id)
              return (
                <li key={sound.id}>
                  <div
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/55 p-2.5 transition-colors hover:border-[#00f0ff]/40"
                  >
                    <button
                      type="button"
                      onClick={() => onPlay(sound)}
                      aria-pressed={isPlaying}
                      aria-label={
                        isPlaying ? `Stop ${sound.name}` : `Play ${sound.name}`
                      }
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
                      style={{
                        background: isError
                          ? "rgba(255,122,0,0.15)"
                          : "rgba(0,240,255,0.15)",
                        boxShadow: isError
                          ? "inset 0 0 0 1px rgba(255,122,0,0.6)"
                          : "inset 0 0 0 1px rgba(0,240,255,0.6)",
                      }}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin ps-text-cyan" />
                      ) : isError ? (
                        <AlertTriangle className="h-4 w-4 ps-text-orange" />
                      ) : isPlaying ? (
                        <Pause className="h-4 w-4 ps-text-cyan" />
                      ) : (
                        <Play className="h-4 w-4 ps-text-cyan" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onPlay(sound)}
                      className="min-w-0 flex-1 text-left"
                      aria-label={
                        isPlaying ? `Stop ${sound.name}` : `Play ${sound.name}`
                      }
                    >
                      <span className="block truncate text-sm text-white/90">
                        {sound.name}
                      </span>
                      <span className="block ps-mono text-[9px] tracking-[0.22em] text-white/45">
                        {sound.category}
                        {sound.durationMs > 0
                          ? ` · ${(sound.durationMs / 1000).toFixed(1)}s`
                          : ""}
                        {sound.loopable ? " · LOOP" : ""}
                        {sound.isSafeForRandomMode ? "" : " · INTENSE"}
                      </span>
                      {sound.tags.length > 0 && (
                        <span className="mt-1 flex flex-wrap gap-1">
                          {sound.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 ps-mono text-[8px] tracking-[0.18em] text-white/55"
                            >
                              {tag}
                            </span>
                          ))}
                        </span>
                      )}
                    </button>

                    {isPlaying && (
                      <motion.span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#00f0ff]"
                        style={{ boxShadow: "0 0 8px #00f0ff" }}
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        aria-hidden="true"
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setTrapIntent({ kind: "sound", soundId: sound.id })
                        setScreen("prankTraps")
                      }}
                      aria-label={`Use ${sound.name} in a Timer Trap`}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#ff7a00]/50 bg-[#ff7a00]/10 hover:bg-[#ff7a00]/20"
                    >
                      <TimerIcon className="h-4 w-4 ps-text-orange" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSoundForgeIntent({ soundId: sound.id })
                        setScreen("prankSoundForge")
                      }}
                      aria-label={`Add ${sound.name} to Sound Forge`}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#39ff14]/50 bg-[#39ff14]/10 hover:bg-[#39ff14]/20"
                    >
                      <Hammer className="h-4 w-4" style={{ color: "#39ff14" }} />
                    </button>

                    <button
                      type="button"
                      onClick={() => togglePrankSoundFavorite(sound.id)}
                      aria-pressed={isFavorite}
                      aria-label={
                        isFavorite
                          ? `Unfavorite ${sound.name}`
                          : `Favorite ${sound.name}`
                      }
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                      style={{
                        background: isFavorite
                          ? "rgba(255,216,77,0.15)"
                          : "rgba(255,255,255,0.04)",
                        boxShadow: isFavorite
                          ? "inset 0 0 0 1px rgba(255,216,77,0.7)"
                          : "inset 0 0 0 1px rgba(255,255,255,0.12)",
                      }}
                    >
                      <Star
                        className="h-4 w-4"
                        style={{
                          color: isFavorite ? "#ffd84d" : "rgba(255,255,255,0.6)",
                          fill: isFavorite ? "#ffd84d" : "none",
                          filter: isFavorite ? "drop-shadow(0 0 6px #ffd84d)" : "none",
                        }}
                      />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </NeonPanel>

      <p className="ps-mono text-[9px] leading-relaxed tracking-[0.15em] text-white/40">
        SOUND LIBRARY SHOWS CURRENTLY PLAYABLE ASSETS ONLY. ADDITIONAL CATALOG
        ENTRIES REJOIN THE LIBRARY AUTOMATICALLY AS THEIR AUDIO FILES SHIP.
      </p>
    </div>
  )
}

interface FilterPillProps {
  label: string
  count: number
  active: boolean
  onClick: () => void
  icon: typeof Filter
  accent: string
}

function FilterPill({ label, count, active, onClick, icon: Icon, accent }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ps-mono text-[10px] tracking-[0.22em]"
      style={{
        background: active ? `${accent}1f` : "rgba(255,255,255,0.04)",
        boxShadow: active
          ? `inset 0 0 0 1px ${accent}aa, 0 0 12px ${accent}55`
          : "inset 0 0 0 1px rgba(255,255,255,0.12)",
        color: active ? accent : "rgba(255,255,255,0.75)",
      }}
    >
      <Icon className="h-3 w-3" style={active ? { filter: `drop-shadow(0 0 4px ${accent})` } : undefined} />
      {label.toUpperCase()}
      <span className="text-white/40">({count})</span>
    </button>
  )
}

interface CategoryChipProps {
  label: string
  count: number
  active: boolean
  onClick: () => void
}

function CategoryChip({ label, count, active, onClick }: CategoryChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className="shrink-0 rounded-md px-2.5 py-1.5 ps-mono text-[9px] tracking-[0.22em]"
      style={{
        background: active ? "rgba(0,240,255,0.18)" : "rgba(255,255,255,0.04)",
        boxShadow: active
          ? "inset 0 0 0 1px rgba(0,240,255,0.7), 0 0 10px rgba(0,240,255,0.4)"
          : "inset 0 0 0 1px rgba(255,255,255,0.12)",
        color: active ? "#00f0ff" : "rgba(255,255,255,0.7)",
      }}
    >
      {String(label).toUpperCase()}
      <span className="ml-1 text-white/40">{count}</span>
    </button>
  )
}

interface EmptyStateProps {
  filterMode: FilterMode
  hasQuery: boolean
  hasCategory: boolean
  onClear: () => void
}

function EmptyState({ filterMode, hasQuery, hasCategory, onClear }: EmptyStateProps) {
  let message = "Nothing matches the current filters."
  if (filterMode === "favorites" && !hasQuery && !hasCategory) {
    message = "No favorites yet. Tap the star on any sound to bookmark it here."
  } else if (filterMode === "recent" && !hasQuery && !hasCategory) {
    message = "No recent plays. Anything you play will be remembered here."
  }
  return (
    <div className="mt-4 flex flex-col items-center gap-3 rounded-lg border border-dashed border-white/15 bg-black/40 px-4 py-8 text-center">
      <Music2 className="h-6 w-6 text-white/40" aria-hidden="true" />
      <p className="ps-mono text-[10px] leading-relaxed tracking-[0.15em] text-white/65">
        {message}
      </p>
      {(hasQuery || hasCategory || filterMode !== "all") && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-full border border-white/20 px-3 py-1 ps-mono text-[10px] tracking-[0.22em] text-white/80 hover:bg-white/10"
        >
          RESET_FILTERS
        </button>
      )}
    </div>
  )
}
