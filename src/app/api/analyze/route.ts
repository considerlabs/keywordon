import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { applyPlanLimits, checkNaverRateLimit } from "@/lib/quota";
import { resolveKeywordAnalysis } from "@/lib/providers/keyword-data";
import type { Engine } from "@/lib/keyword-engine";

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const engine = (request.nextUrl.searchParams.get("engine") ?? "naver") as Engine;

  if (!keyword) {
    return NextResponse.json({ error: "키워드를 입력해 주세요." }, { status: 400 });
  }
  if (engine !== "naver" && engine !== "google") {
    return NextResponse.json({ error: "지원하지 않는 엔진입니다." }, { status: 400 });
  }

  const authContext = await getAuthContext();
  const actor = authContext.userId ?? request.headers.get("x-forwarded-for") ?? "guest";

  if (engine === "google" && authContext.plan.limits.googleMonthly <= 0) {
    return NextResponse.json(
      { error: "구글 키워드 분석은 베이직 이상 플랜에서 이용할 수 있습니다." },
      { status: 403 },
    );
  }

  const rate = checkNaverRateLimit(actor, authContext.plan);
  if (engine === "naver" && !rate.ok) {
    return NextResponse.json({ error: rate.error }, { status: 429 });
  }

  try {
    const { data, source } = await resolveKeywordAnalysis(keyword, engine);
    const limited = applyPlanLimits(data, authContext.plan);
    return NextResponse.json({ ...limited, dataSource: source });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "분석에 실패했습니다." },
      { status: 500 },
    );
  }
}