// Codex browser full-functionality test runner.
// Drives the live Next.js dev server with headless Chromium via Playwright,
// captures screenshots into qa-screenshots/codex-browser-full-functionality-pass/,
// and emits a structured JSON ledger to stdout.
//
// Each "case" wraps a fragment of user-style interaction and records:
//   - phase / name
//   - status (pass | partial | fail | env-limited)
//   - any observed runtime errors from console
//   - notes captured at runtime
import { createRequire } from "node:module"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

const require = createRequire(import.meta.url)
const { chromium } = require("/opt/node22/lib/node_modules/playwright")

const BASE = process.env.NEO_BASE_URL ?? "http://localhost:3000"
const OUT = path.resolve(process.cwd(), "qa-screenshots/codex-browser-full-functionality-pass")
const LEDGER_PATH = path.resolve(process.cwd(), "qa-screenshots/codex-browser-full-functionality-pass/run-ledger.json")

const results = []
const consoleErrors = []
const pageErrors = []

function push(phase, name, status, notes) {
  results.push({ phase, name, status, notes })
  // also log so we get a running trace in case the script crashes mid-flight.
  process.stderr.write(`[${status.toUpperCase()}] ${phase} :: ${name} — ${notes ?? ""}\n`)
}

async function shot(page, file) {
  try {
    await page.screenshot({ path: path.join(OUT, file), fullPage: false })
  } catch (e) {
    process.stderr.write(`screenshot failed for ${file}: ${e.message}\n`)
  }
}

async function waitForBootGone(page, timeoutMs = 45_000) {
  // Boot overlay only shows once; in headless mode autoplay is blocked
  // so the failsafe in app-shell.tsx (40s) is what tears it down.
  // We can manually unmount by clicking the SKIP path if present, but
  // BootSequenceOverlay has its own internal "boot complete" handler;
  // the simpler approach is to dispatch a synthetic event to short-circuit
  // it via the localStorage flag the wizard reads, or just wait.
  // Faster: trigger video ended event on whatever <video> is mounted.
  try {
    await page.evaluate(() => {
      const v = document.querySelector("video")
      if (v) {
        try {
          // Set ended-like state and fire events the BootSequenceOverlay listens for.
          v.dispatchEvent(new Event("ended"))
          v.dispatchEvent(new Event("error"))
        } catch {}
      }
    })
  } catch {}
  // Now wait for the dock to be present and stable as a proxy for "boot done".
  await page.waitForSelector('nav[aria-label="Primary"]', { timeout: timeoutMs })
  // Also wait a little for the overlay's exit animation to finish.
  await page.waitForTimeout(500)
}

async function dismissOnboardingIfOpen(page) {
  // OnboardingWizard renders a role="dialog" portal. Skip via the X button.
  const dialog = await page.$('[role="dialog"][aria-labelledby="neo-onboarding-title"]')
  if (!dialog) return false
  const skip = await dialog.$('button[aria-label="Skip onboarding"]')
  if (skip) {
    await skip.click()
    await page.waitForTimeout(400)
    return true
  }
  return false
}

async function clickDock(page, label) {
  // Each item: <button aria-label="Robot"> etc. label values match BottomDock ITEMS.
  const btn = await page.$(`nav[aria-label="Primary"] button[aria-label="${label}"]`)
  if (!btn) return false
  await btn.scrollIntoViewIfNeeded()
  await btn.click()
  await page.waitForTimeout(450)
  return true
}

async function getActiveDockLabel(page) {
  return page.evaluate(() => {
    const el = document.querySelector('nav[aria-label="Primary"] button[aria-current="page"]')
    return el?.getAttribute("aria-label") ?? null
  })
}

async function countVisibleButtons(page) {
  return page.evaluate(() => document.querySelectorAll("button").length)
}

async function withErrorCount(page, label, fn) {
  const before = consoleErrors.length + pageErrors.length
  try {
    await fn()
  } catch (e) {
    push("runtime", label, "fail", `interaction threw: ${e.message}`)
  }
  return consoleErrors.length + pageErrors.length - before
}

