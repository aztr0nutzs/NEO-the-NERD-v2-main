/* eslint-disable @next/next/no-img-element -- Native picture/img keeps these fixed public art assets unoptimized and exact. */
import type { BackgroundMode } from "@/lib/types"

const PORTRAIT_BACKGROUND = "/images/neo/backgrounds/neo-background-portrait.png"
const SQUARE_BACKGROUND = "/images/neo/backgrounds/neo-background-square.png"

interface NeoBackgroundSceneProps {
  mode?: BackgroundMode
}

export function NeoBackgroundScene({ mode = "auto" }: NeoBackgroundSceneProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black" aria-hidden="true">
      {mode === "auto" ? (
        <picture className="block h-full w-full">
          <source media="(min-aspect-ratio: 1/1)" srcSet={SQUARE_BACKGROUND} />
          <img
            src={PORTRAIT_BACKGROUND}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        </picture>
      ) : (
        <img
          src={mode === "square" ? SQUARE_BACKGROUND : PORTRAIT_BACKGROUND}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
      )}
      {/*
        Soft vertical scrim — keeps the status bar and bottom dock legible
        without dimming the focal NEO art in the middle of the frame.
      */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0.08) 22%, rgba(0,0,0,0.04) 60%, rgba(0,0,0,0.38) 100%)",
        }}
      />
    </div>
  )
}
