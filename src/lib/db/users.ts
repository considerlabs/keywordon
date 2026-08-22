import { and, eq, sql } from "drizzle-orm";
import { db, hasDatabase } from "./index";
import { users, type UserRow } from "./schema";
import { isAdminEmail } from "../admin/emails";
import { getPlan, type PlanId } from "../plans";

type MemoryUser = {
  id: number;
  clerkId: string;
  email: string | null;
  plan: PlanId;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  aiUsedMonth: number;
  googleUsedMonth: number;
  usageMonthKey: string | null;
};

const memoryUsers = new Map<string, MemoryUser>();
let memoryId = 1;

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function resetIfNeeded(user: MemoryUser | UserRow) {
  const key = monthKey();
  if (user.usageMonthKey !== key) {
    user.usageMonthKey = key;
    user.aiUsedMonth = 0;
    user.googleUsedMonth = 0;
  }
}

export async function ensureUser(
  clerkId: string,
  email?: string | null,
): Promise<{
  id: number;
  plan: PlanId;
  clerkId: string;
  email: string | null;
  aiUsedMonth: number;
  googleUsedMonth: number;
}> {
  if (!hasDatabase || !db) {
    let user = memoryUsers.get(clerkId);
    if (!user) {
      user = {
        id: memoryId++,
        clerkId,
        email: email ?? null,
        plan: "free",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        aiUsedMonth: 0,
        googleUsedMonth: 0,
        usageMonthKey: monthKey(),
      };
      memoryUsers.set(clerkId, user);
    }
    if (email && user.email !== email) user.email = email;
    resetIfNeeded(user);
    return user;
  }

  const existing = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  if (existing[0]) {
    const row = existing[0];
    const key = monthKey();
    if (row.usageMonthKey !== key || (email && email !== row.email)) {
      const updated = await db
        .update(users)
        .set({
          usageMonthKey: key,
          aiUsedMonth: row.usageMonthKey !== key ? 0 : row.aiUsedMonth,
          googleUsedMonth: row.usageMonthKey !== key ? 0 : row.googleUsedMonth,
          updatedAt: new Date(),
          email: email ?? row.email,
        })
        .where(eq(users.clerkId, clerkId))
        .returning();
      return {
        id: updated[0].id,
        plan: updated[0].plan as PlanId,
        clerkId: updated[0].clerkId,
        email: updated[0].email,
        aiUsedMonth: updated[0].aiUsedMonth,
        googleUsedMonth: updated[0].googleUsedMonth,
      };
    }
    return {
      id: row.id,
      plan: row.plan as PlanId,
      clerkId: row.clerkId,
      email: row.email,
      aiUsedMonth: row.aiUsedMonth,
      googleUsedMonth: row.googleUsedMonth,
    };
  }

  const created = await db
    .insert(users)
    .values({
      clerkId,
      email: email ?? null,
      plan: "free",
      usageMonthKey: monthKey(),
    })
    .onConflictDoNothing({ target: users.clerkId })
    .returning();

  if (created[0]) {
    return {
      id: created[0].id,
      plan: created[0].plan as PlanId,
      clerkId: created[0].clerkId,
      email: created[0].email,
      aiUsedMonth: created[0].aiUsedMonth,
      googleUsedMonth: created[0].googleUsedMonth,
    };
  }

  // Concurrent signup won the race — re-select the row they inserted.
  const raced = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  if (!raced[0]) {
    throw new Error("ensureUser: insert conflict but row missing");
  }
  return {
    id: raced[0].id,
    plan: raced[0].plan as PlanId,
    clerkId: raced[0].clerkId,
    email: raced[0].email,
    aiUsedMonth: raced[0].aiUsedMonth,
    googleUsedMonth: raced[0].googleUsedMonth,
  };
}

export async function setUserPlan(clerkId: string, plan: PlanId) {
  if (!hasDatabase || !db) {
    const user = memoryUsers.get(clerkId);
    if (user) user.plan = plan;
    return;
  }
  await db
    .update(users)
    .set({ plan, updatedAt: new Date() })
    .where(eq(users.clerkId, clerkId));
}

/** Atomically consume one AI credit if under monthly limit. */
export async function tryConsumeAiUsage(clerkId: string, limit: number) {
  const user = await ensureUser(clerkId);
  if (isAdminEmail(user.email) || limit >= 1_000_000) {
    return { ok: true as const, used: user.aiUsedMonth };
  }
  if (limit <= 0) return { ok: false as const, used: user.aiUsedMonth };

  if (!hasDatabase || !db) {
    const mem = memoryUsers.get(clerkId);
    if (!mem || mem.aiUsedMonth >= limit) {
      return { ok: false as const, used: mem?.aiUsedMonth ?? user.aiUsedMonth };
    }
    mem.aiUsedMonth += 1;
    return { ok: true as const, used: mem.aiUsedMonth };
  }

  const updated = await db
    .update(users)
    .set({
      aiUsedMonth: sql`${users.aiUsedMonth} + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(users.clerkId, clerkId), sql`${users.aiUsedMonth} < ${limit}`))
    .returning({ aiUsedMonth: users.aiUsedMonth });

  if (!updated[0]) {
    const fresh = await ensureUser(clerkId);
    return { ok: false as const, used: fresh.aiUsedMonth };
  }
  return { ok: true as const, used: updated[0].aiUsedMonth };
}

/** Atomically consume one Google analysis credit if under monthly limit. */
export async function tryConsumeGoogleUsage(clerkId: string, limit: number) {
  const user = await ensureUser(clerkId);
  if (isAdminEmail(user.email) || limit >= 1_000_000) {
    return { ok: true as const, used: user.googleUsedMonth };
  }
  if (limit <= 0) return { ok: false as const, used: user.googleUsedMonth };

  if (!hasDatabase || !db) {
    const mem = memoryUsers.get(clerkId);
    if (!mem || mem.googleUsedMonth >= limit) {
      return { ok: false as const, used: mem?.googleUsedMonth ?? user.googleUsedMonth };
    }
    mem.googleUsedMonth += 1;
    return { ok: true as const, used: mem.googleUsedMonth };
  }

  const updated = await db
    .update(users)
    .set({
      googleUsedMonth: sql`${users.googleUsedMonth} + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(users.clerkId, clerkId), sql`${users.googleUsedMonth} < ${limit}`))
    .returning({ googleUsedMonth: users.googleUsedMonth });

  if (!updated[0]) {
    const fresh = await ensureUser(clerkId);
    return { ok: false as const, used: fresh.googleUsedMonth };
  }
  return { ok: true as const, used: updated[0].googleUsedMonth };
}

/** @deprecated Prefer tryConsumeAiUsage for race-safe increments */
export async function incrementAiUsage(clerkId: string) {
  await tryConsumeAiUsage(clerkId, Number.MAX_SAFE_INTEGER);
}

export async function getUserPlanContext(clerkId: string | null, email?: string | null) {
  if (!clerkId) {
    return { user: null, plan: getPlan("guest") };
  }
  const user = await ensureUser(clerkId, email);
  return { user, plan: getPlan(user.plan) };
}
