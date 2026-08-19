import { eq } from "drizzle-orm";
import { db, hasDatabase } from "./index";
import { users, type UserRow } from "./schema";
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
): Promise<{ id: number; plan: PlanId; clerkId: string; email: string | null; aiUsedMonth: number; googleUsedMonth: number }> {
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
    resetIfNeeded(user);
    return user;
  }

  const existing = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  if (existing[0]) {
    const row = existing[0];
    const key = monthKey();
    if (row.usageMonthKey !== key) {
      const updated = await db
        .update(users)
        .set({
          usageMonthKey: key,
          aiUsedMonth: 0,
          googleUsedMonth: 0,
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
    .returning();

  return {
    id: created[0].id,
    plan: created[0].plan as PlanId,
    clerkId: created[0].clerkId,
    email: created[0].email,
    aiUsedMonth: created[0].aiUsedMonth,
    googleUsedMonth: created[0].googleUsedMonth,
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

export async function incrementAiUsage(clerkId: string) {
  const user = await ensureUser(clerkId);
  if (!hasDatabase || !db) {
    const mem = memoryUsers.get(clerkId);
    if (mem) mem.aiUsedMonth += 1;
    return;
  }
  await db
    .update(users)
    .set({ aiUsedMonth: user.aiUsedMonth + 1, updatedAt: new Date() })
    .where(eq(users.clerkId, clerkId));
}

export async function getUserPlanContext(clerkId: string | null, email?: string | null) {
  if (!clerkId) {
    return { user: null, plan: getPlan("guest") };
  }
  const user = await ensureUser(clerkId, email);
  return { user, plan: getPlan(user.plan) };
}