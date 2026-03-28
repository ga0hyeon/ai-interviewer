const DEFAULT_LM_STUDIO_BASE_URL = "http://127.0.0.1:1234/v1";

type LmStudioModelResponse = {
  data?: Array<{
    id: string;
  }>;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

function getBaseUrl() {
  return (
    process.env.LM_STUDIO_BASE_URL?.replace(/\/$/, "") ??
    DEFAULT_LM_STUDIO_BASE_URL
  );
}

function getHeaders() {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (process.env.LM_STUDIO_API_KEY) {
    headers.Authorization = `Bearer ${process.env.LM_STUDIO_API_KEY}`;
  }

  return headers;
}

async function parseError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: { message?: string } };
    return payload.error?.message ?? `LM Studio request failed (${response.status})`;
  } catch {
    return `LM Studio request failed (${response.status})`;
  }
}

export async function listLocalModels() {
  const response = await fetch(`${getBaseUrl()}/models`, {
    headers: getHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as LmStudioModelResponse;
  return (payload.data ?? []).map((model) => model.id);
}

export async function createLocalChatCompletion(messages: {
  role: "system" | "assistant" | "user";
  content: string;
}[], model: string) {
  const response = await fetch(`${getBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: getHeaders(),
    cache: "no-store",
    body: JSON.stringify({
      model,
      temperature: 0.8,
      max_tokens: 500,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as ChatCompletionResponse;
  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error(
      payload.error?.message ?? "LM Studio returned an empty completion.",
    );
  }

  return content;
}

export function getLocalModelEndpoint() {
  return getBaseUrl();
}
