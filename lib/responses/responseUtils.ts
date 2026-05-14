import type { AssistantMood, LibraryResponseCategory, SavedResponse } from "@/lib/types"
import { RESPONSE_CATEGORY_LIST } from "./responseLibraryData"
import type { ResponseDraftInput, ResponseMutationInput } from "./types"

export function responseDisplayText(response: SavedResponse) {
  return response.text ?? response.body
}

export function responseKey(response: Pick<SavedResponse, "title" | "body">) {
  return `${response.title.trim().toLowerCase()}::${response.body.trim().toLowerCase()}`
}

export function markResponseUsed(response: SavedResponse, now = new Date().toISOString()): SavedResponse {
  return {
    ...response,
    timesUsed: (response.timesUsed ?? 0) + 1,
    lastUsedAt: now,
  }
}

export function duplicateResponse(response: SavedResponse): ResponseMutationInput {
  const now = new Date().toISOString()
  return {
    ...response,
    title: `${response.title} Copy`,
    favorite: false,
    pinned: false,
    createdBy: "user",
    createdAt: now,
    updatedAt: now,
    timesUsed: 0,
    lastUsedAt: undefined,
    archived: false,
  }
}

export function normalizeResponseInput(input: ResponseMutationInput): ResponseMutationInput {
  const now = new Date().toISOString()
  const body = input.body.trim()
  return {
    ...input,
    title: input.title.trim(),
    body,
    text: body,
    category: normalizeCategory(input.category),
    mood: input.mood ?? "speaking",
    subcategory: input.subcategory?.trim() || undefined,
    toneTags: normalizeTags(input.toneTags),
    useCaseTags: normalizeTags(input.useCaseTags),
    voiceCompat: input.voiceCompat?.length ? normalizeTags(input.voiceCompat) : ["neo"],
    linkedPersonalityIds: normalizeTags(input.linkedPersonalityIds),
    linkedVoiceProfileIds: normalizeTags(input.linkedVoiceProfileIds),
    humorLevel: clampLevel(input.humorLevel ?? 2),
    intensity: clampLevel(input.intensity ?? 2),
    safeForAutoUse: input.safeForAutoUse ?? true,
    favorite: Boolean(input.favorite),
    pinned: Boolean(input.pinned),
    archived: Boolean(input.archived),
    createdBy: input.createdBy ?? "user",
    createdAt: input.createdAt ?? now,
    updatedAt: now,
    timesUsed: input.timesUsed ?? 0,
  }
}

export function draftToResponseInput(draft: ResponseDraftInput, createdBy: "system" | "user" = "user"): ResponseMutationInput | null {
  if (!draft.title.trim() || !draft.body.trim()) return null
  const now = new Date().toISOString()
  return normalizeResponseInput({
    title: draft.title,
    body: draft.body,
    text: draft.body,
    category: draft.category,
    subcategory: draft.subcategory,
    mood: draft.mood,
    toneTags: splitTags(draft.toneTags),
    useCaseTags: splitTags(draft.useCaseTags),
    voiceCompat: splitTags(draft.voiceCompat),
    favorite: draft.favorite,
    pinned: draft.pinned,
    safeForAutoUse: draft.safeForAutoUse,
    humorLevel: draft.humorLevel,
    intensity: draft.intensity,
    createdBy,
    createdAt: now,
    updatedAt: now,
    timesUsed: 0,
    linkedPersonalityIds: splitTags(draft.linkedPersonalityIds),
    linkedVoiceProfileIds: splitTags(draft.linkedVoiceProfileIds),
    archived: false,
  })
}

export function responseToDraft(response: SavedResponse): ResponseDraftInput {
  return {
    title: response.title,
    body: responseDisplayText(response),
    category: response.category,
    subcategory: response.subcategory ?? "",
    mood: response.mood,
    toneTags: (response.toneTags ?? []).join(", "),
    useCaseTags: (response.useCaseTags ?? []).join(", "),
    voiceCompat: response.voiceCompat.join(", "),
    linkedPersonalityIds: (response.linkedPersonalityIds ?? []).join(", "),
    linkedVoiceProfileIds: (response.linkedVoiceProfileIds ?? []).join(", "),
    humorLevel: response.humorLevel ?? 2,
    intensity: response.intensity ?? 2,
    safeForAutoUse: response.safeForAutoUse ?? true,
    favorite: response.favorite,
    pinned: Boolean(response.pinned),
  }
}

export function emptyResponseDraft(seed?: Partial<ResponseDraftInput>): ResponseDraftInput {
  return {
    title: seed?.title ?? "",
    body: seed?.body ?? "",
    category: seed?.category ?? "Helpful answers",
    subcategory: seed?.subcategory ?? "",
    mood: seed?.mood ?? "speaking",
    toneTags: seed?.toneTags ?? "helpful, neo",
    useCaseTags: seed?.useCaseTags ?? "chat",
    voiceCompat: seed?.voiceCompat ?? "neo",
    linkedPersonalityIds: seed?.linkedPersonalityIds ?? "",
    linkedVoiceProfileIds: seed?.linkedVoiceProfileIds ?? "neo",
    humorLevel: seed?.humorLevel ?? 2,
    intensity: seed?.intensity ?? 2,
    safeForAutoUse: seed?.safeForAutoUse ?? true,
    favorite: seed?.favorite ?? false,
    pinned: seed?.pinned ?? false,
  }
}

export function normalizeImportedResponse(
  item: Partial<SavedResponse>,
  index: number,
): SavedResponse | null {
  if (!item.title?.trim() || !item.body?.trim()) return null
  const input = normalizeResponseInput({
    title: item.title,
    body: item.body,
    text: item.text ?? item.body,
    category: normalizeCategory(item.category),
    subcategory: item.subcategory,
    mood: normalizeMood(item.mood),
    toneTags: normalizeTags(item.toneTags),
    useCaseTags: normalizeTags(item.useCaseTags),
    humorLevel: item.humorLevel,
    intensity: item.intensity,
    safeForAutoUse: item.safeForAutoUse,
    voiceCompat: item.voiceCompat?.length ? item.voiceCompat : ["neo"],
    favorite: Boolean(item.favorite),
    createdBy: item.createdBy ?? "user",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    timesUsed: item.timesUsed ?? 0,
    lastUsedAt: item.lastUsedAt,
    linkedPersonalityIds: normalizeTags(item.linkedPersonalityIds),
    linkedVoiceProfileIds: normalizeTags(item.linkedVoiceProfileIds),
    pinned: item.pinned,
    archived: item.archived,
  })
  return {
    ...input,
    id: item.id?.trim() || `r-import-${Date.now()}-${index}`,
  }
}

function normalizeCategory(category?: LibraryResponseCategory): LibraryResponseCategory {
  return RESPONSE_CATEGORY_LIST.includes(category as LibraryResponseCategory)
    ? (category as LibraryResponseCategory)
    : "Helpful answers"
}

function normalizeMood(mood?: AssistantMood): AssistantMood {
  const allowed: AssistantMood[] = ["idle", "listening", "thinking", "speaking", "playful", "gaming"]
  return allowed.includes(mood as AssistantMood) ? (mood as AssistantMood) : "speaking"
}

function normalizeTags(tags?: string[]) {
  return tags?.map((tag) => tag.trim()).filter(Boolean) ?? []
}

function splitTags(value: string) {
  return value.split(",").map((tag) => tag.trim()).filter(Boolean)
}

function clampLevel(value: number) {
  return Math.min(5, Math.max(1, Math.round(value)))
}
