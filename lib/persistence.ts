import type { PersistedAppState } from "./types"

export const STORAGE_KEY = "neo-the-nerd:app-state"
export const STORAGE_SCHEMA_VERSION = 1

async function getCapacitorPreferences() {
  if (typeof window === "undefined") return null
  try {
    const [{ Capacitor }, { Preferences }] = await Promise.all([
      import("@capacitor/core"),
      import("@capacitor/preferences"),
    ])
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
      return null
    }
    return { Preferences }
  } catch {
    return null
  }
}

export async function readStoredState() {
  const prefsModule = await getCapacitorPreferences()
  if (prefsModule) {
    const result = await prefsModule.Preferences.get({ key: STORAGE_KEY })
    return parseStoredState(result.value)
  }

  if (typeof window === "undefined") return null
  return parseStoredState(window.localStorage.getItem(STORAGE_KEY))
}

export async function writeStoredState(state: PersistedAppState) {
  const value = JSON.stringify(state)
  const prefsModule = await getCapacitorPreferences()
  if (prefsModule) {
    await prefsModule.Preferences.set({ key: STORAGE_KEY, value })
    return
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, value)
  }
}

export async function clearStoredState() {
  const prefsModule = await getCapacitorPreferences()
  if (prefsModule) {
    await prefsModule.Preferences.remove({ key: STORAGE_KEY })
    return
  }

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY)
  }
}

function parseStoredState(value: string | null): Partial<PersistedAppState> | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as unknown
    if (!parsed || typeof parsed !== "object") return null
    return migrateStoredState(parsed as Partial<PersistedAppState>)
  } catch {
    return null
  }
}

function migrateStoredState(state: Partial<PersistedAppState>) {
  if (!state.version) {
    return { ...state, version: STORAGE_SCHEMA_VERSION }
  }

  if (state.version === STORAGE_SCHEMA_VERSION) {
    return state
  }

  return { ...state, version: STORAGE_SCHEMA_VERSION }
}
