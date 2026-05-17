"use client"

import type { VoiceParams } from "@/lib/types"
import type { VoiceProfile } from "./types"
import type { VoicePlaybackSnapshot } from "./voicePlayback"
import { prepareSpeechForDelivery } from "./speechPreparation"
import type { SpeechIntent } from "./speechIntent"

type PlaybackListener = (snapshot: VoicePlaybackSnapshot) => void

interface BrowserSpeechRequest {
  profile: VoiceProfile
  text: string
  params: VoiceParams
  personalityId?: string
  intent?: SpeechIntent
  onStateChange?: PlaybackListener
}

let activeUtterance: SpeechSynthesisUtterance | null = null

export function isBrowserSpeechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window
}

export function pauseBrowserSpeech() {
  if (!isBrowserSpeechSupported()) return false
  window.speechSynthesis.pause()
  return true
}

export function resumeBrowserSpeech() {
  if (!isBrowserSpeechSupported()) return false
  window.speechSynthesis.resume()
  return true
}

export function stopBrowserSpeech() {
  if (!isBrowserSpeechSupported()) return false
  window.speechSynthesis.cancel()
  activeUtterance = null
  return true
}

export async function speakWithBrowserSpeech({
  profile,
  text,
  params,
  personalityId,
  intent,
  onStateChange,
}: BrowserSpeechRequest) {
  if (!isBrowserSpeechSupported()) {
    onStateChange?.({
      state: "error",
      source: "unavailable",
      voiceId: profile.id,
      message: "BROWSER SPEECH UNAVAILABLE IN THIS WEBVIEW",
    })
    return false
  }

  const speech = prepareSpeechForDelivery({
    voice: profile,
    text,
    params,
    personalityId,
    intent,
  })
  stopBrowserSpeech()

  onStateChange?.({
    state: "preparing",
    source: "browser-speech",
    voiceId: profile.id,
    message: `PREPARING BROWSER PREVIEW // ${profile.name.toUpperCase()}`,
  })

  return new Promise<boolean>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(speech.text)
    utterance.rate = speech.rate
    utterance.pitch = speech.pitch
    utterance.volume = speech.volume
    utterance.voice = selectBrowserVoice(profile)

    utterance.onstart = () => {
      onStateChange?.({
        state: "playing",
        source: "browser-speech",
        voiceId: profile.id,
        message: `BROWSER SPEECH PREVIEW // ${profile.name.toUpperCase()}`,
      })
    }

    utterance.onpause = () => {
      onStateChange?.({
        state: "paused",
        source: "browser-speech",
        voiceId: profile.id,
        message: "BROWSER SPEECH PAUSED",
      })
    }

    utterance.onresume = () => {
      onStateChange?.({
        state: "playing",
        source: "browser-speech",
        voiceId: profile.id,
        message: "BROWSER SPEECH RESUMED",
      })
    }

    utterance.onend = () => {
      if (activeUtterance === utterance) activeUtterance = null
      onStateChange?.({
        state: "ended",
        source: "browser-speech",
        voiceId: profile.id,
        message: "BROWSER SPEECH PREVIEW ENDED",
      })
      resolve(true)
    }

    utterance.onerror = () => {
      if (activeUtterance === utterance) activeUtterance = null
      onStateChange?.({
        state: "error",
        source: "browser-speech",
        voiceId: profile.id,
        message: "BROWSER SPEECH PREVIEW FAILED",
      })
      resolve(false)
    }

    activeUtterance = utterance
    window.speechSynthesis.speak(utterance)
  })
}

function selectBrowserVoice(profile: VoiceProfile) {
  if (!isBrowserSpeechSupported()) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null

  const nameHints = getVoiceNameHints(profile)
  return (
    voices.find((voice) => nameHints.some((hint) => voice.name.toLowerCase().includes(hint))) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ??
    voices[0] ??
    null
  )
}

function getVoiceNameHints(profile: VoiceProfile) {
  const text = `${profile.name} ${profile.category} ${profile.toneTags.join(" ")}`.toLowerCase()
  if (text.includes("deep") || text.includes("villain") || text.includes("commander")) return ["daniel", "guy", "david", "male"]
  if (text.includes("nova") || text.includes("friendly") || text.includes("warm")) return ["samantha", "zira", "female", "aria"]
  if (text.includes("retro") || text.includes("arcade") || text.includes("robot")) return ["alex", "fred", "google"]
  return ["en"]
}
