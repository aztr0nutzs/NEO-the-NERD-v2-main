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
import type { VoiceProfile } from "./types"
import {
  isBrowserSpeechSupported,
  pauseBrowserSpeech,
  resumeBrowserSpeech,
  speakWithBrowserSpeech,
  stopBrowserSpeech,
} from "./browserSpeechAdapter"
import type { VoicePlaybackSnapshot } from "./voicePlayback"
import { getVoiceProviderConfig, audioBase64ToBlob, downloadAudio, shareOrSaveAudio } from "./ttsClient"
import { generateOmniVoiceTts, paramsToOmniVoiceSpeed } from "./omnivoiceClient"
import { postTtsPreview } from "@/lib/runtime/backend-client"
import {
  checkBackendAvailability,
  getCachedBackendHealth,
} from "@/lib/runtime/backend-health"
import { getBackendConfig } from "@/lib/runtime/backend-config"
import {
  getAndroidNativeTtsAvailability,
  getAndroidNativeVoices,
  isAndroidNativeTtsRuntime,
  selectAndroidNativeVoiceName,
  speakWithAndroidNativeTts,
  stopAndroidNativeTts,
} from "./native-tts-bridge"
import { getVoiceTruthLabel } from "./voiceUniqueness"
import type { SpeechIntent } from "./speechIntent"

// -----------------------------------------------------------------------------
// Capability model
// -----------------------------------------------------------------------------

export type VoicePreviewMode = "browser-speech" | "native-android" | "provider-tts" | "unavailable"

export type TtsProviderType = "openai" | "omnivoice" | "android-native" | "browser-speech" | "unavailable"

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
}

export interface ProviderSpeechPayload {
  audioBase64: string
  fileName: string
  mimeType: string
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
}

// -----------------------------------------------------------------------------
// Capability resolution
// -----------------------------------------------------------------------------

function profileCanUseProvider(profile: VoiceProfile) {
  if (profile.availability !== "provider-ready") return false
  return Boolean(getVoiceProviderConfig(profile.id)?.available)
}

function providerTtsAvailableForProfile(
  profile: VoiceProfile | undefined,
  input: {
    remoteBackendConfigured: boolean
    providerConfigured: boolean
    omnivoiceBackendConfigured: boolean
  },
) {
  if (profile?.provider === "omnivoice") {
    return input.omnivoiceBackendConfigured
  }
  return input.remoteBackendConfigured && input.providerConfigured
}

