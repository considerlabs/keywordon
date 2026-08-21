# Phase F Smoke Checklist

## Prerequisites

- [ ] `npm run db:push` applied (`keyword_snapshots` table exists)
- [ ] `CRON_SECRET` set in Vercel (Production/Preview/Development) and in local `.env.local` for manual cron tests
- [ ] Dev server: `npm run dev`

## Cron `/api/cron/snapshot`

```bash
# Should return 401
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/cron/snapshot

# Should return 200 with captured count (replace YOUR_SECRET)
curl -X POST http://localhost:3000/api/cron/snapshot \
  -H "Authorization: Bearer YOUR_SECRET"

# Alternate header auth
curl -X POST http://localhost:3000/api/cron/snapshot \
  -H "CRON_SECRET: YOUR_SECRET"
```

- [ ] Unauthorized requests rejected (401)
- [ ] Valid secret inserts rows into `keyword_snapshots`
- [ ] `vercel.json` cron path `/api/cron/snapshot` schedule `0 0 * * *` (Hobby: 일 1회; Pro면 시간별로 상향 가능)


## Trends (plan gating)

| Plan | `/trends` | Expected |
|------|-----------|----------|
| guest (signed out) | open | PlanGate — 비회원 |
| free+ (signed in) | open | list or empty state |

- [ ] Guest sees PlanGate on `/trends`
- [ ] Free user sees trend list (live) or empty state if no DB history
- [ ] Empty copy mentions collection started / N days until sparkline
- [ ] Keyword link opens `/trends/[keyword]` with sparkline section
- [ ] CTA links: analyze, write, automation

## Calculator

- [ ] `/calculator` loads without login
- [ ] Changing views / CTR / CPC updates monthly estimate
- [ ] Disclaimer shows 추정치 notice

## Hardening

- [ ] `/api/discover` returns 429 when RPM exceeded (manual or test)
- [ ] Bulk with many unique keywords respects per-keyword RPM

## Extension

- [ ] `manifest.json` host_permissions limited to keywordon.vercel.app + search.naver.com
- [ ] Popup/sidepanel/content default to `https://keywordon.vercel.app`
- [ ] README notes localhost override for local dev

## Shop

- [ ] Plan comparison table includes "급상승 트렌드" row
- [ ] Checkout / plan cards still render (no break from new limit key)

## Automated

```bash
npm test
npm run build
```

- [ ] All tests pass
- [ ] Production build succeeds
