import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { assertFeature } from "@/lib/quota";
import { tryConsumeAiUsage } from "@/lib/db/users";
import { resolveKeywordAnalysis } from "@/lib/providers/keyword-data";

// Absolute URL — do not interpolate, do not use gemini-2.0-flash
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

function getGeminiApiKey() {
  const key = (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ""
  ).trim();
  if (!key || key === "undefined") return null;
  return key;
}

/** Public readiness probe only — no live Gemini calls, no key material. */
export async function GET() {
  return NextResponse.json({
    model: "gemini-3.6-flash",
    hasApiKey: Boolean(getGeminiApiKey()),
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

  const consumed = await tryConsumeAiUsage(
    authContext.userId,
    authContext.plan.limits.aiMonthly,
  );
  if (!consumed.ok) {
    return NextResponse.json(
      {
        error: `이번 달 AI 생성 한도(${authContext.plan.limits.aiMonthly}회)를 모두 사용했습니다.`,
      },
      { status: 429 },
    );
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Gemini API 키가 없습니다. Google AI Studio의 AIza 키를 GOOGLE_GENERATIVE_AI_API_KEY로 등록해 주세요.",
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

  const geminiResponse = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    }),
  });

  const geminiJson = (await geminiResponse.json()) as {
    error?: { message?: string };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  if (!geminiResponse.ok) {
    return NextResponse.json(
      {
        error: geminiJson.error?.message ?? "Gemini 호출에 실패했습니다.",
        model: "gemini-3.6-flash",
        endpoint: GEMINI_ENDPOINT,
      },
      { status: 502 },
    );
  }

  const text =
    geminiJson.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";

  if (!text) {
    return NextResponse.json(
      { error: "Gemini가 빈 응답을 반환했습니다.", model: "gemini-3.6-flash" },
      { status: 502 },
    );
  }

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-KeywordOn-Model": "gemini-3.6-flash",
    },
  });
}
