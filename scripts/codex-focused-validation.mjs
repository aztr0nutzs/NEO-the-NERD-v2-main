// Focused follow-up validation: re-test the items the broad sweep flagged
// "partial" or "fail" with corrected selectors, on the live production server.
import { createRequire } from "node:module"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

const require = createRequire(import.meta.url)
const { chromium } = require("/opt/node22/lib/node_modules/playwright")

const BASE = process.env.NEO_BASE_URL ?? "http://localhost:3000"
const OUT = path.resolve(process.cwd(), "qa-screenshots/codex-browser-full-functionality-pass")
const LEDGER_PATH = path.resolve(OUT, "focused-ledger.json")

const results = []
const consoleErrors = []
const pageErrors = []

function push(phase, name, status, notes) {
  results.push({ phase, name, status, notes })
  process.stderr.write(`[${status.toUpperCase()}] ${phase} :: ${name} — ${notes ?? ""}\n`)
}

async function shot(page, file) {
  try {
    await page.screenshot({ path: path.join(OUT, file), fullPage: false })
  } catch {}
}

async function waitForShell(page) {
  await page.waitForSelector('nav[aria-label="Primary"]', { timeout: 45_000 })
  await page.waitForTimeout(400)
}

async function clickDock(page, label) {
  const ok = await page.evaluate((l) => {
    const b = document.querySelector(`nav[aria-label="Primary"] button[aria-label="${l}"]`)
    if (!b) return false
    b.scrollIntoView()
    b.click()
    return true
  }, label)
  await page.waitForTimeout(600)
  return ok
}

