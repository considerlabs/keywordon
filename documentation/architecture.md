# Architecture

## Product

KeywordOn is a keyword-intelligence MVP: search volume/competition heuristics, opportunity score, bulk tools, blog/site helpers, and Gemini-backed draft writing, gated by membership plans.

## Stack

| Layer | Choice |
|-------|--------|
| App | Next.js 16 App Router, React 19, Tailwind 4 |
| Host | Vercel project `briank-projects/keywordon` |
| Auth | Clerk (development instance at handoff) |
| DB | Neon Postgres + Drizzle |
| Pay | Stripe Checkout + webhook |
| AI | Google Generative Language REST (`gemini-3.6-flash`) |
| Data | Simulated engine by default; optional Naver SearchAd |

## Trust boundaries

1. **Browser → Next.js** — public pages; `/site` protected by Clerk middleware (`src/proxy.ts`). Most APIs return JSON 401/403 instead of HTML redirects.
2. **Next.js → Clerk** — session via middleware/`auth()`; plan **not** in Clerk claims — stored in Neon `users.plan`.
3. **Next.js → Neon** — server-only `DATABASE_URL`; no RLS; app code enforces plan limits.
4. **Next.js → Stripe** — secret key + webhook signature; plan upgrades only via webhook/metadata.
5. **Next.js → Gemini** — server-only `GOOGLE_GENERATIVE_AI_API_KEY`; model URL hardcoded in `src/app/api/copilot/route.ts`.
6. **Extension → App** — currently hardcodes `http://localhost:3000` (not production).

## Key assumptions

- Without Naver credentials, volumes/scores are **synthetic** (`src/lib/keyword-engine.ts`).
- Free plan includes Copilot with monthly AI quota (see `plans.ts`).
- No dedicated `admin` role; elevate by setting `users.plan = 'enterprise'`.
- Copilot intentionally bypasses Vercel AI Gateway / AI SDK Google provider after `gemini-2.0-flash` deprecation incidents.

## Known risks

| Risk | Where |
|------|--------|
| Clerk still on **development** keys in production deploy | Vercel env `NEXT_PUBLIC_CLERK_*`, `CLERK_SECRET_KEY` |
| Secrets may have appeared in chat/logs — rotate if unsure | Gemini, Clerk, Stripe |
| Extension points at localhost | `extension/*.js` |
| Unused tables / incomplete features | `honey_box`, `search_history`, `sites` |
| No automated tests | — |

## Related Documents

- [인수인계.md](./인수인계.md) — primary Korean handoff
- [flows.md](./flows.md)
- [permissions.md](./permissions.md)
- [variables.md](./variables.md)
- [automation.md](./automation.md)
- [tests.md](./tests.md)

No scheduled work — no `cron.md`.  
No transactional email from the app — no `emails.md` (Clerk owns auth emails).  
SEO not productized beyond default Next metadata — no `seo.md`.
