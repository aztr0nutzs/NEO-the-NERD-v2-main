"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Download, FilePlus, Pin, Plus, RotateCcw, Search, Sparkles, Star, Upload, X } from "lucide-react"
import { useApp } from "@/lib/store"
import { NeonPanel } from "../neon-panel"
import { ResponseLibraryCard } from "../response-library-card"
import type { AssistantMood, LibraryResponseCategory, SavedResponse } from "@/lib/types"
import { shareOrSaveAudio } from "@/lib/voice/ttsClient"
import { getProviderVoiceCapabilities } from "@/lib/voice/ttsProviderAdapter"
import {
  generateProviderAudio,
  getCachedVoiceRuntimeCapabilities,
  getVoiceRuntimeCapabilities,
  playProviderAudio,
  previewVoice,
  stopVoicePreview,
  type VoiceRuntimeCapabilities,
} from "@/lib/voice/voice-runtime"
import { getVoiceProfile } from "@/lib/voice/voiceProfiles"
import { getRecommendedResponses } from "@/lib/assistant/assistantIntegrations"
import { DEFAULT_RESPONSE_FILTERS, filterResponses } from "@/lib/responses/responseFilters"
import { RESPONSE_CATEGORY_COUNTS, RESPONSE_CATEGORY_LIST, RESPONSE_TONE_TAGS, SYSTEM_RESPONSE_LIBRARY } from "@/lib/responses/responseLibraryData"
import { draftToResponseInput, duplicateResponse as duplicateResponseInput, emptyResponseDraft, responseDisplayText, responseToDraft } from "@/lib/responses/responseUtils"
import type { ResponseDraftInput, ResponseFilterState, ResponseSortMode } from "@/lib/responses/types"

const MOODS: AssistantMood[] = ["idle", "listening", "thinking", "speaking", "playful", "gaming"]
const SORT_MODES: ResponseSortMode[] = ["Recently used", "Alphabetical", "Category", "Favorites first"]

