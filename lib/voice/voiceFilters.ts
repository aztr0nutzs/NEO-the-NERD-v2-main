import type { VoiceFilterState, VoiceProfile } from "./types"

export const DEFAULT_VOICE_FILTERS: VoiceFilterState = {
  search: "",
  category: "All",
  toneTag: "All",
  favoritesOnly: false,
}

export function filterVoiceProfiles(
  profiles: VoiceProfile[],
  filters: VoiceFilterState,
  favoriteIds: string[],
) {
  const query = filters.search.trim().toLowerCase()
  const favorites = new Set(favoriteIds)

  return profiles.filter((profile) => {
    if (filters.category !== "All" && profile.category !== filters.category) return false
    if (filters.toneTag !== "All" && !profile.toneTags.includes(filters.toneTag)) return false
    if (filters.favoritesOnly && !favorites.has(profile.id)) return false
    if (!query) return true

    const haystack = [
      profile.name,
      profile.category,
      profile.shortDescription,
      profile.longDescription,
      profile.toneTags.join(" "),
      profile.idealUseCases.join(" "),
    ]
      .join(" ")
      .toLowerCase()

    return haystack.includes(query)
  })
}

export function categoryBreakdown(profiles: VoiceProfile[]) {
  return profiles.reduce<Record<string, number>>((totals, profile) => {
    totals[profile.category] = (totals[profile.category] ?? 0) + 1
    return totals
  }, {})
}
