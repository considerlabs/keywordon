import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { assertBulkAllowed } from "@/lib/quota";
import { resolveBulk } from "@/lib/providers/keyword-data";
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

    const { results, source } = await resolveBulk(keywords, engine);
    return NextResponse.json({
      results: results.slice(0, authContext.plan.limits.bulkMax),
      count: Math.min(results.length, authContext.plan.limits.bulkMax),
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