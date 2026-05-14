import type { Metadata, Viewport } from "next"
import { AppAnalytics } from "@/components/AppAnalytics"
import "./globals.css"

export const metadata: Metadata = {
  title: "NEO the Nerd",
  description:
    "NEO the Nerd — a futuristic robot companion with voices, personalities, mini-games, network discovery, and cyberpunk controls.",
  generator: "v0.app",
  applicationName: "NEO the Nerd",
  manifest: "/manifest.webmanifest",
}

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark bg-background">
      {/*
        Body must remain transparent so the fixed NeoBackgroundScene (z-0)
        is visible. The html element provides the #000 fallback canvas.
      */}
      <body className="font-sans antialiased bg-transparent text-foreground">
        {children}
        {process.env.NODE_ENV === "production" && <AppAnalytics />}
      </body>
    </html>
  )
}
