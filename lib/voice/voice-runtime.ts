/**
 * Canonical voice runtime for NEO the N.E.R.D.
 *
 * Unifies the three voice surfaces (browser SpeechSynthesis preview, provider
 * TTS generation, audio playback of generated payloads) behind a single API
 * that is correct in every runtime the app ships in:
 *
 *   - web dev/server with same-origin `/api/tts`
 *   - hosted web with `NEXT_PUBLIC_NEO_BACKEND_BASE_URL` set
 *   - Capacitor Android with a remote backend configured
 *   - Capacitor Android with no backend            → native Android TTS (with readiness retry), then browser fallback if exposed
 *   - browsers without SpeechSynthesis             → browser path is disabled
 *
 * Blob URLs created from provider audio payloads are tracked and revoked in:
 *   - the next preview/play call
 *   - explicit `stopVoicePreview()`
 *   - the `<audio>` "ended" or "error" event
 */

"use client"

import type { VoiceParams } from "@/lib/types"
import type { TtsProviderType, VoiceProfile } from "./types"
import {
  isBrowserSpeechSupported,
  pauseBrowserSpeech,
  resumeBrowserSpeech,
  speakWithBrowserSpeech,
  stopBrowserSpeech,
} from "./browserSpeechAdapter"
import type { VoicePlaybackSnapshot } from "./voicePlayback"
import { getVoiceProviderConfig, audioBase64ToBlob, downloadAudio, shareOrSaveAudio } from "./ttsClient"
import {
  checkOmniVoiceHealth,
  generateOmniVoiceTts,
  getCachedOmniVoiceHealth,
  paramsToOmniVoiceSpeed,
} from "./omnivoiceClient"
import { postTtsPreview } from "@/lib/runtime/backend-client"
import {
  checkBackendAvailability,
  getCachedBackendHealth,
} from "@/lib/runtime/backend-health"
import { getBackendConfig } from "@/lib/runtime/backend-config"
import {
  getAndroidNativeTtsAvailability,
  getAndroidNativeVoices,
  getCachedAndroidNativeTtsAvailability,
  getCachedAndroidNativeVoices,
  selectAndroidNativeVoiceName,
  speakWithAndroidNativeTts,
  stopAndroidNativeTts,
} from "./native-tts-bridge"
import { getVoiceTruthLabel } from "./voiceUniqueness"
import type { SpeechIntent } from "./speechIntent"
import { getVoiceProfile } from "./voiceProfiles"

// -----------------------------------------------------------------------------
// Capability model
// -----------------------------------------------------------------------------

export type VoicePreviewMode = "browser-speech" | "native-android" | "provider-tts" | "unavailable"

/**
 * Mirror of `AssistantSettings.voiceQualityPreference` — duplicated as a
 * loose string type here so the voice runtime does not need to import the
 * full assistant settings module (and to keep this layer renderer-agnostic).
 */
export type VoiceQualityPreference = "prefer-high-quality" | "fallback-only"

export interface VoiceRuntimeCapabilities {
  /** Web Speech API (SpeechSynthesis) is present and usable. */
  browserSpeechSupported: boolean
  /** Backend is reachable AND a TTS provider key is configured server-side. */
  providerTtsAvailable: boolean
  /** OpenAI TTS backend is reachable and configured server-side. */
  openaiTtsAvailable: boolean
  /** OmniVoice external backend health passed. */
  omnivoiceTtsAvailable: boolean
  /** Provider/engine selected for the active profile in this runtime. */
  selectedProvider: TtsProviderType
  openAiProviderAvailable: boolean
  openAiBackendConfigured: boolean
  openAiBackendReachable: boolean
  omnivoiceProviderConfigured: boolean
  omnivoiceProviderReachable: boolean
  omnivoiceProviderAvailable: boolean
  anyProviderAvailable: boolean
  /** Local Android TextToSpeech plugin is registered and engine-ready. */
  nativeAndroidTtsAvailable: boolean
  /** Number of selectable Android engine voices exposed by the installed TTS engine. */
  nativeAndroidVoiceCount: number
  /** Selected Android engine voice for the current profile, if one can be safely selected. */
  selectedAndroidVoiceName: string | null
  /** A backend URL is resolvable (same-origin or remote). */
  remoteBackendConfigured: boolean
  /** Best preview path for the *currently selected* voice profile. */
  currentPreviewMode: VoicePreviewMode
  activeProvider: TtsProviderType
  omnivoiceBackendConfigured: boolean
  omnivoiceBackendReachable: boolean
  fallbackReason: string | null
}

export interface ProviderSpeechPayload {
  audioBase64: string
  fileName: string
  mimeType: string
  provider?: string
  providerVoiceId?: string
}

