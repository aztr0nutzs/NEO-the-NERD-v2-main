import { cp, mkdir, rm } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"

const root = process.cwd()
const outDir = path.join(root, "out")
const nextIndex = path.join(root, ".next", "server", "app", "index.html")
const nextStatic = path.join(root, ".next", "static")
const publicDir = path.join(root, "public")

if (!existsSync(nextIndex)) {
  throw new Error("Missing .next/server/app/index.html. Run next build first.")
}

await rm(outDir, { recursive: true, force: true })
await mkdir(path.join(outDir, "_next"), { recursive: true })
await cp(nextIndex, path.join(outDir, "index.html"))

if (existsSync(nextStatic)) {
  await cp(nextStatic, path.join(outDir, "_next", "static"), { recursive: true })
}

if (existsSync(publicDir)) {
  await cp(publicDir, outDir, { recursive: true })
}

console.log("Prepared Capacitor web assets in out/.")
