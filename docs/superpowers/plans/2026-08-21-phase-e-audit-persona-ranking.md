# Phase E: Audit · Persona · Ranking Implementation Plan

> **Branch:** `feature/phase-e-audit-persona-ranking`  
> **Spec:** `docs/superpowers/specs/2026-08-21-creator-automation-shortform-design.md` (§3 크리에이터 audit/persona/ranking, §6.2 APIs, §7 schema, §9 Phase E)

**Goal:** `/audit` 게시글 SEO 진단, `/persona` 문체 학습(5단계·2초 폴링), `/ranking` 블로그 순위(시뮬 데이터). 페르소나 완료 시 글쓰기·숏폼·자동화에 주입.

**Architecture:** `blog_personas` · `post_audits` (Drizzle) + `postAuditMonthly` · `personaMonthly` plan limits + shared `src/lib/ssrf.ts` + Gemini `gemini-3.6-flash` absolute URL. IDOR: all queries `userId`-scoped.

## Deliverables

| Area | Files |
|------|--------|
| Schema + plans | `schema.ts`, `plans.ts` |
| SSRF | 기존 `src/lib/ssrf.ts` 재사용 |
| Domain | `src/lib/audit/*`, `src/lib/persona/*`, `src/lib/ranking/*`, `src/lib/gemini.ts` |
| API | `/api/audit/post`, `/api/persona`, `/api/persona/analyze`, `/api/persona/status` + route tests |
| UI | `/audit`, `/persona`, `/ranking` + CreatorSubnav |
| Persona wire | `src/lib/write/persona.ts` → `getActivePersona` when status=done |
| Smoke | `docs/superpowers/plans/phase-e-smoke.md` |

## Quota

- `assertFeature(blogAnalysis)` — audit/persona 게이트
- `postAuditMonthly` / `personaMonthly` — `usage_events` actions `post_audit`, `persona_analyze`
- `tryConsumeAiUsage` — Gemini 호출 **전** 입력·SSRF·월간 한도 검증 완료 후 차감

## Plan limits

| limit | guest | free | basic | super | enterprise |
|---|---|---|---|---|---|
| `postAuditMonthly` | 0 | 1 | 5 | 15 | 40 |
| `personaMonthly` | 0 | 1 | 4 | 8 | 20 |

## Persona flow

1. POST `/api/persona/analyze` — URL 또는 pasted posts, status=`analyzing`
2. GET `/api/persona/status` — 2초 폴링, 단계 1→5 진행 (각 2초), 5단계에서 Gemini 호출
3. status=`done` → `getActivePersona`가 글쓰기/숏폼/자동화 프롬프트에 블록 주입

## Manual smoke

See `phase-e-smoke.md`.