export interface VoicePreviewRequest {
  profile: VoiceProfile
  text: string
  params: VoiceParams
  /** Force a specific path; "auto" picks the best available. */
  mode?: "auto" | "browser-speech" | "native-android" | "provider-tts"
  /**
   * User's voice-quality preference. When `fallback-only`, the runtime
   * will skip the provider path even if it is available. Default is
   * `prefer-high-quality` (`undefined` is treated as the default).
   */
  qualityPreference?: VoiceQualityPreference
  /**
   * Optional personality id active at the time of speech. Drives the
   * personality-aware delivery shaping layer (cadence cues, opener
   * framing) and the provider-side persona instruction string. Pass
   * `undefined` to skip personality shaping (e.g. raw voice library
   * preview where no persona is intended).
   */
  personalityId?: string
  /** Optional spoken-delivery intent — sharpens cadence + provider hints. */
  intent?: SpeechIntent
  onStateChange?: (snapshot: VoicePlaybackSnapshot) => void
}

export interface VoicePreviewResult {
  mode: VoicePreviewMode
  ok: boolean
  /** Set when the chosen path was provider-tts AND it succeeded. */
  payload?: ProviderSpeechPayload
  /** Set when something failed. */
  error?: string
  fallbackReason?: string | null
}

function logVoicePreview(
  phase: "attempt" | "success" | "failure" | "fallback",
  details: Record<string, unknown>,
) {
  const logger = phase === "failure" ? console.error : console.info
  logger("[voice-preview]", { phase, ...details })
}

// -----------------------------------------------------------------------------
// Capability resolution
// -----------------------------------------------------------------------------

function profileCanUseProvider(profile: VoiceProfile) {
  if (profile.provider !== "openai") return false
  if (profile.availability !== "provider-ready") return false
  return Boolean(getVoiceProviderConfig(profile.id)?.available)
}

function profileCanUseOmniVoice(profile: VoiceProfile) {
  return Boolean(
    profile.provider === "omnivoice" &&
      profile.availability === "provider-ready" &&
      profile.providerVoiceId &&
      profile.omnivoiceMode,
  )
}

export function getVoiceProfileCapabilities(profile: VoiceProfile) {
  const openaiConfig = getVoiceProviderConfig(profile.id)
  return {
    providerReady: profileCanUseProvider(profile) || profileCanUseOmniVoice(profile),
    omnivoiceReady: profileCanUseOmniVoice(profile),
    provider: profile.provider,
    providerVoiceId: openaiConfig?.providerVoiceId ?? profile.providerVoiceId ?? null,
    supports: openaiConfig?.supports ?? {
      speed: false,
      pitch: false,
      volume: false,
      emotion: false,
    },
  }
}

export async function getVoiceRuntimeCapabilities(
  profile?: VoiceProfile,
): Promise<VoiceRuntimeCapabilities> {
  const [config, health, nativeTts, nativeVoices, omniHealth] = await Promise.all([
    getBackendConfig().catch(() => null),
    checkBackendAvailability().catch(() => null),
    getAndroidNativeTtsAvailability().catch(() => ({ available: false, ready: false, platform: "unknown" })),
    getAndroidNativeVoices().catch(() => []),
    checkOmniVoiceHealth().catch(() => getCachedOmniVoiceHealth()),
  ])
  const browserSpeechSupported = isBrowserSpeechSupported()
  const nativeAndroidTtsAvailable = Boolean(nativeTts.available && nativeTts.ready)
  const remoteBackendConfigured = Boolean(config && config.mode !== "unavailable")
  const openAiBackendConfigured = remoteBackendConfigured
  const openAiBackendReachable = Boolean(
    remoteBackendConfigured &&
      health &&
      (health.state === "available" || health.state === "available-no-provider"),
  )
  const openAiProviderAvailable = Boolean(
    remoteBackendConfigured &&
      health?.state === "available" &&
      health.ttsStatus?.providerConfigured,
  )
  const openaiTtsAvailable = openAiProviderAvailable
  const omnivoiceProviderConfigured = omniHealth.configured
  const omnivoiceProviderReachable = omniHealth.reachable
  const omnivoiceProviderAvailable = omniHealth.generationReady
  const omnivoiceTtsAvailable = omnivoiceProviderAvailable
  const omnivoiceBackendConfigured = omnivoiceProviderConfigured
  const omnivoiceBackendReachable = omnivoiceProviderReachable
  const anyProviderAvailable = openAiProviderAvailable || omnivoiceProviderAvailable
  const providerTtsAvailable = profile
    ? Boolean(
        (profileCanUseOmniVoice(profile) && omnivoiceProviderAvailable) ||
          (profileCanUseProvider(profile) && openAiProviderAvailable),
      )
    : anyProviderAvailable
  const selectedAndroidVoiceName =
    nativeAndroidTtsAvailable && profile ? await selectAndroidNativeVoiceName(profile) : null

  let currentPreviewMode: VoicePreviewMode = "unavailable"
  let selectedProvider: TtsProviderType = "unavailable"
  let fallbackReason: string | null = null
  if (profile) {
    if (profileCanUseOmniVoice(profile) && omnivoiceProviderAvailable) {
      currentPreviewMode = "provider-tts"
      selectedProvider = "omnivoice"
    } else if (profileCanUseProvider(profile) && openAiProviderAvailable) {
      currentPreviewMode = "provider-tts"
      selectedProvider = "openai"
    } else if (nativeAndroidTtsAvailable && profile.availability !== "unavailable") {
      currentPreviewMode = "native-android"
      selectedProvider = "android-native"
    } else if (browserSpeechSupported && profile.availability !== "unavailable") {
      currentPreviewMode = "browser-speech"
      selectedProvider = "browser-speech"
    } else {
      currentPreviewMode = "unavailable"
      selectedProvider = "unavailable"
    }
    if (
      currentPreviewMode !== "provider-tts" &&
      profile.availability !== "unavailable" &&
      (profile.provider === "omnivoice" || profile.provider === "openai")
    ) {
      fallbackReason = providerFallbackReason(profile, {
        openaiTtsAvailable,
        omnivoiceBackendConfigured,
        omnivoiceTtsAvailable,
        remoteBackendConfigured,
      })
    }
  } else if (omnivoiceProviderAvailable) {
    currentPreviewMode = "provider-tts"
    selectedProvider = "omnivoice"
  } else if (openAiProviderAvailable) {
    currentPreviewMode = "provider-tts"
    selectedProvider = "openai"
  } else if (nativeAndroidTtsAvailable) {
    currentPreviewMode = "native-android"
    selectedProvider = "android-native"
  } else if (browserSpeechSupported) {
    currentPreviewMode = "browser-speech"
    selectedProvider = "browser-speech"
  }

  return {
    browserSpeechSupported,
    providerTtsAvailable,
    openaiTtsAvailable,
    omnivoiceBackendConfigured,
    omnivoiceTtsAvailable,
    selectedProvider,
    openAiProviderAvailable,
    openAiBackendConfigured,
    openAiBackendReachable,
    omnivoiceProviderConfigured,
    omnivoiceProviderReachable,
    omnivoiceProviderAvailable,
    anyProviderAvailable,
    nativeAndroidTtsAvailable,
    nativeAndroidVoiceCount: nativeVoices.length,
    selectedAndroidVoiceName,
    remoteBackendConfigured,
    currentPreviewMode,
    activeProvider: selectedProvider,
    omnivoiceBackendReachable,
    fallbackReason,
  }
}

