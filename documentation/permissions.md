# Permissions

## Identity sources

| Claim | Source | Notes |
|-------|--------|-------|
| Session / `userId` | Clerk | |
| Email | Clerk primary email | synced into `users.email` |
| Plan | Neon `users.plan` | **not** Clerk public_metadata for enforcement |
| Role `admin` | Clerk metadata only (optional label) | **not** checked in app code |

## Roles (effective)

| Effective role | How obtained |
|----------------|--------------|
| Guest | No Clerk session |
| Free member | Signed up → `ensureUser` defaults `free` |
| Paid | Stripe webhook / manual SQL |
| “Admin” tester | Manual `plan=enterprise` (see 인수인계) |

## Matrix (resource × operation)

| Resource / feature | guest | free | basic | super | enterprise |
|--------------------|-------|------|-------|-------|------------|
| Naver analyze | limited RPM | higher | higher | higher | highest |
| Google analyze | ✗ | ✗ | limited | higher | highest |
| Opportunity / CPC / issue / content volume | ✗ | ✗ | ✓ | ✓ | ✓ |
| Bulk / CSV | ✗ | small bulk, no CSV | ✓ | ✓ | ✓ |
| Blog analysis | ✗ | ✓ | ✓ | ✓ | ✓ |
| Site diagnosis | ✗ | ✗ | ✓ | ✓ | ✓ |
| Copilot AI | ✗ | ✓ (20/mo) | ✓ | ✓ | ✓ |
| `/site` page | middleware blocks | if logged in | ✓ feature | ✓ | ✓ |

Exact numbers: `src/lib/plans.ts`. Enforcement: `src/lib/quota.ts` + each route.

## Data access

- No Postgres RLS.
- All DB access via server code with `DATABASE_URL`.
- Users identified by `clerk_id`; no cross-user APIs implemented yet for honey_box/history.
