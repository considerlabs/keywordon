import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { getAuthContext } from "@/lib/auth";
import { assertFeature } from "@/lib/quota";
import { incrementAiUsage } from "@/lib/db/users";
import { resolveKeywordAnalysis } from "@/lib/providers/keyword-data";

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

  const result = streamText({
    model: "google/gemini-3.5-flash",
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
}