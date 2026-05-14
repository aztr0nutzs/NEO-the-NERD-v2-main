"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { useState } from "react"
import { createPortal } from "react-dom"

const POSTERS = [
  {
    src: "/images/neo/info/nerd-info-1.png",
    alt: "N.E.O. feature information poster 1",
  },
  {
    src: "/images/neo/info/nerd-info-2.png",
    alt: "N.E.O. feature information poster 2",
  },
  {
    src: "/images/neo/info/nerd-info-3.png",
    alt: "N.E.O. feature information poster 3",
  },
] as const

interface NeoFeatureShowcaseProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NeoFeatureShowcase({ open, onOpenChange }: NeoFeatureShowcaseProps) {
  const [index, setIndex] = useState(0)
  const poster = POSTERS[index]

  if (!open || typeof document === "undefined") return null

  const goTo = (nextIndex: number) => {
    setIndex((nextIndex + POSTERS.length) % POSTERS.length)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 px-3 py-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="neo-showcase-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-cyan-400/35 bg-black shadow-[0_0_40px_rgba(0,240,255,0.22)]"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <p className="ps-mono text-[10px] tracking-[0.35em] ps-text-cyan">
              FEATURE_SHOWCASE
            </p>
            <h3 id="neo-showcase-title" className="ps-heading text-xl text-white">
              ABOUT <span className="ps-text-pink">N.E.O.</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close feature showcase"
            className="grid h-9 w-9 place-items-center rounded-lg text-white/70 hover:text-white"
            style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="relative min-h-0 flex-1 touch-pan-y overflow-hidden bg-black/70"
          onPointerUp={(event) => {
            const width = event.currentTarget.clientWidth
            if (event.clientX < width * 0.22) goTo(index - 1)
            if (event.clientX > width * 0.78) goTo(index + 1)
          }}
        >
          <div className="relative mx-auto aspect-[1122/1402] max-h-[70dvh] w-full max-w-[min(100%,560px)]">
            <Image
              key={poster.src}
              src={poster.src}
              alt={poster.alt}
              fill
              sizes="(max-width: 768px) 94vw, 560px"
              className="object-contain"
              priority={index === 0}
            />
          </div>

          <NavButton direction="previous" onClick={() => goTo(index - 1)} />
          <NavButton direction="next" onClick={() => goTo(index + 1)} />
        </div>

        <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
          <p className="ps-mono text-[10px] tracking-[0.25em] text-white/55">
            {index + 1} / {POSTERS.length}
          </p>
          <div className="flex gap-2">
            {POSTERS.map((item, itemIndex) => (
              <button
                key={item.src}
                type="button"
                aria-label={`Show poster ${itemIndex + 1}`}
                onClick={() => setIndex(itemIndex)}
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  background: itemIndex === index ? "#00f0ff" : "rgba(255,255,255,0.24)",
                  boxShadow: itemIndex === index ? "0 0 10px #00f0ff" : "none",
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}

function NavButton({
  direction,
  onClick,
}: {
  direction: "previous" | "next"
  onClick: () => void
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${direction} poster`}
      className={`absolute top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/70 text-white/75 hover:text-white ${
        direction === "previous" ? "left-2" : "right-2"
      }`}
      style={{ boxShadow: "inset 0 0 0 1px rgba(0,240,255,0.38), 0 0 16px rgba(0,240,255,0.18)" }}
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}
