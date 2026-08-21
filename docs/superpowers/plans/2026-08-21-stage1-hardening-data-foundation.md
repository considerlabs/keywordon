# Stage 1: Hardening + Data Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the "1단계 — 데이터 기반 + 하드닝" items from `docs/00-통합개발계획서.md` §9: fix the three Low-severity issues found in the security audit (§2.2–§2.4), wire `usage_events` logging into the five existing analysis routes so Stage 3's savings dashboard has data to read, and stand up the `keyword_snapshots` table + hourly cron so trend history starts accumulating immediately (per §7.1, snapshot data cannot be backfilled — every day this is delayed is permanently lost).

**Architecture:** No new services, no new runtime dependencies beyond a test runner. All changes are surgical edits to existing Next.js 16 App Router route handlers (`src/app/api/**/route.ts`) and the existing Drizzle schema (`src/lib/db/schema.ts`), following the exact patterns already in the codebase (`assertFeature`/`checkNaverRateLimit` from `src/lib/quota.ts`, the `hasDatabase && db` guard used throughout `src/lib/db/users.ts`). One new route (`/api/cron/snapshot`) and one new config file (`vercel.json`) are added for the hourly snapshot cron.

**Tech Stack:** Next.js 16 (App Router, Node runtime), TypeScript, Drizzle ORM + Neon Postgres, Vitest (new — this repo has zero test infrastructure today; Task 1 adds the minimum needed for TDD).

**Spec:** `docs/00-통합개발계획서.md` (sections §2.2, §2.3, §2.4, §7.2, §7.3, §8.4-precondition, §9 1단계)

## Global Constraints

- Zero regressions in the 5 existing API routes (`/api/analyze`, `/api/bulk`, `/api/discover`, `/api/blog`, `/api/site`) or their plan-gating behavior — verified by the existing manual smoke checklist plus the new automated tests in this plan.
- No new quota/rate-limit system — reuse `checkNaverRateLimit`, `assertFeature`, `applyPlanLimits` from `src/lib/quota.ts` exactly as they exist today. Do not modify their signatures.
- Exactly one new npm dependency: `vitest` (devDependency). No mocking libraries, no test-framework plugins beyond what vitest ships with.
- `usage_events` inserts are gated by `hasDatabase && db` (mirrors the existing pattern in `src/lib/quota.ts::checkNaverRateLimit`) and only fire for authenticated users (`authContext.user` present) — guests are never logged.
- Scope is exactly the "1단계" checklist in `docs/00-통합개발계획서.md` §9. Persona (§6), post-audit (§5), trend UI (§4/§7.4), shortform/calculator (§8.1/§8.2), and the new plan-limit keys (§8.5) are **out of scope** for this plan — they get their own plans later.
- The `keyword_snapshots` cron in this plan captures whatever `getRealtimeTrends()` currently returns (the existing deterministic simulation in `src/lib/keyword-engine.ts`) — it does **not** wire up a real trending-keyword data source. The point of this stage is to start the pipeline and the table *today* so history exists once a real data source lands in a later stage (per spec §7.1's "소급 축적 불가능" argument). Say this explicitly to anyone reviewing — it is intentional, not an oversight.

---

### Task 1: Add Vitest test runner

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/test/smoke.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `npm test` command (runs `vitest run`); `@/*` path alias resolves inside test files the same way it does in `tsconfig.json`. Every later task's tests depend on this.

- [ ] **Step 1: Install vitest**

Run:
```bash
npm install -D vitest@^4.1.11
```

- [ ] **Step 2: Create the vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // Auto-clears mock.calls/mock.results before every test (equivalent to
    // vi.clearAllMocks() in a global beforeEach), without touching
    // mockReturnValue/mockImplementation setups. Every route-handler test in
    // this plan reuses the same mocked module across multiple `it()` blocks
    // in one file, and without this, call-count assertions
    // (toHaveBeenCalledTimes, "not.toHaveBeenCalled") in a later test would
    // see call history left over from an earlier test in the same file.
    clearMocks: true,
  },
});
```

- [ ] **Step 3: Add the `test` script**

Modify `package.json` — in the `"scripts"` block, add a `test` entry right after `"lint"`:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  },
```

- [ ] **Step 4: Write a smoke test**

Create `src/test/smoke.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { getPlan } from "@/lib/plans";

describe("vitest setup", () => {
  it("resolves the @ path alias and runs", () => {
    expect(getPlan("guest").id).toBe("guest");
  });
});
```

- [ ] **Step 5: Run the test suite and verify it passes**

Run: `npm test`
Expected: 1 test file, 1 test, PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/test/smoke.test.ts
git commit -m "test: add vitest test runner"
```

---

### Task 2: Fix bulk Naver RPM accounting (§2.3)

**Files:**
- Modify: `src/app/api/bulk/route.ts`
- Test: `src/app/api/bulk/route.test.ts`

**Interfaces:**
- Consumes: `checkNaverRateLimit(actor, plan)` from `@/lib/quota` (existing, unchanged signature)
- Produces: nothing new for later tasks — this is a leaf fix.

**Context:** Today `bulk/route.ts` calls `checkNaverRateLimit()` exactly once per HTTP request, then `resolveBulk()` internally fetches live Naver data once per unique keyword (up to 50). The fix: call `checkNaverRateLimit()` once per keyword that will actually be fetched, so the same RPM bucket `analyze` uses also sees bulk's real Naver call volume, and a request is rejected early if it would blow the limit.

- [ ] **Step 1: Write the failing test**

Create `src/app/api/bulk/route.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  getAuthContext: vi.fn(),
}));
vi.mock("@/lib/quota", async () => {
  const actual = await vi.importActual<typeof import("@/lib/quota")>("@/lib/quota");
  return {
    ...actual,
    checkNaverRateLimit: vi.fn(),
  };
});

import { getAuthContext } from "@/lib/auth";
import { checkNaverRateLimit } from "@/lib/quota";
import { getPlan } from "@/lib/plans";
import { POST } from "./route";

