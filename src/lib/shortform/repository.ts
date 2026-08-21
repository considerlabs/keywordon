import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db, hasDatabase } from "@/lib/db";
import {
  shortformProjects,
  usageEvents,
  type ShortformProjectRow,
} from "@/lib/db/schema";
import type { ShortformProjectStatus, ShortformScript } from "./types";
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

export async function listProjects(userId: number): Promise<ShortformProjectRow[]> {
  const database = requireDb();
  return database
    .select()
    .from(shortformProjects)
    .where(eq(shortformProjects.userId, userId))
    .orderBy(desc(shortformProjects.updatedAt));
}

export async function getProjectForUser(
  userId: number,
  id: number,
): Promise<ShortformProjectRow | null> {
  const database = requireDb();
  const rows = await database
    .select()
    .from(shortformProjects)
    .where(and(eq(shortformProjects.userId, userId), eq(shortformProjects.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertProject(input: {
  userId: number;
  title: string;
  sourceUrl?: string | null;
  sourceText?: string | null;
  status?: ShortformProjectStatus;
  meta?: Record<string, unknown> | null;
}): Promise<ShortformProjectRow> {
  const database = requireDb();
  const inserted = await database
    .insert(shortformProjects)
    .values({
      userId: input.userId,
      title: input.title,
      sourceUrl: input.sourceUrl ?? null,
      status: input.status ?? "draft",
      meta: {
        ...(input.meta ?? {}),
        ...(input.sourceText ? { sourceText: input.sourceText.slice(0, 50_000) } : {}),
      },
    })
    .returning();
  return inserted[0];
}

export async function updateProjectForUser(
  userId: number,
  id: number,
  patch: {
    title?: string;
    sourceUrl?: string | null;
    script?: ShortformScript | null;
    status?: ShortformProjectStatus;
    meta?: Record<string, unknown> | null;
  },
): Promise<ShortformProjectRow | null> {
  const database = requireDb();
  const existing = await getProjectForUser(userId, id);
  if (!existing) return null;

  const nextMeta =
    patch.meta !== undefined
      ? { ...((existing.meta as Record<string, unknown> | null) ?? {}), ...patch.meta }
      : undefined;

  const updated = await database
    .update(shortformProjects)
    .set({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.sourceUrl !== undefined ? { sourceUrl: patch.sourceUrl } : {}),
      ...(patch.script !== undefined ? { script: patch.script } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(nextMeta !== undefined ? { meta: nextMeta } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(shortformProjects.userId, userId), eq(shortformProjects.id, id)))
    .returning();
  return updated[0] ?? null;
}

export async function countShortformGenerationsThisMonth(
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
        eq(usageEvents.action, "shortform_generate"),
        gte(usageEvents.createdAt, start),
        lt(usageEvents.createdAt, end),
      ),
    );
  return Number(rows[0]?.count ?? 0);
}

export async function logShortformGenerateEvent(
  userId: number,
  meta: Record<string, unknown>,
): Promise<void> {
  const database = requireDb();
  await database.insert(usageEvents).values({
    userId,
    action: "shortform_generate",
    meta,
  });
}
