import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { assertFeature } from "@/lib/quota";
import { diagnoseSite } from "@/lib/analysis-tools";

export async function POST(request: NextRequest) {
  const authContext = await getAuthContext();
  const feature = assertFeature(authContext.plan, "siteDiagnosis", "사이트 진단");
  if (!feature.ok) {
    return NextResponse.json({ error: feature.error }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { domain?: string };
    const report = await diagnoseSite(body.domain ?? "");
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "사이트 진단에 실패했습니다.";
    const safe = /\(\s*30[1278]\s*\)|fetch failed|ERR_INVALID_IP/i.test(message)
      ? "사이트에 연결하지 못했습니다. 도메인과 HTTPS 여부를 확인해 주세요."
      : message;
    return NextResponse.json({ error: safe }, { status: 400 });
  }
}