function bulkRequest(keywords: string[], engine = "naver") {
  return new NextRequest("http://localhost/api/bulk", {
    method: "POST",
    body: JSON.stringify({ keywords, engine }),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/bulk — Naver RPM accounting", () => {
  beforeEach(() => {
    vi.mocked(getAuthContext).mockResolvedValue({
      userId: "user_1",
      email: "a@b.com",
      plan: getPlan("enterprise"),
      user: { id: 1, plan: "enterprise", clerkId: "user_1", email: "a@b.com", aiUsedMonth: 0, googleUsedMonth: 0 },
      authEnabled: true,
    });
  });

  it("calls checkNaverRateLimit once per unique keyword, not once per request", async () => {
    vi.mocked(checkNaverRateLimit).mockResolvedValue({ ok: true });

    const response = await POST(bulkRequest(["김치찌개", "된장찌개", "된장찌개", "순두부찌개"]));

    expect(response.status).toBe(200);
    // 3 unique keywords after de-dupe ("된장찌개" repeated)
    expect(vi.mocked(checkNaverRateLimit)).toHaveBeenCalledTimes(3);
  });

  it("rejects with 429 as soon as any per-keyword rate check fails, without ever calling resolveBulk", async () => {
    vi.mocked(checkNaverRateLimit)
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, error: "분당 분석 한도(40회)를 초과했습니다. 엔터프라이즈 플랜을 업그레이드하세요." });

    const response = await POST(bulkRequest(["김치찌개", "된장찌개", "순두부찌개"]));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toContain("한도");
    // Stopped after the 2nd keyword failed — never checked the 3rd.
    expect(vi.mocked(checkNaverRateLimit)).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- bulk/route.test`
Expected: FAIL — `checkNaverRateLimit` called 1 time, not 3, in the first test.

- [ ] **Step 3: Implement the fix**

Modify `src/app/api/bulk/route.ts`. Replace the `else` branch of the engine check (the Naver rate-limit block) with a per-keyword loop. Current code:

```typescript
    } else {
      const actor = authContext.userId ?? request.headers.get("x-forwarded-for") ?? "guest";
      const rate = await checkNaverRateLimit(actor, authContext.plan);
      if (!rate.ok) {
        return NextResponse.json({ error: rate.error }, { status: 429 });
      }
    }
```

New code:

```typescript
    } else {
      const actor = authContext.userId ?? request.headers.get("x-forwarded-for") ?? "guest";
      // One live Naver fetch happens per unique keyword inside resolveBulk() below —
      // account for each one against the same RPM bucket /api/analyze uses, so a
      // single bulk request can't silently blow through the per-minute limit.
      const uniqueKeywordCount = [...new Set(keywords.map((k) => k.trim()).filter(Boolean))].slice(
        0,
        50,
      ).length;
      for (let i = 0; i < uniqueKeywordCount; i += 1) {
        const rate = await checkNaverRateLimit(actor, authContext.plan);
        if (!rate.ok) {
          return NextResponse.json({ error: rate.error }, { status: 429 });
        }
      }
    }
```

(The dedupe/slice logic mirrors `resolveBulk()`'s own `[...new Set(...)].slice(0, 50)` in `src/lib/providers/keyword-data.ts` exactly, so the count here always matches the number of calls `resolveBulk` will actually make.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- bulk/route.test`
Expected: PASS, both tests.

- [ ] **Step 5: Run the full suite to confirm no regressions**

Run: `npm test`
Expected: all tests PASS (smoke test + these 2).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/bulk/route.ts src/app/api/bulk/route.test.ts
git commit -m "fix: account for every live Naver call in bulk RPM limiter"
```

---

### Task 3: Add rate limiting to `/api/discover` (§2.2)

**Files:**
- Modify: `src/app/api/discover/route.ts`
- Test: `src/app/api/discover/route.test.ts`

**Interfaces:**
- Consumes: `checkNaverRateLimit(actor, plan)` from `@/lib/quota`
- Produces: nothing new for later tasks.

- [ ] **Step 1: Write the failing test**

Create `src/app/api/discover/route.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  getAuthContext: vi.fn(),
}));
vi.mock("@/lib/quota", async () => {
  const actual = await vi.importActual<typeof import("@/lib/quota")>("@/lib/quota");
  return {
    ...actual,
    checkNaverRateLimit: vi.fn(),
  };
});

import { getAuthContext } from "@/lib/auth";
import { checkNaverRateLimit } from "@/lib/quota";
import { getPlan } from "@/lib/plans";
import { GET } from "./route";

function discoverRequest(q: string) {
  return new NextRequest(`http://localhost/api/discover?q=${encodeURIComponent(q)}`);
}

