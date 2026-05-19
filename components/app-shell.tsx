"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useCallback, useEffect, useState } from "react"
import { useApp } from "@/lib/store"
import { AssistantStatusBar } from "./assistant-status-bar"
import { BottomDock } from "./bottom-dock"
import { MainScreen } from "./screens/main-screen"
import { ChatScreen } from "./screens/chat-screen"
import { VoicesScreen } from "./screens/voices-screen"
import { PersonalitiesScreen } from "./screens/personalities-screen"
import { GamesScreen } from "./screens/games-screen"
import { ControlsScreen } from "./screens/controls-screen"
import { NetworkScreen } from "./screens/network-screen"
import { LibraryScreen } from "./screens/library-screen"
import { PrankScreen } from "./screens/prank-screen"
import { PrankLibraryScreen } from "./screens/prank-library-screen"
import { PrankMessagesScreen } from "./screens/prank-messages-screen"
import { PrankTrapsScreen } from "./screens/prank-traps-screen"
import { PrankChaosScreen } from "./screens/prank-chaos-screen"
import { SettingsScreen } from "./screens/settings-screen"
import { SpeedTestScreen } from "./screens/speed-test-screen"
import { NeoBackgroundScene } from "./background/neo-background-scene"
import { BootSequenceOverlay } from "./boot/boot-sequence-overlay"
import { PersistentAvatarOrb } from "./avatar/persistent-avatar-orb"
import { OnboardingWizard } from "./onboarding/onboarding-wizard"

const SCREEN_MAP = {
  main: MainScreen,
  chat: ChatScreen,
  voices: VoicesScreen,
  personalities: PersonalitiesScreen,
  games: GamesScreen,
  controls: ControlsScreen,
  network: NetworkScreen,
  speed: SpeedTestScreen,
  library: LibraryScreen,
  prank: PrankScreen,
  prankLibrary: PrankLibraryScreen,
  prankMessages: PrankMessagesScreen,
  prankTraps: PrankTrapsScreen,
  prankChaos: PrankChaosScreen,
  settings: SettingsScreen,
} as const

export function AppShell() {
  const { screen, playAvatarReaction, settings } = useApp()
  const Active = SCREEN_MAP[screen]
  const showPersistentOrb = screen !== "main" && screen !== "network"
  // Once the boot video finishes (or fails), unmount the overlay entirely.
  // Keeping it mounted leaves an idle React subtree that — while invisible —
  // can hold onto a detached <video> element and its decoder buffers.
  const [bootMounted, setBootMounted] = useState(true)
  const handleBootComplete = useCallback(() => {
    playAvatarReaction("wakeup")
    setBootMounted(false)
  }, [playAvatarReaction])

  // Onboarding only shows once boot is offscreen so the cinematic intro plays
  // first. A failsafe timer also fires so that a failed boot (e.g. video error
  // on a headless device) does not block the wizard indefinitely. The window
  // is sized to match the boot overlay's own outer failsafe with a small
  // safety margin — it should rarely if ever fire because the overlay also
  // self-exits on stall/error.
  const [bootSettled, setBootSettled] = useState(false)
  useEffect(() => {
    if (!bootMounted) {
      setBootSettled(true)
      return
    }
    const timer = window.setTimeout(() => setBootSettled(true), 15_000)
    return () => window.clearTimeout(timer)
  }, [bootMounted])
  const showOnboarding = bootSettled && !settings.onboarding.completed
  const [onboardingDismissed, setOnboardingDismissed] = useState(false)
  const handleOnboardingClose = useCallback(() => {
    setOnboardingDismissed(true)
  }, [])

  return (
    <div className="relative isolate min-h-[100dvh] w-full overflow-x-hidden bg-transparent">
      {/* Background layers. The animated MP4 inside NeoBackgroundScene is
          gated by `videoEnabled` so it does not compete with the boot video
          for decoder slots on Android WebView. The static PNG poster keeps
          rendering throughout boot so the visual identity is preserved —
          the heavy MP4 simply fades in once the boot sequence has exited. */}
      <NeoBackgroundScene videoEnabled={!bootMounted} />
      {/*
        Content-column shade. Sits behind the main viewport and in front of
        the animated background. Width-bounded to the same max-w-2xl column
        used by <main>, so the background stays visible on the left and
        right gutters (preserving the NEO art) while the content area gets
        an extra darker substrate that makes text and HUD cards readable
        on bright frames. Opaque enough to win contrast, soft enough to keep
        the cyberpunk depth.
      */}
      <div className="pointer-events-none fixed inset-x-0 top-0 bottom-0 z-[1] flex justify-center">
        <div className="ps-content-shade h-full w-full max-w-2xl" />
      </div>
      <div className="pointer-events-none fixed inset-0 z-[2] ps-scanlines opacity-25" />

      <AssistantStatusBar />
      {showPersistentOrb && <PersistentAvatarOrb />}

      <main
        // Bottom padding reserves space for the fixed BottomDock (~5rem
        // dock content + 1rem container padding/border) PLUS the Android
        // safe-area gesture inset, with a comfortable buffer so the
        // last content card never sits beneath the dock's glass surface.
        className={`relative z-10 mx-auto w-full max-w-2xl pl-3 pt-2 pb-[calc(8.5rem+env(safe-area-inset-bottom))] ${
          // Reserve right-side runway on narrow phones when the persistent orb
          // is visible so header titles and right-aligned status pills do not
          // disappear under it. Tablet+ uses the standard right padding.
          showPersistentOrb ? "pr-[5.25rem] sm:pr-3" : "pr-3"
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
            transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <Active />
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomDock />
      {bootMounted && <BootSequenceOverlay onBootComplete={handleBootComplete} />}
      <OnboardingWizard
        open={showOnboarding && !onboardingDismissed}
        onClose={handleOnboardingClose}
      />
    </div>
  )
}
