# Phase A: Shell · Navigation · Account Usage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the hybrid top navigation (Creator / AI Automation / Shortform / More), shared UX primitives (EmptyState, PlanGate, QuotaBanner, CreatorSubnav), stub pages so every IA destination is reachable, and `/account/usage` as the credit-UI replacement.

**Architecture:** Keep existing App Router pages; only restructure `SiteHeader` around a single nav config module. New routes under Phase A are thin placeholder pages (same layout shell) so later phases fill them in without changing IA. Usage API reads Clerk + existing `users.aiUsedMonth` / plan limits — no new credit ledger.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Clerk, Tailwind CSS v4, Drizzle/Neon (read-only for usage), Vitest (added here; repo has no tests yet).

**Spec:** `docs/superpowers/specs/2026-08-21-creator-automation-shortform-design.md` (§3 IA, §5 routes stubs, §8.2 common components, §9 Phase A)

## Global Constraints

- No credit balance / recharge UI. No calendar tab anywhere.
- Do not move existing routes under `/creator/*`; keep `/analyze`, `/blog`, etc. and only change menu links.
- Reuse KeywordOn CSS variables (`--brand`, `--ink`, `--muted`, `--line`, `--surface`). Do not introduce purple-on-white or new design systems.
- Stub pages must render a clear title + one sentence + CTA to `/shop` or a related existing tool — never blank white screens.
- Every task ends with a commit. Do not push unless asked.
- Later plans (separate files): **B** Write, **C** Automation, **D** Shortform, **E** Audit/Persona/Ranking, **F** Trends/Calculator/Plans (+ may merge with existing `docs/superpowers/plans/2026-08-21-stage1-hardening-data-foundation.md` for cron/hardening).

### File map (Phase A)

| File | Responsibility |
|---|---|
| `src/lib/nav.ts` | Single source of truth for top nav + creator subnav href/labels |
| `src/components/site-header.tsx` | Hybrid header using `nav.ts` |
| `src/components/creator-subnav.tsx` | Secondary tabs on creator tool pages |
| `src/components/empty-state.tsx` | Shared empty state |
| `src/components/plan-gate.tsx` | Shared upgrade gate panel |
| `src/components/quota-banner.tsx` | Monthly AI remaining banner |
| `src/app/{write,automation,shortform,trends,audit,persona,ranking,calculator,account/usage}/**` | Stub or real pages |
| `src/app/api/account/usage/route.ts` | Usage JSON for banner + account page |
| `src/lib/account/usage-summary.ts` | Pure helper to shape usage payload (unit-tested) |
| `vitest.config.ts` + `package.json` `test` script | Test runner |

---

### Task 1: Add Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/lib/nav.test.ts` (smoke only in this task — full nav tests in Task 2)

**Interfaces:**
- Consumes: nothing
- Produces: `npm test` → `vitest run`; `@/` alias works in tests

- [ ] **Step 1: Install vitest**

```bash
npm install -D vitest@^3.2.4
```

- [ ] **Step 2: Create `vitest.config.ts`**

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
    clearMocks: true,
  },
});
```

- [ ] **Step 3: Add script to `package.json`**

In `"scripts"`, after `"lint"`:

```json
"test": "vitest run"
```

- [ ] **Step 4: Write a trivial failing smoke test then fix**

Create `src/lib/nav.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

