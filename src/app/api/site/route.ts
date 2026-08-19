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
    const report = diagnoseSite(body.domain ?? "");
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "사이트 진단에 실패했습니다." },
      { status: 400 },
    );
  }
}