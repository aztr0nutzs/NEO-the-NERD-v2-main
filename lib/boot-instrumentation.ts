"use client"

export type BootEventDetail = Record<string, string | number | boolean | null | undefined>

export function logBootEvent(event: string, detail: BootEventDetail = {}) {
  if (typeof window === "undefined") return

  console.info("[NEO_BOOT]", event, {
    t: Math.round(performance.now()),
    ...detail,
  })
}
