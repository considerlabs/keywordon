# Phase F: Trends, Calculator, Hardening

> Spec: `docs/superpowers/specs/2026-08-21-creator-automation-shortform-design.md` §9 Phase F, §11, §7  
> Branch: `feature/phase-f-trends-calculator-hardening`

## Goal

Ship keyword snapshot pipeline, trends UI with sparklines, AdPost calculator, plan `trendAccess` gating, API hardening, and extension permission shrink.

## Tasks

### 1. Schema + plans
- [x] `keyword_snapshots` table in `src/lib/db/schema.ts`
- [x] `trendAccess` limit: guest `false`, free+ `true` in `src/lib/plans.ts`

### 2. Cron pipeline
- [x] `POST /api/cron/snapshot` with `Authorization: Bearer ${CRON_SECRET}` or `CRON_SECRET` header
- [x] Inserts `getRealtimeTrends()` rows hourly via `vercel.json`
- [x] Document `CRON_SECRET` in smoke doc

### 3. Trends API + UI
- [x] Enhance `GET /api/trends` — merge live trends + DB snapshots
- [x] `GET /api/trends/[keyword]` — rank history + sparkline data
- [x] `/trends` list with empty state ("수집 시작, N일 후 추이")
- [x] `/trends/[keyword]` detail with SVG sparkline
- [x] `PlanGate` via `assertFeature(..., "trendAccess")`

### 4. Calculator
- [x] `/calculator` client form: views, CTR, CPC → monthly estimate
- [x] Pure helper `estimateAdpostRevenue` in `src/lib/calculator/adpost.ts`
- [x] No credits / no login gate (growth page)

### 5. Hardening
- [x] `/api/discover`: `checkNaverRateLimit`
- [x] `/api/bulk`: `checkNaverRateLimit` once per unique keyword
- [x] Extension: shrink `host_permissions`; default base `https://keywordon.vercel.app`

### 6. Shop
- [x] Comparison table row for 급상승 트렌드 (`trendAccess`)

### 7. Tests
- [x] Cron auth reject + success
- [x] Discover rate limit
- [x] Bulk per-keyword RPM
- [x] Sparkline helpers
- [x] Calculator compute helper

### 8. Verify
- [ ] `npm test`
- [ ] `npm run build`

## Notes

- Snapshot data uses today's simulated `getRealtimeTrends()` — intentional pipeline bootstrap; real feed can replace later without schema change.
- Run `npm run db:push` after pulling to create `keyword_snapshots` in Neon.
- Set `CRON_SECRET` in Vercel env for production cron auth.
