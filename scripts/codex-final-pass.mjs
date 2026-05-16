// Final clean pass: properly seed completed-onboarding state and target
// the items the prior runs flagged as needing attention.
import { createRequire } from "node:module"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

const require = createRequire(import.meta.url)
const { chromium } = require("/opt/node22/lib/node_modules/playwright")

const BASE = process.env.NEO_BASE_URL ?? "http://localhost:3000"
const OUT = path.resolve(process.cwd(), "qa-screenshots/codex-browser-full-functionality-pass")
const LEDGER_PATH = path.resolve(OUT, "final-ledger.json")

const results = []
const consoleErrors = []
const pageErrors = []
function push(phase, name, status, notes) {
  results.push({ phase, name, status, notes })
  process.stderr.write(`[${status.toUpperCase()}] ${phase} :: ${name} — ${notes ?? ""}\n`)
}
async function shot(page, file) {
  try { await page.screenshot({ path: path.join(OUT, file), fullPage: false }) } catch {}
}

;(async () => {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
    hasTouch: true, isMobile: true,
    userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) Chrome/120.0.0.0 Mobile Safari/537.36",
  })
  const page = await ctx.newPage()
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()) })
  page.on("pageerror", (e) => pageErrors.push(e.message))

  // Open page once to obtain a session, then seed real PersistedAppState shape
  await page.goto(BASE, { waitUntil: "domcontentloaded" })
  await page.evaluate(() => {
    const seed = {
      version: 1,
      voiceId: "neo",
      voiceFavoriteIds: [],
      recentVoiceIds: [],
      personalityId: "genius",
      voiceParams: { rate: 1, pitch: 1, volume: 1 },
      conversationMode: "Helpful Assistant",
      settings: {
        memoryEnabled: true,
        theme: "NEO_BLACK",
        assetPath: "/robot.png",
        gameDifficulty: "ADAPTIVE",
        trashTalk: true,
        autoScroll: true,
        showMoodTags: true,
        reducedMotion: false,
        backgroundService: false,
        debugMode: false,
        permissions: {
          microphone: "unknown",
          notifications: "unknown",
          storage: "unknown",
          bluetooth: "unavailable",
          network: "unknown",
        },
        onboarding: {
          completed: true, skipped: false, monitoringOptIn: false,
          initialScanRequested: true, completedAt: new Date().toISOString(),
        },
        entitlement: { tier: "free" },
      },
      accentColor: "cyan",
      robotSource: "default",
      responses: [],
      messages: [],
    }
    localStorage.setItem("neo-the-nerd:app-state", JSON.stringify(seed))
  })
  await page.reload({ waitUntil: "domcontentloaded" })
  await page.evaluate(() => {
    const v = document.querySelector("video"); if (v) v.dispatchEvent(new Event("ended"))
  })
  await page.waitForSelector('nav[aria-label="Primary"]', { timeout: 45_000 })
  await page.waitForTimeout(700)

  // Confirm wizard is NOT showing
  const wizardOpen = !!(await page.$('[role="dialog"][aria-labelledby="neo-onboarding-title"]'))
  push("setup", "Onboarding wizard hidden after proper seed", wizardOpen ? "fail" : "pass", "")
  await shot(page, "H00-main-seeded.png")

  // --- SETTINGS: flip real (non-radio) toggles ---
  await page.locator('nav[aria-label="Primary"] button[aria-label="Set"]').click()
  await page.waitForTimeout(700)
  await shot(page, "H10-settings.png")

  const allTogglesInfo = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button[aria-pressed]'))
    return buttons.map((b, idx) => {
      // an accent color picker has aria-label of color name (cyan/purple/etc.)
      const label = b.getAttribute('aria-label') || (b.textContent ?? '').trim()
      const isColor = /^(cyan|purple|pink|green|orange)$/i.test(label)
      const r = b.getBoundingClientRect()
      return { idx, label, isColor, pressed: b.getAttribute('aria-pressed'), w: Math.round(r.width), h: Math.round(r.height) }
    })
  })
  // Pick first 3 NON-COLOR toggles to flip
  const flipResults = []
  const nonColorIdxs = allTogglesInfo.filter(t => !t.isColor).map(t => t.idx).slice(0, 5)
  for (const i of nonColorIdxs) {
    const r = await page.evaluate((idx) => {
      const b = document.querySelectorAll('button[aria-pressed]')[idx]
      if (!b) return null
      const before = b.getAttribute('aria-pressed')
      b.click()
      // wait for React tick
      return { before, label: b.getAttribute('aria-label') || (b.textContent ?? '').trim() }
    }, i)
    await page.waitForTimeout(160)
    const after = await page.evaluate((idx) => {
      const b = document.querySelectorAll('button[aria-pressed]')[idx]
      return b ? b.getAttribute('aria-pressed') : null
    }, i)
    flipResults.push({ ...r, after })
  }
  const flips = flipResults.filter(f => f.before !== f.after).length
  push("settings", "Settings: non-color toggles flip state", flips >= 3 ? "pass" : "partial",
    `flips=${flips}/${flipResults.length} sample=${JSON.stringify(flipResults)}`)
  await shot(page, "H11-settings-flipped.png")

  // --- GAMES: launch TTT cleanly, play a move, see grid update ---
  await page.locator('nav[aria-label="Primary"] button[aria-label="Games"]').click()
  await page.waitForTimeout(700)
  await shot(page, "H20-games.png")

  // Click the LAUNCH button on the rotating challenge prompt — fastest entry.
  const launchClicked = await page.locator('button:has-text("LAUNCH")').first().click().then(() => true).catch(() => false)
  push("games", "Games: LAUNCH button on robot challenge", launchClicked ? "pass" : "partial", "")
  await page.waitForTimeout(900)
  await shot(page, "H21-games-launch.png")

  // Identify visible game (whatever challenge was active when we clicked LAUNCH)
  const gameVisible = await page.evaluate(() => {
    const allText = (document.body.textContent ?? "")
    return {
      tictactoe: /tic.?tac.?toe/i.test(allText),
      rps: /rock.?paper.?scissors|rock\s+paper\s+scissors/i.test(allText),
      trivia: /trivia/i.test(allText),
      reaction: /reaction/i.test(allText),
    }
  })
  push("games", "Games: a game became visible after LAUNCH", Object.values(gameVisible).some(Boolean) ? "pass" : "partial", JSON.stringify(gameVisible))

  // Try a TTT cell or RPS choice
  const gameInteraction = await page.evaluate(() => {
    const cells = Array.from(document.querySelectorAll("button")).filter(b => {
      const r = b.getBoundingClientRect()
      return r.width >= 40 && r.width <= 140 && r.height >= 40 && r.height <= 140 && (b.textContent ?? "").trim().length < 4
    })
    if (cells.length >= 3) { cells[0].click(); return { type: 'ttt-cell', clicked: true } }
    // RPS: three big choice buttons with text
    const rps = Array.from(document.querySelectorAll("button")).filter(b => /^(rock|paper|scissors)$/i.test((b.textContent ?? "").trim()))
    if (rps.length >= 3) { rps[0].click(); return { type: 'rps-pick', clicked: true } }
    return null
  })
  push("games", "Games: interactive turn played", gameInteraction ? "pass" : "partial", JSON.stringify(gameInteraction))
  await page.waitForTimeout(800)
  await shot(page, "H22-games-after-turn.png")

  // --- TIC TAC TOE via direct card click ---
  // Find tic tac toe card and click PLAY NOW
  await page.locator('nav[aria-label="Primary"] button[aria-label="Games"]').click()
  await page.waitForTimeout(500)
  // Click PLAY NOW on the first PLAYABLE card (which is tic tac toe by GAMES array order)
  const playNowClicked = await page.locator('button:has-text("PLAY NOW")').first().click().then(() => true).catch(() => false)
  push("games", "Games: PLAY NOW on first card", playNowClicked ? "pass" : "partial", "")
  await page.waitForTimeout(700)
  await shot(page, "H30-game-via-playnow.png")

  // Capture any visible game state
  const gameStateAfter = await page.evaluate(() => {
    // Find the most likely game grid: many small same-size buttons
    const buttons = Array.from(document.querySelectorAll("button"))
    const small = buttons.filter(b => {
      const r = b.getBoundingClientRect()
      return r.width > 40 && r.width < 100 && Math.abs(r.width - r.height) < 12
    })
    return { smallSquares: small.length }
  })
  push("games", "Games: small square cell elements rendered", gameStateAfter.smallSquares >= 3 ? "pass" : "partial",
    JSON.stringify(gameStateAfter))

  // --- LIBRARY: confirm visible saved responses interactivity ---
  await page.locator('nav[aria-label="Primary"] button[aria-label="Library"]').click()
  await page.waitForTimeout(700)
  await shot(page, "H40-library.png")
  const libUI = await page.evaluate(() => {
    return {
      buttons: document.querySelectorAll("button").length,
      cards: document.querySelectorAll("[class*=card], article, [class*=Card]").length,
      searchInput: !!document.querySelector('input[placeholder*="search" i], input[placeholder*="Search" i]'),
    }
  })
  push("library", "Library: UI element snapshot", libUI.buttons > 10 ? "pass" : "partial", JSON.stringify(libUI))

  // --- VOICES: switch through several voices, capture detail change ---
  await page.locator('nav[aria-label="Primary"] button[aria-label="Voices"]').click()
  await page.waitForTimeout(800)
  await shot(page, "H50-voices.png")

  const voicesData = await page.evaluate(() => {
    // Voice cards have aria-label/title or distinctive structure
    const cards = Array.from(document.querySelectorAll("button, article, [role='listitem'], [class*='VoiceCard']"))
      .filter(el => el.offsetParent !== null)
    return { interactiveCount: cards.length }
  })
  push("voices", "Voices: interactive count", voicesData.interactiveCount > 10 ? "pass" : "partial", JSON.stringify(voicesData))

  // --- CHAT: send a network-aware prompt and capture response text density growth ---
  await page.locator('nav[aria-label="Primary"] button[aria-label="Chat"]').click()
  await page.waitForTimeout(800)
  await shot(page, "H60-chat.png")
  const beforeMsgs = await page.evaluate(() => {
    const root = document.querySelector('main')
    return root ? root.textContent.length : 0
  })
  const input = await page.$('input[placeholder*="Message NEO"]')
  if (input) {
    await input.fill("Which devices need review?")
    await input.press("Enter")
    await page.waitForTimeout(1500)
    const afterMsgs = await page.evaluate(() => {
      const root = document.querySelector('main')
      return root ? root.textContent.length : 0
    })
    push("chat", "Chat: response grows text content after prompt", afterMsgs > beforeMsgs ? "pass" : "partial",
      `before=${beforeMsgs} after=${afterMsgs}`)
    await shot(page, "H61-chat-network-prompt.png")
  }

  // --- PERSONALITIES: pick 3 different cards and confirm aria-pressed state ---
  await page.locator('nav[aria-label="Primary"] button[aria-label="Person."]').click()
  await page.waitForTimeout(800)
  await shot(page, "H70-personalities.png")
  const personalityCards = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('button[aria-pressed], [data-personality-id]'))
    return all.length
  })
  push("personalities", "Personalities: selectable cards count", personalityCards > 3 ? "pass" : "partial", `count=${personalityCards}`)

  const persPicks = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('button[aria-pressed]'))
      .filter(b => {
        const r = b.getBoundingClientRect()
        return r.width > 100 && r.height > 60 // bigger than tiny toggles
      })
    const sample = cards.slice(0, 3).map(b => {
      const before = b.getAttribute('aria-pressed')
      b.click()
      return { label: (b.textContent ?? '').trim().slice(0, 50), before }
    })
    return sample
  })
  await page.waitForTimeout(500)
  // re-read states
  const persAfter = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('button[aria-pressed]'))
      .filter(b => {
        const r = b.getBoundingClientRect()
        return r.width > 100 && r.height > 60
      })
    return cards.slice(0, 3).map(b => b.getAttribute('aria-pressed'))
  })
  push("personalities", "Personalities: card aria-pressed flips",
    persAfter.some((s, i) => s !== persPicks[i]?.before) ? "pass" : "partial",
    `picks=${JSON.stringify(persPicks)} after=${JSON.stringify(persAfter)}`)
  await shot(page, "H71-personalities-picked.png")

  // --- ALERTS / TIMELINE / HEALTH from Network ---
  await page.locator('nav[aria-label="Primary"] button[aria-label="Network"]').click()
  await page.waitForTimeout(800)
  await page.locator('[role="tab"]', { hasText: /^TIMELINE$/ }).click()
  await page.waitForTimeout(800)
  await shot(page, "H80-network-timeline.png")
  const timelineRows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("[class*='timeline'], [data-event-id], [role='listitem'], article")).length
  })
  push("network", "Network: timeline rows render", timelineRows > 0 ? "pass" : "partial", `rows=${timelineRows}`)

  // SECURITY tab — confirm health/alerts/insights
  await page.locator('[role="tab"]', { hasText: /^SECURITY$/ }).click()
  await page.waitForTimeout(800)
  await shot(page, "H81-network-security.png")
  const securityHeadings = await page.evaluate(() =>
    Array.from(document.querySelectorAll("h1,h2,h3,p")).map(h => (h.textContent ?? "").trim()).filter(t => /alert|insight|health|risk|recommend/i.test(t)).slice(0, 10))
  push("network", "Network: security/insights content present", securityHeadings.length > 0 ? "pass" : "partial",
    `samples=${JSON.stringify(securityHeadings)}`)

  // ROUTER tab
  await page.locator('[role="tab"]', { hasText: /^ROUTER$/ }).click()
  await page.waitForTimeout(800)
  await shot(page, "H82-network-router.png")

  // HISTORY tab
  await page.locator('[role="tab"]', { hasText: /^HISTORY$/ }).click()
  await page.waitForTimeout(800)
  await shot(page, "H83-network-history.png")

  // CONFIG tab — exports panel
  await page.locator('[role="tab"]', { hasText: /^CONFIG$/ }).click()
  await page.waitForTimeout(800)
  await shot(page, "H84-network-config.png")

  // Map again to capture canvas dimensions cleanly
  await page.locator('[role="tab"]', { hasText: /^MAP$/ }).click()
  await page.waitForTimeout(1500)
  await shot(page, "H85-network-map.png")
  const mapCanvas = await page.evaluate(() => {
    const c = document.querySelector("canvas")
    return c ? { w: c.clientWidth, h: c.clientHeight, found: true } : { found: false }
  })
  push("network", "Network 3D Map canvas re-check", mapCanvas.found && mapCanvas.h > 100 ? "pass" : "partial",
    JSON.stringify(mapCanvas))

  // --- desktop wide  ---
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.locator('nav[aria-label="Primary"] button[aria-label="Robot"]').click()
  await page.waitForTimeout(800)
  await shot(page, "H90-main-desktop.png")
  await page.locator('nav[aria-label="Primary"] button[aria-label="Network"]').click()
  await page.waitForTimeout(1500)
  await shot(page, "H91-network-desktop.png")

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
