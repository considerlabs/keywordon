# Permissions

## Identity sources

| Claim | Source | Notes |
|-------|--------|-------|
| Session / `userId` | Clerk | |
| Email | Clerk primary email | synced into `users.email` |
| Plan | Neon `users.plan` | **not** Clerk public_metadata for enforcement |
| Role `admin` | Clerk primary email ∈ allowlist | `considerlabs@gmail.com` always; plus `ADMIN_EMAILS` |

## Roles (effective)

| Effective role | How obtained |
|----------------|--------------|
| Guest | No Clerk session |
| Free member | Signed up → `ensureUser` defaults `free` |
| Paid | Stripe webhook / manual SQL |
| Super admin | Clerk email `considerlabs@gmail.com` → `superAdminPlan()` | all features, no quotas |
| “Admin” tester | Manual `plan=enterprise` (see 인수인계) |

## Matrix (resource × operation)

| Resource / feature | guest | free | basic | super | enterprise |
|--------------------|-------|------|-------|-------|------------|
| Naver analyze | limited RPM | higher | higher | higher | highest |
| Google analyze | ✗ | ✗ | limited | higher | highest |
| Opportunity / CPC / issue / content volume | ✗ | ✗ | ✓ | ✓ | ✓ |
| Bulk / CSV | ✗ | small bulk, no CSV | ✓ | ✓ | ✓ |
| Keyword discover | ✗ (401) | ✓ (opportunity locked) | ✓ | ✓ | ✓ |
| Blog analysis | ✗ | ✓ | ✓ | ✓ | ✓ |
| Site diagnosis | ✗ | ✗ | ✓ | ✓ | ✓ |
| Copilot AI | ✗ | ✓ (20/mo) | ✓ | ✓ | ✓ |
| `/site` page | middleware blocks | if logged in | ✓ feature | ✓ | ✓ |

Exact numbers: `src/lib/plans.ts`. Enforcement: `src/lib/quota.ts` + each route. Super admin skips gates via `plan.unrestricted`.

## Data access

- No Postgres RLS.
- All DB access via server code with `DATABASE_URL`.
- Users identified by `clerk_id`; no cross-user APIs implemented yet for honey_box/history.
