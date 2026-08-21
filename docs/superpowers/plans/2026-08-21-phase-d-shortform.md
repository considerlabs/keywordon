# Phase D: Shortform (`/shortform`) Implementation Plan

> **Branch:** `feature/phase-d-shortform`  
> **Spec:** `docs/superpowers/specs/2026-08-21-creator-automation-shortform-design.md` (§3 숏폼, §4.3, §6.2 shortform APIs, §7 schema, §9 Phase D)

**Goal:** URL 또는 내 글 → 훅·씬·나레이션 대본 → CapCut/Canva 텍스트 내보내기. 서버 영상 렌더·크레딧 UI 없음.

**Architecture:** `shortform_projects` (Drizzle) + `shortformMonthly` plan limit + `aiMonthly` via `tryConsumeAiUsage`. Shared `src/lib/ssrf.ts` for Naver/Tistory https fetch. Gemini `gemini-3.6-flash` absolute URL. IDOR: all queries `userId`-scoped.

## Deliverables

| Area | Files |
|------|--------|
| Schema + plans | `schema.ts`, `plans.ts` |
| SSRF | `src/lib/ssrf.ts`, `ssrf.test.ts` |
| Domain | `src/lib/shortform/*` |
| API | `/api/shortform`, `/api/shortform/[id]`, `…/generate` + route tests |
| UI | `/shortform` hub, `/shortform/[id]` editor, `ImportPostsModal`, `ShortformExportActions` |
| Smoke | `docs/superpowers/plans/phase-d-smoke.md` |

## Quota

- `assertFeature(copilot)` — 로그인·Copilot 게이트 (automation과 동일)
- `shortformMonthly` — 생성 횟수 (`usage_events.action = shortform_generate`)
- `tryConsumeAiUsage` — Gemini 호출 전 검증 완료 후 차감

## Manual smoke

See `phase-d-smoke.md`.
