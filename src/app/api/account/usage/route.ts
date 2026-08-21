import { NextResponse } from "next/server";
import { buildUsageSummary } from "@/lib/account/usage-summary";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  const authContext = await getAuthContext();

  if (authContext.authEnabled && !authContext.userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const summary = buildUsageSummary({
    planName: authContext.plan.name,
    aiUsedMonth: authContext.user?.aiUsedMonth ?? 0,
    aiMonthly: authContext.plan.limits.aiMonthly,
    googleUsedMonth: authContext.user?.googleUsedMonth ?? 0,
    googleMonthly: authContext.plan.limits.googleMonthly,
  });

  return NextResponse.json(summary);
}
