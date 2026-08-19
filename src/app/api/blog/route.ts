import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { assertFeature } from "@/lib/quota";
import { analyzeBlog } from "@/lib/analysis-tools";

export async function POST(request: NextRequest) {
  const authContext = await getAuthContext();
  const feature = assertFeature(authContext.plan, "blogAnalysis", "블로그 분석");
  if (!feature.ok) {
    return NextResponse.json({ error: feature.error }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { url?: string };
    const report = analyzeBlog(body.url ?? "");
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "블로그 분석에 실패했습니다." },
      { status: 400 },
    );
  }
}