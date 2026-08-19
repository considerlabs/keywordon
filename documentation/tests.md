# Tests

## Existing coverage

None. No `*.test.*` / Playwright / CI test workflow in the repo at handoff.

## Proposed tests

| Use case | Rule | Expected | Type | Status |
|----------|------|----------|------|--------|
| Analyze guest | opportunity locked | `opportunityScore` null / locked flag | unit (`applyPlanLimits`) | proposed |
| Copilot anonymous | requires login | 401 | integration | proposed |
| Copilot free quota | `aiUsedMonth` ≥ limit | 429 | integration | proposed |
| Copilot model | never call 2.0-flash | request URL contains `gemini-3.6-flash` | unit/guarded live | proposed |
| Checkout auth | no session | JSON 401 (not HTML) | integration | proposed |
| Stripe webhook | bad signature | 400; plan unchanged | integration | proposed |
| Middleware | `/site` logged out | redirect/sign-in | e2e | proposed |

## Gaps (unverified today)

- Plan matrix correctness end-to-end  
- Webhook idempotency / subscription updates  
- Naver credential path vs synthetic fallback  
- Extension ↔ API auth cookies / CORS  
- Clerk production vs development behavior  

Manual smoke list: [인수인계.md §12](./인수인계.md).
