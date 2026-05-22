// One-shot: combine + scope the original Knxt 4 CSS under .knxt4-root.
// Reads /tmp/knxt4_extract/{neo-styles.css,game-styles.css} and writes the
// scoped result to components/games/knxt4/knxt4-styles.css.

import { readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

const TMP = process.argv[2] || "C:/Users/AZTR0N~1/AppData/Local/Temp/knxt4_extract"
const OUT = resolve("components/games/knxt4/knxt4-styles.css")
const SCOPE = ".knxt4-root"

const src1 = readFileSync(join(TMP, "neo-styles.css"), "utf8")
const src2 = readFileSync(join(TMP, "game-styles.css"), "utf8")

// 1) Drop global-page resets from game-styles.css (only the ones that touch
// html, body, #root). Keep .neo-phone__screen rule.
let combined = src1 + "\n\n" + src2

// Strip the well-known global resets at the head of game-styles.css.
combined = combined.replace(
  /html,\s*body\s*\{[^}]*\}\s*body\s*\{[^}]*\}\s*#root\s*\{[^}]*\}\s*/m,
  ""
)

function stripComments(s) {
  // Keep them — preserves verbatim character; ok to leave.
  return s
}

function tokenize(css) {
  // Walk and produce a list of tokens: 'atRuleBlock' (keyframes/font-face),
  // 'atRuleStatement' (@import), 'atRuleGroup' (@media/@supports + inner blocks),
  // 'rule' (selector + body).
  let i = 0
  const out = []
  const len = css.length
  const advancePast = (from, stopChars) => {
    // Walk from `from`, skipping over '..' / ".." string literals and /* */ comments,
    // returning the index of the first unquoted character whose code is in stopChars.
    let p = from
    while (p < len) {
      const ch = css[p]
      if (ch === "'" || ch === '"') {
        const q = ch
        p++
        while (p < len && css[p] !== q) {
          if (css[p] === "\\") p++
          p++
        }
        p++
        continue
      }
      if (ch === "/" && css[p + 1] === "*") {
        const end = css.indexOf("*/", p + 2)
        p = end < 0 ? len : end + 2
        continue
      }
      if (stopChars.includes(ch)) return p
      p++
    }
    return len
  }
  while (i < len) {
    // Skip leading whitespace + comments
    while (i < len && /\s/.test(css[i])) { out.push({ type: "ws", v: css[i] }); i++ }
    if (i >= len) break
    if (css.startsWith("/*", i)) {
      const end = css.indexOf("*/", i + 2)
      const stop = end < 0 ? len : end + 2
      out.push({ type: "comment", v: css.slice(i, stop) })
      i = stop
      continue
    }
    if (css[i] === "@") {
      // read at-keyword
      let j = i + 1
      while (j < len && /[\w-]/.test(css[j])) j++
      const name = css.slice(i, j)
      // find next ; or { (string-aware)
      let k = advancePast(j, [";", "{"])
      if (k < len && css[k] === ";") {
        out.push({ type: "atStmt", v: css.slice(i, k + 1) })
        i = k + 1
        continue
      }
      if (k >= len) { out.push({ type: "raw", v: css.slice(i) }); i = len; break }
      // brace block: find matching }
      let depth = 1
      let m = k + 1
      while (m < len && depth > 0) {
        if (css[m] === "{") depth++
        else if (css[m] === "}") depth--
        if (depth === 0) break
        m++
      }
      const prelude = css.slice(i, k) // includes name + selector
      const body = css.slice(k + 1, m)
      const trailingBrace = m < len ? "}" : ""
      const isKeyframes = /^@(-\w+-)?keyframes\b/.test(name)
      const isFontFace  = name === "@font-face"
      if (isKeyframes || isFontFace) {
        // Leave fully untouched.
        out.push({ type: "atBlockRaw", v: prelude + "{" + body + trailingBrace })
      } else {
        // Group rule: scope inner.
        out.push({ type: "atGroup", prelude, body })
      }
      i = m + 1
      continue
    }
    // Plain rule: read selector up to { (string-aware)
    const k = advancePast(i, ["{"])
    if (k >= len) { out.push({ type: "raw", v: css.slice(i) }); break }
    let depth = 1
    let m = k + 1
    while (m < len && depth > 0) {
      if (css[m] === "{") depth++
      else if (css[m] === "}") depth--
      if (depth === 0) break
      m++
    }
    const selectors = css.slice(i, k)
    const body = css.slice(k + 1, m)
    out.push({ type: "rule", selectors, body })
    i = m + 1
  }
  return out
}

function scopeSelectorList(selectors, scope) {
  return selectors
    .split(",")
    .map((s) => {
      const t = s.replace(/\s+/g, " ").trim()
      if (!t) return null
      if (t === scope || t.startsWith(scope)) return t
      // :root → attach CSS variables directly to the scope element.
      if (t === ":root") return scope
      // html, body, #root — drop (host owns these).
      if (t === "html" || t === "body" || t === "#root") return null
      // Stand-alone pseudo-class selectors are extremely rare; pass through.
      return `${scope} ${t}`
    })
    .filter(Boolean)
    .join(", ")
}

function emit(tokens) {
  let out = ""
  for (const t of tokens) {
    if (t.type === "ws" || t.type === "raw") out += t.v
    else if (t.type === "comment") out += t.v
    else if (t.type === "atStmt") out += t.v
    else if (t.type === "atBlockRaw") out += t.v
    else if (t.type === "atGroup") {
      // Re-tokenize and scope inner.
      const innerTokens = tokenize(t.body)
      out += t.prelude + "{" + emit(innerTokens) + "}"
    } else if (t.type === "rule") {
      const scoped = scopeSelectorList(t.selectors, SCOPE)
      if (!scoped) continue
      out += scoped + "{" + t.body + "}"
    }
  }
  return out
}

const tokens = tokenize(stripComments(combined))
const result = emit(tokens)

// Prepend a header comment.
const header =
  "/* Generated by scripts/scope-knxt4-css.mjs — DO NOT EDIT.\n" +
  "   Combines neo-styles.css + game-styles.css verbatim, scoped under " +
  SCOPE +
  ". */\n\n"

writeFileSync(OUT, header + result, "utf8")
console.log("wrote", OUT, "(" + (header.length + result.length) + " bytes)")
