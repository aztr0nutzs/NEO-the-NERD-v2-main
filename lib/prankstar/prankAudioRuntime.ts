"use client"

import type {
  PrankAudioListener,
  PrankAudioState,
  PrankSound,
} from "./types"

/**
 * HTMLAudio-based runtime for Prankstar sound assets. Intentionally distinct
 * from NEO's voice/TTS subsystem — this plays bundled audio files only.
 *
 * Single-track by default: starting a new sound stops the current one so
 * tapping rapidly through the library cannot pile up overlapping clips.
 */
class PrankAudioRuntime {
  private audio: HTMLAudioElement | null = null
  private state: PrankAudioState = {
    status: "idle",
    currentSoundId: null,
    error: null,
  }
  private listeners = new Set<PrankAudioListener>()

  getState(): PrankAudioState {
    return this.state
  }

  subscribe(listener: PrankAudioListener): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private setState(next: Partial<PrankAudioState>) {
    this.state = { ...this.state, ...next }
    for (const l of this.listeners) l(this.state)
  }

  private teardownAudio() {
    if (!this.audio) return
    try {
      this.audio.pause()
      this.audio.src = ""
      this.audio.load()
    } catch {
      // Some browsers throw on reassigning src after error; safe to ignore.
    }
    this.audio.onended = null
    this.audio.onerror = null
    this.audio.onplaying = null
    this.audio = null
  }

  stop() {
    this.teardownAudio()
    if (this.state.status !== "idle") {
      this.setState({ status: "idle", currentSoundId: null, error: null })
    }
  }

  async play(sound: PrankSound): Promise<void> {
    if (typeof window === "undefined") return
    this.teardownAudio()

    const audio = new Audio(sound.assetPath)
    audio.preload = "auto"
    audio.loop = sound.loopable
    this.audio = audio

    this.setState({
      status: "loading",
      currentSoundId: sound.id,
      error: null,
    })

    audio.onplaying = () => {
      if (this.audio === audio) {
        this.setState({ status: "playing" })
      }
    }
    audio.onended = () => {
      if (this.audio === audio) {
        this.teardownAudio()
        this.setState({ status: "idle", currentSoundId: null, error: null })
      }
    }
    audio.onerror = () => {
      if (this.audio !== audio) return
      const code = audio.error?.code
      const msg =
        code === 4
          ? `Asset not found or unsupported: ${sound.sourcePath}`
          : `Playback failed (code ${code ?? "?"}) for ${sound.sourcePath}`
      this.teardownAudio()
      this.setState({
        status: "error",
        currentSoundId: sound.id,
        error: msg,
      })
    }

    try {
      await audio.play()
    } catch (err) {
      if (this.audio !== audio) return
      const message =
        err instanceof Error ? err.message : "Unknown playback failure"
      this.teardownAudio()
      this.setState({
        status: "error",
        currentSoundId: sound.id,
        error: message,
      })
    }
  }
}

export const prankAudioRuntime = new PrankAudioRuntime()
export type { PrankAudioState }
