import { and, desc, eq, gte, lt } from "drizzle-orm";
import { db, hasDatabase } from "@/lib/db";
import {
  automationDrafts,
  automationIdeas,
  usageEvents,
  type AutomationDraftRow,
  type AutomationIdeaRow,
} from "@/lib/db/schema";
import type { AutomationDraftStatus, IdeaSource } from "./types";

function requireDb() {
  if (!hasDatabase || !db) {
    throw new Error("DATABASE_URL이 필요합니다.");
  }
  return db;
}

export async function listIdeas(userId: number): Promise<AutomationIdeaRow[]> {
  const database = requireDb();
  return database
    .select()
    .from(automationIdeas)
    .where(eq(automationIdeas.userId, userId))
    .orderBy(desc(automationIdeas.createdAt));
}

export async function countIdeasCreatedOn(
  userId: number,
  key: string,
): Promise<number> {
  const database = requireDb();
  const start = new Date(`${key}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 86_400_000);
  const rows = await database
    .select({ id: automationIdeas.id })
    .from(automationIdeas)
    .where(
      and(
        eq(automationIdeas.userId, userId),
        gte(automationIdeas.createdAt, start),
        lt(automationIdeas.createdAt, end),
      ),
    );
  return rows.length;
}

export async function insertIdea(input: {
  userId: number;
  source: IdeaSource;
  title: string;
  keyword?: string | null;
  monthlyVolume?: number | null;
  meta?: Record<string, unknown> | null;
}): Promise<AutomationIdeaRow> {
  const database = requireDb();
  const inserted = await database
    .insert(automationIdeas)
    .values({
      userId: input.userId,
      source: input.source,
      title: input.title,
      keyword: input.keyword ?? null,
      monthlyVolume: input.monthlyVolume ?? null,
      meta: input.meta ?? null,
    })
    .returning();
  return inserted[0];
}

export async function getIdeaForUser(
  userId: number,
  ideaId: number,
): Promise<AutomationIdeaRow | null> {
  const database = requireDb();
  const rows = await database
    .select()
    .from(automationIdeas)
    .where(and(eq(automationIdeas.userId, userId), eq(automationIdeas.id, ideaId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listDrafts(userId: number): Promise<AutomationDraftRow[]> {
  const database = requireDb();
  return database
    .select()
    .from(automationDrafts)
    .where(eq(automationDrafts.userId, userId))
    .orderBy(desc(automationDrafts.updatedAt));
}

export async function insertDraft(input: {
  userId: number;
  ideaId?: number | null;
  title: string;
  content: string;
  status?: AutomationDraftStatus;
  meta?: Record<string, unknown> | null;
}): Promise<AutomationDraftRow> {
  const database = requireDb();
  const inserted = await database
    .insert(automationDrafts)
    .values({
      userId: input.userId,
      ideaId: input.ideaId ?? null,
      title: input.title,
      content: input.content,
      status: input.status ?? "draft",
      meta: input.meta ?? null,
    })
    .returning();
  return inserted[0];
}

export async function updateDraftForUser(
  userId: number,
  id: number,
  patch: {
    status?: AutomationDraftStatus;
    content?: string;
    title?: string;
    exportedAt?: Date | null;
  },
): Promise<AutomationDraftRow | null> {
  const database = requireDb();
  const updated = await database
    .update(automationDrafts)
    .set({
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.content !== undefined ? { content: patch.content } : {}),
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.exportedAt !== undefined ? { exportedAt: patch.exportedAt } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(automationDrafts.userId, userId), eq(automationDrafts.id, id)))
    .returning();
  return updated[0] ?? null;
}

export async function logAutomationDraftEvent(
  userId: number,
  meta: Record<string, unknown>,
): Promise<void> {
  const database = requireDb();
  await database.insert(usageEvents).values({
    userId,
    action: "automation_draft",
    meta,
  });
}
