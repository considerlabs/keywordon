import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db, hasDatabase } from "@/lib/db/index";
import { keywordSnapshots } from "@/lib/db/schema";
import type { TrendItem } from "@/lib/keyword-engine";

const HISTORY_DAYS = 7;

export async function countDistinctSnapshotHours(): Promise<number> {
  if (!hasDatabase || !db) return 0;

  const rows = await db
    .select({ count: sql<number>`count(distinct ${keywordSnapshots.bucketHour})::int` })
    .from(keywordSnapshots);

  return Number(rows[0]?.count ?? 0);
}

export async function getLatestSnapshotBucket(): Promise<Date | null> {
  if (!hasDatabase || !db) return null;

  const rows = await db
    .select({ bucketHour: keywordSnapshots.bucketHour })
    .from(keywordSnapshots)
    .orderBy(desc(keywordSnapshots.bucketHour))
    .limit(1);

  return rows[0]?.bucketHour ?? null;
}

export async function getTrendListFromSnapshots(): Promise<TrendItem[]> {
  if (!hasDatabase || !db) return [];

  const latestBucket = await getLatestSnapshotBucket();
  if (!latestBucket) return [];

  const rows = await db
    .select()
    .from(keywordSnapshots)
    .where(eq(keywordSnapshots.bucketHour, latestBucket))
    .orderBy(keywordSnapshots.rank);

  return rows.map((row) => ({
    rank: row.rank ?? 0,
    keyword: row.keyword,
    change: "same" as const,
    delta: 0,
  }));
}

export async function getKeywordRankHistory(keyword: string, days = HISTORY_DAYS) {
  if (!hasDatabase || !db) return [];

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return db
    .select({
      bucketHour: keywordSnapshots.bucketHour,
      rank: keywordSnapshots.rank,
      monthlyVolume: keywordSnapshots.monthlyVolume,
      changeRate: keywordSnapshots.changeRate,
    })
    .from(keywordSnapshots)
    .where(
      and(
        eq(keywordSnapshots.keyword, keyword),
        eq(keywordSnapshots.engine, "naver"),
        gte(keywordSnapshots.bucketHour, since),
      ),
    )
    .orderBy(keywordSnapshots.bucketHour);
}

export function mergeTrendItems(
  live: TrendItem[],
  fromDb: TrendItem[],
): { items: TrendItem[]; hasHistory: boolean } {
  if (fromDb.length === 0) {
    return { items: live, hasHistory: false };
  }

  const liveByKeyword = new Map(live.map((item) => [item.keyword, item]));

  const merged = fromDb.map((row) => {
    const current = liveByKeyword.get(row.keyword);
    return current ?? row;
  });

  for (const item of live) {
    if (!merged.some((row) => row.keyword === item.keyword)) {
      merged.push(item);
    }
  }

  merged.sort((a, b) => a.rank - b.rank);

  return { items: merged, hasHistory: true };
}
