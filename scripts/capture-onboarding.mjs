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

const OUT_DIR = path.resolve(process.cwd(), "qa-screenshots/onboarding")
const BASE_URL = process.env.NEO_BASE_URL ?? "http://localhost:3000"

const STEPS = [
  "01-welcome",
  "02-personality",
  "03-voice",
  "04-network",
  "05-demo-vs-live",
  "06-permissions",
  "07-first-scan",
  "08-review-unknown",
  "09-monitoring",
  "10-complete",
]

async function waitForBoot(page) {
  // Boot video is 4.4MB and has a 35s failsafe; in headless we may need to wait
  // for the timer to fire when autoplay is blocked. Capture intermediate state.
  await page.waitForTimeout(2500)
  await page.screenshot({ path: path.join(OUT_DIR, "00-boot-overlay.png") }).catch(() => {})
  await page.waitForSelector('[role="dialog"][aria-labelledby="neo-onboarding-title"]', {
    state: "visible",
    timeout: 90000,
  })
  await page.waitForTimeout(800)
}

async function clickByText(page, text) {
  const handle = page.locator(`button:has-text("${text}")`).first()
  await handle.waitFor({ state: "visible", timeout: 5000 })
  await handle.click()
}

async function captureFirstRun() {
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch({
    args: ["--autoplay-policy=no-user-gesture-required"],
  })
  const context = await browser.newContext({
    viewport: { width: 420, height: 900 },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  })
  await context.addInitScript(() => {
    // The boot overlay only fires `onBootComplete` on the success path of the
    // <video> element. In headless tests the codec may stall, leaving the
    // app blocked behind the (invisible) overlay. Coerce the boot video to a
    // synchronous "ended" event so the wizard can render promptly.
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
  })
  const page = await context.newPage()

  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" })
  await waitForBoot(page)

  for (let i = 0; i < STEPS.length; i += 1) {
    await page.waitForTimeout(450)
    await page.screenshot({ path: path.join(OUT_DIR, `${STEPS[i]}.png`) })
    if (i < STEPS.length - 1) {
      await clickByText(page, "NEXT")
    }
  }

  // Final: tap LAUNCH NEO and confirm dashboard appears
  await clickByText(page, "LAUNCH NEO")
  await page.waitForSelector('[role="dialog"][aria-labelledby="neo-onboarding-title"]', {
    state: "detached",
    timeout: 8000,
  })
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(OUT_DIR, "11-dashboard-after-launch.png") })

  // Cold-start verification — reload and confirm wizard does NOT reappear
  await page.reload({ waitUntil: "domcontentloaded" })
  await page.waitForTimeout(4000)
  const wizardAfterReload = await page.locator(
    '[role="dialog"][aria-labelledby="neo-onboarding-title"]',
  ).count()
  await page.screenshot({ path: path.join(OUT_DIR, "12-cold-start-no-wizard.png") })

  // Replay flow: navigate to Settings via the bottom dock and capture
  // the new "About N.E.O." section, then trigger the replay wizard so the
  // recoverable path is documented in the proof set.
  const dockSettings = page.locator('button[aria-label="Set"]').first()
  await dockSettings.click().catch(() => {})
  await page.waitForTimeout(700)
  await page.locator("text=REPLAY FIRST-RUN SETUP").scrollIntoViewIfNeeded().catch(() => {})
  await page.screenshot({ path: path.join(OUT_DIR, "13-settings-replay-entry.png") })
  await page.locator("text=REPLAY FIRST-RUN SETUP").click().catch(() => {})
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(OUT_DIR, "14-replay-from-settings.png") })

  await browser.close()

  return { wizardAfterReload }
}

const result = await captureFirstRun()
console.log(JSON.stringify(result, null, 2))
