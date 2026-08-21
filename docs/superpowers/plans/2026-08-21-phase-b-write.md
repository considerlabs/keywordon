# Phase B: Write Studio (`/write`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Phase A stubs with a working blog Write 2.1 studio (`/write` + image/commerce/tools), extend `POST /api/copilot` for post type / advanced settings / trimmed inputs, add semi-auto export actions, and redirect `/copilot` → `/write`.

**Architecture:** Keep Gemini REST + `tryConsumeAiUsage` + `assertFeature(…, "copilot")`. Extract prompt assembly into a pure `buildWritePrompt` helper (unit-tested). `/write` is a client studio (form | preview) calling the existing streaming-friendly plain-text copilot response. Persona injection is a **no-op hook** until Phase E (`getActivePersona` returns `null`). Image/commerce get thin dedicated API routes that still consume the same AI monthly quota.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, existing Gemini 3.6 Flash REST, Vitest, KeywordOn CSS variables, Clerk auth via `getAuthContext`.

**Spec:** `docs/superpowers/specs/2026-08-21-creator-automation-shortform-design.md` (§3 Creator write map, §4.1, §5 `/write*`, §6.1 copilot extension, §8 UX, §9 Phase B)

## Global Constraints

- No credit UI, no calendar copy anywhere in write surfaces.
- Semi-auto publish only: copy, markdown download, Naver blog write deep link (`https://blog.naver.com/Redirect.naver?url=…` or documented blog write URL). No OAuth auto-publish.
- Reuse `aiMonthly` via `tryConsumeAiUsage` — do not invent a credit ledger.
- Input trim: `keyword`/`title`/`tone`/`intent`/`emphasis`/each keyword ≤ **200** chars; keywords array max **5**.
- KeywordOn CSS variables (`--brand`, `--ink`, `--muted`, `--line`, `--surface`, `--panel`, `--canvas`, `--accent`). No purple-on-white redesign.
- `/copilot` must redirect to `/write` (308 or Next `redirect`).
- Persona: if no persona store yet, `usePersona: true` must not error — omit persona block.
- Work on an isolated worktree branch (not bare `main`) unless the human explicitly allows in-place main work.
- Commit per task; do not push unless asked.
- Desktop: two-column input | preview; mobile: single column.

### File map

| File | Responsibility |
|------|----------------|
| `src/lib/write/types.ts` | Post types, request body types, tone presets |
| `src/lib/write/prompt.ts` | `trimWriteField`, `buildWritePrompt` (pure) |
| `src/lib/write/prompt.test.ts` | TDD for trim + prompt |
| `src/lib/write/persona.ts` | `getActivePersona(userId): Promise<PersonaBlock \| null>` stub → null |
| `src/app/api/copilot/route.ts` | Accept extended body; call prompt builder; keep plain-text Response |
| `src/app/api/write/image/route.ts` | Image brief / generation via Gemini; AI quota |
| `src/app/api/write/commerce/route.ts` | Product URL → promo draft; AI quota |
| `src/components/write/write-studio.tsx` | Main client studio for `/write` |
| `src/components/write/trend-topics.tsx` | Right-rail topics from `/api/trends` |
| `src/components/write/export-actions.tsx` | Copy / MD / Naver deep link |
| `src/components/write/write-tool-hub.tsx` | Tools page client |
| `src/components/write/commerce-form.tsx` | Commerce page client |
| `src/components/write/image-form.tsx` | Image page client |
| `src/app/write/page.tsx` | Server shell + CreatorSubnav + WriteStudio |
| `src/app/write/tools/page.tsx` | Replace stub |
| `src/app/write/commerce/page.tsx` | Replace stub |
| `src/app/write/image/page.tsx` | Replace stub |
| `src/app/copilot/page.tsx` | Redirect only |

---

### Task 1: Write types + prompt builder (TDD)

**Files:**
- Create: `src/lib/write/types.ts`
- Create: `src/lib/write/prompt.ts`
- Create: `src/lib/write/prompt.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `POST_TYPES: readonly { id: string; label: string; tags?: string[] }[]` — ids: `travel`, `restaurant`, `info`, `promo`, `it_review`, `biz`, `beauty`, `daily`
  - `TONE_PRESETS: readonly string[]` — `자동 설정`, `~해요`, `~합니다`, `~한다(반말)`
  - `CHAR_COUNTS: readonly number[]` — `500, 1000, 1500, 2000, 3000`
  - `WritePromptInput` / `buildWritePrompt(input): { system: string; user: string }`
  - `trimWriteField(value: string | undefined, max = 200): string`
  - `normalizeKeywords(raw: unknown): string[]` — max 5, each trimmed to 200

- [ ] **Step 1: Failing tests**

```typescript
import { describe, expect, it } from "vitest";
import { buildWritePrompt, normalizeKeywords, trimWriteField } from "./prompt";

