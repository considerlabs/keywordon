import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { tryConsumeAiUsage } from "@/lib/db/users";
import { assertFeature } from "@/lib/quota";
import { assertCommerceUrl, buildCommercePrompt } from "@/lib/write/commerce-prompt";
import { trimWriteField } from "@/lib/write/prompt";

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

export async function POST(request: NextRequest) {
  const authContext = await getAuthContext();
  const feature = assertFeature(authContext.plan, "copilot", "Copilot AI");
  if (!feature.ok) {
    return NextResponse.json({ error: feature.error }, { status: 403 });
  }

  if (!authContext.userId || !authContext.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json()) as {
    productUrl?: string;
    productName?: string;
    tone?: string;
  };

  let system: string;
  let prompt: string;
  try {
    const url = assertCommerceUrl(
      typeof body.productUrl === "string" ? body.productUrl : "",
    );
    const commercePrompt = buildCommercePrompt({
      productUrl: url.toString(),
      productName:
        typeof body.productName === "string" ? trimWriteField(body.productName, 120) : "",
      tone: typeof body.tone === "string" ? trimWriteField(body.tone, 80) : "",
    });
    system = commercePrompt.system;
    prompt = commercePrompt.user;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "상품 링크를 확인해 주세요.",
      },
      { status: 400 },
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

  const geminiResponse = await fetch(
    `${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      }),
    },
  );

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