export function getCachedVoiceRuntimeCapabilities(
  profile?: VoiceProfile,
): VoiceRuntimeCapabilities {
  const health = getCachedBackendHealth()
  const omniHealth = getCachedOmniVoiceHealth()
  const browserSpeechSupported = isBrowserSpeechSupported()
  const remoteBackendConfigured = health.mode !== "unavailable"
  const nativeTts = getCachedAndroidNativeTtsAvailability()
  const nativeVoices = getCachedAndroidNativeVoices()
  const nativeAndroidTtsAvailable = Boolean(nativeTts.available && nativeTts.ready)
  const openAiBackendConfigured = remoteBackendConfigured
  const openAiBackendReachable = Boolean(
    remoteBackendConfigured &&
      (health.state === "available" || health.state === "available-no-provider"),
  )
  const openAiProviderAvailable = Boolean(
    remoteBackendConfigured &&
      health.state === "available" &&
      health.ttsStatus?.providerConfigured,
  )
  const openaiTtsAvailable = openAiProviderAvailable
  const omnivoiceBackendConfigured = Boolean(omniHealth.configured)
  const omnivoiceProviderConfigured = omnivoiceBackendConfigured
  const omnivoiceProviderReachable = omniHealth.reachable
  const omnivoiceProviderAvailable = omniHealth.generationReady
  const omnivoiceTtsAvailable = omnivoiceProviderAvailable
  const omnivoiceBackendReachable = omnivoiceProviderReachable
  const anyProviderAvailable = openAiProviderAvailable || omnivoiceProviderAvailable
  const providerTtsAvailable = profile
    ? Boolean(
        (profileCanUseOmniVoice(profile) && omnivoiceProviderAvailable) ||
          (profileCanUseProvider(profile) && openAiProviderAvailable),
      )
    : anyProviderAvailable

  let currentPreviewMode: VoicePreviewMode = "unavailable"
  let selectedProvider: TtsProviderType = "unavailable"
  let fallbackReason: string | null = null
  if (profile) {
    if (profileCanUseOmniVoice(profile) && omnivoiceTtsAvailable) {
      currentPreviewMode = "provider-tts"
      selectedProvider = "omnivoice"
    } else if (profileCanUseProvider(profile) && openaiTtsAvailable) {
      currentPreviewMode = "provider-tts"
      selectedProvider = "openai"
    } else if (nativeAndroidTtsAvailable && profile.availability !== "unavailable") {
      currentPreviewMode = "native-android"
      selectedProvider = "android-native"
    } else if (browserSpeechSupported && profile.availability !== "unavailable") {
      currentPreviewMode = "browser-speech"
      selectedProvider = "browser-speech"
    }
    if (
      currentPreviewMode !== "provider-tts" &&
      profile.availability !== "unavailable" &&
      (profile.provider === "omnivoice" || profile.provider === "openai")
    ) {
      fallbackReason = providerFallbackReason(profile, {
        openaiTtsAvailable,
        omnivoiceBackendConfigured,
        omnivoiceTtsAvailable,
        remoteBackendConfigured,
      })
    }
  }

  let activeProvider: TtsProviderType = "unavailable"
  if (currentPreviewMode === "provider-tts") activeProvider = profile?.provider === "omnivoice" ? "omnivoice" : "openai"
  else if (currentPreviewMode === "native-android") activeProvider = "android-native"
  else if (currentPreviewMode === "browser-speech") activeProvider = "browser-speech"

  return {
    browserSpeechSupported,
    providerTtsAvailable,
    openaiTtsAvailable,
    omnivoiceTtsAvailable,
    selectedProvider,
    openAiProviderAvailable,
    openAiBackendConfigured,
    openAiBackendReachable,
    omnivoiceProviderConfigured,
    omnivoiceProviderReachable,
    omnivoiceProviderAvailable,
    anyProviderAvailable,
    nativeAndroidTtsAvailable,
    nativeAndroidVoiceCount: nativeVoices.length,
    selectedAndroidVoiceName: null,
    remoteBackendConfigured,
    currentPreviewMode,
    activeProvider,
    omnivoiceBackendConfigured,
    omnivoiceBackendReachable,
    fallbackReason,
  }
}

