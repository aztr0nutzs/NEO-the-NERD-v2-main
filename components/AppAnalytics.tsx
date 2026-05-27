"use client"

import { Analytics } from "@vercel/analytics/react"
import { useEffect, useState } from "react"

export function AppAnalytics() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    let mounted = true

    import("@capacitor/core").then(({ Capacitor }) => {
      if (mounted && !Capacitor.isNativePlatform()) {
        setEnabled(true)
      }
    }).catch(() => {
      if (mounted) setEnabled(true)
    })

    return () => {
      mounted = false
    }
  }, [])

  if (!enabled) return null

  return <Analytics />
}
