import type { SavedResponse } from "@/lib/types"
import { responseDisplayText } from "./responseUtils"

export function scoreResponseSearch(response: SavedResponse, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return 1
  const haystack = [
    response.title,
    responseDisplayText(response),
    response.category,
    response.subcategory,
    ...(response.toneTags ?? []),
    ...(response.useCaseTags ?? []),
    ...response.voiceCompat,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  const tokens = normalized.split(/\s+/).filter(Boolean)
  return tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0)
}

export function responseMatchesSearch(response: SavedResponse, query: string) {
  return scoreResponseSearch(response, query) > 0
}