function providerFallbackReason(
  profile: VoiceProfile,
  state: {
    openaiTtsAvailable: boolean
    omnivoiceBackendConfigured: boolean
    omnivoiceTtsAvailable: boolean
    remoteBackendConfigured: boolean
  },
) {
  if (profile.provider === "omnivoice") {
    if (!state.omnivoiceBackendConfigured) {
      return "OmniVoice profile selected, but NEXT_PUBLIC_OMNIVOICE_BASE_URL is not configured."
    }
    if (!state.omnivoiceTtsAvailable) {
      return "OmniVoice profile selected, but the OmniVoice backend health check is not passing."
    }
    return "OmniVoice profile selected, but it is missing required OmniVoice metadata."
  }
  if (profile.provider === "openai") {
    if (!state.remoteBackendConfigured) {
      return "OpenAI provider profile selected, but NEXT_PUBLIC_NEO_BACKEND_BASE_URL is not configured for this runtime."
    }
    if (!state.openaiTtsAvailable) {
      return "OpenAI provider profile selected, but the backend is unreachable or OPENAI_API_KEY is not configured."
    }
  }
  return null
}

// -----------------------------------------------------------------------------
// Managed audio + blob URL lifecycle
// -----------------------------------------------------------------------------

let currentAudio: HTMLAudioElement | null = null
let currentBlobUrl: string | null = null

function revokeCurrentBlobUrl() {
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl)
    currentBlobUrl = null
  }
}

function teardownProviderAudio() {
  if (currentAudio) {
    try {
      currentAudio.onplay = null
      currentAudio.onpause = null
      currentAudio.onended = null
      currentAudio.onerror = null
      currentAudio.pause()
      currentAudio.currentTime = 0
    } catch {
      // ignore audio teardown errors
    }
    currentAudio = null
  }
  revokeCurrentBlobUrl()
}

export interface ProviderAudioPlaybackOptions {
  payload: ProviderSpeechPayload
  volume: number
  voiceId?: string
  statusLabel?: string
  onStateChange?: (snapshot: VoicePlaybackSnapshot) => void
}

function startProviderAudio(options: ProviderAudioPlaybackOptions): {
  audio: HTMLAudioElement | null
  started: Promise<void>
} {
  teardownProviderAudio()
  if (typeof Audio === "undefined") {
    return {
      audio: null,
      started: Promise.reject(new Error("Audio playback is not available in this runtime.")),
    }
  }

  if (!options.payload.audioBase64.trim()) {
    return {
      audio: null,
      started: Promise.reject(new Error("Provider returned an empty audio payload.")),
    }
  }

  const blob = audioBase64ToBlob(options.payload.audioBase64, options.payload.mimeType)
  const url = URL.createObjectURL(blob)
  currentBlobUrl = url

  const audio = new Audio(url)
  audio.volume = Math.min(1, Math.max(0, options.volume))

  let resolveStarted!: () => void
  let rejectStarted!: (error: Error) => void
  let settled = false
  const started = new Promise<void>((resolve, reject) => {
    resolveStarted = resolve
    rejectStarted = reject
  })

  audio.onplay = () => {
    if (!settled) {
      settled = true
      resolveStarted()
    }
    const providerName = options.payload.provider === "omnivoice" ? "OmniVoice" : "OpenAI provider"
    options.onStateChange?.({
      state: "playing",
      source: "provider",
      voiceId: options.voiceId,
      message: options.statusLabel ??
        (options.voiceId
          ? `Playing ${providerName} voice: ${options.payload.providerVoiceId ?? options.voiceId}`
          : `Playing ${providerName} voice`),
    })
  }
  audio.onpause = () => {
    if (!currentAudio || currentAudio.ended) return
    options.onStateChange?.({
      state: "paused",
      source: "provider",
      voiceId: options.voiceId,
      message: "PROVIDER AUDIO PAUSED",
    })
  }
  audio.onended = () => {
    options.onStateChange?.({
      state: "ended",
      source: "provider",
      voiceId: options.voiceId,
      message: "PROVIDER AUDIO ENDED",
    })
    if (currentAudio === audio) {
      currentAudio = null
      revokeCurrentBlobUrl()
    }
  }
  audio.onerror = () => {
    const error = new Error("Playback failed: provider audio element reported an error.")
    if (!settled) {
      settled = true
      rejectStarted(error)
    }
    options.onStateChange?.({
      state: "error",
      source: "provider",
      voiceId: options.voiceId,
      message: error.message,
    })
    if (currentAudio === audio) {
      currentAudio = null
      revokeCurrentBlobUrl()
    }
  }

  currentAudio = audio
  audio.play().catch((error) => {
    const message = error instanceof Error ? error.message : "Provider playback blocked by browser."
    const playbackError = new Error(`Playback failed: ${message}`)
    if (!settled) {
      settled = true
      rejectStarted(playbackError)
    }
    options.onStateChange?.({
      state: "error",
      source: "provider",
      voiceId: options.voiceId,
      message: playbackError.message,
    })
    if (currentAudio === audio) {
      currentAudio = null
      revokeCurrentBlobUrl()
    }
  })

  return { audio, started }
}