describe("GET /api/discover — rate limiting", () => {
  beforeEach(() => {
    vi.mocked(getAuthContext).mockResolvedValue({
      userId: "user_1",
      email: "a@b.com",
      plan: getPlan("free"),
      user: { id: 1, plan: "free", clerkId: "user_1", email: "a@b.com", aiUsedMonth: 0, googleUsedMonth: 0 },
      authEnabled: true,
    });
  });

  it("returns results when under the rate limit", async () => {
    vi.mocked(checkNaverRateLimit).mockResolvedValue({ ok: true });

    const response = await GET(discoverRequest("마케팅"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.seed).toBe("마케팅");
    expect(vi.mocked(checkNaverRateLimit)).toHaveBeenCalledWith("user_1", getPlan("free"));
  });

  it("returns 429 when the rate limit is exceeded", async () => {
    vi.mocked(checkNaverRateLimit).mockResolvedValue({
      ok: false,
      error: "분당 분석 한도(4회)를 초과했습니다. 무료 플랜을 업그레이드하세요.",
    });

    const response = await GET(discoverRequest("마케팅"));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toContain("한도");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- discover/route.test`
Expected: FAIL — both requests currently return 200 (no rate check exists yet), so the second test fails.

- [ ] **Step 3: Implement the fix**

Modify `src/app/api/discover/route.ts`. Full new file content:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { applyDiscoverLimits, checkNaverRateLimit } from "@/lib/quota";
import { discoverKeywords } from "@/lib/keyword-engine";

export async function GET(request: NextRequest) {
  const authContext = await getAuthContext();

  if (!authContext.userId) {
    return NextResponse.json(
      { error: "키워드 발굴은 로그인 후 이용할 수 있습니다." },
      { status: 401 },
    );
  }

  const rate = await checkNaverRateLimit(authContext.userId, authContext.plan);
  if (!rate.ok) {
    return NextResponse.json({ error: rate.error }, { status: 429 });
  }

  const seed = request.nextUrl.searchParams.get("q")?.trim() ?? "마케팅";
  const items = applyDiscoverLimits(discoverKeywords(seed), authContext.plan);

  return NextResponse.json({
    seed,
    items,
    locked: { opportunityScore: !authContext.plan.limits.opportunityScore },
    planName: authContext.plan.name,
  });
}
```

(`authContext.userId` is guaranteed non-null past the guard above, so no `?? "guest"` fallback is needed here — unlike `analyze`/`bulk`, which are reachable while signed out.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- discover/route.test`
Expected: PASS, both tests.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/discover/route.ts src/app/api/discover/route.test.ts
git commit -m "fix: add Naver RPM rate limiting to /api/discover"
```

---

### Task 4: Fix `ensureUser()` race condition on first signup (§2.4)

**Files:**
- Modify: `src/lib/db/users.ts`
- Test: `src/lib/db/users.test.ts`

**Interfaces:**
- Consumes: `db`, `hasDatabase` from `@/lib/db/index` (mocked in test); `users` table from `@/lib/db/schema`
- Produces: `ensureUser()` keeps its exact existing signature and return shape — every route that calls it (directly or via `getAuthContext`) is unaffected except that concurrent first-signup requests no longer 500.

**Context:** `ensureUser()` does `SELECT ... LIMIT 1`, and if empty, `INSERT`. Two concurrent requests for a brand-new Clerk user can both see "no row" and both `INSERT`, and the second hits the `users_clerk_id_idx` unique constraint and throws. Fix: use `.onConflictDoNothing()` on the insert, and if it returns no row (meaning another request won the race), re-select the row that request created.

- [ ] **Step 1: Write the failing test**

Create `src/lib/db/users.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";

// vi.mock factories are hoisted above imports, so any object they reference
// must be created via vi.hoisted() — a plain top-level `const` declared later
// in the file would not exist yet when the factory runs.
const { mockDb, insertChain, selectChain } = vi.hoisted(() => {
  const insertChain = {
    values: vi.fn(),
    onConflictDoNothing: vi.fn(),
    returning: vi.fn(),
  };
  const selectChain = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };
  // Make every chain method return `this` so `.values().onConflictDoNothing().returning()` chains.
  insertChain.values.mockReturnValue(insertChain);
  insertChain.onConflictDoNothing.mockReturnValue(insertChain);
  selectChain.from.mockReturnValue(selectChain);
  selectChain.where.mockReturnValue(selectChain);

  const mockDb = {
    insert: vi.fn(() => insertChain),
    select: vi.fn(() => selectChain),
    update: vi.fn(),
  };
  return { mockDb, insertChain, selectChain };
});

vi.mock("./index", () => ({
  db: mockDb,
  hasDatabase: true,
}));

import { ensureUser } from "./users";

describe("ensureUser — signup race condition", () => {
  it("re-selects the row when a concurrent request wins the insert race", async () => {
    // 1st select (the "does this user already exist" check): empty.
    selectChain.limit.mockResolvedValueOnce([]);
    // The insert loses the race — onConflictDoNothing means Postgres returns 0 rows.
    insertChain.returning.mockResolvedValueOnce([]);
    // 2nd select (our new fallback): the row the concurrent request created.
    selectChain.limit.mockResolvedValueOnce([
      {
        id: 42,
        clerkId: "user_race",
        email: "race@example.com",
        plan: "free",
        aiUsedMonth: 0,
        googleUsedMonth: 0,
        usageMonthKey: "2026-08",
      },
    ]);

    const result = await ensureUser("user_race", "race@example.com");

    expect(result.id).toBe(42);
    expect(result.clerkId).toBe("user_race");
    expect(insertChain.onConflictDoNothing).toHaveBeenCalled();
  });

  it("returns the freshly inserted row directly when there is no race", async () => {
    selectChain.limit.mockResolvedValueOnce([]); // no existing user
    insertChain.returning.mockResolvedValueOnce([
      {
        id: 43,
        clerkId: "user_solo",
        email: null,
        plan: "free",
        aiUsedMonth: 0,
        googleUsedMonth: 0,
        usageMonthKey: "2026-08",
      },
    ]);

    const result = await ensureUser("user_solo");

    expect(result.id).toBe(43);
    expect(selectChain.limit).toHaveBeenCalledTimes(1); // no fallback re-select needed
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- lib/db/users.test`
Expected: FAIL on the first test (`onConflictDoNothing` is never called; `result.id` is `undefined` because `insertChain.returning` resolved to `[]` and current code does `created[0].id` on an empty array, throwing).

- [ ] **Step 3: Implement the fix**

Modify `src/lib/db/users.ts`. Replace the final block of `ensureUser()` (the `const created = ...` insert through its `return`) — everything above it (the `existing[0]` branch) is unchanged. Current code being replaced:

```typescript
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
```

New code:

```typescript
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

  // onConflictDoNothing returned no row: a concurrent request for the same
  // clerkId won the insert race between our SELECT above and this INSERT.
  // Re-select the row it created instead of throwing.
  const raced = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  const row = raced[0];
  if (!row) {
    throw new Error(`동시 가입 처리 중 사용자 행을 찾을 수 없습니다: ${clerkId}`);
  }
  return {
    id: row.id,
    plan: row.plan as PlanId,
    clerkId: row.clerkId,
    email: row.email,
    aiUsedMonth: row.aiUsedMonth,
    googleUsedMonth: row.googleUsedMonth,
  };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- lib/db/users.test`
Expected: PASS, both tests.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 6: Manual verification against a real database**

This fix's whole point is Postgres-level conflict behavior, which a mock can't fully prove. Before merging, run once against the real dev DB:

```bash
vercel env pull .env.local --yes --scope briank-projects
npm run dev
# In two separate terminals, fire the same brand-new Clerk session's first
# request at the same time, e.g. two curls to /api/analyze with a fresh test
# account's session cookie. Confirm both return 200 (no 500), and confirm in
# `npm run db:studio` that exactly one `users` row exists for that clerk_id.
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/users.ts src/lib/db/users.test.ts
git commit -m "fix: make ensureUser race-safe on concurrent first signup"
```

---

### Task 5: Log `usage_events` from `/api/analyze` (§8.4 precondition)

**Files:**
- Modify: `src/app/api/analyze/route.ts`
- Test: `src/app/api/analyze/route.test.ts`

**Interfaces:**
- Consumes: `usageEvents` table from `@/lib/db/schema`; `db`, `hasDatabase` from `@/lib/db/index`
- Produces: `usage_events` rows with `action: "keyword_lookup"`, `meta: { keyword, engine }`, `userId: authContext.user.id` — this exact action name and meta shape is what a later (out-of-scope) Stage 3 plan will aggregate for the savings dashboard. Do not rename `"keyword_lookup"` without updating that later plan too.

- [ ] **Step 1: Write the failing test**

Create `src/app/api/analyze/route.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  getAuthContext: vi.fn(),
}));
vi.mock("@/lib/db/index", () => ({
  db: { insert: vi.fn() },
  hasDatabase: true,
}));
vi.mock("@/lib/db/users", () => ({
  tryConsumeGoogleUsage: vi.fn(),
}));
// checkNaverRateLimit does its own real DB reads/writes when hasDatabase is
// true (see src/lib/quota.ts). This test only cares about usage-event
// logging, so stub it out — otherwise it would hit the fake `db` above with
// calls (`db.select()`) that mock doesn't implement and throw.
vi.mock("@/lib/quota", async () => {
  const actual = await vi.importActual<typeof import("@/lib/quota")>("@/lib/quota");
  return {
    ...actual,
    checkNaverRateLimit: vi.fn().mockResolvedValue({ ok: true }),
  };
});

import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/db/index";
import { getPlan } from "@/lib/plans";
import { usageEvents } from "@/lib/db/schema";
import { GET } from "./route";

function analyzeRequest(q: string, engine = "naver") {
  return new NextRequest(`http://localhost/api/analyze?q=${encodeURIComponent(q)}&engine=${engine}`);
}

describe("GET /api/analyze — usage logging", () => {
  const insertValues = vi.fn();

  beforeEach(() => {
    vi.mocked(db.insert).mockReturnValue({ values: insertValues } as never);
    insertValues.mockResolvedValue(undefined);
  });

  it("logs a keyword_lookup usage event for a logged-in user", async () => {
    vi.mocked(getAuthContext).mockResolvedValue({
      userId: "user_1",
      email: "a@b.com",
      plan: getPlan("free"),
      user: { id: 7, plan: "free", clerkId: "user_1", email: "a@b.com", aiUsedMonth: 0, googleUsedMonth: 0 },
      authEnabled: true,
    });

    const response = await GET(analyzeRequest("다이어트 식단"));

    expect(response.status).toBe(200);
    expect(db.insert).toHaveBeenCalledWith(usageEvents);
    expect(insertValues).toHaveBeenCalledWith({
      userId: 7,
      action: "keyword_lookup",
      meta: { keyword: "다이어트 식단", engine: "naver" },
    });
  });

  it("does not log anything for a guest (no authContext.user)", async () => {
    vi.mocked(getAuthContext).mockResolvedValue({
      userId: null,
      email: null,
      plan: getPlan("guest"),
      user: null,
      authEnabled: true,
    });

    const response = await GET(analyzeRequest("다이어트 식단"));

    expect(response.status).toBe(200);
    expect(db.insert).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- analyze/route.test`
Expected: FAIL — `db.insert` is never called today.

- [ ] **Step 3: Implement the fix**

Modify `src/app/api/analyze/route.ts`. Add two imports at the top:

```typescript
import { db, hasDatabase } from "@/lib/db/index";
import { usageEvents } from "@/lib/db/schema";
```

Then inside the `try` block, insert the logging call right after resolving the analysis and before applying plan limits. Current code:

```typescript
  try {
    const { data, source } = await resolveKeywordAnalysis(keyword, engine);
    const limited = applyPlanLimits(data, authContext.plan);
    return NextResponse.json({ ...limited, dataSource: source });
  } catch (error) {
```

New code:

```typescript
  try {
    const { data, source } = await resolveKeywordAnalysis(keyword, engine);
    if (hasDatabase && db && authContext.user) {
      await db.insert(usageEvents).values({
        userId: authContext.user.id,
        action: "keyword_lookup",
        meta: { keyword, engine },
      });
    }
    const limited = applyPlanLimits(data, authContext.plan);
    return NextResponse.json({ ...limited, dataSource: source });
  } catch (error) {
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- analyze/route.test`
Expected: PASS, both tests.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/analyze/route.ts src/app/api/analyze/route.test.ts
git commit -m "feat: log keyword_lookup usage events from /api/analyze"
```

---

### Task 6: Log `usage_events` from `/api/bulk` (§8.4 precondition)

**Files:**
- Modify: `src/app/api/bulk/route.ts`
- Test: `src/app/api/bulk/route.test.ts` (extend the file from Task 2)

**Interfaces:**
- Consumes: same as Task 5
- Produces: `usage_events` rows with `action: "bulk_lookup"`, `meta: { count, engine }`.

- [ ] **Step 1: Write the failing test**

Append to `src/app/api/bulk/route.test.ts` (add these imports to the top alongside the existing ones, and this new `describe` block at the end of the file):

Add to the top imports:
```typescript
vi.mock("@/lib/db/index", () => ({
  db: { insert: vi.fn() },
  hasDatabase: true,
}));
```

Add after the existing `import { POST } from "./route";` line:
```typescript
import { db } from "@/lib/db/index";
import { usageEvents } from "@/lib/db/schema";
```

Add this new `describe` block at the end of the file:

```typescript
describe("POST /api/bulk — usage logging", () => {
  const insertValues = vi.fn();

  beforeEach(() => {
    vi.mocked(checkNaverRateLimit).mockResolvedValue({ ok: true });
    vi.mocked(db.insert).mockReturnValue({ values: insertValues } as never);
    insertValues.mockResolvedValue(undefined);
  });

  it("logs one bulk_lookup event per request with the result count", async () => {
    vi.mocked(getAuthContext).mockResolvedValue({
      userId: "user_1",
      email: "a@b.com",
      plan: getPlan("enterprise"),
      user: { id: 9, plan: "enterprise", clerkId: "user_1", email: "a@b.com", aiUsedMonth: 0, googleUsedMonth: 0 },
      authEnabled: true,
    });

    const response = await POST(bulkRequest(["김치찌개", "된장찌개"]));

    expect(response.status).toBe(200);
    expect(db.insert).toHaveBeenCalledWith(usageEvents);
    expect(insertValues).toHaveBeenCalledWith({
      userId: 9,
      action: "bulk_lookup",
      meta: { count: 2, engine: "naver" },
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- bulk/route.test`
Expected: FAIL — the new test's `db.insert` assertion fails (never called).

- [ ] **Step 3: Implement the fix**

Modify `src/app/api/bulk/route.ts`. Add the two imports (same as Task 5):

```typescript
import { db, hasDatabase } from "@/lib/db/index";
import { usageEvents } from "@/lib/db/schema";
```

Then insert the logging call right after computing `limited`, before the final `return`. Current code:

```typescript
    const { results, source } = await resolveBulk(keywords, engine);
    const limited = results
      .slice(0, authContext.plan.limits.bulkMax)
      .map((item) => applyPlanLimits(item, authContext.plan));

    return NextResponse.json({
      results: limited,
      count: limited.length,
      dataSource: source,
      csvExport: authContext.plan.limits.csvExport,
    });
```

New code:

```typescript
    const { results, source } = await resolveBulk(keywords, engine);
    const limited = results
      .slice(0, authContext.plan.limits.bulkMax)
      .map((item) => applyPlanLimits(item, authContext.plan));

    if (hasDatabase && db && authContext.user) {
      await db.insert(usageEvents).values({
        userId: authContext.user.id,
        action: "bulk_lookup",
        meta: { count: limited.length, engine },
      });
    }

    return NextResponse.json({
      results: limited,
      count: limited.length,
      dataSource: source,
      csvExport: authContext.plan.limits.csvExport,
    });
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- bulk/route.test`
Expected: PASS, all tests in the file (Task 2's + this one).

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/bulk/route.ts src/app/api/bulk/route.test.ts
git commit -m "feat: log bulk_lookup usage events from /api/bulk"
```

---

### Task 7: Log `usage_events` from `/api/copilot` (§8.4 precondition)

**Files:**
- Modify: `src/app/api/copilot/route.ts`
- Test: `src/app/api/copilot/route.test.ts`

**Interfaces:**
- Consumes: same pattern as Task 5
- Produces: `usage_events` rows with `action: "draft"`, `meta: { keyword }`.

**Context:** Unlike analyze/bulk, copilot always requires a logged-in user with `authContext.user` set (there's an explicit 401 guard earlier in the route), so no `authContext.user` null-check is needed at the insertion point — only the `hasDatabase && db` guard.

- [ ] **Step 1: Write the failing test**

Create `src/app/api/copilot/route.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  getAuthContext: vi.fn(),
}));
vi.mock("@/lib/db/users", () => ({
  tryConsumeAiUsage: vi.fn(),
}));
vi.mock("@/lib/db/index", () => ({
  db: { insert: vi.fn() },
  hasDatabase: true,
}));
vi.mock("@/lib/providers/keyword-data", () => ({
  resolveKeywordAnalysis: vi.fn(),
}));

import { getAuthContext } from "@/lib/auth";
import { tryConsumeAiUsage } from "@/lib/db/users";
import { db } from "@/lib/db/index";
import { usageEvents } from "@/lib/db/schema";
import { resolveKeywordAnalysis } from "@/lib/providers/keyword-data";
import { getPlan } from "@/lib/plans";
import { POST } from "./route";

function copilotRequest(body: object) {
  return new NextRequest("http://localhost/api/copilot", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/copilot — usage logging", () => {
  const insertValues = vi.fn();
  const originalFetch = global.fetch;
  const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  beforeEach(() => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
    vi.mocked(getAuthContext).mockResolvedValue({
      userId: "user_1",
      email: "a@b.com",
      plan: getPlan("free"),
      user: { id: 5, plan: "free", clerkId: "user_1", email: "a@b.com", aiUsedMonth: 0, googleUsedMonth: 0 },
      authEnabled: true,
    });
    vi.mocked(tryConsumeAiUsage).mockResolvedValue({ ok: true, used: 1 });
    vi.mocked(resolveKeywordAnalysis).mockResolvedValue({
      data: {
        keyword: "캠핑 용품",
        monthlyVolume: 1000,
        category: "여행",
        subcategory: "국내여행",
        relatedInternal: [],
      } as never,
      source: "simulated",
    });
    vi.mocked(db.insert).mockReturnValue({ values: insertValues } as never);
    insertValues.mockResolvedValue(undefined);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "생성된 초안 본문" }] } }],
      }),
    }) as never;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey;
  });

  it("logs a draft usage event after a successful generation", async () => {
    const response = await POST(copilotRequest({ keyword: "캠핑 용품" }));
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toBe("생성된 초안 본문");
    expect(db.insert).toHaveBeenCalledWith(usageEvents);
    expect(insertValues).toHaveBeenCalledWith({
      userId: 5,
      action: "draft",
      meta: { keyword: "캠핑 용품" },
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- copilot/route.test`
Expected: FAIL — `db.insert` never called today.

- [ ] **Step 3: Implement the fix**

Modify `src/app/api/copilot/route.ts`. Add two imports at the top:

```typescript
import { db, hasDatabase } from "@/lib/db/index";
import { usageEvents } from "@/lib/db/schema";
```

Then insert the logging call after the empty-text guard and before the final `return new Response(...)`. Current code:

```typescript
  if (!text) {
    return NextResponse.json(
      { error: "Gemini가 빈 응답을 반환했습니다.", model: "gemini-3.6-flash" },
      { status: 502 },
    );
  }

  return new Response(text, {
```

New code:

```typescript
  if (!text) {
    return NextResponse.json(
      { error: "Gemini가 빈 응답을 반환했습니다.", model: "gemini-3.6-flash" },
      { status: 502 },
    );
  }

  if (hasDatabase && db) {
    await db.insert(usageEvents).values({
      userId: authContext.user.id,
      action: "draft",
      meta: { keyword },
    });
  }

  return new Response(text, {
```

(`authContext.user` is guaranteed non-null this far into the function — there's already an `if (!authContext.userId || !authContext.user) return 401` guard earlier — so `authContext.user.id` needs no extra null check here.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- copilot/route.test`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/copilot/route.ts src/app/api/copilot/route.test.ts
git commit -m "feat: log draft usage events from /api/copilot"
```

---

### Task 8: Log `usage_events` from `/api/blog` (§8.4 precondition)

**Files:**
- Modify: `src/app/api/blog/route.ts`
- Test: `src/app/api/blog/route.test.ts`

**Interfaces:**
- Consumes: same pattern as Task 5. `analyzeBlog` from `@/lib/analysis-tools` is a pure function (confirmed in the security audit, §2.1) — no need to mock it, call it for real.
- Produces: `usage_events` rows with `action: "blog_analysis"`, `meta: { url }`.

- [ ] **Step 1: Write the failing test**

Create `src/app/api/blog/route.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  getAuthContext: vi.fn(),
}));
vi.mock("@/lib/db/index", () => ({
  db: { insert: vi.fn() },
  hasDatabase: true,
}));

import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/db/index";
import { usageEvents } from "@/lib/db/schema";
import { getPlan } from "@/lib/plans";
import { POST } from "./route";

function blogRequest(url: string) {
  return new NextRequest("http://localhost/api/blog", {
    method: "POST",
    body: JSON.stringify({ url }),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/blog — usage logging", () => {
  const insertValues = vi.fn();

  beforeEach(() => {
    vi.mocked(getAuthContext).mockResolvedValue({
      userId: "user_1",
      email: "a@b.com",
      plan: getPlan("free"),
      user: { id: 11, plan: "free", clerkId: "user_1", email: "a@b.com", aiUsedMonth: 0, googleUsedMonth: 0 },
      authEnabled: true,
    });
    vi.mocked(db.insert).mockReturnValue({ values: insertValues } as never);
    insertValues.mockResolvedValue(undefined);
  });

  it("logs a blog_analysis usage event after a successful analysis", async () => {
    const response = await POST(blogRequest("https://blog.naver.com/example/1"));

    expect(response.status).toBe(200);
    expect(db.insert).toHaveBeenCalledWith(usageEvents);
    expect(insertValues).toHaveBeenCalledWith({
      userId: 11,
      action: "blog_analysis",
      meta: { url: "https://blog.naver.com/example/1" },
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- blog/route.test`
Expected: FAIL — `db.insert` never called today.

- [ ] **Step 3: Implement the fix**

Modify `src/app/api/blog/route.ts`. Full new file content:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { assertFeature } from "@/lib/quota";
import { analyzeBlog } from "@/lib/analysis-tools";
import { db, hasDatabase } from "@/lib/db/index";
import { usageEvents } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
  const authContext = await getAuthContext();
  const feature = assertFeature(authContext.plan, "blogAnalysis", "블로그 분석");
  if (!feature.ok) {
    return NextResponse.json({ error: feature.error }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { url?: string };
    const report = analyzeBlog(body.url ?? "");
    if (hasDatabase && db && authContext.user) {
      await db.insert(usageEvents).values({
        userId: authContext.user.id,
        action: "blog_analysis",
        meta: { url: body.url },
      });
    }
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "블로그 분석에 실패했습니다." },
      { status: 400 },
    );
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- blog/route.test`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/blog/route.ts src/app/api/blog/route.test.ts
git commit -m "feat: log blog_analysis usage events from /api/blog"
```

---

### Task 9: Log `usage_events` from `/api/site` (§8.4 precondition)

**Files:**
- Modify: `src/app/api/site/route.ts`
- Test: `src/app/api/site/route.test.ts`

**Interfaces:**
- Consumes: same pattern as Task 8. `diagnoseSite` from `@/lib/analysis-tools` is also pure (§2.1) — call it for real.
- Produces: `usage_events` rows with `action: "site_diagnosis"`, `meta: { domain }`.

- [ ] **Step 1: Write the failing test**

Create `src/app/api/site/route.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  getAuthContext: vi.fn(),
}));
vi.mock("@/lib/db/index", () => ({
  db: { insert: vi.fn() },
  hasDatabase: true,
}));

import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/db/index";
import { usageEvents } from "@/lib/db/schema";
import { getPlan } from "@/lib/plans";
import { POST } from "./route";

function siteRequest(domain: string) {
  return new NextRequest("http://localhost/api/site", {
    method: "POST",
    body: JSON.stringify({ domain }),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/site — usage logging", () => {
  const insertValues = vi.fn();

  beforeEach(() => {
    vi.mocked(getAuthContext).mockResolvedValue({
      userId: "user_1",
      email: "a@b.com",
      plan: getPlan("basic"),
      user: { id: 13, plan: "basic", clerkId: "user_1", email: "a@b.com", aiUsedMonth: 0, googleUsedMonth: 0 },
      authEnabled: true,
    });
    vi.mocked(db.insert).mockReturnValue({ values: insertValues } as never);
    insertValues.mockResolvedValue(undefined);
  });

  it("logs a site_diagnosis usage event after a successful diagnosis", async () => {
    const response = await POST(siteRequest("example.com"));

    expect(response.status).toBe(200);
    expect(db.insert).toHaveBeenCalledWith(usageEvents);
    expect(insertValues).toHaveBeenCalledWith({
      userId: 13,
      action: "site_diagnosis",
      meta: { domain: "example.com" },
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- site/route.test`
Expected: FAIL — `db.insert` never called today.

- [ ] **Step 3: Implement the fix**

Modify `src/app/api/site/route.ts`. Full new file content:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { assertFeature } from "@/lib/quota";
import { diagnoseSite } from "@/lib/analysis-tools";
import { db, hasDatabase } from "@/lib/db/index";
import { usageEvents } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
  const authContext = await getAuthContext();
  const feature = assertFeature(authContext.plan, "siteDiagnosis", "사이트 진단");
  if (!feature.ok) {
    return NextResponse.json({ error: feature.error }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { domain?: string };
    const report = diagnoseSite(body.domain ?? "");
    if (hasDatabase && db && authContext.user) {
      await db.insert(usageEvents).values({
        userId: authContext.user.id,
        action: "site_diagnosis",
        meta: { domain: body.domain },
      });
    }
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "사이트 진단에 실패했습니다." },
      { status: 400 },
    );
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- site/route.test`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/site/route.ts src/app/api/site/route.test.ts
git commit -m "feat: log site_diagnosis usage events from /api/site"
```

---

### Task 10: Add the `keyword_snapshots` table (§7.3)

**Files:**
- Modify: `src/lib/db/schema.ts`

**Interfaces:**
- Consumes: nothing new
- Produces: `keywordSnapshots` table + `KeywordSnapshotRow`/`NewKeywordSnapshot` types, consumed by Task 11.

This is a pure schema declaration — no branch, loop, or logic to unit test. The correctness check is TypeScript compilation plus an actual `db:push` against the dev database (Step 3).

- [ ] **Step 1: Add the table**

Modify `src/lib/db/schema.ts`. Add `numeric` to the existing import list at the top:

```typescript
import {
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
```

Then add the new table definition after `usageEvents` and before the `export type UserRow` line. Current tail of the file:

```typescript
export const usageEvents = pgTable("usage_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: text("action").notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserRow = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

New tail:

```typescript
export const usageEvents = pgTable("usage_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: text("action").notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const keywordSnapshots = pgTable("keyword_snapshots", {
  id: serial("id").primaryKey(),
  keyword: text("keyword").notNull(),
  engine: text("engine").notNull().default("naver"),
  rank: integer("rank"),
  monthlyVolume: integer("monthly_volume"),
  changeRate: numeric("change_rate"),
  bucketHour: timestamp("bucket_hour").notNull(),
  capturedAt: timestamp("captured_at").defaultNow().notNull(),
});

export type UserRow = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type KeywordSnapshotRow = typeof keywordSnapshots.$inferSelect;
export type NewKeywordSnapshot = typeof keywordSnapshots.$inferInsert;
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Push the migration to the dev database**

```bash
vercel env pull .env.local --yes --scope briank-projects
npm run db:push
```

Expected: Drizzle Kit reports it created the `keyword_snapshots` table. Confirm with `npm run db:studio` that the table exists with the 7 columns above.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat: add keyword_snapshots table"
```

---

### Task 11: Add the `/api/cron/snapshot` endpoint (§7.2, §7.3)

**Files:**
- Create: `src/app/api/cron/snapshot/route.ts`
- Test: `src/app/api/cron/snapshot/route.test.ts`

**Interfaces:**
- Consumes: `keywordSnapshots` table (Task 10), `getRealtimeTrends()` from `@/lib/keyword-engine` (existing, unchanged)
- Produces: `truncateToHour(date: Date): Date` (exported, pure — reusable by any later stage that needs hour-bucketing), the `/api/cron/snapshot` path that Task 12 wires into `vercel.json`.

**Reminder (see Global Constraints):** `getRealtimeTrends()` is today's existing deterministic simulation, not a real trending-keyword feed. This task's job is to get *something* landing in `keyword_snapshots` every hour so the table has continuous history before a real data source replaces the simulation in a later stage.

- [ ] **Step 1: Write the failing test**

Create `src/app/api/cron/snapshot/route.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db/index", () => ({
  db: { insert: vi.fn() },
  hasDatabase: true,
}));
vi.mock("@/lib/keyword-engine", () => ({
  getRealtimeTrends: vi.fn(),
}));

import { db } from "@/lib/db/index";
import { keywordSnapshots } from "@/lib/db/schema";
import { getRealtimeTrends } from "@/lib/keyword-engine";
import { GET, truncateToHour } from "./route";

function cronRequest(authHeader?: string) {
  return new NextRequest("http://localhost/api/cron/snapshot", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

describe("truncateToHour", () => {
  it("zeroes out minutes, seconds, and milliseconds", () => {
    const input = new Date("2026-08-21T13:47:32.501Z");
    const result = truncateToHour(input);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
    expect(result.getHours()).toBe(input.getHours());
  });
});

describe("GET /api/cron/snapshot", () => {
  const insertValues = vi.fn();
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = "test-secret";
    vi.mocked(db.insert).mockReturnValue({ values: insertValues } as never);
    insertValues.mockResolvedValue(undefined);
    vi.mocked(getRealtimeTrends).mockReturnValue([
      { rank: 1, keyword: "부동산 정책", change: "up", delta: 3 },
      { rank: 2, keyword: "여름 휴가 추천", change: "new", delta: 1 },
    ]);
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("returns 503 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const response = await GET(cronRequest("Bearer whatever"));
    expect(response.status).toBe(503);
  });

  it("returns 401 when the bearer token does not match", async () => {
    const response = await GET(cronRequest("Bearer wrong-secret"));
    expect(response.status).toBe(401);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("inserts one snapshot row per trend item on a valid authenticated request", async () => {
    const response = await GET(cronRequest("Bearer test-secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.captured).toBe(2);
    expect(db.insert).toHaveBeenCalledWith(keywordSnapshots);
    expect(insertValues).toHaveBeenCalledWith([
      expect.objectContaining({ keyword: "부동산 정책", engine: "naver", rank: 1 }),
      expect.objectContaining({ keyword: "여름 휴가 추천", engine: "naver", rank: 2 }),
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- cron/snapshot/route.test`
Expected: FAIL — the module `./route` doesn't exist yet.

- [ ] **Step 3: Implement the endpoint**

Create `src/app/api/cron/snapshot/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db, hasDatabase } from "@/lib/db/index";
import { keywordSnapshots } from "@/lib/db/schema";
import { getRealtimeTrends } from "@/lib/keyword-engine";

export const runtime = "nodejs";

/** Truncates a Date down to the start of its hour (minutes/seconds/ms zeroed). */
export function truncateToHour(date: Date): Date {
  const truncated = new Date(date);
  truncated.setMinutes(0, 0, 0);
  return truncated;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET이 설정되지 않았습니다." }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });
  }

  if (!hasDatabase || !db) {
    return NextResponse.json({ error: "DATABASE_URL이 없습니다." }, { status: 503 });
  }

  const bucketHour = truncateToHour(new Date());
  const trends = getRealtimeTrends();
  const rows = trends.map((item) => ({
    keyword: item.keyword,
    engine: "naver" as const,
    rank: item.rank,
    monthlyVolume: null,
    changeRate: null,
    bucketHour,
  }));

  await db.insert(keywordSnapshots).values(rows);

  return NextResponse.json({ captured: rows.length, bucketHour: bucketHour.toISOString() });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
```

(`POST` delegates to `GET` so the GitHub Actions fallback in Task 12's notes can call this endpoint with either verb — Vercel Cron itself always uses `GET`.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- cron/snapshot/route.test`
Expected: PASS, all 4 tests.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/cron/snapshot/route.ts src/app/api/cron/snapshot/route.test.ts
git commit -m "feat: add /api/cron/snapshot hourly keyword snapshot endpoint"
```

---

### Task 12: Wire the hourly cron schedule (§7.2)

**Files:**
- Create: `vercel.json`

**Interfaces:**
- Consumes: `/api/cron/snapshot` from Task 11
- Produces: nothing further downstream in this plan — this is the final task.

- [ ] **Step 1: Create the Vercel Cron config**

Vercel Cron schedules are evaluated in **UTC**, not KST, and the spec's target window is 08:00–22:00 **KST** (UTC+9). Converting: 08:00 KST = 23:00 UTC the previous day; 22:00 KST = 13:00 UTC the same day. So the UTC hour set covering that window is `23,0-13` (23:00 the previous day through 13:00 the same day — 15 distinct hours, matching 08:00–22:00 KST inclusive).

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/snapshot",
      "schedule": "0 23,0-13 * * *"
    }
  ]
}
```

- [ ] **Step 2: Add `CRON_SECRET` to the Vercel project**

Run (this repo's env vars are Vercel-Marketplace-managed per `README.md` §"필수 연동" — do not hand-edit `.env.local` for this one, add it through Vercel so both `vercel env pull` and the deployed cron job pick it up):

```bash
vercel env add CRON_SECRET production --scope briank-projects
vercel env add CRON_SECRET preview --scope briank-projects
vercel env add CRON_SECRET development --scope briank-projects
vercel env pull .env.local --yes --scope briank-projects
```

When prompted, paste a freshly generated random value, e.g. from `openssl rand -hex 32`.

- [ ] **Step 3: Confirm the cron plan requirement (manual — see spec §10 item 1)**

Vercel Cron Jobs' execution-frequency allowance depends on the account's plan tier, and that tier was not confirmed as part of this plan (spec §10-1: "확인 필요"). Before relying on this hourly schedule in production:

1. Check the current plan at https://vercel.com/briank-projects (Team settings → Plan).
2. If the plan does not support hourly cron frequency, this `vercel.json` schedule will either be rejected at deploy time or silently throttled — Vercel's dashboard shows the actual next-run time for a registered cron under Project → Settings → Cron Jobs after deploying.
3. **Fallback if hourly isn't available:** replace the Vercel Cron with a GitHub Actions scheduled workflow that calls `POST https://<production-domain>/api/cron/snapshot` hourly with an `Authorization: Bearer ${{ secrets.CRON_SECRET }}` header (the same `CRON_SECRET` value from Step 2, added as a GitHub Actions repository secret). The endpoint already accepts `POST` for exactly this reason (Task 11, Step 3).

- [ ] **Step 4: Deploy and verify the first live run**

```bash
git add vercel.json
git commit -m "feat: schedule hourly keyword snapshot cron"
git push origin main
vercel --prod --yes --scope briank-projects
```

After the next hour boundary passes, check Project → Logs in the Vercel dashboard for a request to `/api/cron/snapshot` returning `200` with a `captured` count, then confirm rows exist:

```bash
npm run db:studio
# open keyword_snapshots, confirm at least one row with bucketHour set to the top of the hour
```

- [ ] **Step 5: Final commit if Step 3 required a schedule/fallback change**

If Step 3 determined the plan doesn't support hourly Vercel Cron and you switched to the GitHub Actions fallback, commit that workflow file now:

```bash
git add .github/workflows/keyword-snapshot-cron.yml
git commit -m "feat: fall back to GitHub Actions for hourly keyword snapshot cron"
```

(No workflow file is created by default in this plan — only add it if Step 3 actually determines it's needed, per the Vercel plan tier you find.)

---

## Definition of Done

- `npm test` passes with all tests from Tasks 1–11 green.
- `npx tsc --noEmit` passes.
- `npm run lint` passes (no new lint errors introduced).
- `keyword_snapshots` table exists in the dev DB (`npm run db:studio`).
- A real hourly snapshot has landed at least once in production (Task 12, Step 4).
- Manual smoke: re-run the existing checklist in `documentation/인수인계.md` §13 — all items still pass, confirming zero regressions in `/`, `/analyze`, `/bulk`, `/discover`, `/blog`, `/site`, `/copilot`, `/shop`.
- This satisfies `docs/00-통합개발계획서.md` §9 "1단계" completion criteria: "7일 후 `/trends`에서 스파크라인을 그릴 수 있는 시계열 데이터가 쌓이기 시작함. 기존 6개 API 어디에서도 회귀 없음."
