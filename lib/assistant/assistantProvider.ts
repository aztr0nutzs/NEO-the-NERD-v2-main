import type {
  AssistantProviderAdapter,
  AssistantProviderCompletion,
  AssistantProviderPrompt,
  AssistantProviderStatus,
} from "./providerTypes"

const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini"

class OpenAIResponsesProvider implements AssistantProviderAdapter {
  private readonly model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL

  providerStatus(): AssistantProviderStatus {
    const providerConfigured = Boolean(process.env.OPENAI_API_KEY)
    return {
      provider: "openai",
      providerConfigured,
      model: this.model,
      supportsStreaming: false,
      message: providerConfigured
        ? "OpenAI provider configured server-side."
        : "OpenAI provider is not configured. Local assistant engine will be used.",
    }
  }

  async sendChatCompletion(prompt: AssistantProviderPrompt): Promise<AssistantProviderCompletion> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured.")
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        instructions: prompt.instructions,
        input: prompt.messages.map((message) => ({
          role: message.role === "assistant" ? "assistant" : "user",
          content: message.content,
        })),
        temperature: Number(process.env.OPENAI_TEMPERATURE ?? 0.75),
        max_output_tokens: Number(process.env.OPENAI_MAX_OUTPUT_TOKENS ?? 650),
      }),
    })

    if (!response.ok) {
      const details = await response.text()
      throw new Error(`OpenAI request failed (${response.status}): ${details}`)
    }

    const data = (await response.json()) as {
      output_text?: string
      output?: Array<{
        content?: Array<{ type?: string; text?: string }>
      }>
    }

    const text =
      data.output_text ??
      data.output
        ?.flatMap((item) => item.content ?? [])
        .map((content) => content.text)
        .filter(Boolean)
        .join("\n")

    return {
      text: text?.trim() || "I did not get a usable response. Try again.",
      provider: "openai",
      model: this.model,
    }
  }
}

export function createAssistantProvider(): AssistantProviderAdapter {
  return new OpenAIResponsesProvider()
}

export function getAssistantProviderStatus() {
  return createAssistantProvider().providerStatus()
}
