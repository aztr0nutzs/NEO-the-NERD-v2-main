# NEO Assistant Runtime

This is the canonical execution layer for NEO chat. All UI/store code goes through
`generateAssistantReply()` exported from `lib/assistant/assistant-runtime.ts`.
This document explains the decision tree, the contracts, and how the runtime
behaves in every mode the app ships in.

## Goals

1. **Always answer.** A user message must always produce a visible assistant
   reply. The chat must never get stuck in "responding" because of a network
   failure or missing backend.
2. **Truthful mode reporting.** The user must be able to see whether they are
   talking to a live AI provider or to the in-browser local response engine.
3. **Capacitor-correct.** Static Android builds must never attempt
   `fetch("/api/assistant/chat")` against a server that does not exist inside
   the APK.
4. **No layout damage.** The chat screen, avatar, dock, neon styling, and all
   other visual systems are preserved. Only a single compact `AI: …` status
   pill was added in the chat header.

## Modules

```
lib/assistant/
  assistant-runtime.ts      Single entry point: generateAssistantReply()
  assistantLocalRuntime.ts  Browser-side execution of the response engine
  assistantResponseEngine.ts Pure intent/emotion/library/personality engine
  assistantContext.ts       Builds AssistantContextSnapshot
  assistantPromptBuilder.ts Provider system-prompt builder
  assistantProvider.ts      Server-only OpenAI client
  assistantClient.ts        (legacy) server-only wrapper used by /api/chat
  providerTypes.ts          Shared API request/response types

lib/runtime/
  runtime-environment.ts    Detects web / Capacitor / static
  backend-config.ts         Resolves BackendMode from env + runtime
  backend-health.ts         30s-cached probe of /api/assistant/chat
  backend-client.ts         Typed transport: postAssistantChat, postTtsPreview

hooks/
  use-backend-runtime.ts    Engine label + AI status pill state
```

## Decision tree

`generateAssistantReply(input)` runs the following decisions in order. It
**never throws** — it always returns an `AssistantReplyResult`.

```
1. Sanitize input. Empty userMessage → friendly system prompt, status="ok".
2. Resolve BackendConfig + BackendHealth (cached).
3. If BackendMode === "unavailable":
       → run local engine.
       → mode="local-engine", status="config-fallback", providerAvailable=false.
4. If health.state === "unreachable":
       → run local engine.
       → mode="local-engine", status="provider-fallback", providerAvailable=false.
5. If health.state === "available-no-provider":
       → run local engine (no point calling the server just to get its own demo).
       → mode="local-engine", status="config-fallback", providerAvailable=false.
6. Otherwise call postAssistantChat() through the runtime transport.
       a. transport.outcome === "remote-success" AND payload.text usable AND NOT payload.fallback
          → mode="provider", status="ok", providerAvailable=true.
       b. transport.outcome === "remote-success" AND payload.fallback === true
          → server itself ran demo. mode="local-engine", status="config-fallback".
       c. transport.outcome === "remote-error"
          → run local engine, mode="local-engine", status="provider-fallback".
          → providerAvailable=true (we *tried*; the provider just failed).
       d. transport.outcome === "local-fallback" (BackendMode flipped)
          → run local engine, mode="local-engine", status="config-fallback".
       e. transport itself throws
          → catch + run local engine, status="provider-fallback".
7. If local engine raises mid-fallback (extremely unlikely; pure function),
   return a friendly hard-fail message and status="hard-fail".
```

## AssistantReplyResult contract

```ts
interface AssistantReplyResult {
  text: string                                            // body for the bubble
  mode: "provider" | "local-engine"
  providerAvailable: boolean                              // could provider have answered?
  fallbackReason?: string                                 // why local engine ran
  status: "ok" | "provider-fallback" | "config-fallback" | "hard-fail"
  category: ResponseCategory
  mood?: AssistantMood
  detectedIntent?: AssistantIntent
  emotion?: AssistantEmotionState
  reactionClip?: AvatarReactionKey
  suggestedActions?: string[]
  error?: string
  health?: BackendHealthSnapshot
}
```

## Provider vs local fallback truth table

