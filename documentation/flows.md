# Flows

Anti-PRD: only permission, money, AI, or data-integrity paths.

## F1 — Keyword analyze (guest or signed-in)

- **Actor**: anyone  
- **Precondition**: none for page; Google engine needs plan quota  
- **Success**: analysis JSON/UI with plan-gated fields stripped/locked  

Steps:
1. UI `GET/POST` → `/api/analyze` or `/analyze` server path  
2. `getAuthContext()` → guest or DB plan  
3. Rate limit (`checkNaverRateLimit`) / Google monthly gate  
4. `resolveKeywordAnalysis` → Naver live or synthetic  
5. `applyPlanLimits` hides opportunity/CPC/etc. for lower plans  

**Deny**: 429 rate limit; Google blocked for free/guest.

## F2 — Copilot draft

- **Actor**: signed-in user with `plan.limits.copilot`  
- **Precondition**: Gemini API key on server; monthly `aiUsedMonth` under limit  
- **Success**: plain-text draft; AI usage incremented  

Steps:
1. Browser `POST /api/copilot` `{ keyword, tone, intent }`  
2. `assertFeature(copilot)` → 403 if locked  
3. Require `userId` → 401 if anonymous  
4. Quota check → 429  
5. Server fetch Gemini `gemini-3.6-flash:generateContent`  
6. `incrementAiUsage`  
7. Response `text/plain`  

**Deny**: 401/403/429/502/503.  
**Trust crossing**: server → Google Generative Language (API key query param).

## F3 — Stripe upgrade

- **Actor**: signed-in user  
- **Precondition**: Stripe price env vars set  
- **Success**: Checkout session URL; after pay, webhook sets plan  

Steps:
1. `/shop` → `POST /api/checkout` `{ planId, interval }`  
2. Auth required (JSON 401, not Clerk HTML)  
3. Stripe session with metadata `clerkId`, `planId`  
4. Stripe → `POST /api/webhooks/stripe` (signature verified)  
5. `setUserPlan(clerkId, planId)`  

**Deny**: unauthenticated checkout; invalid plan; missing price id.  
**Trust crossing**: Stripe webhook → app (must verify signature).

## F4 — Site diagnosis page

- **Actor**: signed-in  
- **Precondition**: middleware `auth.protect()` on `/site(.*)`  
- **Success**: page + API when `siteDiagnosis` feature allowed  

**Deny**: unauthenticated redirected by Clerk; feature 403 from API.