/**
 * Play a generated provider audio payload. Owns the blob URL — it is revoked
 * on the next play, on `stopVoicePreview()`, or when the audio ends/errors.
 */
export function playProviderAudio(options: ProviderAudioPlaybackOptions) {
  const playback = startProviderAudio(options)
  playback.started.catch(() => undefined)
  return playback.audio
}

/** Get the active provider audio element, if any (for replay/seek UI). */
export function getActiveProviderAudio(): HTMLAudioElement | null {
  return currentAudio
}

// -----------------------------------------------------------------------------
// Unified preview + control surface
// -----------------------------------------------------------------------------

/**
 * Drive a voice preview. With mode="auto" the runtime picks the best path:
 *   1. provider-tts when the profile is provider-ready AND the backend +
 *      provider key are configured AND reachable
 *   2. browser-speech when the Web Speech API is supported
 *   3. unavailable otherwise (returns ok:false with a truthful error)
 *
 * The browser-speech path executes locally; the provider-tts path issues a
 * POST through the Phase 1 backend transport and plays the returned audio
 * through the managed audio element above.
 */
export async function previewVoice(
  request: VoicePreviewRequest,
): Promise<VoicePreviewResult> {
  const desiredMode = request.mode ?? "auto"
  const qualityPreference: VoiceQualityPreference =
    request.qualityPreference ?? "prefer-high-quality"
  const capabilities = await getVoiceRuntimeCapabilities(request.profile)
  const profileProvider = request.profile.provider ?? "fallback"
  logVoicePreview("attempt", {
    selectedProfileId: request.profile.id,
    provider: profileProvider,
    requestedRuntimeMode: desiredMode,
    resolvedRuntimeMode: capabilities.currentPreviewMode,
    providerVoiceId: request.profile.providerVoiceId ?? null,
    fallbackReason: capabilities.fallbackReason,
  })

  if (request.profile.availability === "unavailable") {
    request.onStateChange?.({
      state: "error",
      source: "unavailable",
      voiceId: request.profile.id,
      message: "VOICE PREVIEW UNAVAILABLE",
    })
    logVoicePreview("failure", {
      selectedProfileId: request.profile.id,
      provider: profileProvider,
      requestedRuntimeMode: desiredMode,
      resolvedRuntimeMode: "unavailable",
      fallbackReason: "Voice marked unavailable.",
    })
    return { mode: "unavailable", ok: false, error: "Voice marked unavailable." }
  }

  // Quality preference gate: when the user has opted to stay on the local
  // fallback engine, we silently downgrade an "auto" decision that would
  // otherwise pick provider TTS. Explicit `mode: "provider-tts"` still
  // honors the caller — the setting is a preference for `auto` routing,
  // not a hard prohibition.
  const autoPreferredMode: VoicePreviewMode =
    qualityPreference === "fallback-only" && capabilities.currentPreviewMode === "provider-tts"
      ? capabilities.nativeAndroidTtsAvailable
        ? "native-android"
        : capabilities.browserSpeechSupported
          ? "browser-speech"
          : "unavailable"
      : capabilities.currentPreviewMode

  if (
    desiredMode === "auto" &&
    autoPreferredMode !== "provider-tts" &&
    (request.profile.provider === "omnivoice" || request.profile.provider === "openai") &&
    capabilities.fallbackReason
  ) {
    logVoicePreview("fallback", {
      selectedProfileId: request.profile.id,
      provider: profileProvider,
      requestedRuntimeMode: desiredMode,
      resolvedRuntimeMode: autoPreferredMode,
      providerVoiceId: request.profile.providerVoiceId ?? null,
      fallbackReason: capabilities.fallbackReason,
    })
    request.onStateChange?.({
      state: "preparing",
      source: "unavailable",
      voiceId: request.profile.id,
      message: `Provider unavailable: ${capabilities.fallbackReason}`,
    })
  }

  // Provider-tts path
  if (
    desiredMode === "provider-tts" ||
    (desiredMode === "auto" && autoPreferredMode === "provider-tts")
  ) {
    if (!capabilities.providerTtsAvailable) {
      const error = capabilities.fallbackReason ??
        (capabilities.remoteBackendConfigured
          ? "Provider TTS reachable but not configured."
          : "Provider TTS is not available in this runtime.")
      request.onStateChange?.({
        state: "error",
        source: "unavailable",
        voiceId: request.profile.id,
        message: `Provider unavailable: ${error}`,
      })
      logVoicePreview("failure", {
        selectedProfileId: request.profile.id,
        provider: profileProvider,
        requestedRuntimeMode: desiredMode,
        resolvedRuntimeMode: "unavailable",
        providerVoiceId: request.profile.providerVoiceId ?? null,
        fallbackReason: error,
      })
      return { mode: "unavailable", ok: false, error, fallbackReason: error }
    }
    return previewViaProvider(request)
  }

  // Native Android TextToSpeech path — the reliable local preview route for the Android app.
  if (
    desiredMode === "native-android" ||
    (desiredMode === "auto" && autoPreferredMode === "native-android")
  ) {
    if (!capabilities.nativeAndroidTtsAvailable) {
      const error = "Android TTS engine is unavailable or not ready."
      request.onStateChange?.({
        state: "error",
        source: "unavailable",
        voiceId: request.profile.id,
        message: `Android TTS unavailable: ${error}`,
      })
      return { mode: "unavailable", ok: false, error }
    }
    return previewViaNativeAndroidTts(request)
  }

  // Browser-speech path
  if (
    desiredMode === "browser-speech" ||
    (desiredMode === "auto" && autoPreferredMode === "browser-speech")
  ) {
    if (!capabilities.browserSpeechSupported) {
      const error = "Browser SpeechSynthesis is not supported in this WebView."
      request.onStateChange?.({
        state: "error",
        source: "unavailable",
        voiceId: request.profile.id,
        message: "BROWSER SPEECH UNAVAILABLE IN THIS WEBVIEW",
      })
      return { mode: "unavailable", ok: false, error }
    }
    teardownProviderAudio()
    const ok = await speakWithBrowserSpeech({
      profile: request.profile,
      text: request.text,
      params: request.params,
      personalityId: request.personalityId,
      intent: request.intent,
      onStateChange: request.onStateChange,
    })
    if (ok) {
      logVoicePreview("success", {
        selectedProfileId: request.profile.id,
        provider: profileProvider,
        requestedRuntimeMode: desiredMode,
        resolvedRuntimeMode: "browser-speech",
        fallbackReason: capabilities.fallbackReason,
      })
    } else {
      logVoicePreview("failure", {
        selectedProfileId: request.profile.id,
        provider: profileProvider,
        requestedRuntimeMode: desiredMode,
        resolvedRuntimeMode: "browser-speech",
        fallbackReason: capabilities.fallbackReason,
      })
    }
    return {
      mode: "browser-speech",
      ok,
      error: ok ? undefined : "Playback failed: browser speech preview failed.",
      fallbackReason: capabilities.fallbackReason,
    }
  }

  request.onStateChange?.({
    state: "error",
    source: "unavailable",
    voiceId: request.profile.id,
    message: `VOICE PREVIEW UNAVAILABLE: ${capabilities.fallbackReason ?? "No provider, Android TTS, or browser speech engine is available."}`,
  })
  logVoicePreview("failure", {
    selectedProfileId: request.profile.id,
    provider: profileProvider,
    requestedRuntimeMode: desiredMode,
    resolvedRuntimeMode: "unavailable",
    providerVoiceId: request.profile.providerVoiceId ?? null,
    fallbackReason: capabilities.fallbackReason,
  })
  return {
    mode: "unavailable",
    ok: false,
    error: capabilities.fallbackReason ?? "No provider, Android TTS, or browser speech engine is available.",
    fallbackReason: capabilities.fallbackReason,
  }
}

