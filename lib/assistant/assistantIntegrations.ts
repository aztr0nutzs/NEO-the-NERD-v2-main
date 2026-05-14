import type { ChatMessage, SavedResponse } from "@/lib/types"
import { GAMES, PERSONALITIES } from "@/lib/data"
import { getPersonalityProfile } from "@/lib/personality/personalityProfiles"
import { VOICE_PROFILES, getVoiceProfile } from "@/lib/voice/voiceProfiles"

const PERSONALITY_VOICE_MATCHES: Record<string, string[]> = {
  genius: ["neo", "byte", "neon-mentor", "friendly-tech-support"],
  chaos: ["prankster", "glitch", "tiny", "glitch-sprite"],
  friendly: ["nova", "droid", "friendly-tech-support", "solar-diplomat"],
  snark: ["snark", "dry-humor-unit", "smooth-operator", "low-battery-philosopher"],
  gm: ["arcade-announcer", "hyperdrive-host", "sparky", "retro"],
  wizard: ["byte", "tactical-guide", "friendly-tech-support", "packet-punk"],
  motivator: ["overclock-coach", "sparky", "circuit-cheerleader", "hyper"],
  detective: ["midnight-narrator", "analog-ghost", "void-oracle", "commander"],
  story: ["deepcore", "midnight-narrator", "cosmic-commentator", "holo-host"],
  calm: ["velvet-circuit", "chill-byte", "synth-sage", "low-battery-philosopher"],
  hype: ["hyperdrive-host", "hyper", "sparky", "circuit-cheerleader"],
  strat: ["commander", "tactical-guide", "neon-mentor", "neo"],
}

const PERSONALITY_RESPONSE_TAGS: Record<string, string[]> = {
  genius: ["helpful", "clear", "technical"],
  chaos: ["mischief", "funny", "playful"],
  friendly: ["warm", "helpful", "motivating"],
  snark: ["snarky", "sharp", "funny"],
  gm: ["gaming", "competitive", "celebration"],
  wizard: ["technical", "diagnostic", "clear"],
  motivator: ["motivating", "positive", "hype"],
  detective: ["curious", "story", "diagnostic"],
  story: ["story", "cinematic", "imaginative"],
  calm: ["calm", "reflective", "helpful"],
  hype: ["hype", "celebration", "energetic"],
  strat: ["focused", "clear", "diagnostic"],
}

export function getRecommendedVoiceProfiles(personalityId: string, limit = 4) {
  const linkedVoiceId = getPersonalityProfile(personalityId).voiceId
  const ids = [linkedVoiceId, ...(PERSONALITY_VOICE_MATCHES[personalityId] ?? PERSONALITY_VOICE_MATCHES.genius)]
  return Array.from(new Set(ids)).map(getVoiceProfile).filter(Boolean).slice(0, limit)
}

export function getRecommendedPersonalityNamesForVoice(voiceId: string) {
  const profile = getVoiceProfile(voiceId)
  return profile.compatiblePersonalities
    .map((id) => PERSONALITIES.find((personality) => personality.id === id)?.name ?? id)
    .slice(0, 4)
}

export function getRecommendedResponses({
  responses,
  personalityId,
  voiceId,
  lastAssistantMessage,
  limit = 4,
}: {
  responses: SavedResponse[]
  personalityId: string
  voiceId?: string
  lastAssistantMessage?: ChatMessage
  limit?: number
}) {
  const tags = new Set(PERSONALITY_RESPONSE_TAGS[personalityId] ?? [])
  const voice = voiceId ? getVoiceProfile(voiceId) : null
  voice?.toneTags.forEach((tag) => tags.add(tag))
  if (lastAssistantMessage?.category === "Funny") tags.add("funny")
  if (lastAssistantMessage?.category === "Prank") tags.add("mischief")
  if (lastAssistantMessage?.category === "Game") tags.add("gaming")

  return responses
    .filter((response) => !response.archived)
    .map((response) => {
      const responseTags = [...(response.toneTags ?? []), ...(response.useCaseTags ?? []), response.category]
        .map((tag) => tag.toLowerCase())
      const tagScore = responseTags.reduce((score, tag) => score + (tags.has(tag) ? 2 : 0), 0)
      const voiceScore = voiceId && (response.linkedVoiceProfileIds?.includes(voiceId) || response.voiceCompat.includes(voiceId)) ? 3 : 0
      const pinScore = response.pinned ? 2 : 0
      const favoriteScore = response.favorite ? 1 : 0
      return { response, score: tagScore + voiceScore + pinScore + favoriteScore }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || (b.response.timesUsed ?? 0) - (a.response.timesUsed ?? 0))
    .slice(0, limit)
    .map((item) => item.response)
}

export function getRecommendedGameInvites(lastAssistantMessage?: ChatMessage, personalityId?: string) {
  if (lastAssistantMessage?.category !== "Game" && personalityId !== "gm" && personalityId !== "hype") return []
  return GAMES.filter((game) => game.playable).slice(0, 3)
}

export function getVoiceToneSummary(voiceId: string) {
  const profile = getVoiceProfile(voiceId)
  return `${profile.name} // ${profile.toneTags.slice(0, 3).join(" / ")}`
}

export function getPersonalityVoiceIds(personalityId: string) {
  const linkedVoiceId = getPersonalityProfile(personalityId).voiceId
  return Array.from(new Set([linkedVoiceId, ...(PERSONALITY_VOICE_MATCHES[personalityId] ?? PERSONALITY_VOICE_MATCHES.genius)]))
}

export function getPersonalityResponseTags(personalityId: string) {
  return PERSONALITY_RESPONSE_TAGS[personalityId] ?? PERSONALITY_RESPONSE_TAGS.genius
}

export const RECOMMENDED_VOICE_IDS = Array.from(new Set(Object.values(PERSONALITY_VOICE_MATCHES).flat()))
export const RECOMMENDED_VOICES = VOICE_PROFILES.filter((voice) => RECOMMENDED_VOICE_IDS.includes(voice.id))
