import { count, desc, eq, ilike, or } from "drizzle-orm";
import { db, hasDatabase } from "@/lib/db/index";
import { users } from "@/lib/db/schema";
import { getPlan, type PlanId } from "@/lib/plans";

export type AdminUserRow = {
  id: number;
  clerkId: string;
  email: string | null;
  plan: PlanId;
  aiUsedMonth: number;
  googleUsedMonth: number;
  usageMonthKey: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export async function listUsersForAdmin(input: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ users: AdminUserRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));
  const q = input.q?.trim() ?? "";

  if (!hasDatabase || !db) {
    return { users: [], total: 0, page, pageSize };
  }

  const where = q
    ? or(ilike(users.email, `%${q}%`), ilike(users.clerkId, `%${q}%`), ilike(users.plan, `%${q}%`))
    : undefined;

  const [totalRow] = await db
    .select({ total: count() })
    .from(users)
    .where(where);

  const rows = await db
    .select()
    .from(users)
    .where(where)
    .orderBy(desc(users.updatedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    users: rows.map((row) => ({
      id: row.id,
      clerkId: row.clerkId,
      email: row.email,
      plan: getPlan(row.plan).id,
      aiUsedMonth: row.aiUsedMonth,
      googleUsedMonth: row.googleUsedMonth,
      usageMonthKey: row.usageMonthKey,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
    total: Number(totalRow?.total ?? 0),
    page,
    pageSize,
  };
}

export async function getPlanDistribution(): Promise<Record<string, number>> {
  if (!hasDatabase || !db) return {};
  const rows = await db
    .select({ plan: users.plan, total: count() })
    .from(users)
    .groupBy(users.plan);
  const out: Record<string, number> = {};
  for (const row of rows) out[row.plan] = Number(row.total);
  return out;
}

export async function countUsers(): Promise<number> {
  if (!hasDatabase || !db) return 0;
  const [row] = await db.select({ total: count() }).from(users);
  return Number(row?.total ?? 0);
}

const ASSIGNABLE: PlanId[] = ["free", "basic", "super", "enterprise"];

export function isAssignablePlan(plan: string): plan is PlanId {
  return (ASSIGNABLE as string[]).includes(plan);
}

export async function patchUserForAdmin(
  id: number,
  input: { plan?: PlanId; resetUsage?: boolean },
): Promise<AdminUserRow | null> {
  if (!hasDatabase || !db) return null;

  const existing = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!existing[0]) return null;

  const patch: Partial<typeof users.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (input.plan && isAssignablePlan(input.plan)) {
    patch.plan = input.plan;
  }
  if (input.resetUsage) {
    patch.aiUsedMonth = 0;
    patch.googleUsedMonth = 0;
  }

  const updated = await db.update(users).set(patch).where(eq(users.id, id)).returning();
  const row = updated[0];
  if (!row) return null;
  return {
    id: row.id,
    clerkId: row.clerkId,
    email: row.email,
    plan: getPlan(row.plan).id,
    aiUsedMonth: row.aiUsedMonth,
    googleUsedMonth: row.googleUsedMonth,
    usageMonthKey: row.usageMonthKey,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