| Runtime | `BACKEND_BASE_URL` | Health probe | Result |
|---|---|---|---|
| `next dev`, `OPENAI_API_KEY` set | unset | `available` + provider | `mode=provider`, `status=ok`, AI: CONNECTED |
| `next dev`, no key | unset | `available-no-provider` | `mode=local-engine`, `status=config-fallback`, AI: LOCAL FALLBACK |
| Capacitor APK | unset | (skipped) | `mode=local-engine`, `status=config-fallback`, AI: LOCAL FALLBACK |
| Capacitor APK | valid hosted URL, key set | `available` + provider | `mode=provider`, `status=ok`, AI: CONNECTED |
| Capacitor APK | invalid URL | `unreachable` | `mode=local-engine`, `status=provider-fallback`, AI: BACKEND UNAVAILABLE |
| Hosted | provider returns 500 | `available` then `unreachable` | `mode=local-engine`, `status=provider-fallback`, AI: BACKEND UNAVAILABLE |
| Hosted | provider returns valid text but `fallback:true` | `available-no-provider` | `mode=local-engine`, `status=config-fallback`, AI: LOCAL FALLBACK |

## Failure-path behavior

- The chat send state machine in `lib/store.tsx` is now driven entirely by
  `reply.status`. Only `status === "hard-fail"` produces:
    - `chatSendState = "error"`
    - `playAvatarReaction("angry")`
    - The reply text is the friendly hard-fail message (not the user-visible
      stack trace).
- All non-hard-fail outcomes produce:
    - `chatSendState = "success"`
    - Avatar reaction derived from emotion/category (never "angry")
    - Natural assistant message text with no raw diagnostic suffix.
    - Fallback truth exposed through the compact AI status pill and dev logging.
- The `setChatSendState("idle")` and `setMood("idle")` timers are scheduled
  unconditionally. There is no path that leaves the UI stuck in "thinking".

## Avatar reaction rules

| Result | Reaction |
|---|---|
| Provider success | `reactionClip` if present, else emotion-mapped (`happy` / `surprised` / `ecstatic`) |
| Local engine success (any reason) | Same as above — fallback no longer forces `surprised` |
| `status === "hard-fail"` | `angry` |
| Send in flight | `thinking` (set immediately on user submit) |

## Conversation consistency

- Provider and local fallback both produce `ChatMessage` objects pushed onto the
  same `messages` array via `setMessages`.
- The store persists `messages` through `lib/persistence.ts` whenever
  `settings.memoryEnabled` is true, so navigating away from Chat and back
  preserves the entire history.
- `source` is set to `"assistant"` for provider replies, `"demo"` for local
  engine replies, and `"system"` for hard-fail replies. `MessageBubble`
  consumers can theme on this if needed; today they treat them the same.

## Compact UI status indicator

The chat header now contains a single right-aligned mono pill:

```
NEO // CHANNEL_NEO                    AI: CONNECTED
```

Possible labels:

- `AI: CONNECTED` (green)        — provider reachable + configured
- `AI: LOCAL FALLBACK` (orange)  — local engine path is active
- `AI: BACKEND UNAVAILABLE` (pink) — health probe failed
- `AI: DETECTING` (orange)       — first paint, before the probe resolves

It mirrors the truthful state from `useBackendRuntime()`, which is already used
by the Settings/Controls engine rows. No other chat layout is changed.

## Test scenarios (manual)

| ID | Scenario | Expected |
|---|---|---|
| A  | `next dev`, no `OPENAI_API_KEY` | AI: LOCAL FALLBACK; chat answers from local engine; no errors |
| A' | `next dev`, `OPENAI_API_KEY` set | AI: CONNECTED; chat answers from provider; no fallback suffix |
| B  | Capacitor build, no `NEXT_PUBLIC_NEO_BACKEND_BASE_URL` | AI: LOCAL FALLBACK; zero `/api/*` requests in WebView devtools |
| C  | Capacitor build, invalid URL | AI: BACKEND UNAVAILABLE; chat still answers from local engine |
| D  | Hosted, force a 500 from `/api/assistant/chat` | AI: BACKEND UNAVAILABLE; chat answers from local engine; no raw diagnostic suffix in the bubble |
| E  | Local engine path with valid input | Returns coherent text; matches personality + intent |
| F  | Pull network mid-send | sendState resets to idle within 1.2 s; local engine still answers |
| G  | Toggle backend up/down between sends | AI status label updates within 30 s (health TTL) or immediately if `refresh()` is called |

## Configuring the hosted backend (recap)

```env
# Server (next start / Vercel / Render / Fly):
OPENAI_API_KEY=sk-...

# Static build for Capacitor (baked in at build time):
NEXT_PUBLIC_NEO_BACKEND_BASE_URL=https://neo-backend.example.com
```

Then `npm run build && npx cap sync android`. The transport layer will route
all chat and TTS through the configured remote.
