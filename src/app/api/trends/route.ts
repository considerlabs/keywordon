import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { assertFeature } from "@/lib/quota";
import { fetchRealtimeTrends } from "@/lib/trends/live";
import { countDistinctSnapshotHours } from "@/lib/trends/snapshots";

export async function GET() {
  const authContext = await getAuthContext();
  const feature = assertFeature(authContext.plan, "trendAccess", "급상승 트렌드");
  if (!feature.ok) {
    return NextResponse.json({ error: feature.error }, { status: 403 });
  }

  let items;
  try {
    items = await fetchRealtimeTrends();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "실시간 트렌드를 불러오지 못했습니다." },
      { status: 502 },
    );
  }
  const snapshotHours = await countDistinctSnapshotHours();
  const hasHistory = snapshotHours > 0;

  return NextResponse.json({
    updatedAt: new Date().toISOString(),
    items,
    hasHistory,
    snapshotHours,
    daysUntilTrend: hasHistory ? 0 : Math.max(0, 7 - snapshotHours / 24),
    planName: authContext.plan.name,
  });
}