describe("vitest wiring", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/nav.test.ts
git commit -m "chore: add vitest test runner"
```

---

### Task 2: Nav config module

**Files:**
- Create: `src/lib/nav.ts`
- Modify: `src/lib/nav.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `export type NavLink = { href: string; label: string; badge?: "new" }`
  - `export type NavGroup = { id: string; label: string; href?: string; badge?: "new"; children?: NavLink[] }`
  - `export const TOP_NAV: NavGroup[]`
  - `export const CREATOR_SUBNAV: NavLink[]`
  - `export function isNavActive(pathname: string, href: string): boolean`

- [ ] **Step 1: Write failing tests for nav completeness**

Replace `src/lib/nav.test.ts` with:

```typescript
import { describe, expect, it } from "vitest";
import { CREATOR_SUBNAV, TOP_NAV, isNavActive } from "./nav";

describe("TOP_NAV", () => {
  it("exposes creator, automation, shortform, more", () => {
    expect(TOP_NAV.map((g) => g.id)).toEqual([
      "creator",
      "automation",
      "shortform",
      "more",
    ]);
  });

  it("includes every Phase-A destination href exactly once across groups", () => {
    const hrefs = TOP_NAV.flatMap((g) => [
      ...(g.href ? [g.href] : []),
      ...(g.children?.map((c) => c.href) ?? []),
    ]);
    const required = [
      "/analyze",
      "/write",
      "/blog",
      "/ranking",
      "/audit",
      "/persona",
      "/automation",
      "/shortform",
      "/bulk",
      "/discover",
      "/trends",
      "/calculator",
      "/site",
      "/account/usage",
      "/shop",
    ];
    for (const href of required) {
      expect(hrefs).toContain(href);
    }
  });

  it("marks shortform with new badge", () => {
    expect(TOP_NAV.find((g) => g.id === "shortform")?.badge).toBe("new");
  });
});

describe("CREATOR_SUBNAV", () => {
  it("lists creator tool tabs in order", () => {
    expect(CREATOR_SUBNAV.map((l) => l.href)).toEqual([
      "/analyze",
      "/write",
      "/blog",
      "/ranking",
      "/audit",
      "/persona",
    ]);
  });
});

describe("isNavActive", () => {
  it("matches nested paths except home", () => {
    expect(isNavActive("/write/image", "/write")).toBe(true);
    expect(isNavActive("/analyze", "/")).toBe(false);
    expect(isNavActive("/", "/")).toBe(true);
  });
});
```

Run: `npm test`  
Expected: FAIL (module not found)

- [ ] **Step 2: Implement `src/lib/nav.ts`**

```typescript
export type NavLink = {
  href: string;
  label: string;
  badge?: "new";
};

export type NavGroup = {
  id: string;
  label: string;
  href?: string;
  badge?: "new";
  children?: NavLink[];
};

export const TOP_NAV: NavGroup[] = [
  {
    id: "creator",
    label: "크리에이터",
    children: [
      { href: "/analyze", label: "키워드 분석" },
      { href: "/write", label: "글쓰기 AI" },
      { href: "/blog", label: "블로그 분석" },
      { href: "/ranking", label: "블로그 순위" },
      { href: "/audit", label: "게시글 진단" },
      { href: "/persona", label: "페르소나" },
    ],
  },
  { id: "automation", label: "AI 자동화", href: "/automation" },
  { id: "shortform", label: "숏폼", href: "/shortform", badge: "new" },
  {
    id: "more",
    label: "더보기",
    children: [
      { href: "/bulk", label: "대량 조회" },
      { href: "/discover", label: "키워드 발굴" },
      { href: "/trends", label: "급상승 트렌드" },
      { href: "/calculator", label: "수익 계산기" },
      { href: "/site", label: "사이트 진단" },
      { href: "/account/usage", label: "사용량" },
      { href: "/shop", label: "플랜" },
    ],
  },
];

export const CREATOR_SUBNAV: NavLink[] = [
  { href: "/analyze", label: "키워드 분석" },
  { href: "/write", label: "글쓰기 AI" },
  { href: "/blog", label: "블로그 분석" },
  { href: "/ranking", label: "블로그 순위" },
  { href: "/audit", label: "게시글 진단" },
  { href: "/persona", label: "페르소나" },
];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
```

Run: `npm test`  
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/nav.ts src/lib/nav.test.ts
git commit -m "feat: add hybrid nav config as single source of truth"
```

---

### Task 3: Rewrite SiteHeader for hybrid IA

**Files:**
- Modify: `src/components/site-header.tsx`

**Interfaces:**
- Consumes: `TOP_NAV`, `isNavActive` from `@/lib/nav`
- Produces: desktop dropdowns for groups with `children`; direct links for `href`-only groups; mobile sheet/list with all links; preserve Clerk `SignInButton` / `UserButton` pattern already in file

- [ ] **Step 1: Replace flat `NAV` array with `TOP_NAV`-driven UI**

Rewrite `src/components/site-header.tsx` to:

1. Import `TOP_NAV`, `isNavActive`, `Link`, `usePathname`, Clerk bits, `cn`, `Search`, `ChevronDown`, `useState`, `useEffect`.
2. Desktop (`lg:flex`): for each group —
   - if `children`: button + absolute dropdown panel listing children; active if any child matches `isNavActive`
   - else: `Link` to `group.href`; show red `New` pill if `badge === "new"`
3. Mobile: hamburger toggles a panel listing all flattened links (group label as heading).
4. Keep logo + KeywordOn wordmark + auth controls unchanged in behavior.
5. Dropdown closes on route change (`useEffect` on `pathname`).

Key interaction patterns (implement fully in the file):

```tsx
// Dropdown open state keyed by group.id
const [openId, setOpenId] = useState<string | null>(null);
const [mobileOpen, setMobileOpen] = useState(false);

// On pathname change:
useEffect(() => {
  setOpenId(null);
  setMobileOpen(false);
}, [pathname]);
```

Badge markup:

```tsx
{item.badge === "new" ? (
  <span className="ml-1 rounded bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
    New
  </span>
) : null}
```

Dropdown panel classes (match existing soft surfaces):

```
absolute left-0 top-full z-50 mt-1 min-w-[12rem] rounded-lg border border-[var(--line)] bg-[var(--panel)] py-1 shadow-lg
```

- [ ] **Step 2: Manual check**

Run: `npm run dev`  
Open `/` — confirm 크리에이터 / AI 자동화 / 숏폼 / 더보기; shortform shows New; dropdowns work; login still works.

- [ ] **Step 3: Commit**

```bash
git add src/components/site-header.tsx
git commit -m "feat: hybrid SiteHeader for creator automation shortform IA"
```

---

### Task 4: CreatorSubnav + wire onto existing creator pages

**Files:**
- Create: `src/components/creator-subnav.tsx`
- Modify: `src/app/analyze/page.tsx` (add subnav at top of page content)
- Modify: `src/app/blog/page.tsx` (same)
- Modify: `src/app/copilot/page.tsx` (same — still exists until Plan B redirects)

**Interfaces:**
- Consumes: `CREATOR_SUBNAV`, `isNavActive`
- Produces: `<CreatorSubnav />` client component

- [ ] **Step 1: Create `creator-subnav.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CREATOR_SUBNAV, isNavActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function CreatorSubnav() {
  const pathname = usePathname();
  return (
    <div className="border-b border-[var(--line)] bg-[var(--surface)]">
      <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-5">
        {CREATOR_SUBNAV.map((item) => {
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition",
                active
                  ? "border-[var(--brand)] text-[var(--brand-ink)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
```

- [ ] **Step 2: Insert `<CreatorSubnav />` as the first child inside each of `analyze`, `blog`, `copilot` page default exports** (above existing page chrome). For server components, import is fine (client boundary is inside the component).

- [ ] **Step 3: Commit**

```bash
git add src/components/creator-subnav.tsx src/app/analyze/page.tsx src/app/blog/page.tsx src/app/copilot/page.tsx
git commit -m "feat: add CreatorSubnav to creator tool pages"
```

---

### Task 5: EmptyState, PlanGate, QuotaBanner

**Files:**
- Create: `src/components/empty-state.tsx`
- Create: `src/components/plan-gate.tsx`
- Create: `src/components/quota-banner.tsx`
- Create: `src/lib/account/usage-summary.ts`
- Create: `src/lib/account/usage-summary.test.ts`

**Interfaces:**
- Consumes: `PlanDefinition` types from `@/lib/plans` (for PlanGate copy only)
- Produces:
  - `EmptyState({ title, description, action?: { href, label } })`
  - `PlanGate({ featureLabel, planName })`
  - `QuotaBanner({ aiUsed, aiLimit, href?: string })`
  - `buildUsageSummary({ planName, aiUsedMonth, aiMonthly, googleUsedMonth, googleMonthly }): UsageSummary`

- [ ] **Step 1: Failing test for `buildUsageSummary`**

```typescript
import { describe, expect, it } from "vitest";
import { buildUsageSummary } from "./usage-summary";

describe("buildUsageSummary", () => {
  it("computes remaining and percent safely when limit is 0", () => {
    const s = buildUsageSummary({
      planName: "비회원",
      aiUsedMonth: 0,
      aiMonthly: 0,
      googleUsedMonth: 0,
      googleMonthly: 0,
    });
    expect(s.aiRemaining).toBe(0);
    expect(s.aiPercent).toBe(100);
    expect(s.exhausted).toBe(true);
  });

  it("reports remaining for normal plans", () => {
    const s = buildUsageSummary({
      planName: "베이직",
      aiUsedMonth: 40,
      aiMonthly: 100,
      googleUsedMonth: 1,
      googleMonthly: 10,
    });
    expect(s.aiRemaining).toBe(60);
    expect(s.aiPercent).toBe(40);
    expect(s.exhausted).toBe(false);
  });
});
```

Run: `npm test` — FAIL

- [ ] **Step 2: Implement helper + components**

`src/lib/account/usage-summary.ts`:

```typescript
export type UsageSummary = {
  planName: string;
  aiUsed: number;
  aiLimit: number;
  aiRemaining: number;
  aiPercent: number;
  googleUsed: number;
  googleLimit: number;
  exhausted: boolean;
};

export function buildUsageSummary(input: {
  planName: string;
  aiUsedMonth: number;
  aiMonthly: number;
  googleUsedMonth: number;
  googleMonthly: number;
}): UsageSummary {
  const aiLimit = input.aiMonthly;
  const aiUsed = input.aiUsedMonth;
  const aiRemaining = Math.max(0, aiLimit - aiUsed);
  const aiPercent =
    aiLimit <= 0 ? 100 : Math.min(100, Math.round((aiUsed / aiLimit) * 100));
  return {
    planName: input.planName,
    aiUsed,
    aiLimit,
    aiRemaining,
    aiPercent,
    googleUsed: input.googleUsedMonth,
    googleLimit: input.googleMonthly,
    exhausted: aiLimit <= 0 || aiRemaining <= 0,
  };
}
```

`empty-state.tsx` — centered muted panel with title, description, optional `Link` button using brand styles.

`plan-gate.tsx` — message: `{featureLabel}은(는) {planName} 플랜에서 사용할 수 없습니다.` + Link to `/shop`.

`quota-banner.tsx` — if `aiLimit <= 0` or remaining low (`<= 5` or percent `>= 80`), show bar linking to `href ?? "/account/usage"` with text `이번 달 AI {aiUsed}/{aiLimit}` (크레딧 문구 금지).

- [ ] **Step 3: Run tests**

`npm test` — PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/empty-state.tsx src/components/plan-gate.tsx src/components/quota-banner.tsx src/lib/account/usage-summary.ts src/lib/account/usage-summary.test.ts
git commit -m "feat: add EmptyState PlanGate QuotaBanner and usage summary helper"
```

---

### Task 6: Stub pages for all new IA destinations

**Files:**
- Create: `src/components/feature-placeholder.tsx`
- Create: `src/app/write/page.tsx`
- Create: `src/app/write/image/page.tsx`
- Create: `src/app/write/commerce/page.tsx`
- Create: `src/app/write/tools/page.tsx`
- Create: `src/app/automation/page.tsx`
- Create: `src/app/shortform/page.tsx`
- Create: `src/app/trends/page.tsx`
- Create: `src/app/audit/page.tsx`
- Create: `src/app/persona/page.tsx`
- Create: `src/app/ranking/page.tsx`
- Create: `src/app/calculator/page.tsx`

**Interfaces:**
- Consumes: `EmptyState`, `CreatorSubnav` (on creator stubs only)
- Produces: each route renders without 404

- [ ] **Step 1: Create shared placeholder**

```tsx
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";

export function FeaturePlaceholder({
  eyebrow,
  title,
  description,
  showCreatorSubnav = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  showCreatorSubnav?: boolean;
}) {
  // Dynamically import CreatorSubnav only when needed — or always import and conditionally render.
  return (
    <>
      {/* Caller wraps CreatorSubnav when showCreatorSubnav — keep this component presentational */}
      <div className="mx-auto max-w-6xl px-5 py-12">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
          {eyebrow}
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--ink)]">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">{description}</p>
        <div className="mt-10">
          <EmptyState
            title="곧 제공됩니다"
            description="이 기능은 다음 배포 단계에서 연결됩니다. 그동안 키워드 분석과 Copilot을 이용하세요."
            action={{ href: "/analyze", label: "키워드 분석으로 이동" }}
          />
        </div>
        <p className="mt-6 text-sm text-[var(--muted)]">
          플랜·한도가 궁금하면{" "}
          <Link href="/shop" className="font-semibold text-[var(--brand)]">
            플랜 보기
          </Link>
        </p>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create each page**

Creator stubs (`/write`, `/write/*`, `/audit`, `/persona`, `/ranking`) — render `<CreatorSubnav />` then `<FeaturePlaceholder ... />`.

Examples:

- `/write` — eyebrow `크리에이터`, title `글쓰기 AI`, description about blog writing 2.1
- `/automation` — no CreatorSubnav; title `AI 자동화`, mention 글감→초안→발행 (캘린더 없음)
- `/shortform` — title `숏폼`, New feature copy
- `/trends`, `/calculator` — 더보기 tools

Do **not** create `/account/usage` here — Task 7.

- [ ] **Step 3: Smoke**

```bash
npm run build
```

Expected: build succeeds; no missing routes for stubs.

- [ ] **Step 4: Commit**

```bash
git add src/components/feature-placeholder.tsx src/app/write src/app/automation src/app/shortform src/app/trends src/app/audit src/app/persona src/app/ranking src/app/calculator
git commit -m "feat: add placeholder pages for creator automation shortform IA"
```

---

### Task 7: `/api/account/usage` + `/account/usage` page

**Files:**
- Create: `src/app/api/account/usage/route.ts`
- Create: `src/app/account/usage/page.tsx`
- Modify: `src/components/quota-banner.tsx` usage is optional on this page

**Interfaces:**
- Consumes: `getAuthContext`, `buildUsageSummary`
- Produces: `GET /api/account/usage` → JSON `{ planName, aiUsed, aiLimit, aiRemaining, aiPercent, googleUsed, googleLimit, exhausted }`  
  - 401 JSON if auth enabled and signed out  
  - guest summary (zeros / guest plan) if auth disabled

- [ ] **Step 1: Implement API route**

```typescript
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { buildUsageSummary } from "@/lib/account/usage-summary";

export async function GET() {
  const authContext = await getAuthContext();

  if (authContext.authEnabled && !authContext.userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const summary = buildUsageSummary({
    planName: authContext.plan.name,
    aiUsedMonth: authContext.user?.aiUsedMonth ?? 0,
    aiMonthly: authContext.plan.limits.aiMonthly,
    googleUsedMonth: authContext.user?.googleUsedMonth ?? 0,
    googleMonthly: authContext.plan.limits.googleMonthly,
  });

  return NextResponse.json(summary);
}
```

Note: `getAuthContext().user` must expose `aiUsedMonth` / `googleUsedMonth`. Today `getUserPlanContext` returns user from `ensureUser` which already includes those fields — verify types; if `user` on auth context is the DB row shape, use it. If TypeScript complains, narrow with optional chaining and defaults as above.

- [ ] **Step 2: Implement page (server component)**

- Call `getAuthContext()` on server.
- If signed out and auth enabled: show PlanGate-like login CTA (or EmptyState with “로그인 후 사용량을 확인하세요”).
- Else: render summary cards for AI / Google using `buildUsageSummary`, link to `/shop`, include `<QuotaBanner />` when `aiPercent >= 80`.
- No credit language.

- [ ] **Step 3: Manual + build**

```bash
npm run build
curl -s http://localhost:3000/api/account/usage
```

Expected: 401 when logged out (Clerk on) or guest JSON when Clerk off.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/account/usage/route.ts src/app/account/usage/page.tsx
git commit -m "feat: add account usage API and page as credit UI replacement"
```

---

### Task 8: Phase A acceptance smoke + nav on stubs

**Files:**
- Modify: creator stub pages already have subnav; ensure `/write` and siblings import `CreatorSubnav`
- Create: `docs/superpowers/plans/phase-a-smoke.md` (short checklist only)

- [ ] **Step 1: Write smoke checklist file**

```markdown
# Phase A smoke

- [ ] Header shows 크리에이터 / AI 자동화 / 숏폼(New) / 더보기
- [ ] Every href in TOP_NAV returns 200 (no Next 404)
- [ ] Creator dropdown + CreatorSubnav stay in sync
- [ ] Mobile menu lists all destinations
- [ ] /account/usage works signed-in; signed-out gated
- [ ] No "크레딧" or "캘린더" copy in header or automation stub
```

- [ ] **Step 2: Run through checklist on `npm run dev`**

- [ ] **Step 3: Commit checklist**

```bash
git add docs/superpowers/plans/phase-a-smoke.md
git commit -m "docs: add Phase A smoke checklist"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|---|---|
| Hybrid nav Creator / Automation / Shortform / More | 2, 3 |
| Creator subnav tabs | 4, 6 |
| EmptyState / PlanGate / QuotaBanner | 5 |
| All IA hrefs reachable | 6 |
| `/account/usage` replaces credits | 7 |
| No calendar / no credits copy | 3, 6, 7, 8 |
| Phase B–F features (write logic, kanban, etc.) | **Out of this plan** — separate plan files |

Placeholder scan: no TBD steps; stub copy is explicit.  
Type consistency: `buildUsageSummary` field names match API JSON and QuotaBanner props (`aiUsed`/`aiLimit`).

---

## Plan index (follow-on)

| Plan file (to write next) | Spec Phase |
|---|---|
| *(this file)* | A Shell |
| `2026-08-21-phase-b-write.md` | B 글쓰기 |
| `2026-08-21-phase-c-automation.md` | C AI 자동화 |
| `2026-08-21-phase-d-shortform.md` | D 숏폼 |
| `2026-08-21-phase-e-audit-persona-ranking.md` | E |
| `2026-08-21-phase-f-trends-plans.md` (+ stage1 hardening plan) | F |