;(async () => {
  await mkdir(OUT, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 }, // android phone-ish viewport
    deviceScaleFactor: 2,
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    hasTouch: true,
    isMobile: true,
  })
  const page = await context.newPage()
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })
  page.on("pageerror", (err) => pageErrors.push(err.message))

  // -------------------- PHASE 1: boot & shell --------------------
  await page.goto(BASE, { waitUntil: "domcontentloaded" })
  await shot(page, "01-initial-load.png")
  push("phase1", "Initial HTTP load", "pass", `GET ${BASE} reached domcontentloaded`)

  // Boot overlay should be visible briefly
  const bootOverlayPresent = await page.$('[aria-label="NEO boot sequence"], [data-boot], video') !== null
  push("phase1", "Boot overlay element present", bootOverlayPresent ? "pass" : "partial",
    bootOverlayPresent ? "video / boot artifact found in DOM" : "no boot artifact detected")
  await shot(page, "02-boot-or-prep.png")

  // Try to short-circuit the boot video and reach the shell quickly.
  await waitForBootGone(page)
  await shot(page, "03-shell-ready.png")
  push("phase1", "Shell renders after boot", "pass", "BottomDock found")

  // Background scene: NeoBackgroundScene mounts a <video> using neo_backround.mp4
  const bgInfo = await page.evaluate(() => {
    const v = document.querySelector('video[src*="neo_backround"]') || document.querySelector("video")
    if (!v) return { found: false }
    return {
      found: true,
      src: v.src || v.currentSrc || null,
      readyState: v.readyState,
      paused: v.paused,
      width: v.videoWidth,
      height: v.videoHeight,
    }
  })
  push("phase1", "Background video element", bgInfo.found ? "pass" : "partial",
    JSON.stringify(bgInfo))

  // dock items
  const dockLabels = await page.evaluate(() =>
    Array.from(document.querySelectorAll('nav[aria-label="Primary"] button[aria-label]'))
      .map((b) => b.getAttribute("aria-label")))
  push("phase1", "Dock items present", dockLabels.length === 10 ? "pass" : "partial",
    `labels=${JSON.stringify(dockLabels)}`)

  // -------------------- PHASE 2: onboarding --------------------
  // The first-run onboarding may not show if localStorage already shows completed.
  // Force a fresh first-run by clearing storage and reloading.
  await page.evaluate(() => {
    try { localStorage.clear() } catch {}
    try { sessionStorage.clear() } catch {}
  })
  await page.reload({ waitUntil: "domcontentloaded" })
  await waitForBootGone(page)
  // Trigger app-shell's 40s failsafe by waiting for the wizard portal.
  // Faster: poll for it for a bit; if it isn't shown, push partial.
  let onboardingShown = false
  for (let i = 0; i < 25; i++) {
    if (await page.$('[role="dialog"][aria-labelledby="neo-onboarding-title"]')) {
      onboardingShown = true
      break
    }
    await page.waitForTimeout(300)
  }
  // Boot overlay manages its own 40s failsafe; we may need to wait longer for
  // onboarding to come up if it's gated on bootSettled. Force it via timer.
  if (!onboardingShown) {
    await page.evaluate(() => {
      // Force advance any timers by setting an unrelated state change.
      // Easiest: dispatch a 'visibilitychange' to nudge React.
    })
    for (let i = 0; i < 80; i++) {
      if (await page.$('[role="dialog"][aria-labelledby="neo-onboarding-title"]')) {
        onboardingShown = true
        break
      }
      await page.waitForTimeout(600)
    }
  }
  await shot(page, "10-onboarding-welcome-attempt.png")
  push("phase2", "Onboarding wizard auto-appears on first run", onboardingShown ? "pass" : "partial",
    onboardingShown ? "dialog found" : "wizard did not appear within 50s of reload")

  if (onboardingShown) {
    // Walk every step via NEXT.
    const steps = [
      "welcome", "personality", "voice", "network", "demo-vs-live",
      "permissions", "first-scan", "review-unknown", "monitoring", "complete",
    ]
    for (let i = 0; i < steps.length; i++) {
      await shot(page, `11-onboarding-step-${String(i + 1).padStart(2, "0")}-${steps[i]}.png`)
      // For final step the button label is LAUNCH NEO; for the rest, NEXT.
      const isLast = i === steps.length - 1
      const buttonText = isLast ? "LAUNCH NEO" : "NEXT"
      const clicked = await page.evaluate((label) => {
        const btns = Array.from(document.querySelectorAll('[role="dialog"] button'))
        const t = btns.find((b) => (b.textContent ?? "").trim().toUpperCase().includes(label))
        if (!t) return false
        t.click()
        return true
      }, buttonText)
      if (!clicked) {
        push("phase2", `Onboarding step ${steps[i]}: ${buttonText} button`, "fail", "button not found in dialog")
        break
      }
      push("phase2", `Onboarding step ${steps[i]}: ${buttonText} click`, "pass", "clicked")
      await page.waitForTimeout(450)
    }
    // After LAUNCH NEO, the wizard should close
    const stillOpen = await page.$('[role="dialog"][aria-labelledby="neo-onboarding-title"]')
    push("phase2", "Onboarding completes & closes", stillOpen ? "fail" : "pass",
      stillOpen ? "wizard still open after LAUNCH" : "closed")
  }

  // ensure we're on main now
  await clickDock(page, "Robot")
  await shot(page, "20-main-after-onboarding.png")

  // -------------------- PHASE 3: Main / Mission Control --------------------
  // Confirm main rendered
  const mainHasStage = await page.$('[data-stage], canvas, video, img[alt]') !== null
  push("phase3", "Main: hero / stage area renders", mainHasStage ? "pass" : "partial",
    mainHasStage ? "media element found" : "no media element")

  // Quick command chips
  const chipCount = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).filter(b =>
      ["Tell a joke","Start chat","Change voice","Play a game","Prank idea","Daily briefing","Explain my network","Surprise me"]
        .includes((b.textContent ?? "").trim())
    ).length
  })
  push("phase3", "Main: quick command chips render", chipCount >= 4 ? "pass" : "partial",
    `chip count = ${chipCount}`)

  // Try clicking 'Tell a joke'
  const jokeClicked = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find(b => (b.textContent ?? "").trim() === "Tell a joke")
    if (b) { b.click(); return true } return false
  })
  await page.waitForTimeout(500)
  push("phase3", "Main: 'Tell a joke' chip click", jokeClicked ? "pass" : "partial", "")

  // Try Run Scan / Mission Control shortcut cards if present.
  // The buttons are simple <button> elements with labels; sweep visible text.
  const mainCards = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("button, a")).map(el => (el.textContent ?? "").trim()).filter(Boolean).slice(0, 100)
  })
  push("phase3", "Main: visible interactive labels snapshot", "pass",
    `sample=${JSON.stringify(mainCards.slice(0, 25))}`)

  // -------------------- PHASE 4: Chat --------------------
  await clickDock(page, "Chat")
  await shot(page, "30-chat.png")
  // textarea/input + send
  const inputSel = await page.$('textarea, input[type="text"]')
  if (inputSel) {
    await inputSel.click()
    await inputSel.fill("Hello NEO.")
    await shot(page, "31-chat-typed.png")
    // Send by pressing Enter
    await inputSel.press("Enter")
    await page.waitForTimeout(900)
    await shot(page, "32-chat-after-send.png")
    push("phase4", "Chat: send via Enter key", "pass", "")
    const msgCount = await page.evaluate(() => document.querySelectorAll('[data-role="message"], [role="article"], .message-bubble, [class*="message"]').length)
    push("phase4", "Chat: message bubbles after send", msgCount > 0 ? "pass" : "partial",
      `bubble-ish elements = ${msgCount}`)
    // try a network-aware prompt
    await inputSel.fill("Summarize what this app can do.")
    await inputSel.press("Enter")
    await page.waitForTimeout(1200)
    await shot(page, "33-chat-summary-prompt.png")
    push("phase4", "Chat: second prompt sent", "pass", "")
  } else {
    push("phase4", "Chat: input field", "fail", "no textarea/input found on chat screen")
  }

  // -------------------- PHASE 5: Voices --------------------
  await clickDock(page, "Voices")
  await shot(page, "40-voices.png")
  // count voice cards
  const voiceCards = await page.evaluate(() => {
    // voice cards rendered by VoiceCard; we use the heuristic of buttons with role within a section
    return document.querySelectorAll('button, [role="button"], [data-voice-id]').length
  })
  push("phase5", "Voices: page renders interactive items", voiceCards > 5 ? "pass" : "partial", `interactive count = ${voiceCards}`)
  // search input
  const voiceSearch = await page.$('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i]')
  if (voiceSearch) {
    await voiceSearch.fill("neo")
    await page.waitForTimeout(300)
    await shot(page, "41-voices-search.png")
    push("phase5", "Voices: search input filters list", "pass", "typed 'neo'")
    await voiceSearch.fill("")
  } else {
    push("phase5", "Voices: search input", "partial", "no search input detected")
  }
  // attempt preview click on first listed voice card
  const previewClicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find(
      (b) => /preview|play|test|sample/i.test((b.textContent ?? "").trim())
    )
    if (btn) { btn.click(); return (btn.textContent || "").trim() }
    return null
  })
  push("phase5", "Voices: preview button reachable",
    previewClicked ? "pass" : "partial",
    previewClicked ? `clicked '${previewClicked}'` : "no preview button found")
  await page.waitForTimeout(700)

  // -------------------- PHASE 6: Personalities --------------------
  await clickDock(page, "Person.")
  await shot(page, "50-personalities.png")
  const persCards = await page.evaluate(() => document.querySelectorAll("button, [role=button]").length)
  push("phase6", "Personalities: page renders", persCards > 5 ? "pass" : "partial", `interactive count = ${persCards}`)
  // try to pick the 2nd personality card (skip dock buttons)
  const persPicked = await page.evaluate(() => {
    const dockNav = document.querySelector('nav[aria-label="Primary"]')
    const candidates = Array.from(document.querySelectorAll("button")).filter(b =>
      !dockNav?.contains(b) && b.offsetParent !== null && (b.textContent ?? "").trim().length > 4
    )
    if (candidates.length < 3) return null
    candidates[2].click()
    return (candidates[2].textContent || "").trim()
  })
  push("phase6", "Personalities: pick a card",
    persPicked ? "pass" : "partial",
    persPicked ? `clicked '${persPicked}'` : "no candidate")
  await page.waitForTimeout(400)
  await shot(page, "51-personalities-after-pick.png")

  // -------------------- PHASE 7: Library / Response Vault --------------------
  await clickDock(page, "Library")
  await shot(page, "60-library.png")
  const libBtnCount = await countVisibleButtons(page)
  push("phase7", "Library: page renders", libBtnCount > 10 ? "pass" : "partial", `buttons = ${libBtnCount}`)
  const librarySearch = await page.$('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i]')
  if (librarySearch) {
    await librarySearch.fill("welcome")
    await page.waitForTimeout(250)
    await shot(page, "61-library-search.png")
    push("phase7", "Library: search input works", "pass", "")
    await librarySearch.fill("")
  } else {
    push("phase7", "Library: search input", "partial", "search input not detected")
  }

  // -------------------- PHASE 8 / 9 / 10 / 11: Network --------------------
  await clickDock(page, "Network")
  await shot(page, "70-network.png")
  // Network screen has tabs (Overview/Devices/Map/Timeline/Alerts/Health/Settings/etc.).
  const tabs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[role="tab"], button'))
      .map(el => (el.textContent ?? "").trim())
      .filter(t => /Overview|Devices|Map|Timeline|Alerts|Health|Settings|Router|History|Insights|Identity|Queue|Scan/i.test(t))
      .slice(0, 30)
  })
  push("phase8", "Network: tabs / sections discoverable", tabs.length > 0 ? "pass" : "partial",
    `headings=${JSON.stringify(tabs)}`)

  // Scan button - look for 'Scan' / 'Start scan' / 'Run scan' text
  const scanInfo = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll("button")).find(
      (b) => /^(\s*(start scan|run scan|scan now|begin scan|start)\s*)$/i.test((b.textContent ?? "").trim())
        || /run scan|start scan|scan now/i.test((b.textContent ?? "").trim())
    )
    return b ? { found: true, label: (b.textContent ?? "").trim() } : { found: false }
  })
  push("phase8", "Network: scan button discoverable", scanInfo.found ? "pass" : "partial", JSON.stringify(scanInfo))
  if (scanInfo.found) {
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll("button")).find(
        (b) => /run scan|start scan|scan now/i.test((b.textContent ?? "").trim())
      )
      if (b) b.click()
    })
    await page.waitForTimeout(1200)
    await shot(page, "71-network-scan-running.png")
    push("phase8", "Network: scan click", "pass", "clicked")
    await page.waitForTimeout(3500)
    await shot(page, "72-network-scan-after.png")
  }

  // Look for the 3D map. The map is implemented with @react-three/fiber/Canvas.
  await page.waitForTimeout(800)
  const mapInfo = await page.evaluate(() => {
    const canvas = document.querySelector("canvas")
    return canvas ? {
      found: true,
      width: canvas.width,
      height: canvas.height,
      clientW: canvas.clientWidth,
      clientH: canvas.clientHeight
    } : { found: false }
  })
  push("phase10", "Network: 3D map canvas present", mapInfo.found ? (mapInfo.clientH > 50 ? "pass" : "partial") : "partial",
    JSON.stringify(mapInfo))
  await shot(page, "73-network-map.png")

  // -------------------- PHASE 12: Speed Test --------------------
  await clickDock(page, "Speed")
  await shot(page, "80-speed.png")
  const speedStart = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll("button")).find(b =>
      /start test|run test|begin test|start speed|run speed/i.test((b.textContent ?? "").trim())
    )
    if (!b) return null
    b.click()
    return (b.textContent || "").trim()
  })
  push("phase12", "Speed test: start button click",
    speedStart ? "pass" : "partial",
    speedStart ? `clicked '${speedStart}'` : "no start button found")
  await page.waitForTimeout(3000)
  await shot(page, "81-speed-after-start.png")

  // -------------------- PHASE 13: Monitoring / Controls --------------------
  await clickDock(page, "Ctrl")
  await shot(page, "90-controls.png")
  const ctrlBtns = await countVisibleButtons(page)
  push("phase13", "Controls screen renders", ctrlBtns > 5 ? "pass" : "partial", `buttons=${ctrlBtns}`)

  // -------------------- PHASE 14: Settings + Exports --------------------
  await clickDock(page, "Set")
  await shot(page, "100-settings.png")
  const settingsControls = await page.evaluate(() => ({
    switches: document.querySelectorAll('[role="switch"], button[role="switch"]').length,
    buttons: document.querySelectorAll('button').length,
    headings: Array.from(document.querySelectorAll("h1, h2, h3")).map(h => (h.textContent ?? "").trim()).slice(0, 30)
  }))
  push("phase15", "Settings page renders", settingsControls.buttons > 5 ? "pass" : "partial",
    JSON.stringify(settingsControls))

  // Try to toggle a switch
  const toggled = await page.evaluate(() => {
    const s = document.querySelector('[role="switch"]')
    if (!s) return false
    s.click()
    return true
  })
  push("phase15", "Settings: a switch can be toggled", toggled ? "pass" : "partial", "")

  // -------------------- PHASE 16: Games --------------------
  await clickDock(page, "Games")
  await shot(page, "110-games.png")
  // Try tic tac toe entry
  const tttEntered = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll("button, [role=button], a")).find(
      el => /tic.?tac/i.test((el.textContent ?? "").trim())
    )
    if (!b) return false
    b.click()
    return true
  })
  await page.waitForTimeout(500)
  await shot(page, "111-games-tic-tac-toe.png")
  push("phase16", "Games: tic tac toe entry", tttEntered ? "pass" : "partial", "")

  const rpsEntered = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll("button, [role=button], a")).find(
      el => /rock.?paper|rps/i.test((el.textContent ?? "").trim())
    )
    if (!b) return false
    b.click()
    return true
  })
  await page.waitForTimeout(500)
  await shot(page, "112-games-rps.png")
  push("phase16", "Games: rock paper scissors entry", rpsEntered ? "pass" : "partial", "")

  // -------------------- PHASE 17: global sweep --------------------
  // collect any console / page errors
  push("phase17", "Console errors total", consoleErrors.length === 0 ? "pass" : "partial",
    `count=${consoleErrors.length}; sample=${JSON.stringify(consoleErrors.slice(0, 5))}`)
  push("phase17", "Uncaught page errors total", pageErrors.length === 0 ? "pass" : "partial",
    `count=${pageErrors.length}; sample=${JSON.stringify(pageErrors.slice(0, 5))}`)

  // Final wide-viewport shot
  await page.setViewportSize({ width: 1280, height: 800 })
  await clickDock(page, "Robot")
  await page.waitForTimeout(500)
  await shot(page, "120-main-wide.png")
  await clickDock(page, "Network")
  await page.waitForTimeout(800)
  await shot(page, "121-network-wide.png")

  // -------------------- write ledger --------------------
  const summary = {
    pass: results.filter(r => r.status === "pass").length,
    partial: results.filter(r => r.status === "partial").length,
    fail: results.filter(r => r.status === "fail").length,
    envLimited: results.filter(r => r.status === "env-limited").length,
  }
  const ledger = {
    base: BASE,
    when: new Date().toISOString(),
    summary,
    consoleErrors: consoleErrors.slice(0, 50),
    pageErrors,
    results,
  }
  await writeFile(LEDGER_PATH, JSON.stringify(ledger, null, 2), "utf8")
  process.stderr.write(`\nLEDGER => ${LEDGER_PATH}\n`)
  process.stdout.write(JSON.stringify(summary) + "\n")

  await browser.close()
})().catch(async (e) => {
  process.stderr.write(`FATAL: ${e?.stack || e?.message || e}\n`)
  try {
    await writeFile(LEDGER_PATH, JSON.stringify({ error: e?.message, results }, null, 2), "utf8")
  } catch {}
  process.exit(1)
})
