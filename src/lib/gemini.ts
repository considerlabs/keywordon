export const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

export function getGeminiApiKey(): string | null {
  const key = (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ""
  ).trim();
  if (!key || key === "undefined") return null;
  return key;
}

export async function callGemini(input: {
  system: string;
  user: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<{ ok: true; text: string } | { ok: false; error: string; status: number }> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return {
      ok: false,
      error:
        "Gemini API 키가 없습니다. Google AI Studio의 AIza 키를 GOOGLE_GENERATIVE_AI_API_KEY로 등록해 주세요.",
      status: 503,
    };
  }

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: input.system }] },
      contents: [{ role: "user", parts: [{ text: input.user }] }],
      generationConfig: {
        temperature: input.temperature ?? 0.6,
        maxOutputTokens: input.maxOutputTokens ?? 4096,
      },
    }),
  });

  const json = (await response.json()) as {
    error?: { message?: string };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  if (!response.ok) {
    return {
      ok: false,
      error: json.error?.message ?? "Gemini 호출에 실패했습니다.",
      status: 502,
    };
  }

  const text =
    json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  if (!text) {
    return {
      ok: false,
      error: "Gemini가 빈 응답을 반환했습니다.",
      status: 502,
    };
  }

  return { ok: true, text };
}