describe("trimWriteField", () => {
  it("trims and caps length", () => {
    expect(trimWriteField("  hi  ")).toBe("hi");
    expect(trimWriteField("x".repeat(250)).length).toBe(200);
  });
});

describe("normalizeKeywords", () => {
  it("caps at 5 and trims", () => {
    expect(normalizeKeywords([" a ", "b", "", "c", "d", "e", "f"])).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
    ]);
  });
});

describe("buildWritePrompt", () => {
  it("includes post type, title, char count, and optional emphasis", () => {
    const { system, user } = buildWritePrompt({
      postTypeLabel: "여행 후기",
      title: "부산 여행",
      keywords: ["부산", "해운대"],
      charCount: 1000,
      tone: "~해요",
      emphasis: "오후 2시 방문 언급",
      flags: { useLatestSearch: true, hashtags: true, seoInsights: false },
      keywordStats: {
        monthlyVolume: 12000,
        category: "여행",
        related: ["광안리", "서면"],
      },
      personaBlock: null,
    });
    expect(system).toContain("한국어");
    expect(user).toContain("여행 후기");
    expect(user).toContain("부산 여행");
    expect(user).toContain("1000");
    expect(user).toContain("~해요");
    expect(user).toContain("오후 2시");
    expect(user).toContain("해시태그");
  });

  it("appends persona when provided", () => {
    const { user } = buildWritePrompt({
      postTypeLabel: "일상/취미",
      title: "",
      keywords: ["캠핑"],
      charCount: 500,
      tone: "자동 설정",
      emphasis: "",
      flags: { useLatestSearch: false, hashtags: false, seoInsights: false },
      keywordStats: { monthlyVolume: 100, category: "생활", related: [] },
      personaBlock: "어미: ~해요, 평균 1200자",
    });
    expect(user).toContain("어미: ~해요");
  });
});
```

Run: `npm test -- src/lib/write/prompt.test.ts`  
Expected: FAIL (module missing)

- [ ] **Step 2: Implement `types.ts` + `prompt.ts`** to make tests pass. Prompt must instruct: Korean blog draft matching type; target length; tone; optional hashtags; avoid exaggerated ads; structure with title + body.

- [ ] **Step 3: `npm test` — PASS**

- [ ] **Step 4: Commit**

```bash
git add src/lib/write/types.ts src/lib/write/prompt.ts src/lib/write/prompt.test.ts
git commit -m "feat: add write prompt builder with input trimming"
```

---

### Task 2: Persona stub + extend `POST /api/copilot`

**Files:**
- Create: `src/lib/write/persona.ts`
- Modify: `src/app/api/copilot/route.ts`
- Create: `src/app/api/copilot/route.test.ts` (optional light tests for trim via importing helpers only — if route testing is heavy, skip route test and rely on prompt tests + manual curl)

**Interfaces:**
- Consumes: `buildWritePrompt`, `trimWriteField`, `normalizeKeywords`, `POST_TYPES`
- Produces: `getActivePersona(_userInternalId: number): Promise<string | null>` always `null` in Phase B
- Extended body:

```typescript
{
  keyword?: string;       // primary keyword (required if keywords empty)
  keywords?: string[];
  title?: string;
  postType?: string;      // POST_TYPES id
  charCount?: number;
  tone?: string;
  intent?: string;        // legacy; maps into post type label fallback
  emphasis?: string;
  usePersona?: boolean;
  flags?: { useLatestSearch?: boolean; hashtags?: boolean; seoInsights?: boolean };
}
```

- [ ] **Step 1: Implement `getActivePersona` stub returning `null`**

- [ ] **Step 2: Update copilot POST**
  1. Keep auth / `assertFeature(copilot)` / `tryConsumeAiUsage` / Gemini key checks.
  2. Parse extended body; `trimWriteField` all strings; `normalizeKeywords`.
  3. Primary keyword = `keywords[0] ?? keyword` — 400 if empty.
  4. Resolve `postTypeLabel` from `POST_TYPES` by id, else `intent` trimmed, else `"블로그 포스팅"`.
  5. `charCount` default `1000` if not in `CHAR_COUNTS`.
  6. `resolveKeywordAnalysis(primaryKeyword, "naver")` for stats (existing).
  7. If `usePersona`, call `getActivePersona(authContext.user.id)` — still null OK.
  8. `buildWritePrompt(...)` → Gemini with same endpoint/model as today.
  9. Return plain-text `Response` (existing headers). On Gemini failure keep 502 JSON.

- [ ] **Step 3: Manual smoke**

```bash
# with Clerk/env as available — or unit-level confidence from Task 1
npm test
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/write/persona.ts src/app/api/copilot/route.ts
git commit -m "feat: extend copilot API for write studio fields"
```

---

### Task 3: Write studio UI (`/write`)

**Files:**
- Create: `src/components/write/trend-topics.tsx`
- Create: `src/components/write/export-actions.tsx`
- Create: `src/components/write/write-studio.tsx`
- Modify: `src/app/write/page.tsx`

**Interfaces:**
- Consumes: `POST_TYPES`, `TONE_PRESETS`, `CHAR_COUNTS`, `/api/copilot`, `/api/trends`
- Produces: interactive studio; states idle | streaming | done | error | quota

- [ ] **Step 1: `trend-topics.tsx`**
  - Client: fetch `GET /api/trends` on mount + refresh button.
  - Filter chips optional by post type label (client-side filter on keyword text is enough if API has no categories).
  - Clicking a topic fills `title` and pushes keyword into the parent via callback `onPick(topic: string)`.

- [ ] **Step 2: `export-actions.tsx`**
  - Props: `draft: string`, `title: string`
  - Buttons: 복사 (clipboard), MD 다운로드 (`Blob` `text/markdown`), 네이버 블로그에 붙여넣기 안내 — open `https://blog.naver.com/` in new tab (deep-link best-effort; show toast/helper text “초안을 복사한 뒤 네이버 글쓰기 창에 붙여넣으세요”). No OAuth.

