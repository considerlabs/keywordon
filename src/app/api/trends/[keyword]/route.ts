import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { resolveKeywordAnalysis } from "@/lib/providers/keyword-data";
import { assertFeature } from "@/lib/quota";
import { getKeywordRankHistory } from "@/lib/trends/snapshots";
import { rankHistoryToSparkline } from "@/lib/trends/sparkline";

type RouteContext = {
  params: Promise<{ keyword: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const authContext = await getAuthContext();
  const feature = assertFeature(authContext.plan, "trendAccess", "급상승 트렌드");
  if (!feature.ok) {
    return NextResponse.json({ error: feature.error }, { status: 403 });
  }

  const { keyword: rawKeyword } = await context.params;
  const keyword = decodeURIComponent(rawKeyword).trim();
  if (!keyword) {
    return NextResponse.json({ error: "키워드를 입력해 주세요." }, { status: 400 });
  }

  const history = await getKeywordRankHistory(keyword);
  const sparkline = rankHistoryToSparkline(history);
  let monthlyVolume: number | null = null;
  try {
    const { data } = await resolveKeywordAnalysis(keyword, "naver");
    monthlyVolume = data.monthlyVolume;
  } catch {
    monthlyVolume = history.at(-1)?.monthlyVolume ?? null;
  }

  return NextResponse.json({
    keyword,
    monthlyVolume,
    category: null,
    subcategory: null,
    history: history.map((row) => ({
      bucketHour: row.bucketHour,
      rank: row.rank,
      monthlyVolume: row.monthlyVolume,
      changeRate: row.changeRate,
    })),
    sparkline,
    hasHistory: sparkline.length > 0,
    planName: authContext.plan.name,
  });
}
