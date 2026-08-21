import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { applyDiscoverLimits, checkNaverRateLimit } from "@/lib/quota";
import { discoverKeywords } from "@/lib/keyword-engine";

export async function GET(request: NextRequest) {
  const authContext = await getAuthContext();

  if (!authContext.userId) {
    return NextResponse.json(
      { error: "키워드 발굴은 로그인 후 이용할 수 있습니다." },
      { status: 401 },
    );
  }

  const rate = await checkNaverRateLimit(authContext.userId, authContext.plan);
  if (!rate.ok) {
    return NextResponse.json({ error: rate.error }, { status: 429 });
  }

  const seed = request.nextUrl.searchParams.get("q")?.trim() ?? "마케팅";
  const items = applyDiscoverLimits(discoverKeywords(seed), authContext.plan);

  return NextResponse.json({
    seed,
    items,
    locked: { opportunityScore: !authContext.plan.limits.opportunityScore },
    planName: authContext.plan.name,
  });
}
