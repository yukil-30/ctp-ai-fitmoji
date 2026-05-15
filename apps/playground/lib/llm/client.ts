type LlmCallOptions = {
  system: string;
  user: string;
};

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-haiku-20241022";
const DEFAULT_OLLAMA_URL = "http://localhost:11434/v1/chat/completions";
const DEFAULT_OLLAMA_MODEL = "llama3.1:8b";

export type LlmProvider = "anthropic" | "ollama";

export function getConfiguredLlmProvider(): LlmProvider | null {
  if (process.env.ANTHROPIC_API_KEY) {
    return "anthropic";
  }
  return "ollama";
}

function parseJsonFromLlmText<T>(rawText: string): T {
  const stripped = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(stripped) as T;
}

function extractOllamaText(data: Record<string, unknown>): string {
  const choices = data.choices as Array<{ message?: { content?: string } }> | undefined;
  const message = data.message as { content?: string } | undefined;
  return choices?.[0]?.message?.content ?? message?.content ?? "";
}

function extractAnthropicText(data: Record<string, unknown>): string {
  const content = data.content as Array<{ type?: string; text?: string }> | undefined;
  return content?.find((block) => block.type === "text")?.text ?? "";
}

async function callAnthropicJson<T>(options: LlmCallOptions): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_ANTHROPIC_MODEL;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: options.system,
      messages: [{ role: "user", content: options.user }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const rawText = extractAnthropicText(data);

  if (!rawText) {
    throw new Error(`Anthropic returned no text. Full response: ${JSON.stringify(data)}`);
  }

  try {
    return parseJsonFromLlmText<T>(rawText);
  } catch {
    throw new Error(`Failed to parse Anthropic response as JSON.\nRaw: ${rawText}`);
  }
}

function getOllamaApiUrl(): string {
  const base = process.env.LOCAL_LLM_API_BASE?.replace(/\/$/, "");
  if (!base) {
    return DEFAULT_OLLAMA_URL;
  }
  return base.endsWith("/v1/chat/completions") ? base : `${base}/v1/chat/completions`;
}

async function callOllamaJson<T>(options: LlmCallOptions): Promise<T> {
  const model = process.env.LOCAL_LLM_MODEL ?? DEFAULT_OLLAMA_MODEL;

  const response = await fetch(getOllamaApiUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.user },
      ],
      stream: false,
      format: "json",
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ollama API error ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const rawText = extractOllamaText(data);

  if (!rawText) {
    throw new Error(`Ollama returned no content. Full response: ${JSON.stringify(data)}`);
  }

  try {
    return parseJsonFromLlmText<T>(rawText);
  } catch {
    throw new Error(`Failed to parse Ollama response as JSON.\nRaw: ${rawText}`);
  }
}

export async function callLlmJson<T>(
  options: LlmCallOptions
): Promise<{ data: T; provider: LlmProvider }> {
  if (process.env.ANTHROPIC_API_KEY) {
    const data = await callAnthropicJson<T>(options);
    return { data, provider: "anthropic" };
  }

  const data = await callOllamaJson<T>(options);
  return { data, provider: "ollama" };
}
