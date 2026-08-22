import { NextRequest, NextResponse } from "next/server";
import { db, hasDatabase } from "@/lib/db/index";
import { keywordSnapshots } from "@/lib/db/schema";
import { fetchRealtimeTrends } from "@/lib/trends/live";
import { getSetting } from "@/lib/settings/store";
import { truncateToHour } from "@/lib/trends/sparkline";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest, secret: string): boolean {
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const headerSecret = request.headers.get("CRON_SECRET");
  return headerSecret === secret;
}

async function captureSnapshots() {
  const bucketHour = truncateToHour(new Date());
  const trends = await fetchRealtimeTrends();
  const rows = trends.map((item) => ({
    keyword: item.keyword,
    engine: "naver" as const,
    rank: item.rank,
    monthlyVolume: null,
    changeRate: null,
    bucketHour,
  }));

  await db!.insert(keywordSnapshots).values(rows);

  return { captured: rows.length, bucketHour: bucketHour.toISOString() };
}

export async function POST(request: NextRequest) {
  const secret = await getSetting("CRON_SECRET");
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET이 설정되지 않았습니다." }, { status: 503 });
  }

  if (!isAuthorized(request, secret)) {
    return NextResponse.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });
  }

  if (!hasDatabase || !db) {
    return NextResponse.json({ error: "DATABASE_URL이 없습니다." }, { status: 503 });
  }

  const result = await captureSnapshots();
  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  return POST(request);
}
