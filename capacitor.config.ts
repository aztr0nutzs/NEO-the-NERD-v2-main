import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.neothenerd.app",
  appName: "NEO the Nerd",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
}

export default config
