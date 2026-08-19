import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { assertFeature } from "@/lib/quota";
import { incrementAiUsage } from "@/lib/db/users";
import { resolveKeywordAnalysis } from "@/lib/providers/keyword-data";

/** Hardcoded — never use gemini-2.0-flash */
const GEMINI_MODEL = "gemini-3.6-flash";

function getGeminiApiKey() {
  const key = (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ""
  ).trim();
  return key || null;
}

async function streamGeminiDraft(params: {
  apiKey: string;
  prompt: string;
  system: string;
}) {
  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent`,
  );
  url.searchParams.set("alt", "sse");
  url.searchParams.set("key", params.apiKey);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: params.system }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: params.prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    let message = raw;
    try {
      const parsed = JSON.parse(raw) as { error?: { message?: string } };
      message = parsed.error?.message ?? raw;
    } catch {
      // keep raw
    }
    throw new Error(message);
  }

  if (!response.body) {
    throw new Error("Gemini 응답 스트림이 비어 있습니다.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n");
      buffer = chunks.pop() ?? "";

      for (const line of chunks) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload) as {
            candidates?: Array<{
              content?: { parts?: Array<{ text?: string }> };
            }>;
          };
          const text = json.candidates?.[0]?.content?.parts
            ?.map((part) => part.text ?? "")
            .join("");
          if (text) {
            controller.enqueue(new TextEncoder().encode(text));
          }
        } catch {
          // ignore malformed sse lines
        }
      }
    },
    cancel() {
      reader.cancel().catch(() => undefined);
    },
  });
}

export async function POST(request: NextRequest) {
  const authContext = await getAuthContext();
  const feature = assertFeature(authContext.plan, "copilot", "Copilot AI");
  if (!feature.ok) {
    return NextResponse.json({ error: feature.error }, { status: 403 });
  }

  if (!authContext.userId || !authContext.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (authContext.user.aiUsedMonth >= authContext.plan.limits.aiMonthly) {
    return NextResponse.json(
      { error: `이번 달 AI 생성 한도(${authContext.plan.limits.aiMonthly}회)를 모두 사용했습니다.` },
      { status: 429 },
    );
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey || apiKey === "undefined") {
    return NextResponse.json(
      {
        error:
          "Gemini API 키가 없습니다. Google AI Studio에서 AIza로 시작하는 키를 발급해 GOOGLE_GENERATIVE_AI_API_KEY로 등록해 주세요.",
      },
      { status: 503 },
    );
  }

  if (!apiKey.startsWith("AIza")) {
    return NextResponse.json(
      {
        error:
          "등록된 키가 Google Gemini API 키 형식(AIza...)이 아닙니다. https://aistudio.google.com/apikey 에서 새 키를 발급해 주세요.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    keyword?: string;
    tone?: string;
    intent?: string;
  };

  const keyword = body.keyword?.trim();
  if (!keyword) {
    return NextResponse.json({ error: "키워드를 입력해 주세요." }, { status: 400 });
  }

  const tone = body.tone ?? "전문적이면서 친근한";
  const intent = body.intent ?? "블로그 포스팅";
  const { data } = await resolveKeywordAnalysis(keyword, "naver");

  await incrementAiUsage(authContext.userId);

  const system =
    "당신은 한국어 SEO·콘텐츠 마케터입니다. 검색 의도를 반영한 완성도 높은 글을 작성하고, 과장 광고 표현은 피합니다.";
  const prompt = `키워드: ${keyword}
의도: ${intent}
톤: ${tone}
월간 검색량: ${data.monthlyVolume}
카테고리: ${data.category}/${data.subcategory}
연관어: ${data.relatedInternal
  .slice(0, 8)
  .map((item) => item.keyword)
  .join(", ")}

위 정보를 바탕으로 ${intent}용 한국어 초안을 작성하세요.
구성: 제목 후보 3개, 서론, 본문(소제목 포함), 결론, SEO 메타 설명 1개.`;

  try {
    const stream = await streamGeminiDraft({ apiKey, prompt, system });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-KeywordOn-Model": GEMINI_MODEL,
      },
    });
  } catch (error) {
    console.error("copilot gemini error", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "AI 초안 생성에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}