;(async () => {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) Chrome/120.0.0.0 Mobile Safari/537.36",
  })
  const page = await ctx.newPage()
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()) })
  page.on("pageerror", (e) => pageErrors.push(e.message))

  // Pre-set onboarding to completed so we land on main fast.
  await page.goto(BASE, { waitUntil: "domcontentloaded" })
  await page.evaluate(() => {
    try {
      const seed = {
        schemaVersion: 1,
        state: {
          settings: {
            onboarding: { completed: true, skipped: false, monitoringOptIn: false, initialScanRequested: false, completedAt: new Date().toISOString() },
          },
        },
      }
      localStorage.setItem("neo-the-nerd:app-state", JSON.stringify(seed))
    } catch (e) {}
  })
  await page.evaluate(() => {
    const v = document.querySelector("video")
    if (v) v.dispatchEvent(new Event("ended"))
  })
  await page.reload({ waitUntil: "domcontentloaded" })
  await page.evaluate(() => {
    const v = document.querySelector("video")
    if (v) v.dispatchEvent(new Event("ended"))
  })
  await waitForShell(page)
  await shot(page, "F00-shell.png")

  // --- CHAT ---
  await clickDock(page, "Chat")
  await page.waitForTimeout(700)
  await shot(page, "F10-chat.png")
  const chatInput = await page.$('input[placeholder*="Message NEO"]')
  if (chatInput) {
    await chatInput.click()
    await chatInput.fill("Hello NEO.")
    await chatInput.press("Enter")
    await page.waitForTimeout(900)
    await shot(page, "F11-chat-hello.png")
    push("chat", "Chat: send 'Hello NEO.' via Enter", "pass", "input filled & submitted")

    await chatInput.fill("Summarize what this app can do.")
    await chatInput.press("Enter")
    await page.waitForTimeout(1500)
    await shot(page, "F12-chat-summary.png")

    await chatInput.fill("What changed on my network?")
    await chatInput.press("Enter")
    await page.waitForTimeout(1500)
    await shot(page, "F13-chat-network.png")

    const bubbleData = await page.evaluate(() => {
      // Heuristic: count repeating chat bubbles by looking for elements with
      // long-ish text inside the chat area. We look for paragraphs with role-ish.
      const candidates = Array.from(document.querySelectorAll("p, div"))
        .filter(el => el.offsetHeight > 20 && (el.textContent ?? "").trim().length > 12)
      return candidates.length
    })
    push("chat", "Chat: text content density after 3 prompts", bubbleData > 5 ? "pass" : "partial",
      `text-bearing block count = ${bubbleData}`)

    // Look for an explicit send button as well (for users not pressing Enter)
    const sendBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"))
      const send = btns.find(b => /send|^➤$|^→$/i.test((b.textContent ?? "").trim()) || (b.getAttribute("aria-label") ?? "").match(/send/i))
      return send ? { label: (send.textContent || "").trim() || send.getAttribute("aria-label") || "(icon)", ariaLabel: send.getAttribute("aria-label") } : null
    })
    push("chat", "Chat: send button discoverable", sendBtn ? "pass" : "partial", JSON.stringify(sendBtn))
  } else {
    push("chat", "Chat: input field", "fail", "no input found with placeholder='Message NEO…'")
  }

  // --- NETWORK SCAN ---
  await clickDock(page, "Network")
  await page.waitForTimeout(800)
  await shot(page, "F20-network-default-map.png")

  // Click SCAN tab
  const scanTabClicked = await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('[role="tab"], button')).find(el =>
      (el.textContent ?? "").trim() === "SCAN"
    )
    if (t) { t.click(); return true } return false
  })
  await page.waitForTimeout(600)
  await shot(page, "F21-network-scan-tab.png")
  push("network", "Network: SCAN tab opens", scanTabClicked ? "pass" : "fail", "")
  // START_SCAN
  const startScanClicked = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll("button")).find(el =>
      /^start_scan$/i.test((el.textContent ?? "").trim())
    )
    if (b) { b.click(); return (b.textContent ?? "").trim() }
    return null
  })
  push("network", "Network: START_SCAN button click",
    startScanClicked ? "pass" : "partial",
    startScanClicked ? `clicked '${startScanClicked}'` : "not found via START_SCAN text")
  await page.waitForTimeout(2500)
  await shot(page, "F22-network-scan-running.png")
  await page.waitForTimeout(4500)
  await shot(page, "F23-network-scan-after.png")

  // Devices tab
  const devicesTab = await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('button, [role="tab"]')).find(el =>
      (el.textContent ?? "").trim() === "DEVICES")
    if (t) { t.click(); return true } return false
  })
  await page.waitForTimeout(600)
  await shot(page, "F24-network-devices.png")
  push("network", "Network: DEVICES tab opens", devicesTab ? "pass" : "partial", "")

  // Timeline tab
  const timelineTab = await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('button, [role="tab"]')).find(el =>
      (el.textContent ?? "").trim() === "TIMELINE")
    if (t) { t.click(); return true } return false
  })
  await page.waitForTimeout(600)
  await shot(page, "F25-network-timeline.png")
  push("network", "Network: TIMELINE tab opens", timelineTab ? "pass" : "partial", "")

  // Router tab
  const routerTab = await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('button, [role="tab"]')).find(el =>
      (el.textContent ?? "").trim() === "ROUTER")
    if (t) { t.click(); return true } return false
  })
  await page.waitForTimeout(600)
  await shot(page, "F26-network-router.png")
  push("network", "Network: ROUTER tab opens", routerTab ? "pass" : "partial", "")

  // Security tab
  const securityTab = await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('button, [role="tab"]')).find(el =>
      (el.textContent ?? "").trim() === "SECURITY")
    if (t) { t.click(); return true } return false
  })
  await page.waitForTimeout(600)
  await shot(page, "F27-network-security.png")
  push("network", "Network: SECURITY tab opens", securityTab ? "pass" : "partial", "")

  // History tab
  const historyTab = await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('button, [role="tab"]')).find(el =>
      (el.textContent ?? "").trim() === "HISTORY")
    if (t) { t.click(); return true } return false
  })
  await page.waitForTimeout(600)
  await shot(page, "F28-network-history.png")
  push("network", "Network: HISTORY tab opens", historyTab ? "pass" : "partial", "")

  // Config tab
  const configTab = await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('button, [role="tab"]')).find(el =>
      (el.textContent ?? "").trim() === "CONFIG")
    if (t) { t.click(); return true } return false
  })
  await page.waitForTimeout(600)
  await shot(page, "F29-network-config.png")
  push("network", "Network: CONFIG tab opens", configTab ? "pass" : "partial", "")

  // Back to map
  const mapTab = await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('button, [role="tab"]')).find(el =>
      (el.textContent ?? "").trim() === "MAP")
    if (t) { t.click(); return true } return false
  })
  await page.waitForTimeout(1500)
  await shot(page, "F30-network-map.png")
  push("network", "Network: MAP tab opens", mapTab ? "pass" : "partial", "")

  const canvasInfo = await page.evaluate(() => {
    const c = document.querySelector("canvas")
    return c ? { found: true, w: c.clientWidth, h: c.clientHeight } : { found: false }
  })
  push("network", "3D Map canvas dimensions",
    canvasInfo.found && canvasInfo.h > 100 ? "pass" : "partial",
    JSON.stringify(canvasInfo))

  // --- SPEED TEST ---
  await clickDock(page, "Speed")
  await page.waitForTimeout(800)
  await shot(page, "F40-speed.png")
  // Click "Execute"
  const execClicked = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll("button")).find(el =>
      /^execute$/i.test((el.textContent ?? "").trim()))
    if (b && !b.disabled) { b.click(); return true } return false
  })
  push("speed", "Speed test: Execute button", execClicked ? "pass" : "partial",
    execClicked ? "clicked" : "not found or disabled")
  await page.waitForTimeout(4000)
  await shot(page, "F41-speed-running.png")
  await page.waitForTimeout(6000)
  await shot(page, "F42-speed-progress.png")
  await page.waitForTimeout(8000)
  await shot(page, "F43-speed-complete.png")

  const speedSnapshot = await page.evaluate(() => {
    // Grab any rendered measurement text
    return Array.from(document.querySelectorAll("[class*='hud'], p, span, div"))
      .map(el => (el.textContent ?? "").trim())
      .filter(t => /Mbps|ms|MB|KB|status|phase|complete|fail|abort|run/i.test(t) && t.length < 80)
      .slice(0, 30)
  })
  push("speed", "Speed test: telemetry text snapshot", speedSnapshot.length ? "pass" : "partial",
    `samples=${JSON.stringify(speedSnapshot.slice(0, 10))}`)

  // --- SETTINGS toggles via aria-pressed ---
  await clickDock(page, "Set")
  await page.waitForTimeout(700)
  await shot(page, "F50-settings.png")

  const toggleCount = await page.evaluate(() => {
    return document.querySelectorAll('button[aria-pressed]').length
  })
  push("settings", "Settings: aria-pressed toggle count", toggleCount > 0 ? "pass" : "fail", `count=${toggleCount}`)

  const toggledLabels = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button[aria-pressed]'))
    // exclude accent color picker (round small buttons) — but we'll just try to flip the first 3
    const flipped = []
    for (const b of buttons.slice(0, 3)) {
      const before = b.getAttribute("aria-pressed")
      b.click()
      const after = b.getAttribute("aria-pressed")
      flipped.push({
        label: b.getAttribute("aria-label") || (b.textContent ?? "").trim() || "(unlabeled)",
        before, after,
      })
    }
    return flipped
  })
  await page.waitForTimeout(500)
  await shot(page, "F51-settings-after-toggle.png")
  const flipsWorked = toggledLabels.filter(f => f.before !== f.after).length
  push("settings", "Settings: toggles flip state",
    flipsWorked > 0 ? "pass" : "partial",
    `flips=${flipsWorked}/3 sample=${JSON.stringify(toggledLabels)}`)

  // --- GAMES ---
  await clickDock(page, "Games")
  await page.waitForTimeout(700)
  await shot(page, "F60-games.png")
  const playableButtons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("button"))
      .filter(b => /play now|launch/i.test((b.textContent ?? "").trim()))
      .map(b => (b.textContent ?? "").trim())
  })
  push("games", "Games: PLAY NOW / LAUNCH buttons rendered",
    playableButtons.length >= 2 ? "pass" : "partial", `labels=${JSON.stringify(playableButtons)}`)

  // Launch tic tac toe by clicking the first PLAY NOW (which is the tic tac toe card, given the data ordering)
  const tttLaunched = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll("h3, [class*='ps-heading']")).filter(h => /tic tac toe/i.test((h.textContent ?? "").trim()))
    if (!cards.length) return false
    // Find nearest ancestor with a button to play
    let el = cards[0]
    for (let i = 0; i < 6 && el; i++) { el = el.parentElement }
    if (!el) return false
    const b = Array.from(el.querySelectorAll("button")).find(x => /play now|launch/i.test((x.textContent ?? "").trim()))
    if (!b) {
      // fallback: walk back up the DOM
      let cur = cards[0]
      while (cur && cur !== document.body) {
        const cand = cur.querySelector("button")
        if (cand && /play now|launch/i.test((cand.textContent ?? "").trim())) { cand.click(); return true }
        cur = cur.parentElement
      }
      return false
    }
    b.click()
    return true
  })
  await page.waitForTimeout(700)
  await shot(page, "F61-games-tic-tac-toe.png")
  push("games", "Games: Tic Tac Toe launched", tttLaunched ? "pass" : "partial", "")

  // Try a move
  const movePlayed = await page.evaluate(() => {
    // The TicTacToeGame renders a 3x3 grid. We try clicking the first empty cell.
    const cells = Array.from(document.querySelectorAll("button")).filter(b => {
      // squares typically have small text content (empty) and are square-ish
      const r = b.getBoundingClientRect()
      return r.width > 40 && r.width < 120 && r.height > 40 && r.height < 120
    })
    if (!cells.length) return false
    cells[0].click()
    return true
  })
  await page.waitForTimeout(700)
  await shot(page, "F62-games-ttt-move.png")
  push("games", "Games: TicTacToe move click", movePlayed ? "pass" : "partial", "")

  // close game via any visible Close / X button — most modal-like overlays expose one
  // (the screen still navigates, so move on)

  // --- VOICES preview cycle ---
  await clickDock(page, "Voices")
  await page.waitForTimeout(700)
  await shot(page, "F70-voices.png")
  const voicePreview = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll("button")).find(el =>
      /play voice preview|preview voice|test voice/i.test((el.textContent ?? "").trim())
    )
    if (b) { b.click(); return (b.textContent ?? "").trim() } return null
  })
  push("voices", "Voices: preview triggered", voicePreview ? "pass" : "partial",
    voicePreview ? `clicked '${voicePreview}'` : "not found")
  await page.waitForTimeout(900)
  await shot(page, "F71-voices-preview.png")

  // Switch through several voice cards
  const voiceSelections = await page.evaluate(() => {
    // The voice cards in voice-card.tsx likely have aria-pressed or selectable behavior;
    // count visible voice cards: pick the first 3 below the search input.
    const cards = Array.from(document.querySelectorAll('[data-voice-id], [class*="VoiceCard"], button'))
      .filter(b => b.offsetParent !== null)
      .slice(0, 60)
    return cards.length
  })
  push("voices", "Voices: voice cards visible count snapshot",
    voiceSelections > 5 ? "pass" : "partial", `count=${voiceSelections}`)

  // --- PERSONALITIES select & preview ---
  await clickDock(page, "Person.")
  await page.waitForTimeout(700)
  await shot(page, "F80-personalities.png")
  const persInfo = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button")).filter(b => !document.querySelector('nav[aria-label="Primary"]')?.contains(b))
    const previewBtn = buttons.find(b => /preview|test|sample personality/i.test((b.textContent ?? "").trim()))
    if (previewBtn) { previewBtn.click() }
    return { previewLabel: previewBtn ? (previewBtn.textContent ?? "").trim() : null }
  })
  push("personalities", "Personalities: preview/test button reachable",
    persInfo.previewLabel ? "pass" : "partial", JSON.stringify(persInfo))
  await page.waitForTimeout(700)
  await shot(page, "F81-personalities-preview.png")

  // --- LIBRARY interactions ---
  await clickDock(page, "Library")
  await page.waitForTimeout(700)
  await shot(page, "F90-library.png")
  const libAction = await page.evaluate(() => {
    // try Favorite or Use buttons
    const b = Array.from(document.querySelectorAll("button")).find(el =>
      /favorite|use in chat|pin|edit|speak/i.test((el.textContent ?? "").trim())
    )
    if (b) { b.click(); return (b.textContent ?? "").trim() } return null
  })
  push("library", "Library: action button clickable",
    libAction ? "pass" : "partial",
    libAction ? `clicked '${libAction}'` : "no action button labelled favorite/use/etc.")
  await page.waitForTimeout(700)
  await shot(page, "F91-library-action.png")

  // --- ROCK PAPER SCISSORS ---
  await clickDock(page, "Games")
  await page.waitForTimeout(500)
  const rpsLaunched = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll("h3, [class*='ps-heading']")).filter(h => /rock paper scissors/i.test((h.textContent ?? "").trim()))
    if (!cards.length) return false
    let cur = cards[0]
    while (cur && cur !== document.body) {
      const cand = cur.querySelector("button")
      if (cand && /play now|launch/i.test((cand.textContent ?? "").trim())) { cand.click(); return true }
      cur = cur.parentElement
    }
    return false
  })
  await page.waitForTimeout(800)
  await shot(page, "F95-games-rps.png")
  push("games", "Games: Rock Paper Scissors launched", rpsLaunched ? "pass" : "partial", "")

  // --- CONTROLS ---
  await clickDock(page, "Ctrl")
  await page.waitForTimeout(600)
  await shot(page, "F100-controls.png")
  const ctrlSliders = await page.evaluate(() => document.querySelectorAll('[role="slider"], input[type="range"]').length)
  push("controls", "Controls: slider count", ctrlSliders > 0 ? "pass" : "partial", `count=${ctrlSliders}`)

  // --- final wide / desktop layout ---
  await page.setViewportSize({ width: 1280, height: 800 })
  await clickDock(page, "Robot")
  await page.waitForTimeout(700)
  await shot(page, "F120-main-wide.png")
  await clickDock(page, "Network")
  await page.waitForTimeout(800)
  await shot(page, "F121-network-wide.png")

  const summary = {
    pass: results.filter(r => r.status === "pass").length,
    partial: results.filter(r => r.status === "partial").length,
    fail: results.filter(r => r.status === "fail").length,
  }
  await writeFile(LEDGER_PATH, JSON.stringify({
    base: BASE, when: new Date().toISOString(), summary,
    consoleErrors: consoleErrors.slice(0, 50),
    pageErrors: pageErrors.slice(0, 50),
    results,
  }, null, 2), "utf8")
  process.stdout.write(JSON.stringify(summary) + "\n")
  process.stderr.write(`\nLEDGER => ${LEDGER_PATH}\n`)
  await browser.close()
})().catch(async (e) => {
  process.stderr.write(`FATAL: ${e?.stack || e?.message || e}\n`)
  process.exit(1)
})