- [ ] **Step 3: `write-studio.tsx`**
  - Left: postType select, title (0/50 counter), keywords (max 5, chip input or comma field + “자동입력” that uses first trend), advanced accordion (charCount radios, tone radios, emphasis textarea max 300 UI / server 200, toggles for flags, usePersona checkbox disabled-with-hint “페르소나는 곧 연결됩니다” OR enabled but no-op).
  - Right: notice banner + TrendTopics + draft preview (`whitespace-pre-wrap`).
  - Submit → POST `/api/copilot` with extended JSON; read body stream like current copilot page.
  - 401/403 → PlanGate or login CTA; 429 → QuotaBanner link to `/account/usage`.
  - Layout: `md:grid-cols-2`; mobile single column.

- [ ] **Step 4: `write/page.tsx`**

```tsx
import { CreatorSubnav } from "@/components/creator-subnav";
import { WriteStudio } from "@/components/write/write-studio";

export default function WritePage() {
  return (
    <>
      <CreatorSubnav />
      <WriteStudio />
    </>
  );
}
```

- [ ] **Step 5: `npm run build` + commit**

```bash
git add src/components/write src/app/write/page.tsx
git commit -m "feat: ship write studio UI with trends and export actions"
```

---

### Task 4: Write tools hub (`/write/tools`)

**Files:**
- Create: `src/components/write/write-tool-hub.tsx`
- Modify: `src/app/write/tools/page.tsx`

**Interfaces:**
- Modes: `title` | `script` | `sns` — each sets `postType`/`intent` and a fixed prompt flavor via `emphasis` or dedicated `intent` string when calling `/api/copilot`.
- Same AI quota path.

- [ ] **Step 1: Implement hub** — tabs for 제목 / 스크립트 / SNS; keyword + short brief; stream output; ExportActions.

- [ ] **Step 2: Page with CreatorSubnav + hub**

- [ ] **Step 3: Commit**

```bash
git add src/components/write/write-tool-hub.tsx src/app/write/tools/page.tsx
git commit -m "feat: add write micro-tools hub for title script sns"
```

---

### Task 5: Commerce writing (`/write/commerce` + API)

