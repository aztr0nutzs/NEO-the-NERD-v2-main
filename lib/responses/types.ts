import type { AssistantMood, LibraryResponseCategory, SavedResponse } from "@/lib/types"

export type ResponseSortMode =
  | "Recently used"
  | "Alphabetical"
  | "Category"
  | "Favorites first"

export interface ResponseFilterState {
  search: string
  category: LibraryResponseCategory | "All" | "Favorites"
  toneTag: string | "All"
  favoritesOnly: boolean
  pinnedOnly: boolean
  userOnly: boolean
  sortMode: ResponseSortMode
}

export interface ResponseDraftInput {
  title: string
  body: string
  category: LibraryResponseCategory
  subcategory: string
  mood: AssistantMood
  toneTags: string
  useCaseTags: string
  voiceCompat: string
  linkedPersonalityIds: string
  linkedVoiceProfileIds: string
  humorLevel: number
  intensity: number
  safeForAutoUse: boolean
  favorite: boolean
  pinned: boolean
}

export type ResponseMutationInput = Omit<SavedResponse, "id">
