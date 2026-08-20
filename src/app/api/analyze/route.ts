import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { applyPlanLimits, checkNaverRateLimit } from "@/lib/quota";
import { tryConsumeGoogleUsage } from "@/lib/db/users";
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

  if (engine === "google") {
    if (!authContext.userId) {
      return NextResponse.json(
        { error: "구글 키워드 분석은 로그인 후 베이직 이상 플랜에서 이용할 수 있습니다." },
        { status: 401 },
      );
    }
    const consumed = await tryConsumeGoogleUsage(
      authContext.userId,
      authContext.plan.limits.googleMonthly,
    );
    if (!consumed.ok) {
      return NextResponse.json(
        {
          error:
            authContext.plan.limits.googleMonthly <= 0
              ? "구글 키워드 분석은 베이직 이상 플랜에서 이용할 수 있습니다."
              : `이번 달 구글 분석 한도(${authContext.plan.limits.googleMonthly}회)를 모두 사용했습니다.`,
        },
        { status: authContext.plan.limits.googleMonthly <= 0 ? 403 : 429 },
      );
    }
  } else {
    const rate = await checkNaverRateLimit(actor, authContext.plan);
    if (!rate.ok) {
      return NextResponse.json({ error: rate.error }, { status: 429 });
    }
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
