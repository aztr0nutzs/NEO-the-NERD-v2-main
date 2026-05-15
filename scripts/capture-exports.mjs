import { createRequire } from "node:module"
const require = createRequire(import.meta.url)
let chromium
try {
  ({ chromium } = require("playwright"))
} catch {
  ({ chromium } = require("/opt/node22/lib/node_modules/playwright"))
}
import { mkdir } from "node:fs/promises"
import path from "node:path"

const OUT_DIR = path.resolve(process.cwd(), "qa-screenshots/exports")
const BASE_URL = process.env.NEO_BASE_URL ?? "http://localhost:3000"

await mkdir(OUT_DIR, { recursive: true })
const browser = await chromium.launch({
  args: ["--autoplay-policy=no-user-gesture-required"],
})
const context = await browser.newContext({
  viewport: { width: 420, height: 1000 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
})
await context.addInitScript(() => {
  const original = HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play = function patched() {
    if (this instanceof HTMLVideoElement && /neo_boot/.test(this.src)) {
      Object.defineProperty(this, "duration", { configurable: true, value: 0.4 })
      Object.defineProperty(this, "currentTime", { configurable: true, value: 0.4 })
      Promise.resolve().then(() => this.dispatchEvent(new Event("ended")))
      return Promise.resolve()
    }
    return original.apply(this, arguments)
  }
  // Seed onboarding as completed so the wizard does not block the test.
  try {
    const existing = JSON.parse(localStorage.getItem("neo-the-nerd:app-state") || "null") || {}
    const next = {
      version: 1,
      ...existing,
      settings: {
        ...(existing.settings || {}),
        onboarding: {
          ...(existing.settings?.onboarding || {}),
          completed: true,
          skipped: false,
          completedAt: new Date().toISOString(),
          monitoringOptIn: false,
          initialScanRequested: false,
        },
      },
    }
    localStorage.setItem("neo-the-nerd:app-state", JSON.stringify(next))
  } catch {}
})

const page = await context.newPage()
const downloads = []
page.on("download", (download) => {
  downloads.push({ name: download.suggestedFilename(), url: download.url() })
})

await page.goto(BASE_URL, { waitUntil: "domcontentloaded" })
await page.waitForTimeout(2500)

// Settings tab
await page.locator('button[aria-label="Set"]').first().click()
await page.waitForTimeout(700)
await page.locator("text=REPORTS / EXPORTS").scrollIntoViewIfNeeded()
await page.waitForTimeout(400)
await page.screenshot({ path: path.join(OUT_DIR, "01-settings-export-panel.png") })

// Toggle to CSV
await page.locator("button:has-text(\"CSV\")").first().click().catch(() => {})
await page.waitForTimeout(200)
await page.screenshot({ path: path.join(OUT_DIR, "02-format-csv.png") })

// Toggle to Device inventory bundle
await page.locator('button:has-text("DEVICE_INVENTORY")').first().click()
await page.waitForTimeout(200)
await page.screenshot({ path: path.join(OUT_DIR, "03-device-inventory.png") })

// Trigger an actual download. Target the NetworkExportPanel's own EXPORT
// button specifically — `button:has-text("EXPORT")` would also match
// "EXPORT SETTINGS" in the legacy Data & Privacy section above.
await page.locator("button:has-text(\"JSON\")").first().click().catch(() => {})
await page.waitForTimeout(150)
const networkBundleButton = page.locator('button:has-text("NETWORK_REPORT")').first()
await networkBundleButton.scrollIntoViewIfNeeded()
await networkBundleButton.click()
await page.waitForTimeout(200)
const exportButton = page
  .locator('button:has-text("EXPORT")')
  .filter({ hasNotText: "SETTINGS" })
  .first()
await exportButton.scrollIntoViewIfNeeded()
const downloadPromise = page.waitForEvent("download", { timeout: 12000 }).catch(() => null)
await exportButton.click()
const dl = await downloadPromise
await page.waitForTimeout(900)
await page.screenshot({ path: path.join(OUT_DIR, "04-export-success.png") })

// Network screen → History tab → export panel
await page.locator('button[aria-label="Network"]').first().click().catch(() => {})
await page.waitForTimeout(900)
// Use the Radix-UI tab role + tabs root data attribute to avoid colliding
// with the "HISTORY" button rendered inside the NetworkHealthPanel.
const historyTab = page.locator('[role="tab"][data-state]').filter({ hasText: "HISTORY" }).first()
await historyTab.click({ force: true }).catch(() => {})
await page.waitForTimeout(800)
const networkExportPanel = page.locator("text=REPORTS / EXPORTS").last()
await networkExportPanel.scrollIntoViewIfNeeded().catch(() => {})
await page.waitForTimeout(400)
await page.screenshot({ path: path.join(OUT_DIR, "05-network-history-export.png") })

await browser.close()

console.log(
  JSON.stringify(
    {
      ok: true,
      downloadsCaptured: downloads.length,
      downloads,
    },
    null,
    2,
  ),
)
