# Phase C: AI Automation Kanban (`/automation`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/automation` stub with a working 3-column kanban (글감 → AI 초안 → 발행), persist ideas/drafts in Neon, generate drafts via Gemini + `aiMonthly`, and reuse Phase B semi-auto export actions.

**Architecture:** Add `automation_ideas` / `automation_drafts` tables (Drizzle). Ideas API serves curated suggestions + user ideas with `automationIdeasDaily` gating. Drafts API creates content by calling the same Gemini path as write (`buildWritePrompt` + `tryConsumeAiUsage`, action `automation_draft`). Client kanban loads both lists, moves cards via PATCH status, and reuses `ExportActions` for copy/MD/Naver. Persona stays a no-op stub until Phase E. No calendar tab, no credit UI, no OAuth publish.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle + Neon, Gemini 3.6 Flash REST, Vitest, existing auth/quota helpers, KeywordOn CSS variables.

**Spec:** `docs/superpowers/specs/2026-08-21-creator-automation-shortform-design.md` (§3 `/automation`, §4.2, §5, §6.2 ideas/drafts, §7 schema + `automationIdeasDaily`, §8 UX, §9 Phase C)

## Global Constraints

- No credit UI, no calendar copy on automation surfaces.
- Semi-auto publish only: copy, MD download, Naver deep link, extension tip. No OAuth.
- Reuse `aiMonthly` via `tryConsumeAiUsage` for draft generation; record `usage_events.action = "automation_draft"` when inserting usage meta is practical (prefer logging via existing tryConsume path + optional usageEvents insert).
- All idea/draft queries MUST scope `userId = auth user id` (IDOR).
- Input trim: title/keyword ≤ **200** chars (`trimWriteField`).
- KeywordOn CSS variables only. No purple-on-white redesign.
- Persona: `getActivePersona` may return null — do not error.
- Desktop: 3 columns; mobile (`<md`): vertical steps 1→2→3.
- Alimtalk: optional disabled toggle placeholder only — no send.
- Work on branch `feature/phase-c-automation` (not bare main). Commit per task; push/PR only when asked or at finishing skill.
- `db:push` required after schema change (document in smoke; CI may lack Neon — unit tests mock DB).

### File map

| File | Responsibility |
|------|----------------|
| `src/lib/db/schema.ts` | Add `automationIdeas`, `automationDrafts` tables + types |
| `src/lib/plans.ts` | Add `automationIdeasDaily` to every plan limits |
| `src/lib/automation/types.ts` | Idea/draft status unions, suggestion type |
| `src/lib/automation/suggestions.ts` | Pure curated suggestion list (+ merge trends helper) |
| `src/lib/automation/suggestions.test.ts` | Unit tests for suggestions |
| `src/lib/automation/daily.ts` | `dayKey()`, `assertIdeasDailyLimit(used, limit)` |
| `src/lib/automation/daily.test.ts` | Limit helper tests |
| `src/lib/automation/repository.ts` | DB CRUD scoped by userId (ideas/drafts/countToday) |
| `src/app/api/automation/ideas/route.ts` | GET list+suggestions+quota; POST add idea |
| `src/app/api/automation/ideas/route.test.ts` | Auth/validation/limit tests (mocked) |
| `src/app/api/automation/drafts/route.ts` | GET list; POST generate; PATCH status/content |
| `src/app/api/automation/drafts/route.test.ts` | Validate-before-quota + ownership mocks |
| `src/components/automation/automation-board.tsx` | Client kanban shell |
| `src/components/automation/idea-column.tsx` | Suggestions + add form + idea cards |
| `src/components/automation/draft-column.tsx` | Draft cards + generate progress |
| `src/components/automation/publish-column.tsx` | Ready/exported + ExportActions |
| `src/app/automation/page.tsx` | Server shell + CreatorSubnav + board |
| `docs/superpowers/plans/phase-c-smoke.md` | Manual smoke checklist |

---

### Task 1: Schema + plan limit

**Files:**
- Modify: `src/lib/db/schema.ts`
- Modify: `src/lib/plans.ts`

**Interfaces:**
- Produces:
  - Tables `automation_ideas` (`automationIdeas`), `automation_drafts` (`automationDrafts`)
  - `PlanDefinition.limits.automationIdeasDaily: number` — guest 0, free 3, basic 7, super 15, enterprise 30

- [ ] **Step 1: Add tables to schema**

Append to `src/lib/db/schema.ts`:

```typescript
export const automationIdeas = pgTable("automation_ideas", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  source: text("source").notNull().default("manual"), // manual | suggestion | keyword
  title: text("title").notNull(),
  keyword: text("keyword"),
  monthlyVolume: integer("monthly_volume"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const automationDrafts = pgTable("automation_drafts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  ideaId: integer("idea_id"),
  title: text("title").notNull().default(""),
  content: text("content").notNull().default(""),
  status: text("status").notNull().default("draft"), // draft | ready | exported
  exportedAt: timestamp("exported_at"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AutomationIdeaRow = typeof automationIdeas.$inferSelect;
export type AutomationDraftRow = typeof automationDrafts.$inferSelect;
```

