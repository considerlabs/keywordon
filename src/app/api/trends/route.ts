import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { getRealtimeTrends } from "@/lib/keyword-engine";
import { assertFeature } from "@/lib/quota";
import { countDistinctSnapshotHours } from "@/lib/trends/snapshots";

export async function GET() {
  const authContext = await getAuthContext();
  const feature = assertFeature(authContext.plan, "trendAccess", "급상승 트렌드");
  if (!feature.ok) {
    return NextResponse.json({ error: feature.error }, { status: 403 });
  }

  const items = getRealtimeTrends();
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
