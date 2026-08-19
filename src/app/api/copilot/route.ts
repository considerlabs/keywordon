import { NextRequest, NextResponse } from "next/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { gateway, streamText } from "ai";
import { getAuthContext } from "@/lib/auth";
import { assertFeature } from "@/lib/quota";
import { incrementAiUsage } from "@/lib/db/users";
import { resolveKeywordAnalysis } from "@/lib/providers/keyword-data";

/** Google AI Studio / Generative Language API model id */
const GEMINI_MODEL = "gemini-3.6-flash";

function resolveCopilotModel() {
  const apiKey = (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ""
  ).trim();

  // Google AI Studio keys look like "AIza...". Other formats (e.g. "AQ.") are ignored
  // so we don't accidentally hit a broken provider path that falls back to gemini-2.0-flash.
  if (apiKey.startsWith("AIza")) {
    const google = createGoogleGenerativeAI({ apiKey });
    return google(GEMINI_MODEL);
  }

  // Prefer Vercel AI Gateway (OIDC on Vercel, or AI_GATEWAY_API_KEY locally)
  return gateway(`google/${GEMINI_MODEL}`);
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

  try {
    const model = resolveCopilotModel();
    const result = streamText({
      model,
      system:
        "당신은 한국어 SEO·콘텐츠 마케터입니다. 검색 의도를 반영한 완성도 높은 글을 작성하고, 과장 광고 표현은 피합니다.",
      prompt: `키워드: ${keyword}
의도: ${intent}
톤: ${tone}
월간 검색량: ${data.monthlyVolume}
카테고리: ${data.category}/${data.subcategory}
연관어: ${data.relatedInternal
  .slice(0, 8)
  .map((item) => item.keyword)
  .join(", ")}

위 정보를 바탕으로 ${intent}용 한국어 초안을 작성하세요.
구성: 제목 후보 3개, 서론, 본문(소제목 포함), 결론, SEO 메타 설명 1개.`,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("copilot error", error);
    const message =
      error instanceof Error
        ? error.message
        : "AI 초안 생성에 실패했습니다. Gemini API 키 또는 모델을 확인해 주세요.";
    return NextResponse.json(
      {
        error: message.includes("gemini-2.0")
          ? "모델 설정을 갱신했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요."
          : message,
      },
      { status: 500 },
    );
  }
}