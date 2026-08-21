import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { tryConsumeAiUsage } from "@/lib/db/users";
import { assertFeature } from "@/lib/quota";
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
  return !key || key === "undefined" ? null : key;
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

  let topic: string;
  let style: string;
  try {
    const body = (await request.json()) as { topic?: unknown; style?: unknown };
    topic = typeof body.topic === "string" ? trimWriteField(body.topic, 200) : "";
    style = typeof body.style === "string" ? trimWriteField(body.style, 80) : "";
    if (!topic) throw new Error("이미지 주제를 입력해 주세요.");
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "요청 내용을 확인해 주세요." },
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
      { error: `이번 달 AI 생성 한도(${authContext.plan.limits.aiMonthly}회)를 모두 사용했습니다.` },
      { status: 429 },
    );
  }

  const geminiResponse = await fetch(
    `${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: "당신은 한국어 콘텐츠 이미지 기획자입니다. 실제 이미지 파일을 생성하지 말고, 실행 가능한 텍스트 이미지 브리프만 작성하세요.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: [
                  `주제: ${topic}`,
                  `스타일: ${style || "깔끔하고 현대적인"}`,
                  "",
                  "아래 항목을 한국어로 명확히 작성하세요.",
                  "1. 이미지 콘셉트와 구도",
                  "2. 색상 팔레트와 분위기",
                  "3. 이미지 안에 넣을 짧은 캡션",
                  "4. 접근성을 위한 알트 텍스트",
                  "5. Canva에서 바로 쓸 프롬프트",
                  "6. Midjourney에서 바로 쓸 프롬프트",
                ].join("\n"),
              },
            ],
          },
        ],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      }),
    },
  );

  const geminiJson = (await geminiResponse.json()) as {
    error?: { message?: string };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  if (!geminiResponse.ok) {
    return NextResponse.json(
      { error: geminiJson.error?.message ?? "Gemini 호출에 실패했습니다." },
      { status: 502 },
    );
  }

  const text =
    geminiJson.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  if (!text) {
    return NextResponse.json({ error: "Gemini가 빈 응답을 반환했습니다." }, { status: 502 });
  }

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-KeywordOn-Model": "gemini-3.6-flash",
    },
  });
}
