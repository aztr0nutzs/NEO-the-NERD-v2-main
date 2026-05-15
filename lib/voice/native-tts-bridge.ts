"use client"

import { Capacitor, registerPlugin } from "@capacitor/core"
import type { VoiceParams } from "@/lib/types"
import type { NativeVoiceResolution, VoiceProfile } from "./types"
import { VOICE_PROFILES } from "./voiceProfiles"
import { buildStyledVoiceSpeech } from "./voiceStyle"

export interface NativeTtsAvailability {
  available: boolean
  ready: boolean
  platform: string
  message?: string
}

export interface NativeTtsSpeakResult {
  ok: boolean
  message?: string
  voiceName?: string | null
}

export interface AndroidNativeVoice {
  name: string
  locale: string
  quality?: number
  latency?: number
  networkConnectionRequired?: boolean
}

interface NativeTtsPlugin {
  isAvailable(): Promise<NativeTtsAvailability>
  speak(options: {
    text: string
    rate: number
    pitch: number
    volume: number
    voiceName?: string
  }): Promise<NativeTtsSpeakResult>
  getVoices(): Promise<{
    available: boolean
    voices: AndroidNativeVoice[]
    message?: string
  }>
  stop(): Promise<NativeTtsSpeakResult>
}

const neoTts = registerPlugin<NativeTtsPlugin>("NeoTts")

export function isAndroidNativeTtsRuntime(): boolean {
  return Capacitor.getPlatform() === "android"
}

export async function getAndroidNativeTtsAvailability(): Promise<NativeTtsAvailability> {
  if (!isAndroidNativeTtsRuntime()) {
    return { available: false, ready: false, platform: Capacitor.getPlatform(), message: "Not Android runtime." }
  }
  try {
    return await neoTts.isAvailable()
  } catch (error) {
    return {
      available: false,
      ready: false,
      platform: "android",
      message: error instanceof Error ? error.message : "Native Android TTS bridge unavailable.",
    }
  }
}

export async function speakWithAndroidNativeTts(options: {
  text: string
  profile: VoiceProfile
  params: VoiceParams
}): Promise<NativeTtsSpeakResult> {
  const availability = await waitForAndroidNativeTtsReady()
  if (!availability.available || !availability.ready) {
    return { ok: false, message: availability.message ?? "Android TTS engine not ready." }
  }
  const speech = buildStyledVoiceSpeech(options.profile, options.text, options.params)
  const voiceName = await selectAndroidNativeVoiceName(options.profile)
  return neoTts.speak({
    text: speech.text,
    rate: speech.rate,
    pitch: speech.pitch,
    volume: speech.volume,
    ...(voiceName ? { voiceName } : {}),
  })
}

let cachedAndroidVoices: AndroidNativeVoice[] | null = null

export async function getAndroidNativeVoices(): Promise<AndroidNativeVoice[]> {
  if (!isAndroidNativeTtsRuntime()) return []
  if (cachedAndroidVoices) return cachedAndroidVoices
  try {
    const result = await neoTts.getVoices()
    cachedAndroidVoices = Array.isArray(result.voices) ? result.voices : []
    return cachedAndroidVoices
  } catch {
    cachedAndroidVoices = []
    return cachedAndroidVoices
  }
}

export interface NativeVoiceResolutionResult {
  voiceName: string | null
  resolution: NativeVoiceResolution
  candidateCount: number
  poolSize: number
  reason: string
}

/**
 * Score a candidate Android engine voice against a profile's authored
 * preference. Higher score wins. Exported for tests/debug.
 */
export function scoreNativeVoiceCandidate(profile: VoiceProfile, voice: AndroidNativeVoice): number {
  const pref = profile.nativeVoicePreference
  let score = 0

  const locale = (voice.locale ?? "").toLowerCase()
  const wantedLocales = (pref?.localePreference ?? ["en-US", "en-GB", "en"]).map((l) => l.toLowerCase())
  const localeIndex = wantedLocales.findIndex((tag) =>
    locale === tag || locale.startsWith(`${tag}-`) || locale.startsWith(tag),
  )
  if (localeIndex >= 0) score += 50 - localeIndex * 10
  else if (locale.startsWith("en")) score += 10

  const offlineWanted = pref?.preferOffline !== false
  if (offlineWanted) {
    if (voice.networkConnectionRequired === false) score += 30
    else if (voice.networkConnectionRequired === true) score -= 20
  }

  const quality = voice.quality ?? 0
  if (pref?.preferHighQuality) score += Math.min(40, quality)
  else score += Math.min(20, Math.floor(quality / 2))

  if (pref?.preferLowLatency) {
    const latency = voice.latency ?? 200
    score += Math.max(0, 30 - Math.min(30, latency / 10))
  }

  const lowerName = voice.name.toLowerCase()
  for (const hint of pref?.preferNameHints ?? []) {
    if (lowerName.includes(hint.toLowerCase())) score += 25
  }
  for (const hint of pref?.avoidNameHints ?? []) {
    if (lowerName.includes(hint.toLowerCase())) score -= 35
  }
  return score
}

