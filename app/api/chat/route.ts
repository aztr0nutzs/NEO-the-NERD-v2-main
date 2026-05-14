import { NextResponse } from "next/server"
import { createAssistantClient } from "@/lib/assistant/assistantClient"
import type { ChatMessage, ConversationMode } from "@/lib/types"

interface ChatRouteBody {
  messages?: Pick<ChatMessage, "role" | "text">[]
  personalityId?: string
  conversationMode?: ConversationMode
}

export async function POST(request: Request) {
  let body: ChatRouteBody
  try {
    body = (await request.json()) as ChatRouteBody
  } catch {
    return NextResponse.json(
      { error: "Invalid chat request JSON." },
      { status: 400 },
    )
  }

  if (!body.messages?.length || !body.personalityId || !body.conversationMode) {
    return NextResponse.json(
      { error: "Missing messages, personality, or conversation mode." },
      { status: 400 },
    )
  }

  try {
    const client = createAssistantClient()
    const result = await client.complete({
      messages: body.messages.slice(-16),
      personalityId: body.personalityId,
      conversationMode: body.conversationMode,
    })
    return NextResponse.json(result)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "AI assistant unavailable. Check server configuration."

    return NextResponse.json({ error: message }, { status: 503 })
  }
}