async function previewViaNativeAndroidTts(
  request: VoicePreviewRequest,
): Promise<VoicePreviewResult> {
  const capabilities = await getVoiceRuntimeCapabilities(request.profile)
  stopBrowserSpeech()
  teardownProviderAudio()
  request.onStateChange?.({
    state: "preparing",
    source: "native-android",
    voiceId: request.profile.id,
    message: capabilities.fallbackReason
      ? `Provider unavailable: ${capabilities.fallbackReason}. Preparing Android TTS fallback...`
      : "Preparing Android TTS fallback...",
  })

  const result = await speakWithAndroidNativeTts({
    text: request.text.trim() || request.profile.sampleLine,
    profile: request.profile,
    params: request.params,
    personalityId: request.personalityId,
    intent: request.intent,
  }).catch((error): { ok: false; message: string; voiceName?: string | null } => ({
    ok: false,
    message: error instanceof Error ? error.message : "Android TTS preview failed.",
  }))

  if (!result.ok) {
    const error = result.message ?? "Android TTS preview failed."
    request.onStateChange?.({
      state: "error",
      source: "native-android",
      voiceId: request.profile.id,
      message: `Playback failed: ${error}`,
    })
    logVoicePreview("failure", {
      selectedProfileId: request.profile.id,
      provider: request.profile.provider ?? "fallback",
      requestedRuntimeMode: "native-android",
      resolvedRuntimeMode: "native-android",
      fallbackReason: capabilities.fallbackReason,
      providerVoiceId: request.profile.providerVoiceId ?? null,
      error,
    })
    return { mode: "native-android", ok: false, error }
  }

  // Surface the exact native voice name in the status — "PLAYING ANDROID TTS
  // VOICE: en-us-x-..." — so the user can verify which device voice was
  // actually used and tell whether multiple profiles collapse to the same one.
  const resolvedName = result.voiceName ?? null
  const message = resolvedName
    ? `Playing Android device TTS fallback: ${resolvedName}`
    : "Playing Android device TTS fallback: shared device voice"
  request.onStateChange?.({
    state: "playing",
    source: "native-android",
    voiceId: request.profile.id,
    message,
  })
  logVoicePreview("success", {
    selectedProfileId: request.profile.id,
    provider: request.profile.provider ?? "fallback",
    requestedRuntimeMode: "native-android",
    resolvedRuntimeMode: "native-android",
    providerVoiceId: request.profile.providerVoiceId ?? null,
    selectedAndroidVoiceName: resolvedName,
    fallbackReason: capabilities.fallbackReason,
  })
  return { mode: "native-android", ok: true, fallbackReason: capabilities.fallbackReason }
}