export function LibraryScreen() {
  const {
    responses,
    toggleFavorite,
    togglePinnedResponse,
    deleteResponse,
    restoreAllArchived,
    addResponse,
    updateResponse,
    duplicateResponse,
    useResponseInChat,
    exportResponses,
    importResponses,
    voiceId,
    voiceParams,
    personalityId,
  } = useApp()

  const importRef = useRef<HTMLInputElement>(null)
  const [filters, setFilters] = useState<ResponseFilterState>(DEFAULT_RESPONSE_FILTERS)
  const [editing, setEditing] = useState<SavedResponse | null>(null)
  const [detail, setDetail] = useState<SavedResponse | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [draft, setDraft] = useState<ResponseDraftInput>(emptyResponseDraft())
  const [status, setStatus] = useState("RESPONSE VAULT READY")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [voiceCapabilities, setVoiceCapabilities] = useState<VoiceRuntimeCapabilities>(() =>
    getCachedVoiceRuntimeCapabilities(),
  )

  useEffect(() => {
    let cancelled = false
    getVoiceRuntimeCapabilities().then((caps) => {
      if (!cancelled) setVoiceCapabilities(caps)
    })
    return () => {
      cancelled = true
      stopVoicePreview()
    }
  }, [])

  const visibleResponses = useMemo(() => filterResponses(responses, filters), [responses, filters])
  const pinnedResponses = useMemo(() => responses.filter((response) => response.pinned && !response.archived).slice(0, 8), [responses])
  const recentResponses = useMemo(
    () => responses.filter((response) => response.lastUsedAt && !response.archived).sort((a, b) => new Date(b.lastUsedAt ?? 0).getTime() - new Date(a.lastUsedAt ?? 0).getTime()).slice(0, 6),
    [responses],
  )
  const userResponses = useMemo(() => responses.filter((response) => response.createdBy === "user" && !response.archived).slice(0, 8), [responses])
  const assistantMatches = useMemo(
    () => getRecommendedResponses({ responses, personalityId, voiceId, limit: 8 }),
    [personalityId, responses, voiceId],
  )
  const activeVoice = getVoiceProfile(voiceId)

  const openEditor = (response?: SavedResponse | Partial<ResponseDraftInput>) => {
    if (response && "id" in response) {
      const editable = response.createdBy === "system" ? duplicateResponseInput(response) : response
      setEditing(response.createdBy === "system" ? null : response)
      setDraft(responseToDraft(editable as SavedResponse))
      setStatus(response.createdBy === "system" ? "SYSTEM RESPONSE LOADED AS DUPLICATE" : "EDITING CUSTOM RESPONSE")
    } else {
      setEditing(null)
      setDraft(emptyResponseDraft(response))
    }
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditing(null)
    setDraft(emptyResponseDraft())
  }

  const saveDraft = () => {
    const next = draftToResponseInput(draft)
    if (!next) {
      setStatus("SAVE BLOCKED // TITLE AND RESPONSE REQUIRED")
      return
    }
    const result = editing ? updateResponse(editing.id, next) : addResponse(next)
    if (result.duplicate) {
      setStatus("DUPLICATE SKIPPED // PHRASE ALREADY EXISTS")
      return
    }
    setStatus(editing ? "CUSTOM RESPONSE UPDATED" : "CUSTOM RESPONSE SAVED")
    closeEditor()
  }

  const playAudioPayload = (payload: { audioBase64: string; fileName: string; mimeType: string }) => {
    playProviderAudio({
      payload,
      volume: Math.min(1, Math.max(0, voiceParams.volume / 100)),
      voiceId,
      onStateChange: (snapshot) => setStatus(snapshot.message),
    })
  }

  const speakResponse = async (response: SavedResponse) => {
    setBusyId(response.id)
    setStatus("PLAYING VOICE PREVIEW")
    try {
      stopVoicePreview()
      await previewVoice({
        profile: activeVoice,
        text: responseDisplayText(response),
        params: voiceParams,
        mode: "auto",
        onStateChange: (snapshot) => setStatus(snapshot.message),
      })
    } finally {
      setBusyId(null)
    }
  }

  const generateResponseAudio = async (response: SavedResponse) => {
    const profileCaps = getProviderVoiceCapabilities(voiceId)
    if (!profileCaps.providerReady) {
      setStatus("PROVIDER AUDIO NOT AVAILABLE FOR SELECTED VOICE")
      return
    }
    if (!voiceCapabilities.providerTtsAvailable) {
      setStatus(
        voiceCapabilities.remoteBackendConfigured
          ? "PROVIDER UNREACHABLE OR NOT CONFIGURED // CHECK BACKEND"
          : "REMOTE BACKEND NOT CONFIGURED // SET NEXT_PUBLIC_NEO_BACKEND_BASE_URL",
      )
      return
    }
    setBusyId(response.id)
    setStatus("GENERATING AUDIO FILE")
    const result = await generateProviderAudio({
      voiceId,
      text: responseDisplayText(response),
      params: voiceParams,
    })
    if (result.payload) {
      playAudioPayload(result.payload)
      shareOrSaveAudio(result.payload.audioBase64, result.payload.fileName, result.payload.mimeType).catch(
        () => undefined,
      )
      setStatus("AUDIO GENERATED")
    } else {
      setStatus((result.error ?? "TTS PROVIDER UNAVAILABLE").toUpperCase())
    }
    setBusyId(null)
  }

  const copyResponse = (response: SavedResponse) => {
    navigator.clipboard
      ?.writeText(responseDisplayText(response))
      .then(() => setStatus("RESPONSE COPIED"))
      .catch(() => setStatus("COPY BLOCKED BY BROWSER"))
  }

  const duplicateVaultResponse = (response: SavedResponse) => {
    const result = duplicateResponse(response.id)
    setStatus(result.duplicate ? "DUPLICATE BLOCKED" : "RESPONSE DUPLICATED")
  }

  const archiveResponse = (id: string) => {
    // Soft archive: hidden from filters but reversible via the RESTORE
    // ARCHIVED footer action. We only prompt for user-created entries —
    // archiving a seeded system response is always recoverable.
    const target = responses.find((r) => r.id === id)
    if (target?.createdBy === "user" && typeof window !== "undefined") {
      const ok = window.confirm(
        `Archive "${target.title}"? It will be hidden from filters but can be restored from the archive footer.`,
      )
      if (!ok) {
        setStatus("ARCHIVE CANCELLED")
        return
      }
    }
    deleteResponse(id)
    setStatus("RESPONSE ARCHIVED // RESTORE AVAILABLE BELOW")
  }

  const restoreArchived = () => {
    const count = restoreAllArchived()
    setStatus(
      count > 0
        ? `RESTORED ${count} ARCHIVED ${count === 1 ? "ENTRY" : "ENTRIES"}`
        : "NO ARCHIVED ENTRIES",
    )
  }

  const archivedCount = useMemo(
    () => responses.filter((response) => response.archived).length,
    [responses],
  )

  const useInChat = (response: SavedResponse) => {
    useResponseInChat(response.id)
    setStatus("SENT TO CHAT")
  }

  return (
    <div className="space-y-3">
      <header className="px-1">
        <p className="ps-mono text-[10px] tracking-[0.4em] text-white/50">NEO // RESPONSE_VAULT</p>
        <h2 className="ps-heading text-2xl flex items-center gap-2">
          <Sparkles className="h-5 w-5 ps-text-cyan" />
          <span className="ps-text-cyan">RESPONSE</span>{" "}
          <span className="text-white/80">VAULT</span>
        </h2>
        <p className="mt-1 text-[12px] text-white/55">
          {SYSTEM_RESPONSE_LIBRARY.length} system responses // {userResponses.length} custom // {responses.filter((r) => r.favorite).length} favorites
        </p>
      </header>

      <NeonPanel accent="cyan" glow="soft" className="p-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-white/55" />
          <input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Search response vault..."
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
          />
          <button
            type="button"
            onClick={() => setFilters((current) => ({ ...current, favoritesOnly: !current.favoritesOnly }))}
            className="grid h-9 w-9 place-items-center rounded-lg"
            style={{ color: filters.favoritesOnly ? "#ff7a00" : "rgba(255,255,255,0.65)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)" }}
            aria-label="Toggle favorites filter"
          >
            <Star className="h-4 w-4" fill={filters.favoritesOnly ? "#ff7a00" : "transparent"} />
          </button>
          <button
            type="button"
            onClick={() => setFilters((current) => ({ ...current, pinnedOnly: !current.pinnedOnly }))}
            className="grid h-9 w-9 place-items-center rounded-lg"
            style={{ color: filters.pinnedOnly ? "#39ff14" : "rgba(255,255,255,0.65)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)" }}
            aria-label="Toggle pinned filter"
          >
            <Pin className="h-4 w-4" fill={filters.pinnedOnly ? "#39ff14" : "transparent"} />
          </button>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto ps-no-scrollbar">
          {(["All", "Favorites", ...RESPONSE_CATEGORY_LIST] as const).map((category) => (
            <FilterChip
              key={category}
              label={`${category}${category !== "All" && category !== "Favorites" ? ` (${RESPONSE_CATEGORY_COUNTS[category] ?? 0})` : ""}`}
              active={filters.category === category}
              onClick={() => setFilters((current) => ({ ...current, category }))}
            />
          ))}
        </div>

        <div className="mt-2 flex gap-2 overflow-x-auto ps-no-scrollbar">
          {(["All", ...RESPONSE_TONE_TAGS] as const).map((tag) => (
            <FilterChip
              key={tag}
              label={tag}
              active={filters.toneTag === tag}
              onClick={() => setFilters((current) => ({ ...current, toneTag: tag }))}
            />
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <VaultSelect label="SORT" value={filters.sortMode} options={SORT_MODES} onChange={(sortMode) => setFilters((current) => ({ ...current, sortMode: sortMode as ResponseSortMode }))} />
          <button
            type="button"
            onClick={() => setFilters((current) => ({ ...current, userOnly: !current.userOnly }))}
            className="h-9 rounded-md ps-mono text-[10px] uppercase tracking-[0.2em]"
            style={{ color: filters.userOnly ? "#39ff14" : "rgba(255,255,255,0.62)", boxShadow: "inset 0 0 0 1px rgba(57,255,20,0.35)", background: "rgba(57,255,20,0.08)" }}
          >
            {filters.userOnly ? "CUSTOM ONLY" : "ALL AUTHORS"}
          </button>
        </div>
      </NeonPanel>

      <div className="grid grid-cols-3 gap-2">
        <ActionButton icon={<Plus className="w-4 h-4" />} label="ADD" color="#39ff14" onClick={() => openEditor()} />
        <ActionButton
          icon={<FilePlus className="w-4 h-4" />}
          label="DRAFT"
          color="#b829ff"
          onClick={() => {
            // Opens the editor with the current search string pre-filled as
            // the draft body. This is a writing helper, NOT a provider/LLM
            // generation call — labeled "DRAFT" so the affordance is truthful.
            openEditor({ body: filters.search })
            setStatus(
              filters.search
                ? "DRAFT STARTED // SEARCH TEXT PREFILLED"
                : "DRAFT STARTED // EMPTY TEMPLATE",
            )
          }}
          ariaLabel="Start a new draft response (writing helper, not AI generation)"
          title="Open the editor with your search prefilled. Writing helper, not AI generation."
        />
        <ActionButton icon={<Upload className="w-4 h-4" />} label="IMPORT" color="#00f0ff" onClick={() => importRef.current?.click()} />
      </div>

      <input
        ref={importRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (!file) return
          file.text().then((text) => {
            importResponses(text).then((result) => {
              setStatus(result.ok ? `IMPORT COMPLETE // ${result.imported} ADDED // ${result.skipped} SKIPPED` : "IMPORT FAILED // INVALID VAULT JSON")
            })
          })
          event.target.value = ""
        }}
      />

      {editorOpen && (
        <ResponseEditor draft={draft} editing={editing} onChange={setDraft} onSave={saveDraft} onClose={closeEditor} />
      )}

      <ResponseRail title="PINNED RESPONSES" responses={pinnedResponses} onPick={setDetail} />
      <ResponseRail title="ASSISTANT MATCHES" responses={assistantMatches} onPick={setDetail} />
      <ResponseRail title="RECENTLY USED" responses={recentResponses} onPick={setDetail} />
      <ResponseRail title="CUSTOM RESPONSES" responses={userResponses} onPick={setDetail} />

      <div className="flex items-center justify-between px-1">
        <p className="ps-mono text-[10px] uppercase tracking-[0.3em] text-white/55">
          {visibleResponses.length} {visibleResponses.length === 1 ? "ENTRY" : "ENTRIES"}
        </p>
        <button type="button" onClick={exportResponses} className="flex items-center gap-1.5 ps-mono text-[10px] uppercase tracking-[0.3em] text-white/65">
          <Download className="w-3.5 h-3.5" />
          EXPORT
        </button>
      </div>
      <p className="px-1 ps-mono text-[10px] uppercase tracking-[0.24em] text-white/45">{status}</p>

      {archivedCount > 0 && (
        <div
          className="flex items-center justify-between rounded-lg bg-black/40 px-3 py-2"
          style={{ boxShadow: "inset 0 0 0 1px rgba(255,122,0,0.35)" }}
        >
          <p className="ps-mono text-[10px] uppercase tracking-[0.25em] text-white/65">
            ARCHIVED // {archivedCount} {archivedCount === 1 ? "ENTRY" : "ENTRIES"}
          </p>
          <button
            type="button"
            onClick={restoreArchived}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 ps-mono text-[10px] uppercase tracking-[0.22em]"
            style={{
              color: "#ff7a00",
              boxShadow: "inset 0 0 0 1px rgba(255,122,0,0.55)",
              background: "rgba(255,122,0,0.1)",
            }}
            aria-label="Restore all archived responses"
          >
            <RotateCcw className="h-3 w-3" />
            RESTORE ALL
          </button>
        </div>
      )}

      <div className="space-y-3">
        {visibleResponses.length === 0 ? (
          <NeonPanel accent="purple" glow="soft" className="p-8 text-center">
            <p className="ps-mono text-sm text-white/60 tracking-widest">NO RESPONSES MATCH FILTER</p>
          </NeonPanel>
        ) : (
          visibleResponses.map((response) => (
            <ResponseLibraryCard
              key={response.id}
              response={response}
              onToggleFavorite={toggleFavorite}
              onTogglePinned={togglePinnedResponse}
              onDelete={archiveResponse}
              onEdit={openEditor}
              onDetails={setDetail}
              onDuplicate={duplicateVaultResponse}
              onUseInChat={useInChat}
              onSpeak={speakResponse}
              onGenerateAudio={generateResponseAudio}
              onCopy={copyResponse}
              busy={busyId === response.id}
            />
          ))
        )}
      </div>

      {detail && (
        <ResponseDetailPanel
          response={detail}
          onClose={() => setDetail(null)}
          onCopy={copyResponse}
          onFavorite={toggleFavorite}
          onPin={togglePinnedResponse}
          onUse={useInChat}
          onEdit={openEditor}
          onDuplicate={duplicateVaultResponse}
          onArchive={archiveResponse}
        />
      )}
    </div>
  )
}

function ResponseRail({ title, responses, onPick }: { title: string; responses: SavedResponse[]; onPick: (response: SavedResponse) => void }) {
  if (!responses.length) return null
  return (
    <div>
      <p className="mb-2 px-1 ps-mono text-[10px] uppercase tracking-[0.3em] text-white/50">{title}</p>
      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 ps-no-scrollbar">
        {responses.map((response) => (
          <button
            type="button"
            key={response.id}
            onClick={() => onPick(response)}
            className="w-[240px] shrink-0 rounded-xl p-3 text-left ps-glass"
            style={{ boxShadow: "inset 0 0 0 1px rgba(0,240,255,0.22)" }}
          >
            <p className="ps-mono text-[9px] uppercase tracking-[0.22em] text-white/45">{response.category}</p>
            <p className="mt-1 ps-heading text-sm text-white truncate">{response.title}</p>
            <p className="mt-1 line-clamp-2 text-xs text-white/60">{responseDisplayText(response)}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

function ResponseEditor({ draft, editing, onChange, onSave, onClose }: { draft: ResponseDraftInput; editing: SavedResponse | null; onChange: (draft: ResponseDraftInput) => void; onSave: () => void; onClose: () => void }) {
  return (
    <NeonPanel accent="green" glow="soft" className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="ps-mono text-[10px] tracking-[0.3em] ps-text-green">{editing ? "EDIT_CUSTOM_RESPONSE" : "ADD_RESPONSE"}</p>
        <button type="button" onClick={onClose} aria-label="Close editor" className="grid h-7 w-7 place-items-center rounded-md text-white/60" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)" }}>
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid gap-2">
        <VaultInput label="TITLE" value={draft.title} onChange={(title) => onChange({ ...draft, title })} />
        <div>
          <p className="ps-mono text-[10px] tracking-[0.25em] text-white/55 mb-1.5">RESPONSE</p>
          <textarea value={draft.body} onChange={(event) => onChange({ ...draft, body: event.target.value })} rows={4} className="w-full resize-none rounded-md bg-black/60 px-3 py-2 text-[13px] text-white outline-none" style={{ boxShadow: "inset 0 0 0 1px rgba(57,255,20,0.35)" }} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <VaultSelect label="CATEGORY" value={draft.category} options={RESPONSE_CATEGORY_LIST} onChange={(category) => onChange({ ...draft, category: category as LibraryResponseCategory })} />
          <VaultSelect label="MOOD" value={draft.mood} options={MOODS} onChange={(mood) => onChange({ ...draft, mood: mood as AssistantMood })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <VaultInput label="SUBCATEGORY" value={draft.subcategory} onChange={(subcategory) => onChange({ ...draft, subcategory })} />
          <VaultInput label="TONE TAGS" value={draft.toneTags} onChange={(toneTags) => onChange({ ...draft, toneTags })} />
        </div>
        <VaultInput label="USE CASE TAGS" value={draft.useCaseTags} onChange={(useCaseTags) => onChange({ ...draft, useCaseTags })} />
        <VaultInput label="VOICE IDS" value={draft.voiceCompat} onChange={(voiceCompat) => onChange({ ...draft, voiceCompat })} />
        <VaultInput label="PERSONALITY IDS" value={draft.linkedPersonalityIds} onChange={(linkedPersonalityIds) => onChange({ ...draft, linkedPersonalityIds })} />
        <div className="grid grid-cols-2 gap-2">
          <VaultNumber label="HUMOR" value={draft.humorLevel} onChange={(humorLevel) => onChange({ ...draft, humorLevel })} />
          <VaultNumber label="INTENSITY" value={draft.intensity} onChange={(intensity) => onChange({ ...draft, intensity })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ToggleButton active={draft.safeForAutoUse} label="SAFE AUTO USE" onClick={() => onChange({ ...draft, safeForAutoUse: !draft.safeForAutoUse })} />
          <ToggleButton active={draft.pinned} label="PINNED" onClick={() => onChange({ ...draft, pinned: !draft.pinned })} />
        </div>
        <button type="button" onClick={onSave} className="h-10 rounded-lg ps-mono text-[11px] uppercase tracking-[0.25em]" style={{ color: "#39ff14", boxShadow: "inset 0 0 0 1px rgba(57,255,20,0.65), 0 0 12px rgba(57,255,20,0.25)", background: "rgba(57,255,20,0.1)" }}>
          {editing ? "SAVE EDIT" : "SAVE RESPONSE"}
        </button>
      </div>
    </NeonPanel>
  )
}

function ResponseDetailPanel({ response, onClose, onCopy, onFavorite, onPin, onUse, onEdit, onDuplicate, onArchive }: { response: SavedResponse; onClose: () => void; onCopy: (response: SavedResponse) => void; onFavorite: (id: string) => void; onPin: (id: string) => void; onUse: (response: SavedResponse) => void; onEdit: (response: SavedResponse) => void; onDuplicate: (response: SavedResponse) => void; onArchive: (id: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
      <NeonPanel accent="cyan" glow="strong" className="max-h-[88vh] w-full overflow-y-auto p-4 sm:max-w-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="ps-mono text-[10px] uppercase tracking-[0.3em] text-white/50">{response.category}{" // "}{response.subcategory ?? "general"}</p>
            <h3 className="ps-heading text-2xl text-white">{response.title}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close response details" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/70" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)" }}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-4 rounded-lg bg-black/40 p-3 text-sm leading-relaxed text-white/85" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>{responseDisplayText(response)}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[...(response.toneTags ?? []), ...(response.useCaseTags ?? [])].map((tag) => (
            <span key={tag} className="rounded-full px-2 py-0.5 ps-mono text-[9px] uppercase tracking-[0.2em] text-white/70" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)" }}>{tag}</span>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Meta label="Author" value={response.createdBy ?? "system"} />
          <Meta label="Used" value={`${response.timesUsed ?? 0}x`} />
          <Meta label="Safe auto" value={response.safeForAutoUse === false ? "no" : "yes"} />
          <Meta label="Updated" value={response.updatedAt ? new Date(response.updatedAt).toLocaleDateString() : "seed"} />
        </div>
        <p className="mt-3 ps-mono text-[9px] uppercase tracking-[0.22em] text-white/45">Linked voices</p>
        <p className="mt-1 text-xs text-white/65">{(response.linkedVoiceProfileIds?.length ? response.linkedVoiceProfileIds : response.voiceCompat).join(", ")}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <DetailButton label="Use In Chat" onClick={() => onUse(response)} color="#39ff14" />
          <DetailButton label="Copy" onClick={() => onCopy(response)} color="#00f0ff" />
          <DetailButton label={response.favorite ? "Favorited" : "Favorite"} onClick={() => onFavorite(response.id)} color="#ff7a00" />
          <DetailButton label={response.pinned ? "Pinned" : "Pin"} onClick={() => onPin(response.id)} color="#39ff14" />
          <DetailButton label="Edit" onClick={() => onEdit(response)} color="#b829ff" />
          <DetailButton label="Duplicate" onClick={() => onDuplicate(response)} color="#b829ff" />
          <button type="button" onClick={() => onArchive(response.id)} className="col-span-2 rounded-lg py-2.5 ps-mono text-[11px] uppercase tracking-[0.25em]" style={{ color: "rgb(255,80,110)", boxShadow: "inset 0 0 0 1px rgba(255,40,80,0.45)", background: "rgba(255,40,80,0.08)" }}>Archive / Delete</button>
        </div>
      </NeonPanel>
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="shrink-0 rounded-full px-3 py-1.5 ps-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: active ? "#00f0ff" : "rgba(255,255,255,0.64)", background: active ? "rgba(0,240,255,0.12)" : "rgba(255,255,255,0.04)", boxShadow: active ? "inset 0 0 0 1px #00f0ff, 0 0 10px rgba(0,240,255,0.35)" : "inset 0 0 0 1px rgba(255,255,255,0.1)" }}>
      {label}
    </button>
  )
}

function ActionButton({ icon, label, color, onClick, ariaLabel, title }: { icon: React.ReactNode; label: string; color: string; onClick: () => void; ariaLabel?: string; title?: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      title={title}
      className="h-12 rounded-xl flex items-center justify-center gap-2 ps-mono text-[11px] uppercase tracking-[0.25em]"
      style={{ color, boxShadow: `inset 0 0 0 1px ${color}99, 0 0 12px ${color}33`, background: `${color}14` }}
    >
      {icon}
      {label}
    </motion.button>
  )
}

function VaultInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <p className="ps-mono text-[10px] tracking-[0.25em] text-white/55 mb-1.5">{label}</p>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-md bg-black/60 px-3 text-[13px] text-white outline-none" style={{ boxShadow: "inset 0 0 0 1px rgba(57,255,20,0.35)" }} />
    </div>
  )
}

function VaultNumber({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div>
      <p className="ps-mono text-[10px] tracking-[0.25em] text-white/55 mb-1.5">{label}</p>
      <input type="number" min={1} max={5} value={value} onChange={(event) => onChange(Number(event.target.value))} className="h-9 w-full rounded-md bg-black/60 px-3 text-[13px] text-white outline-none" style={{ boxShadow: "inset 0 0 0 1px rgba(57,255,20,0.35)" }} />
    </div>
  )
}

function VaultSelect({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  return (
    <div>
      <p className="ps-mono text-[10px] tracking-[0.25em] text-white/55 mb-1.5">{label}</p>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-md bg-black/70 px-2 text-[12px] text-white outline-none ps-mono tracking-widest" style={{ boxShadow: "inset 0 0 0 1px rgba(57,255,20,0.35)" }}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  )
}

function ToggleButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="h-9 rounded-md ps-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: active ? "#39ff14" : "rgba(255,255,255,0.58)", boxShadow: "inset 0 0 0 1px rgba(57,255,20,0.35)", background: active ? "rgba(57,255,20,0.12)" : "rgba(255,255,255,0.04)" }}>
      {label}
    </button>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/40 p-3" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
      <p className="ps-mono text-[9px] uppercase tracking-[0.22em] text-white/45">{label}</p>
      <p className="mt-1 ps-mono text-[11px] uppercase tracking-[0.18em] text-white/75">{value}</p>
    </div>
  )
}

function DetailButton({ label, onClick, color }: { label: string; onClick: () => void; color: string }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg py-2.5 ps-mono text-[11px] uppercase tracking-[0.25em]" style={{ color, boxShadow: `inset 0 0 0 1px ${color}88`, background: `${color}14` }}>
      {label}
    </button>
  )
}
