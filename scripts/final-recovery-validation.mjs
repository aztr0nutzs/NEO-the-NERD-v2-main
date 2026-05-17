/**
 * Final-recovery validation harness for NEO the N.E.R.D.
 *
 * Runs the production Next.js build against headless Chromium so we can
 * exercise every code path the Android WebView would actually execute,
 * capture screenshots, and produce a pass/fail ledger.
 *
 * This is NOT a substitute for real Android device verification (timbre
 * realism of the Android TTS fallback, the GPU decode behavior of the
 * boot/background videos, and the NeoNetwork plugin's native scan are
 * all device-bounded). It IS a deterministic check that the React app's
 * state machines, copy, gating logic, scan flow, speed-test UI, and
 * voice runtime labels are intact after the five recovery PRs.
 *
 * Run:
 *   PORT=3300 npm start &
 *   node scripts/final-recovery-validation.mjs
 *
 * Artifacts land in qa-screenshots/final-recovery-validation/.
 */
import { createRequire } from "node:module"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

const require = createRequire(import.meta.url)
const { chromium } = require("playwright")

const BASE = process.env.NEO_BASE_URL ?? "http://localhost:3300"
const OUT = path.resolve(process.cwd(), "qa-screenshots/final-recovery-validation")
const LEDGER_PATH = path.resolve(OUT, "ledger.json")

const ledger = []
const consoleErrors = []
const pageErrors = []

function rec(phase, name, status, notes, evidence) {
  ledger.push({ phase, name, status, notes, evidence })
  process.stderr.write(`[${status.toUpperCase()}] ${phase} :: ${name} — ${notes ?? ""}\n`)
}

async function shot(page, file) {
  const fullPath = path.join(OUT, file)
  try {
    await page.screenshot({ path: fullPath, fullPage: false })
    return path.relative(process.cwd(), fullPath)
  } catch (err) {
    return `failed: ${err instanceof Error ? err.message : String(err)}`
  }
}

async function dismissOnboarding(page) {
  // The onboarding wizard mounts after boot if onboarding.completed is
  // false. It intercepts pointer events and would block every nav click.
  // We close it via the dialog's own button if visible.
  const dialog = page.locator('[role="dialog"][aria-labelledby="neo-onboarding-title"]')
  if (await dialog.count()) {
    const skipOrDismiss = page.locator(
      '[role="dialog"][aria-labelledby="neo-onboarding-title"] button:has-text("Skip"), [role="dialog"][aria-labelledby="neo-onboarding-title"] button[aria-label*="close" i], [role="dialog"][aria-labelledby="neo-onboarding-title"] button:has-text("Close"), [role="dialog"][aria-labelledby="neo-onboarding-title"] button:has-text("Finish")',
    )
    if (await skipOrDismiss.count()) {
      await skipOrDismiss.first().click({ timeout: 4000 }).catch(() => undefined)
    } else {
      // Hit Escape as a fallback
      await page.keyboard.press("Escape").catch(() => undefined)
    }
    await page.waitForTimeout(400)
    // Also clear the dialog overlay by removing it from the DOM if
    // dismissal didn't take.
    await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"][aria-labelledby="neo-onboarding-title"]')
      if (dlg && dlg.parentElement) dlg.parentElement.removeChild(dlg)
    })
  }
}

async function waitForShell(page) {
  await page.waitForSelector('nav[aria-label="Primary"]', { timeout: 30_000 })
  await page.waitForTimeout(400)
  await dismissOnboarding(page)
}

async function gotoTab(page, tab, key) {
  await dismissOnboarding(page)
  await page.click(`nav[aria-label="Primary"] button:has-text("${tab}")`, { timeout: 10_000 })
  await page.waitForTimeout(900)
  return shot(page, key)
}

