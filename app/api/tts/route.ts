import { NextResponse } from "next/server"
import { generateOpenAITts } from "@/lib/voice/ttsClient"
import type { VoiceParams } from "@/lib/types"
import type { SpeechIntent } from "@/lib/voice/speechIntent"

interface TtsRouteBody {
  voiceId?: string
  text?: string
  params?: VoiceParams
  personalityId?: string
  intent?: SpeechIntent
}

const DEFAULT_PARAMS: VoiceParams = {
  speed: 50,
  pitch: 50,
  volume: 75,
  emotion: 60,
}

export async function POST(request: Request) {
  let body: TtsRouteBody
  try {
    body = (await request.json()) as TtsRouteBody
  } catch {
    return NextResponse.json({ error: "Invalid TTS request JSON." }, { status: 400 })
  }

  if (!body.voiceId || !body.text?.trim()) {
    return NextResponse.json({ error: "Missing voice or text for TTS." }, { status: 400 })
  }

  try {
    const result = await generateOpenAITts({
      voiceId: body.voiceId,
      text: body.text.trim(),
      params: { ...DEFAULT_PARAMS, ...body.params },
      personalityId: body.personalityId,
      intent: body.intent,
    })
    return NextResponse.json(result)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "TTS provider unavailable. Check server configuration."

    return NextResponse.json({ error: message }, { status: 503 })
  }
}
