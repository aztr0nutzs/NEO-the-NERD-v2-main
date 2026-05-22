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

// Stage delay between boot unmount and the ambient background video being
// allowed to mount. Boot has already detached its source by this point so
// there is no decoder fight, but the avatar wakeup/idle pipeline is still
// negotiating with the Android WebView's media stack and the screen tree
// is hydrating — letting that settle for one or two frames before the
// heavier 5.5 MB ambient loop joins prevents a frame-time spike at handoff.
const POST_BOOT_BACKGROUND_DELAY_MS = 700

export function AppShell() {
  const { screen, playAvatarReaction, settings } = useApp()
  const Active = SCREEN_MAP[screen]
  const showPersistentOrb = screen !== "main" && screen !== "network"
  // Once the boot video finishes (or fails), unmount the overlay entirely.
  // Keeping it mounted leaves an idle React subtree that — while invisible —
  // can hold onto a detached <video> element and its decoder buffers.
  const [bootMounted, setBootMounted] = useState(true)
  // Staged media gate. Even after the boot overlay unmounts, the ambient
  // background <video> is held off for a short window so the active screen
  // tree (which mounts the avatar `<video>` element on the very next frame)
  // gets a clean decode slot first. Without this stagger the avatar video,
  // the ambient background video, and the screen's framer-motion entry
  // animation all wake up on the same frame — the exact "decoder stampede"
  // that was producing the residual boot-time stutter even after the boot
  // overlay itself had finished.
  const [mediaReady, setMediaReady] = useState(false)
  // `bgReady` flips true the moment the background <video> emits its first
  // `onPlaying` (or, in reduced-motion / decode-fail fallback, on the next
  // tick after the bg mounts). The persistent avatar orb's <video> mount is
  // gated on this so the WebView's H.264 slots are not contended by two
  // decoders on the same cold-start frame.
  const [bgReady, setBgReady] = useState(false)
  const handleBgReady = useCallback(() => setBgReady(true), [])
  const handleBootComplete = useCallback(() => {
    playAvatarReaction("wakeup")
    setBootMounted(false)
  }, [playAvatarReaction])

  useEffect(() => {
    if (bootMounted) return
    const timer = window.setTimeout(
      () => setMediaReady(true),
      POST_BOOT_BACKGROUND_DELAY_MS,
    )
    return () => window.clearTimeout(timer)
  }, [bootMounted])

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
          the heavy MP4 simply fades in once the boot sequence has exited
          AND the post-boot stagger window has elapsed. */}
      <NeoBackgroundScene videoEnabled={mediaReady} onReady={handleBgReady} />
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
      {/*
        The persistent avatar orb also mounts a <video> element for the
        idle/reaction avatar clips. Holding it back until boot unmounts
        prevents a second avatar decoder from competing with the boot
        intro. The default screen ("main") does not render the orb at all,
        but persisted state can restore a different screen at launch —
        so this gate is the only honest fix.
      */}
      {!bootMounted && bgReady && showPersistentOrb && <PersistentAvatarOrb />}

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
        {/*
          Hard gate on the active screen tree. The default screen is "main",
          which mounts RobotStage → NeoAvatarVideo → the 17 MB idle.mp4
          avatar clip. Mounting that tree behind the boot overlay forced the
          Android WebView to decode the avatar concurrently with the boot
          intro — the residual stutter root cause. We now refuse to mount
          ANY screen until the boot overlay has fully exited; the screen
          fades in via its own framer-motion entry animation immediately
          after, which preserves the cinematic handoff.
        */}
        {!bootMounted && (
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
        )}
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
