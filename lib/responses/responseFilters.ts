import type { SavedResponse } from "@/lib/types"
import { scoreResponseSearch } from "./responseSearch"
import type { ResponseFilterState } from "./types"

export const DEFAULT_RESPONSE_FILTERS: ResponseFilterState = {
  search: "",
  category: "All",
  toneTag: "All",
  favoritesOnly: false,
  pinnedOnly: false,
  userOnly: false,
  sortMode: "Recently used",
}

export function filterResponses(responses: SavedResponse[], filters: ResponseFilterState) {
  return responses
    .filter((response) => !response.archived)
    .filter((response) => {
      if (filters.category === "Favorites" && !response.favorite) return false
      if (filters.category !== "All" && filters.category !== "Favorites" && response.category !== filters.category) return false
      if (filters.favoritesOnly && !response.favorite) return false
      if (filters.pinnedOnly && !response.pinned) return false
      if (filters.userOnly && response.createdBy !== "user") return false
      if (filters.toneTag !== "All" && !(response.toneTags ?? []).includes(filters.toneTag)) return false
      if (filters.search && scoreResponseSearch(response, filters.search) <= 0) return false
      return true
    })
    .sort((a, b) => sortResponses(a, b, filters))
}

function sortResponses(a: SavedResponse, b: SavedResponse, filters: ResponseFilterState) {
  if (filters.search) {
    const scoreDelta = scoreResponseSearch(b, filters.search) - scoreResponseSearch(a, filters.search)
    if (scoreDelta !== 0) return scoreDelta
  }

  switch (filters.sortMode) {
    case "Alphabetical":
      return a.title.localeCompare(b.title)
    case "Category":
      return a.category.localeCompare(b.category) || a.title.localeCompare(b.title)
    case "Favorites first":
      return Number(b.favorite) - Number(a.favorite) || Number(b.pinned) - Number(a.pinned) || a.title.localeCompare(b.title)
    case "Recently used":
    default:
      return dateScore(b.lastUsedAt) - dateScore(a.lastUsedAt) || (b.timesUsed ?? 0) - (a.timesUsed ?? 0) || Number(b.pinned) - Number(a.pinned)
  }
}

function dateScore(value?: string) {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}
