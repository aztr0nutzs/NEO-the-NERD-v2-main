import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { join } from "node:path"

const androidDir = join(process.cwd(), "android")
const wrapper = process.platform === "win32" ? "gradlew.bat" : "./gradlew"
const wrapperPath = join(androidDir, process.platform === "win32" ? "gradlew.bat" : "gradlew")

if (!existsSync(wrapperPath)) {
  console.error(`Missing Android Gradle wrapper at ${wrapperPath}`)
  process.exit(1)
}

const result = spawnSync(wrapper, ["assembleDebug"], {
  cwd: androidDir,
  stdio: "inherit",
  shell: process.platform === "win32",
})

process.exit(result.status ?? 1)