/**
 * Resolve the best available native voice for a profile. The strategy is:
 *
 *   1. If `nativeVoiceId` is pinned AND that voice exists on the device, use
 *      it ("explicit").
 *   2. Otherwise score every device voice with `scoreNativeVoiceCandidate`,
 *      take the top-K candidates, then deterministically slot the profile
 *      among siblings sharing the same `distinctFromPoolKey` so several
 *      styled variants of one provider base don't all collapse to the same
 *      device voice ("heuristic").
 *   3. If no acceptable voice exists, return null with "unavailable".
 *
 * Result is honest: when only one practical voice exists the caller still
 * gets `resolution: "heuristic"` but the runtime layer labels the playback
 * as a styled fallback (not a distinct device voice).
 */
export async function resolveBestNativeVoiceForProfile(
  profile: VoiceProfile,
): Promise<NativeVoiceResolutionResult> {
  const voices = await getAndroidNativeVoices()
  if (!voices.length) {
    return { voiceName: null, resolution: "unavailable", candidateCount: 0, poolSize: 0, reason: "No native voices reported by engine." }
  }

  if (profile.nativeVoiceId) {
    const pinned = voices.find((v) => v.name === profile.nativeVoiceId)
    if (pinned) {
      return {
        voiceName: pinned.name,
        resolution: "explicit",
        candidateCount: voices.length,
        poolSize: 1,
        reason: `Pinned nativeVoiceId "${pinned.name}" is installed on device.`,
      }
    }
  }

  // Score candidates and keep those above a positive baseline.
  const scored = voices
    .map((v) => ({ voice: v, score: scoreNativeVoiceCandidate(profile, v) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || a.voice.name.localeCompare(b.voice.name))

  if (!scored.length) {
    return {
      voiceName: null,
      resolution: "unavailable",
      candidateCount: voices.length,
      poolSize: 0,
      reason: "No native voice passed the scoring threshold for this profile.",
    }
  }

  const TOP_K = 4
  const pool = scored.slice(0, Math.min(TOP_K, scored.length)).map((c) => c.voice)

  // Pool slotting: spread sibling profiles across the pool deterministically.
  const poolKey = profile.nativeVoicePreference?.distinctFromPoolKey ?? `id:${profile.id}`
  const siblings = VOICE_PROFILES.filter(
    (p) => (p.nativeVoicePreference?.distinctFromPoolKey ?? `id:${p.id}`) === poolKey,
  )
    .map((p) => p.id)
    .sort()
  const siblingIndex = Math.max(0, siblings.indexOf(profile.id))
  const slot = siblingIndex % pool.length
  const chosen = pool[slot]

  return {
    voiceName: chosen.name,
    resolution: "heuristic",
    candidateCount: voices.length,
    poolSize: pool.length,
    reason: pool.length > 1
      ? `Selected voice ${slot + 1}/${pool.length} from scored pool for pool "${poolKey}".`
      : `Only one acceptable native voice on this device — styled fallback applies.`,
  }
}

/** Human-readable description of a resolution result (for QA/diagnostics). */
export function describeNativeVoiceResolution(result: NativeVoiceResolutionResult): string {
  if (result.resolution === "explicit") return `Explicit pinned voice: ${result.voiceName}.`
  if (result.resolution === "heuristic") {
    return result.voiceName
      ? `Heuristic native pick: ${result.voiceName} (pool ${result.poolSize}/${result.candidateCount}).`
      : `Heuristic resolution returned no voice (${result.reason}).`
  }
  return `Native voice unavailable: ${result.reason}`
}

export async function selectAndroidNativeVoiceName(profile: VoiceProfile): Promise<string | null> {
  const result = await resolveBestNativeVoiceForProfile(profile)
  return result.voiceName
}

async function waitForAndroidNativeTtsReady(
  attempts = 6,
  intervalMs = 250,
): Promise<NativeTtsAvailability> {
  let last: NativeTtsAvailability = await getAndroidNativeTtsAvailability()
  if (last.available && last.ready) return last
  for (let i = 1; i < attempts; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
    last = await getAndroidNativeTtsAvailability()
    if (last.available && last.ready) return last
  }
  return last
}

export async function stopAndroidNativeTts(): Promise<boolean> {
  if (!isAndroidNativeTtsRuntime()) return false
  try {
    const result = await neoTts.stop()
    return Boolean(result.ok)
  } catch {
    return false
  }
}