- [ ] **Step 2: Add `automationIdeasDaily` to all five plans** in `plans.ts` limits (values above). TypeScript must fail until every plan object includes the field.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/schema.ts src/lib/plans.ts
git commit -m "feat: add automation tables and daily idea plan limit"
```

---

### Task 2: Suggestions + daily limit helpers (TDD)

**Files:**
- Create: `src/lib/automation/types.ts`
- Create: `src/lib/automation/suggestions.ts`
- Create: `src/lib/automation/suggestions.test.ts`
- Create: `src/lib/automation/daily.ts`
- Create: `src/lib/automation/daily.test.ts`

**Interfaces:**
- Produces:
  - `AutomationDraftStatus = "draft" | "ready" | "exported"`
  - `IdeaSource = "manual" | "suggestion" | "keyword"`
  - `AutomationSuggestion = { id: string; title: string; keyword: string; monthlyVolume?: number }`
  - `getCuratedSuggestions(): AutomationSuggestion[]` — ≥5 static KR blog ideas (no credits/calendar wording)
  - `mergeTrendSuggestions(trends: { keyword: string; volume?: number }[]): AutomationSuggestion[]` — curated first, then unique trend keywords as suggestions (cap 12 total)
  - `dayKey(date?: Date): string` — `YYYY-MM-DD` UTC
  - `assertIdeasDailyLimit(used: number, limit: number): { ok: true } | { ok: false; error: string }`

- [ ] **Step 1: Failing tests**

```typescript
// suggestions.test.ts
import { describe, expect, it } from "vitest";
import { getCuratedSuggestions, mergeTrendSuggestions } from "./suggestions";

describe("getCuratedSuggestions", () => {
  it("returns at least 5 Korean blog ideas with title and keyword", () => {
    const items = getCuratedSuggestions();
    expect(items.length).toBeGreaterThanOrEqual(5);
    for (const item of items) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.keyword.length).toBeGreaterThan(0);
      expect(item.id.length).toBeGreaterThan(0);
    }
  });
});

