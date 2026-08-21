import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db, hasDatabase } from "@/lib/db";
import { blogPersonas, usageEvents, type BlogPersonaRow } from "@/lib/db/schema";
import type { PersonaReport, PersonaStatus } from "./types";
import { monthKey } from "./monthly";

const STEP_INTERVAL_MS = 2000;
const TOTAL_STEPS = 5;

function requireDb() {
  if (!hasDatabase || !db) {
    throw new Error("DATABASE_URL이 필요합니다.");
  }
  return db;
}

function monthStart(key: string): Date {
  return new Date(`${key}-01T00:00:00.000Z`);
}

export async function getPersonaForUser(userId: number): Promise<BlogPersonaRow | null> {
  const database = requireDb();
  const rows = await database
    .select()
    .from(blogPersonas)
    .where(eq(blogPersonas.userId, userId))
    .orderBy(desc(blogPersonas.updatedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getDonePersonaForUser(userId: number): Promise<BlogPersonaRow | null> {
  const database = requireDb();
  const rows = await database
    .select()
    .from(blogPersonas)
    .where(and(eq(blogPersonas.userId, userId), eq(blogPersonas.status, "done")))
    .orderBy(desc(blogPersonas.updatedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertPersonaForAnalysis(input: {
  userId: number;
  blogUrl?: string | null;
  sourceText: string;
}): Promise<BlogPersonaRow> {
  const database = requireDb();
  const existing = await getPersonaForUser(input.userId);

  const values = {
    status: "analyzing" as PersonaStatus,
    blogUrl: input.blogUrl ?? null,
    progressStep: 0,
    errorMessage: null as string | null,
    tone: null,
    structure: null,
    audience: null,
    avoid: null,
    editedByUser: 0,
    meta: { sourceText: input.sourceText.slice(0, 50_000) },
    updatedAt: new Date(),
  };

  if (existing) {
    const updated = await database
      .update(blogPersonas)
      .set(values)
      .where(and(eq(blogPersonas.userId, input.userId), eq(blogPersonas.id, existing.id)))
      .returning();
    return updated[0];
  }

  const inserted = await database
    .insert(blogPersonas)
    .values({
      userId: input.userId,
      ...values,
    })
    .returning();
  return inserted[0];
}

export async function updatePersonaProgress(
  userId: number,
  id: number,
  patch: {
    status?: PersonaStatus;
    progressStep?: number;
    errorMessage?: string | null;
    tone?: PersonaReport["tone"] | null;
    structure?: PersonaReport["structure"] | null;
    audience?: PersonaReport["audience"] | null;
    avoid?: PersonaReport["avoid"] | null;
    editedByUser?: number;
    meta?: Record<string, unknown> | null;
  },
): Promise<BlogPersonaRow | null> {
  const database = requireDb();
  const existing = await database
    .select()
    .from(blogPersonas)
    .where(and(eq(blogPersonas.userId, userId), eq(blogPersonas.id, id)))
    .limit(1);
  if (!existing[0]) return null;

  const nextMeta =
    patch.meta !== undefined
      ? { ...((existing[0].meta as Record<string, unknown> | null) ?? {}), ...patch.meta }
      : undefined;

  const updated = await database
    .update(blogPersonas)
    .set({
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.progressStep !== undefined ? { progressStep: patch.progressStep } : {}),
      ...(patch.errorMessage !== undefined ? { errorMessage: patch.errorMessage } : {}),
      ...(patch.tone !== undefined ? { tone: patch.tone } : {}),
      ...(patch.structure !== undefined ? { structure: patch.structure } : {}),
      ...(patch.audience !== undefined ? { audience: patch.audience } : {}),
      ...(patch.avoid !== undefined ? { avoid: patch.avoid } : {}),
      ...(patch.editedByUser !== undefined ? { editedByUser: patch.editedByUser } : {}),
      ...(nextMeta !== undefined ? { meta: nextMeta } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(blogPersonas.userId, userId), eq(blogPersonas.id, id)))
    .returning();
  return updated[0] ?? null;
}

export async function patchPersonaByUser(
  userId: number,
  patch: {
    tone?: PersonaReport["tone"];
    structure?: PersonaReport["structure"];
    audience?: PersonaReport["audience"];
    avoid?: PersonaReport["avoid"];
  },
): Promise<BlogPersonaRow | null> {
  const database = requireDb();
  const existing = await getDonePersonaForUser(userId);
  if (!existing) return null;

  const updated = await database
    .update(blogPersonas)
    .set({
      ...(patch.tone !== undefined ? { tone: patch.tone } : {}),
      ...(patch.structure !== undefined ? { structure: patch.structure } : {}),
      ...(patch.audience !== undefined ? { audience: patch.audience } : {}),
      ...(patch.avoid !== undefined ? { avoid: patch.avoid } : {}),
      editedByUser: 1,
      updatedAt: new Date(),
    })
    .where(and(eq(blogPersonas.userId, userId), eq(blogPersonas.id, existing.id)))
    .returning();
  return updated[0] ?? null;
}

export async function countPersonaAnalyzesThisMonth(
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
        eq(usageEvents.action, "persona_analyze"),
        gte(usageEvents.createdAt, start),
        lt(usageEvents.createdAt, end),
      ),
    );
  return Number(rows[0]?.count ?? 0);
}

export async function logPersonaAnalyzeEvent(
  userId: number,
  meta: Record<string, unknown>,
): Promise<void> {
  const database = requireDb();
  await database.insert(usageEvents).values({
    userId,
    action: "persona_analyze",
    meta,
  });
}

export function shouldAdvanceStep(persona: BlogPersonaRow): boolean {
  if (persona.status !== "analyzing") return false;
  const elapsed = Date.now() - new Date(persona.updatedAt).getTime();
  return elapsed >= STEP_INTERVAL_MS;
}

export function nextProgressStep(current: number): number {
  return Math.min(TOTAL_STEPS, current + 1);
}

export { STEP_INTERVAL_MS, TOTAL_STEPS };