export function getVoiceProfileCapabilities(profile: VoiceProfile) {
  return {
    providerReady: profileCanUseProvider(profile),
    providerVoiceId: getVoiceProviderConfig(profile.id)?.providerVoiceId ?? null,
    supports: getVoiceProviderConfig(profile.id)?.supports ?? {
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
  const [config, health, nativeTts, nativeVoices] = await Promise.all([
    getBackendConfig().catch(() => null),
    checkBackendAvailability().catch(() => null),
    getAndroidNativeTtsAvailability().catch(() => ({ available: false, ready: false, platform: "unknown" })),
    getAndroidNativeVoices().catch(() => []),
  ])
  const browserSpeechSupported = isBrowserSpeechSupported()
  const omnivoiceBaseUrl = process.env.NEXT_PUBLIC_OMNIVOICE_BASE_URL?.trim() ?? ""
  const omnivoiceBackendConfigured = Boolean(omnivoiceBaseUrl)
  const omnivoiceBackendReachable = omnivoiceBackendConfigured
  const nativeAndroidTtsAvailable = Boolean(nativeTts.available && nativeTts.ready)
  const remoteBackendConfigured = Boolean(config && config.mode !== "unavailable")
  const providerConfigured = Boolean(
    health?.state === "available" &&
      health.providerStatus?.providerConfigured,
  )
  const providerTtsAvailable = providerTtsAvailableForProfile(profile, {
    remoteBackendConfigured,
    providerConfigured,
    omnivoiceBackendConfigured,
  })
  const selectedAndroidVoiceName =
    nativeAndroidTtsAvailable && profile ? await selectAndroidNativeVoiceName(profile) : null

  let currentPreviewMode: VoicePreviewMode = "unavailable"
  if (profile) {
    if (profileCanUseProvider(profile) && providerTtsAvailable) {
      currentPreviewMode = "provider-tts"
    } else if (nativeAndroidTtsAvailable && profile.availability !== "unavailable") {
      currentPreviewMode = "native-android"
    } else if (browserSpeechSupported && profile.availability !== "unavailable") {
      currentPreviewMode = "browser-speech"
    } else {
      currentPreviewMode = "unavailable"
    }
  } else if (providerTtsAvailable) {
    currentPreviewMode = "provider-tts"
  } else if (nativeAndroidTtsAvailable) {
    currentPreviewMode = "native-android"
  } else if (browserSpeechSupported) {
    currentPreviewMode = "browser-speech"
  }

  let activeProvider: TtsProviderType = "unavailable"
  if (currentPreviewMode === "provider-tts") activeProvider = profile?.provider === "omnivoice" ? "omnivoice" : "openai"
  else if (currentPreviewMode === "native-android") activeProvider = "android-native"
  else if (currentPreviewMode === "browser-speech") activeProvider = "browser-speech"

  return {
    browserSpeechSupported,
    providerTtsAvailable,
    nativeAndroidTtsAvailable,
    nativeAndroidVoiceCount: nativeVoices.length,
    selectedAndroidVoiceName,
    remoteBackendConfigured,
    currentPreviewMode,
    activeProvider,
    omnivoiceBackendConfigured,
    omnivoiceBackendReachable,
  }
}

export function getCachedVoiceRuntimeCapabilities(
  profile?: VoiceProfile,
): VoiceRuntimeCapabilities {
  const health = getCachedBackendHealth()
  const browserSpeechSupported = isBrowserSpeechSupported()
  const omnivoiceBaseUrl = process.env.NEXT_PUBLIC_OMNIVOICE_BASE_URL?.trim() ?? ""
  const omnivoiceBackendConfigured = Boolean(omnivoiceBaseUrl)
  const omnivoiceBackendReachable = omnivoiceBackendConfigured
  const remoteBackendConfigured = health.mode !== "unavailable"
  const nativeAndroidTtsAvailable = isAndroidNativeTtsRuntime()
  const providerConfigured = Boolean(
    health.state === "available" &&
      health.providerStatus?.providerConfigured,
  )
  const providerTtsAvailable = providerTtsAvailableForProfile(profile, {
    remoteBackendConfigured,
    providerConfigured,
    omnivoiceBackendConfigured,
  })

  let currentPreviewMode: VoicePreviewMode = "unavailable"
  if (profile) {
    if (profileCanUseProvider(profile) && providerTtsAvailable) {
      currentPreviewMode = "provider-tts"
    } else if (nativeAndroidTtsAvailable && profile.availability !== "unavailable") {
      currentPreviewMode = "native-android"
    } else if (browserSpeechSupported && profile.availability !== "unavailable") {
      currentPreviewMode = "browser-speech"
    }
  }

  let activeProvider: TtsProviderType = "unavailable"
  if (currentPreviewMode === "provider-tts") activeProvider = profile?.provider === "omnivoice" ? "omnivoice" : "openai"
  else if (currentPreviewMode === "native-android") activeProvider = "android-native"
  else if (currentPreviewMode === "browser-speech") activeProvider = "browser-speech"

  return {
    browserSpeechSupported,
    providerTtsAvailable,
    nativeAndroidTtsAvailable,
    nativeAndroidVoiceCount: 0,
    selectedAndroidVoiceName: null,
    remoteBackendConfigured,
    currentPreviewMode,
    activeProvider,
    omnivoiceBackendConfigured,
    omnivoiceBackendReachable,
  }
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
  onStateChange?: (snapshot: VoicePlaybackSnapshot) => void
}

/**
 * Play a generated provider audio payload. Owns the blob URL — it is revoked
 * on the next play, on `stopVoicePreview()`, or when the audio ends/errors.
 */
export function playProviderAudio(options: ProviderAudioPlaybackOptions) {
  teardownProviderAudio()
  if (typeof Audio === "undefined") return null

  const blob = audioBase64ToBlob(options.payload.audioBase64, options.payload.mimeType)
  const url = URL.createObjectURL(blob)
  currentBlobUrl = url

  const audio = new Audio(url)
  audio.volume = Math.min(1, Math.max(0, options.volume))

  audio.onplay = () => {
    options.onStateChange?.({
      state: "playing",
      source: "provider",
      voiceId: options.voiceId,
      message: options.voiceId
        ? `PLAYING PROVIDER VOICE: ${options.voiceId.toUpperCase()}`
        : "PLAYING PROVIDER VOICE",
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
    options.onStateChange?.({
      state: "error",
      source: "provider",
      voiceId: options.voiceId,
      message: "PROVIDER PLAYBACK FAILED",
    })
    if (currentAudio === audio) {
      currentAudio = null
      revokeCurrentBlobUrl()
    }
  }

  currentAudio = audio
  audio.play().catch(() => {
    options.onStateChange?.({
      state: "error",
      source: "provider",
      voiceId: options.voiceId,
      message: "PROVIDER PLAYBACK BLOCKED BY BROWSER",
    })
    if (currentAudio === audio) {
      currentAudio = null
      revokeCurrentBlobUrl()
    }
  })
  return audio
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

  if (request.profile.availability === "unavailable") {
    request.onStateChange?.({
      state: "error",
      source: "unavailable",
      voiceId: request.profile.id,
      message: "VOICE PREVIEW UNAVAILABLE",
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

  // Provider-tts path
  if (
    desiredMode === "provider-tts" ||
    (desiredMode === "auto" && autoPreferredMode === "provider-tts")
  ) {
    if (!capabilities.providerTtsAvailable) {
      const error = capabilities.remoteBackendConfigured
        ? "Provider TTS reachable but not configured."
        : "Provider TTS is not available in this runtime."
      request.onStateChange?.({
        state: "error",
        source: "unavailable",
        voiceId: request.profile.id,
        message: error.toUpperCase(),
      })
      return { mode: "unavailable", ok: false, error }
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
        message: "ANDROID TTS UNAVAILABLE",
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
    return { mode: "browser-speech", ok }
  }

  request.onStateChange?.({
    state: "error",
    source: "unavailable",
    voiceId: request.profile.id,
    message: "NO PREVIEW PATH AVAILABLE",
  })
  return {
    mode: "unavailable",
    ok: false,
    error: "Neither browser speech nor provider TTS is available.",
  }
}

async function previewViaNativeAndroidTts(
  request: VoicePreviewRequest,
): Promise<VoicePreviewResult> {
  stopBrowserSpeech()
  teardownProviderAudio()
  request.onStateChange?.({
    state: "preparing",
    source: "native-android",
    voiceId: request.profile.id,
    message: "PREPARING ANDROID TTS PREVIEW",
  })

  const result = await speakWithAndroidNativeTts({
    text: request.text.trim() || request.profile.sampleLine,
    profile: request.profile,
    params: request.params,
    personalityId: request.personalityId,
    intent: request.intent,
  })

  if (!result.ok) {
    const error = result.message ?? "Android TTS preview failed."
    request.onStateChange?.({
      state: "error",
      source: "native-android",
      voiceId: request.profile.id,
      message: error.toUpperCase(),
    })
    return { mode: "native-android", ok: false, error }
  }

  // Surface the exact native voice name in the status — "PLAYING ANDROID TTS
  // VOICE: en-us-x-..." — so the user can verify which device voice was
  // actually used and tell whether multiple profiles collapse to the same one.
  const resolvedName = result.voiceName ?? null
  const message = resolvedName
    ? `PLAYING ANDROID TTS VOICE: ${resolvedName.toUpperCase()}`
    : "PLAYING SHARED FALLBACK DEVICE VOICE"
  request.onStateChange?.({
    state: "playing",
    source: "native-android",
    voiceId: request.profile.id,
    message,
  })
  return { mode: "native-android", ok: true }
}

async function previewViaProvider(
  request: VoicePreviewRequest,
): Promise<VoicePreviewResult> {
  stopBrowserSpeech()
  request.onStateChange?.({
    state: "preparing",
    source: "provider",
    voiceId: request.profile.id,
    message: "GENERATING PROVIDER AUDIO",
  })

  if (request.profile.provider === "omnivoice") {
    try {
      const payload = await generateOmniVoiceTts({
        voiceId: request.profile.id,
        text: request.text,
        mode: request.profile.omnivoiceMode ?? "design",
        refAudioId: request.profile.omnivoiceRefAudioId,
        refText: request.profile.omnivoiceRefText,
        instruct: request.profile.omnivoiceInstruct,
        languageId: request.profile.languageId,
        speed: paramsToOmniVoiceSpeed(request.params),
      })
      playProviderAudio({ payload, volume: Math.min(1, Math.max(0, request.params.volume / 100)), voiceId: request.profile.id, onStateChange: request.onStateChange })
      return { mode: "provider-tts", ok: true, payload }
    } catch (error) {
      const message = error instanceof Error ? error.message : "OmniVoice TTS request failed."
      request.onStateChange?.({ state: "error", source: "provider", voiceId: request.profile.id, message: message.toUpperCase() })
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
      message: error.toUpperCase(),
    })
    return { mode: "provider-tts", ok: false, error }
  }

  const volume = Math.min(1, Math.max(0, request.params.volume / 100))
  playProviderAudio({
    payload: transport.payload,
    volume,
    voiceId: request.profile.id,
    onStateChange: request.onStateChange,
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