describe("mergeTrendSuggestions", () => {
  it("dedupes by keyword and caps at 12", () => {
    const merged = mergeTrendSuggestions(
      Array.from({ length: 20 }, (_, i) => ({ keyword: `키워드${i}`, volume: i })),
    );
    expect(merged.length).toBeLessThanOrEqual(12);
    const keys = merged.map((m) => m.keyword);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
```

```typescript
// daily.test.ts
import { describe, expect, it } from "vitest";
import { assertIdeasDailyLimit, dayKey } from "./daily";

describe("dayKey", () => {
  it("formats UTC YYYY-MM-DD", () => {
    expect(dayKey(new Date("2026-08-21T15:00:00.000Z"))).toBe("2026-08-21");
  });
});

describe("assertIdeasDailyLimit", () => {
  it("rejects when used >= limit", () => {
    expect(assertIdeasDailyLimit(3, 3).ok).toBe(false);
    expect(assertIdeasDailyLimit(2, 3).ok).toBe(true);
  });
  it("rejects when limit is 0", () => {
    expect(assertIdeasDailyLimit(0, 0).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

`npx vitest run src/lib/automation`

- [ ] **Step 3: Implement modules to pass**

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/automation
git commit -m "feat: add automation suggestions and daily limit helpers"
```

---

### Task 3: Repository (DB helpers)

**Files:**
- Create: `src/lib/automation/repository.ts`

**Interfaces:**
- Consumes: schema tables, `db` / `hasDatabase` from `@/lib/db`
- Produces (all require `userId: number`):
  - `listIdeas(userId): Promise<AutomationIdeaRow[]>`
  - `countIdeasCreatedOn(userId, dayKey: string): Promise<number>` — count where `createdAt` falls on that UTC day
  - `insertIdea(input): Promise<AutomationIdeaRow>`
  - `getIdeaForUser(userId, ideaId): Promise<AutomationIdeaRow | null>`
  - `listDrafts(userId): Promise<AutomationDraftRow[]>`
  - `insertDraft(input): Promise<AutomationDraftRow>`
  - `updateDraftForUser(userId, id, patch): Promise<AutomationDraftRow | null>`
  - If `!hasDatabase || !db`, each method throws `Error("DATABASE_URL이 필요합니다.")` (routes map to 503)

- [ ] **Step 1: Implement repository** using drizzle `eq`, `and`, `desc`, `gte`, `lt` for day window.

Day window for `dayKey` `YYYY-MM-DD`:
```typescript
const start = new Date(`${dayKey}T00:00:00.000Z`);
const end = new Date(start.getTime() + 86_400_000);
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/automation/repository.ts
git commit -m "feat: add automation ideas and drafts repository"
```

---

### Task 4: Ideas API (TDD)

**Files:**
- Create: `src/app/api/automation/ideas/route.ts`
- Create: `src/app/api/automation/ideas/route.test.ts`

**Interfaces:**
- Consumes: `getAuthContext`, `assertFeature(..., "copilot")`, repository, suggestions, daily helpers, `getRealtimeTrends` or fetch trends via `getRealtimeTrends` from keyword-engine, `trimWriteField`
- Produces:
  - `GET` → `{ ideas, suggestions, dailyUsed, dailyLimit }` (401/403 as write APIs)
  - `POST` body `{ title, keyword?, source?, monthlyVolume? }` → create idea; 429 when daily limit hit; validate title non-empty **before** insert

- [ ] **Step 1: Failing tests** — mock auth, repository, assertFeature like commerce tests; assert empty title → 400 and no insert; daily limit → 429.

- [ ] **Step 2: Implement route**

- [ ] **Step 3: Tests PASS**

- [ ] **Step 4: Commit**

```bash
git add src/app/api/automation/ideas
git commit -m "feat: add automation ideas API with daily quota"
```

---

### Task 5: Drafts API (TDD)

**Files:**
- Create: `src/app/api/automation/drafts/route.ts`
- Create: `src/app/api/automation/drafts/route.test.ts`

**Interfaces:**
- `GET` → `{ drafts }` scoped to user
- `POST` body `{ ideaId: number }` → load idea (404 if missing/other user); require keyword or title; check Gemini key; **then** `tryConsumeAiUsage`; generate with `buildWritePrompt` (postType `info` / 정보성, charCount 1000, tone 자동 설정); insert draft `status: "ready"`; optional `usageEvents` insert `{ action: "automation_draft", userId, meta: { ideaId } }`
- `PATCH` body `{ id: number, status?: AutomationDraftStatus, content?: string }` → ownership update; if status `exported`, set `exportedAt = now`
- Gemini absolute URL: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent` (never `gemini-2.0-flash`)
- Validate ideaId / missing keyword **before** quota burn

- [ ] **Step 1: Failing test** — POST without ideaId → 400 and `tryConsumeAiUsage` not called

- [ ] **Step 2: Implement**

- [ ] **Step 3: PASS + Commit**

```bash
git add src/app/api/automation/drafts
git commit -m "feat: add automation drafts API with Gemini generation"
```

---

### Task 6: Kanban UI

**Files:**
- Create: `src/components/automation/automation-board.tsx`
- Create: `src/components/automation/idea-column.tsx`
- Create: `src/components/automation/draft-column.tsx`
- Create: `src/components/automation/publish-column.tsx`
- Modify: `src/app/automation/page.tsx`

**Interfaces:**
- Board loads GET ideas + GET drafts on mount
- Header cards: link CTAs to `/audit`, `/shortform`, tip about Chrome extension (text only)
- Idea column: suggestions (Add), manual form, list ideas with “초안 생성” button → POST drafts
- Draft column: `draft`/`ready` cards with content preview; “발행 열로” may be implicit when ready (show in both draft preview + publish column). Ruling: **ready** drafts appear in column 2 (preview) and column 3 (export actions); **exported** only in column 3
- Publish column: `ExportActions` + button “발행 완료로 표시” → PATCH `exported`; extension tip; disabled “알림톡 알림” checkbox placeholder
- PlanGate / QuotaBanner / EmptyState patterns from write studio
- No “크레딧” or “캘린더” strings

- [ ] **Step 1: Implement components + page**

- [ ] **Step 2: `npm test` + `npm run build` (or tsc) sanity**

- [ ] **Step 3: Commit**

```bash
git add src/components/automation src/app/automation
git commit -m "feat: ship automation kanban board UI"
```

---

### Task 7: Smoke checklist

**Files:**
- Create: `docs/superpowers/plans/phase-c-smoke.md`

- [ ] **Step 1: Write checklist** covering login, add idea, daily limit messaging, generate draft, export actions, no credit/calendar, mobile stack, `/automation` empty→filled

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/plans/phase-c-smoke.md
git commit -m "docs: add Phase C smoke checklist"
```

---

## Spec coverage self-check

| Spec item | Task |
|-----------|------|
| Kanban 글감→초안→발행 | 6 |
| No calendar / credits | Global + UI copy review Task 6 |
| ideas/drafts API | 4, 5 |
| Schema + daily limit | 1, 2, 4 |
| Semi-auto export | 6 (ExportActions) |
| Persona stub | 5 (getActivePersona optional) |
| Alimtalk placeholder | 6 |
| IDOR user scope | 3, 4, 5 |

## After plan execution

Push feature branch → `gh pr create` → merge/push main per team preference (Phase B: feature push → PR → then main).