**Files:**
- Create: `src/lib/write/commerce-prompt.ts` + test (URL host allowlist soft-check: must be `http(s)` URL; warn-only for non-shopping hosts)
- Create: `src/app/api/write/commerce/route.ts`
- Create: `src/components/write/commerce-form.tsx`
- Modify: `src/app/write/commerce/page.tsx`

**Interfaces:**
- `POST /api/write/commerce` body `{ productUrl: string; productName?: string; tone?: string }`
- Auth + copilot feature + `tryConsumeAiUsage` identical to copilot.
- Gemini prompt: promo blog post for the product link; no fake medical claims; include CTA soft.
- Do not server-fetch arbitrary product pages (SSRF avoidance) — use URL string + optional name only.

- [ ] **Step 1: Test** `assertCommerceUrl` accepts https URLs, rejects empty/non-http.

- [ ] **Step 2: API + UI** (CreatorSubnav, link field, generate, ExportActions)

- [ ] **Step 3: Commit**

```bash
git add src/lib/write/commerce-prompt.ts src/lib/write/commerce-prompt.test.ts src/app/api/write/commerce/route.ts src/components/write/commerce-form.tsx src/app/write/commerce/page.tsx
git commit -m "feat: add commerce promo writing API and page"
```

---

### Task 6: AI image assistant (`/write/image` + API)

**Files:**
- Create: `src/app/api/write/image/route.ts`
- Create: `src/components/write/image-form.tsx`
- Modify: `src/app/write/image/page.tsx`

**Interfaces:**
- Phase B MVP: Gemini **text** image brief (composition, colors, caption, alt text, Midjourney/Canva prompt) — **not** binary image bytes unless already trivial with current key. Document in UI: “이미지 생성 프롬프트·알트 텍스트를 만듭니다”.
- Same auth + AI quota.
- Body: `{ topic: string; style?: string }`

- [ ] **Step 1: API returns plain text brief**

- [ ] **Step 2: UI with CreatorSubnav + copy actions**

- [ ] **Step 3: Commit**

```bash
git add src/app/api/write/image/route.ts src/components/write/image-form.tsx src/app/write/image/page.tsx
git commit -m "feat: add AI image brief generator for write studio"
```

---

### Task 7: Redirect `/copilot` → `/write` + smoke docs

**Files:**
- Replace: `src/app/copilot/page.tsx` with server redirect
- Update: `docs/superpowers/plans/phase-a-smoke.md` or create `docs/superpowers/plans/phase-b-smoke.md`
- Update: `documentation/인수인계-2026-08-21-phase-a.md` note that B landed — or append short note in `documentation/인수인계.md` write section only if quick

- [ ] **Step 1: Redirect**

```tsx
import { redirect } from "next/navigation";

export default function CopilotRedirectPage() {
  redirect("/write");
}
```

- [ ] **Step 2: Smoke checklist file `phase-b-smoke.md`**

```markdown
# Phase B smoke
- [ ] /write: post type change updates UI; generate streams draft
- [ ] Advanced: char count, tone, emphasis affect output (spot check)
- [ ] Export: copy / md / naver tab
- [ ] /write/tools title|script|sns work
- [ ] /write/commerce URL → draft
- [ ] /write/image topic → brief
- [ ] /copilot redirects to /write
- [ ] 429 shows usage CTA; 403 shows plan CTA
- [ ] No 크레딧/캘린더 copy
```

- [ ] **Step 3: `npm test && npm run build`**

- [ ] **Step 4: Commit**

```bash
git add src/app/copilot/page.tsx docs/superpowers/plans/phase-b-smoke.md
git commit -m "feat: redirect copilot to write studio and add Phase B smoke list"
```

---

## Self-review (plan vs spec Phase B)

| Spec item | Task |
|-----------|------|
| `/write` 글타입·고급설정·트렌드·말투 | 3 |
| Copilot body 확장 + trim | 1–2 |
| 페르소나 주입 훅 | 2 (null until E) |
| `/write/image` `/commerce` `/tools` | 4–6 |
| `/copilot` → `/write` | 7 |
| 반자동 내보내기 | 3 |
| 크레딧/캘린더 없음 | Global |
| Binary Gemini image bytes | Deferred — text brief MVP (Ruling: ship prompts first; native image gen later if key supports) |

---

## Execution

After this plan is approved/saved, run via **subagent-driven-development** (recommended) or **executing-plans**.
