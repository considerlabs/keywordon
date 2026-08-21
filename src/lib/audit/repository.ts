import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db, hasDatabase } from "@/lib/db";
import { postAudits, usageEvents, type PostAuditRow } from "@/lib/db/schema";
import type { PostAuditReport } from "./types";
import { monthKey } from "./monthly";

function requireDb() {
  if (!hasDatabase || !db) {
    throw new Error("DATABASE_URL이 필요합니다.");
  }
  return db;
}

function monthStart(key: string): Date {
  return new Date(`${key}-01T00:00:00.000Z`);
}

export async function insertPostAudit(input: {
  userId: number;
  postUrl: string;
  targetKeyword?: string | null;
  report: PostAuditReport;
}): Promise<PostAuditRow> {
  const database = requireDb();
  const inserted = await database
    .insert(postAudits)
    .values({
      userId: input.userId,
      postUrl: input.postUrl,
      targetKeyword: input.targetKeyword ?? null,
      report: input.report,
    })
    .returning();
  return inserted[0];
}

export async function listPostAudits(userId: number, limit = 10): Promise<PostAuditRow[]> {
  const database = requireDb();
  return database
    .select()
    .from(postAudits)
    .where(eq(postAudits.userId, userId))
    .orderBy(desc(postAudits.createdAt))
    .limit(limit);
}

export async function countPostAuditsThisMonth(
  userId: number,
  key: string = monthKey(),
): Promise<number> {
  const database = requireDb();
  const start = monthStart(key);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

  const rows = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.action, "post_audit"),
        gte(usageEvents.createdAt, start),
        lt(usageEvents.createdAt, end),
      ),
    );
  return Number(rows[0]?.count ?? 0);
}

export async function logPostAuditEvent(
  userId: number,
  meta: Record<string, unknown>,
): Promise<void> {
  const database = requireDb();
  await database.insert(usageEvents).values({
    userId,
    action: "post_audit",
    meta,
  });
}