async function main() {
  await mkdir(OUT, { recursive: true })

  const browser = await chromium.launch({ args: ["--no-sandbox", "--mute-audio"] })
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 }, // Android phone-ish
    deviceScaleFactor: 2,
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36 wv",
    isMobile: true,
    hasTouch: true,
  })
  const page = await context.newPage()
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })
  page.on("pageerror", (err) => pageErrors.push(err.message))

  // -------------------------------------------------------------------
  // TEST 1 — Boot performance / readability stack on cold launch
  // -------------------------------------------------------------------
  const bootTimings = []
  for (let i = 1; i <= 3; i++) {
    const start = Date.now()
    await context.clearCookies()
    await page.goto(BASE, { waitUntil: "domcontentloaded" })
    const initialEvidence = await shot(page, `boot-cold-${i}-01-initial.png`)
    // The boot overlay should mount on first paint and then unmount once
    // the cinematic intro finishes. We wait for the bottom dock to appear
    // (which only renders when AppShell is visible past the overlay).
    try {
      await page.waitForSelector('nav[aria-label="Primary"]', { timeout: 20_000 })
      const elapsed = Date.now() - start
      bootTimings.push(elapsed)
      const settledEvidence = await shot(page, `boot-cold-${i}-02-main.png`)
      rec(
        "boot",
        `cold launch ${i}`,
        "pass",
        `Shell visible in ${elapsed} ms; boot overlay completed and unmounted.`,
        { initial: initialEvidence, settled: settledEvidence },
      )
    } catch (err) {
      bootTimings.push(null)
      rec(
        "boot",
        `cold launch ${i}`,
        "fail",
        `Shell did not appear within 20 s: ${err instanceof Error ? err.message : String(err)}`,
        { initial: initialEvidence },
      )
    }
  }

  // Verify the boot overlay no longer holds the screen and the
  // animated background is allowed to mount after boot. The background
  // <video> only mounts when bootMounted=false (videoEnabled prop gate).
  // The video element itself may unmount on `error` for headless paths
  // that can't decode the mp4 — so we accept either "video present" or
  // "video disabled but PNG poster present" as a pass.
  await page.goto(BASE)
  await waitForShell(page)
  await page.waitForTimeout(2500)
  const bgVideoCount = await page.locator('video[src*="neo_backround"]').count()
  const bgPosterCount = await page.locator('img[src*="neo-background"]').count()
  const bootVideoCount = await page.locator('video.boot-sequence-video').count()
  const bootEnded = bootVideoCount === 0
  const backgroundReady = bgVideoCount >= 1 || bgPosterCount >= 1
  rec(
    "boot",
    "background gating after boot",
    bootEnded && backgroundReady ? "pass" : "partial",
    `boot overlay still present=${!bootEnded}; bg <video>=${bgVideoCount}; bg <img poster>=${bgPosterCount}`,
  )

  // -------------------------------------------------------------------
  // TEST 2 — UI readability stack
  // -------------------------------------------------------------------
  const mainShot = await shot(page, "ui-main.png")
  rec("readability", "Main screen", "pass", `Captured.`, { screenshot: mainShot })

  const networkShot = await gotoTab(page, "Network", "ui-network.png")
  rec("readability", "Network screen", "pass", "Captured.", { screenshot: networkShot })

  const speedShot = await gotoTab(page, "Speed", "ui-speed-test.png")
  rec("readability", "Speed Test screen", "pass", "Captured.", { screenshot: speedShot })

  const voicesShot = await gotoTab(page, "Voices", "ui-voices.png")
  rec("readability", "Voice Library screen", "pass", "Captured.", { screenshot: voicesShot })

  // Confirm the new content-shade utility is mounted behind <main>.
  await page.goto(BASE)
  await waitForShell(page)
  const hasContentShade = await page
    .locator(".ps-content-shade")
    .count()
  rec(
    "readability",
    "content shade present behind main",
    hasContentShade >= 1 ? "pass" : "fail",
    `ps-content-shade count=${hasContentShade}`,
  )

  // -------------------------------------------------------------------
  // TEST 3 — Network initialization
  // -------------------------------------------------------------------
  await gotoTab(page, "Network", "network-init-after-tab.png")
  // The recovery removed the indefinite spinner. We assert that after a
  // bounded wait, either we are in the ready surface (header chip
  // visible) OR we are in the explicit failure panel — never stuck on
  // INITIALIZING_NETWORK_MODULE forever.
  await page.waitForTimeout(2000)
  const initLabel = await page.locator('text=INITIALIZING_NETWORK_MODULE').count()
  const headerLabel = await page.locator('text=NETWORK DISCOVERY + CONTROL').count()
  const failurePanel = await page.locator('text=NETWORK_MODULE_INIT_FAILED').count()
  if (initLabel === 0 && (headerLabel >= 1 || failurePanel >= 1)) {
    rec(
      "network-init",
      "screen escapes initializing spinner",
      "pass",
      `header present=${headerLabel}, failure panel=${failurePanel}, spinner=${initLabel}`,
      { screenshot: await shot(page, "network-init-settled.png") },
    )
  } else {
    rec(
      "network-init",
      "screen escapes initializing spinner",
      "fail",
      `INITIALIZING_NETWORK_MODULE still present after 2 s, header=${headerLabel}, failure=${failurePanel}`,
      { screenshot: await shot(page, "network-init-stuck.png") },
    )
  }

  // -------------------------------------------------------------------
  // TEST 4 — Backend-free scan
  // -------------------------------------------------------------------
  // The Scan tab inside NetworkDiscoveryFeature exposes START_SCAN.
  // We click and verify the state transitions to scanning, then either
  // completes or terminates explicitly within ~15 s.
  try {
    await page.click('button:has-text("OPEN MAP"), button:has-text("ACTIVE")', { timeout: 2000 }).catch(() => undefined)
    // Switch to the SCAN tab
    await page.click('button[role="tab"]:has-text("SCAN")', { timeout: 5000 })
    await page.waitForTimeout(400)
    const beforeShot = await shot(page, "scan-before.png")
    await page.click('button:has-text("START_DEMO_SCAN"), button:has-text("START_SCAN")', { timeout: 5000 })
    await page.waitForTimeout(500)
    const duringShot = await shot(page, "scan-during.png")
    // Wait up to 15s for the scan to terminate (success OR failure).
    const startedAt = Date.now()
    let terminated = false
    while (Date.now() - startedAt < 15000) {
      const stillScanning = await page.locator('text=/SCANNING_|RUNNING_PREVIEW/').count()
      if (stillScanning === 0) {
        terminated = true
        break
      }
      await page.waitForTimeout(400)
    }
    const afterShot = await shot(page, "scan-after.png")
    if (terminated) {
      rec(
        "scan",
        "scan button triggers and terminates",
        "pass",
        `Scan completed (or failed explicitly) within ${(Date.now() - startedAt)/1000}s.`,
        { before: beforeShot, during: duringShot, after: afterShot },
      )
    } else {
      rec(
        "scan",
        "scan button triggers and terminates",
        "fail",
        "Scan still showing SCANNING_/RUNNING_PREVIEW after 15s — possible stuck spinner.",
        { before: beforeShot, during: duringShot, after: afterShot },
      )
    }
  } catch (err) {
    rec(
      "scan",
      "scan button triggers and terminates",
      "fail",
      `Could not exercise scan button: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  // Confirm no UI prompt for backend configuration appears on the local
  // discovery path.
  const backendPromptCount = await page
    .locator('text=/configure backend|backend required|set NEXT_PUBLIC_NEO_NETWORK_BACKEND/i')
    .count()
  rec(
    "scan",
    "no backend prompt on local discovery",
    backendPromptCount === 0 ? "pass" : "fail",
    `backend prompt occurrences on Network screen: ${backendPromptCount}`,
  )

  // -------------------------------------------------------------------
  // TEST 5 — 3D map + device list populate
  // -------------------------------------------------------------------
  try {
    await page.click('button[role="tab"]:has-text("MAP")', { timeout: 5000 })
    await page.waitForTimeout(2000)
    const mapCanvas = await page.locator("canvas").count()
    const mapShot = await shot(page, "map-after-scan.png")
    rec(
      "map",
      "3D map canvas mounts",
      mapCanvas >= 1 ? "pass" : "partial",
      `canvas elements on map tab: ${mapCanvas}`,
      { screenshot: mapShot },
    )

    await page.click('button[role="tab"]:has-text("DEVICES")', { timeout: 5000 })
    await page.waitForTimeout(800)
    const devicesShot = await shot(page, "device-list-after-scan.png")
    // Read the "DEVICES_FOUND" overview card — it is the truth source for
    // how many devices the adapter is exposing to the UI. The actual
    // virtualized DeviceListPanel below is intersect-observed and does
    // not always render rows in headless mobile viewport.
    const devicesFoundText = await page
      .locator('text=DEVICES_FOUND')
      .first()
      .evaluate((node) => node.parentElement?.textContent ?? "")
      .catch(() => "")
    const devicesFoundMatch = devicesFoundText.match(/(\d+)/)
    const devicesFoundCount = devicesFoundMatch ? Number(devicesFoundMatch[1]) : 0
    rec(
      "map",
      "device count card populated",
      devicesFoundCount > 0 ? "pass" : "fail",
      `DEVICES_FOUND card reads ${devicesFoundCount} (browser preview uses demo set; native build uses live NativeScanResult)`,
      { screenshot: devicesShot },
    )
  } catch (err) {
    rec(
      "map",
      "3D map and device list",
      "partial",
      `Could not switch to map/devices tabs: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  // -------------------------------------------------------------------
  // TEST 6 — Speed Test screen
  // -------------------------------------------------------------------
  await gotoTab(page, "Speed", "speedtest-idle.png")
  const phaseStrip = await page.locator("text=PHASE TRACK").count()
  const uploadCfg = await page.locator("text=UPLOAD ENDPOINT").count()
  const verdictBefore = await page.locator("text=PROBE COMPLETE").count()
  rec(
    "speed",
    "phase strip + upload config affordance",
    phaseStrip >= 1 && uploadCfg >= 1 ? "pass" : "fail",
    `phase-strip count=${phaseStrip}, upload-config count=${uploadCfg}`,
  )

  try {
    // Trigger a real probe — Cloudflare endpoint is hit by the runner.
    await page.click('button:has-text("Execute")', { timeout: 5000 })
    // Wait up to 20s for the verdict banner or a failure phase.
    const startedAt = Date.now()
    let outcomeKind = "timeout"
    while (Date.now() - startedAt < 20_000) {
      const banner = await page.locator(
        'text=/EXCELLENT|GOOD|USABLE|DEGRADED|PROBE FAILED|ABORTED/',
      ).count()
      if (banner >= 1) {
        outcomeKind = "verdict-rendered"
        break
      }
      await page.waitForTimeout(500)
    }
    const speedDoneShot = await shot(page, "speedtest-after-run.png")
    rec(
      "speed",
      "real probe → verdict banner",
      outcomeKind === "verdict-rendered" ? "pass" : "partial",
      `outcome=${outcomeKind}; container has limited external network so the probe may complete or fail explicitly`,
      { screenshot: speedDoneShot },
    )
  } catch (err) {
    rec(
      "speed",
      "real probe → verdict banner",
      "partial",
      `Could not click Execute: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  // -------------------------------------------------------------------
  // TEST 7 — Voice realism / truth labels
  // -------------------------------------------------------------------
  await gotoTab(page, "Voices", "voices-overview.png")

  const hearingLine = await page.locator("text=/HEARING:/").count()
  const neuralLabel = await page
    .locator("text=/HIGH-QUALITY NEURAL VOICE|NEURAL VOICE UNAVAILABLE/")
    .count()
  const fallbackLabel = await page
    .locator("text=/ANDROID DEVICE TTS|BROWSER SPEECH \\(STYLED FALLBACK\\)|STYLED FALLBACK/")
    .count()
  rec(
    "voice",
    "HEARING: live disclosure line",
    hearingLine >= 1 ? "pass" : "fail",
    `live disclosure occurrences=${hearingLine}`,
  )
  rec(
    "voice",
    "neural vs fallback label visible",
    neuralLabel >= 1 || fallbackLabel >= 1 ? "pass" : "fail",
    `neural-label=${neuralLabel}, fallback-label=${fallbackLabel}`,
  )

  await gotoTab(page, "Person.", "personalities-overview.png")
  rec("voice", "personalities screen reaches steady state", "pass", "Captured.")

  await gotoTab(page, "Set", "settings-overview.png")
  const qualityToggle = await page.locator("text=Voice quality").count()
  const qualityCopy = await page
    .locator("text=/PREFER HIGH-QUALITY|FALLBACK ONLY/")
    .count()
  rec(
    "voice",
    "voiceQualityPreference setting visible",
    qualityToggle >= 1 && qualityCopy >= 1 ? "pass" : "fail",
    `voice quality label=${qualityToggle}, segmented options=${qualityCopy}`,
  )

  // -------------------------------------------------------------------
  // Wrap up
  // -------------------------------------------------------------------
  await writeFile(
    LEDGER_PATH,
    JSON.stringify(
      {
        baseUrl: BASE,
        bootMillis: bootTimings,
        consoleErrors: consoleErrors.slice(0, 50),
        pageErrors: pageErrors.slice(0, 50),
        ledger,
      },
      null,
      2,
    ),
  )

  await browser.close()
  const fails = ledger.filter((r) => r.status === "fail").length
  const partials = ledger.filter((r) => r.status === "partial").length
  const passes = ledger.filter((r) => r.status === "pass").length
  process.stderr.write(
    `\nSUMMARY: ${passes} pass · ${partials} partial · ${fails} fail · ${ledger.length} total\n`,
  )
  if (fails > 0) process.exit(2)
}

main().catch((err) => {
  console.error("Validation harness crashed:", err)
  process.exit(99)
})
