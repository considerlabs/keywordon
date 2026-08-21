# Admin Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/admin` 콘솔 — 허용 이메일만 접근, 회원/플랜 관리 + 암호화된 앱 설정 CRUD, 런타임은 DB 오버라이드 우선.

**Architecture:** Neon `app_settings` + AES-256-GCM. `getSetting(key)`가 DB→env 폴백. `requireAdmin()`이 `ADMIN_EMAILS` 검사. Admin 전용 레이아웃/API.

**Tech Stack:** Next.js 16 App Router, Drizzle/Neon, Clerk, Vitest, 기존 CSS 토큰

**Spec:** `docs/superpowers/specs/2026-08-21-admin-console-design.md`

## Global Constraints

- 시크릿 GET에 평문 전체 반환 금지 (preview만)
- Clerk/DB URL/`SETTINGS_ENCRYPTION_KEY`/`ADMIN_EMAILS`는 UI 관리 제외
- 공개 SiteHeader에 Admin 링크 없음
- TDD: 라이브러리·API는 실패 테스트 먼저

## 파일 맵

| 파일 | 책임 |
|------|------|
| `src/lib/admin/emails.ts` | ADMIN_EMAILS 파싱 |
| `src/lib/admin/require-admin.ts` | requireAdmin() |
| `src/lib/settings/crypto.ts` | encrypt/decrypt |
| `src/lib/settings/keys.ts` | 화이트리스트 |
| `src/lib/settings/store.ts` | getSetting / list / set / clear + cache |
| `src/lib/db/schema.ts` | app_settings 테이블 |
| `src/lib/db/admin-users.ts` | 회원 목록/패치 |
| `src/app/api/admin/**` | overview, users, settings |
| `src/app/admin/**` | layout + pages |
| `src/proxy.ts` | /admin protect |
| `.env.example` | ADMIN_EMAILS, SETTINGS_ENCRYPTION_KEY |

---

### Task 1: 암호화 + 화이트리스트 + requireAdmin

- [ ] 테스트: crypto round-trip, unknown key reject, admin email allow/deny
- [ ] 구현: `crypto.ts`, `keys.ts`, `emails.ts`, `require-admin.ts`
- [ ] `npm test` 통과

### Task 2: schema + settings store

- [ ] `app_settings` 스키마 추가
- [ ] 테스트: getSetting env 폴백 / set 후 DB 우선 (mock db or in-memory path)
- [ ] `store.ts` 구현, Naver/gemini/stripe/cron을 `getSetting`으로 교체

### Task 3: Admin APIs

- [ ] 테스트: unauthorized, unknown setting key 400, empty value clears
- [ ] routes: overview, users, users/[id], settings, settings/[key]

### Task 4: Admin UI + proxy

- [ ] `proxy.ts`에 `/admin(.*)` 추가
- [ ] layout + dashboard / users / settings 클라이언트 UI
- [ ] 비관리자 403 서버 가드

### Task 5: Env + deploy

- [ ] `.env.example` 갱신, Vercel에 `ADMIN_EMAILS` + `SETTINGS_ENCRYPTION_KEY` 추가
- [ ] `db:push`, 배포, `/admin` 스모크