async function previewViaProvider(
  request: VoicePreviewRequest,
): Promise<VoicePreviewResult> {
  const capabilities = await getVoiceRuntimeCapabilities(request.profile)
  stopBrowserSpeech()
  request.onStateChange?.({
    state: "preparing",
    source: "provider",
    voiceId: request.profile.id,
    message: "Preparing provider audio...",
  })

  if (request.profile.provider === "omnivoice") {
    try {
      const health = await checkOmniVoiceHealth(true)
      if (!health.generationReady) {
        const message = health.error ?? "OmniVoice /health is not ready."
        request.onStateChange?.({
          state: "error",
          source: "provider",
          voiceId: request.profile.id,
          message: `Provider unavailable: ${message}`,
        })
        logVoicePreview("failure", {
          selectedProfileId: request.profile.id,
          provider: "omnivoice",
          requestedRuntimeMode: "provider-tts",
          resolvedRuntimeMode: "unavailable",
          providerEndpointUsed: health.baseUrl ? `${health.baseUrl}/health` : null,
          providerVoiceId: request.profile.providerVoiceId ?? request.profile.id,
          fallbackReason: message,
        })
        return { mode: "provider-tts", ok: false, error: message, fallbackReason: message }
      }
      const payload = await generateOmniVoiceTts({
        voiceId: request.profile.providerVoiceId ?? request.profile.id,
        text: request.text,
        mode: request.profile.omnivoiceMode ?? "design",
        refAudioId: request.profile.omnivoiceRefAudioId,
        refText: request.profile.omnivoiceRefText,
        instruct: request.profile.omnivoiceInstruct,
        languageId: request.profile.languageId,
        speed: paramsToOmniVoiceSpeed(request.params),
      })
      const playback = startProviderAudio({
        payload,
        volume: Math.min(1, Math.max(0, request.params.volume / 100)),
        voiceId: request.profile.id,
        statusLabel: `Playing OmniVoice profile: ${request.profile.providerVoiceId ?? request.profile.id}`,
        onStateChange: request.onStateChange,
      })
      await playback.started
      logVoicePreview("success", {
        selectedProfileId: request.profile.id,
        provider: "omnivoice",
        requestedRuntimeMode: "provider-tts",
        resolvedRuntimeMode: "provider-tts",
        providerEndpointUsed: `${health.baseUrl}/tts`,
        providerVoiceId: payload.providerVoiceId,
        fallbackReason: null,
      })
      return { mode: "provider-tts", ok: true, payload }
    } catch (error) {
      const message = error instanceof Error ? error.message : "OmniVoice TTS request failed."
      request.onStateChange?.({ state: "error", source: "provider", voiceId: request.profile.id, message: `Playback failed: ${message}` })
      logVoicePreview("failure", {
        selectedProfileId: request.profile.id,
        provider: "omnivoice",
        requestedRuntimeMode: "provider-tts",
        resolvedRuntimeMode: "provider-tts",
        providerVoiceId: request.profile.providerVoiceId ?? request.profile.id,
        fallbackReason: capabilities.fallbackReason,
        error: message,
      })
      return { mode: "provider-tts", ok: false, error: message }
    }
  }

  const transport = await postTtsPreview({
    voiceId: request.profile.id,
    text: request.text,
    params: request.params,
    personalityId: request.personalityId,
    intent: request.intent,
  })

  if (!transport.payload) {
    const error = transport.error ?? "Provider TTS request failed."
    request.onStateChange?.({
      state: "error",
      source: "provider",
      voiceId: request.profile.id,
      message: `Provider unavailable: ${error}`,
    })
    logVoicePreview("failure", {
      selectedProfileId: request.profile.id,
      provider: "openai",
      requestedRuntimeMode: "provider-tts",
      resolvedRuntimeMode: "provider-tts",
      providerEndpointUsed: "/api/tts",
      providerVoiceId: request.profile.providerVoiceId ?? null,
      fallbackReason: error,
    })
    return { mode: "provider-tts", ok: false, error }
  }

  const volume = Math.min(1, Math.max(0, request.params.volume / 100))
  const playback = startProviderAudio({
    payload: transport.payload,
    volume,
    voiceId: request.profile.id,
    statusLabel: `Playing OpenAI provider voice: ${transport.payload.providerVoiceId ?? request.profile.providerVoiceId ?? request.profile.id}`,
    onStateChange: request.onStateChange,
  })
  try {
    await playback.started
  } catch (error) {
    const message = error instanceof Error ? error.message : "Playback failed: provider audio did not start."
    logVoicePreview("failure", {
      selectedProfileId: request.profile.id,
      provider: "openai",
      requestedRuntimeMode: "provider-tts",
      resolvedRuntimeMode: "provider-tts",
      providerEndpointUsed: "/api/tts",
      providerVoiceId: transport.payload.providerVoiceId ?? request.profile.providerVoiceId ?? null,
      fallbackReason: capabilities.fallbackReason,
      error: message,
    })
    return { mode: "provider-tts", ok: false, error: message }
  }

  logVoicePreview("success", {
    selectedProfileId: request.profile.id,
    provider: "openai",
    requestedRuntimeMode: "provider-tts",
    resolvedRuntimeMode: "provider-tts",
    providerEndpointUsed: "/api/tts",
    providerVoiceId: transport.payload.providerVoiceId ?? request.profile.providerVoiceId ?? null,
    fallbackReason: null,
  })

  return { mode: "provider-tts", ok: true, payload: transport.payload }
}

