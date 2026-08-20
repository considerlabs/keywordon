import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { applyPlanLimits, assertBulkAllowed, checkNaverRateLimit } from "@/lib/quota";
import { resolveBulk } from "@/lib/providers/keyword-data";
import { tryConsumeGoogleUsage } from "@/lib/db/users";
import type { Engine } from "@/lib/keyword-engine";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      keywords?: string[];
      engine?: Engine;
    };
    const keywords = body.keywords ?? [];
    const engine = body.engine ?? "naver";
    const authContext = await getAuthContext();
    const allowed = assertBulkAllowed(keywords.filter(Boolean).length, authContext.plan);

    if (!allowed.ok) {
      return NextResponse.json({ error: allowed.error }, { status: 403 });
    }

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
      const actor = authContext.userId ?? request.headers.get("x-forwarded-for") ?? "guest";
      const rate = await checkNaverRateLimit(actor, authContext.plan);
      if (!rate.ok) {
        return NextResponse.json({ error: rate.error }, { status: 429 });
      }
    }

    const { results, source } = await resolveBulk(keywords, engine);
    const limited = results
      .slice(0, authContext.plan.limits.bulkMax)
      .map((item) => applyPlanLimits(item, authContext.plan));

    return NextResponse.json({
      results: limited,
      count: limited.length,
      dataSource: source,
      csvExport: authContext.plan.limits.csvExport,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "대량 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}
