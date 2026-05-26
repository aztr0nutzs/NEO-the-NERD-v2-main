#!/usr/bin/env node
const baseUrl = process.env.NEO_BACKEND_URL || process.env.NEXT_PUBLIC_NEO_BACKEND_BASE_URL || "http://localhost:3000"
const voices = ["alloy", "nova", "onyx", "marin"]

async function run() {
  const out = []
  for (const voiceId of voices) {
    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voiceId: mapVoiceId(voiceId), text: `Diagnostics sample for ${voiceId}.`, params: { speed: 50, pitch: 50, volume: 75, emotion: 60 } }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(`${voiceId} failed: ${json.error || res.status}`)
    out.push({ requested: voiceId, providerVoiceId: json.providerVoiceId, provider: json.provider })
  }
  console.table(out)
  const unique = new Set(out.map((v) => v.providerVoiceId))
  if (unique.size < 3) throw new Error(`Expected at least 3 distinct providerVoiceId values, got ${unique.size}`)
  console.log("PASS: provider voices are distinct.")
}

function mapVoiceId(providerVoice) {
  const mapping = { alloy: "neo", nova: "nova", onyx: "commander", marin: "velvet-circuit" }
  return mapping[providerVoice] || "neo"
}

run().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