/**
 * Stop any active preview — browser speech utterance, provider audio element,
 * or both. Always revokes any outstanding blob URL.
 */
export function stopVoicePreview() {
  stopBrowserSpeech()
  teardownProviderAudio()
  void stopAndroidNativeTts()
}

export function pauseVoicePreview() {
  if (currentAudio && !currentAudio.paused) {
    currentAudio.pause()
    return true
  }
  return pauseBrowserSpeech()
}

export function resumeVoicePreview() {
  if (currentAudio && currentAudio.paused) {
    currentAudio.play().catch(() => undefined)
    return true
  }
  return resumeBrowserSpeech()
}

// -----------------------------------------------------------------------------
// Generation-only entry (for "GENERATE PROVIDER AUDIO" save/share workflows)
// -----------------------------------------------------------------------------

export interface GenerateProviderAudioResult {
  ok: boolean
  payload?: ProviderSpeechPayload
  error?: string
}

export async function generateProviderAudio(request: {
  voiceId: string
  text: string
  params: VoiceParams
  personalityId?: string
  intent?: SpeechIntent
}): Promise<GenerateProviderAudioResult> {
  const profile = getVoiceProfile(request.voiceId)
  if (profile.provider === "omnivoice") {
    const health = await checkOmniVoiceHealth()
    if (!health.generationReady) return { ok: false, error: health.error ?? "OmniVoice engine not installed/configured" }
    try {
      const payload = await generateOmniVoiceTts({
        voiceId: request.voiceId,
        text: request.text,
        mode: profile.omnivoiceMode ?? "design",
        refAudioId: profile.omnivoiceRefAudioId,
        refText: profile.omnivoiceRefText,
        instruct: profile.omnivoiceInstruct,
        languageId: profile.languageId,
        speed: paramsToOmniVoiceSpeed(request.params),
      })
      return { ok: true, payload }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "OmniVoice request failed." }
    }
  }

  const transport = await postTtsPreview(request)
  if (transport.payload) {
    return { ok: true, payload: transport.payload }
  }
  return {
    ok: false,
    error: transport.error ?? "Provider TTS request failed.",
  }
}

// -----------------------------------------------------------------------------
// Re-exports kept stable for existing callers
// -----------------------------------------------------------------------------

export { downloadAudio, shareOrSaveAudio } from "./ttsClient"

// -----------------------------------------------------------------------------
// Truth labels
// -----------------------------------------------------------------------------

/**
 * User-facing label describing how the current voice profile will actually be
 * previewed in the current runtime. Strictly truthful: it composes both the
 * profile's intrinsic availability AND the live runtime capabilities.
 */
/**
 * Truthful runtime label for the *currently selected* profile. Composes the
 * profile's authored timbre source with the live runtime capabilities so the
 * UI never overclaims uniqueness.
 *
 * Provider-ready is no longer treated as "provider distinct" by itself —
 * only the canonical owner of a provider voice id is. See
 * `lib/voice/voiceUniqueness.ts` for the full classification.
 */
export function getProfileTruthLabel(
  profile: VoiceProfile,
  capabilities: VoiceRuntimeCapabilities,
): string {
  // Delegated to the uniqueness module so card badge, detail label, and
  // Voice screen all share one truth source.
  return getVoiceTruthLabel(profile, capabilities)
}
