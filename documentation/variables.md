# Variables & secrets

Pull: `vercel env pull .env.local --yes --scope briank-projects`  
Template: `.env.example`

| Name | Used by | Scope | Source | Risk | Rotation |
|------|---------|-------|--------|------|----------|
| `DATABASE_URL` | Drizzle/Neon | server | Vercel Marketplace Neon | High | Neon dashboard |
| `DATABASE_URL_UNPOOLED` | drizzle-kit | server | Neon | High | Neon |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ClerkProvider | **client** | Clerk | Med (public) | Clerk dashboard |
| `CLERK_SECRET_KEY` | auth, Backend API | server | Clerk | Critical | Clerk dashboard |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Clerk | client | config | Low | — |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Clerk | client | config | Low | — |
| `STRIPE_SECRET_KEY` | checkout | server | Stripe | Critical | Stripe |
| `STRIPE_WEBHOOK_SECRET` | webhook verify | server | Stripe | Critical | Stripe |
| `STRIPE_PRICE_*` | checkout | server | Stripe prices | Med | recreate prices |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | (marketplace) | client | Stripe | Med | Stripe |
| `NEXT_PUBLIC_APP_URL` | checkout URLs | both | manual | Low | — |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Copilot | server | Google AI Studio (`AIza…`) | Critical | AI Studio |
| `NAVER_SEARCHAD_CUSTOMER_ID` | keyword live | server | Naver | High | Naver |
| `NAVER_SEARCHAD_API_KEY` | keyword live | server | Naver | High | Naver |
| `NAVER_SEARCHAD_SECRET_KEY` | keyword live | server | Naver | Critical | Naver |
| `GOOGLE_ADS_*` | optional Google | server | Google Ads | High | Google |

Also present from Marketplace (Neon helpers): `POSTGRES_*`, `PG*`, `NEON_*` — prefer `DATABASE_URL` in app code.

## Confirmations

- No Gemini/Stripe/Clerk **secret** keys are intended for client bundles.
- Copilot key must be `AIza…` style Google AI Studio key (not invalid `AQ.…` placeholders).

## Pre-go-live checklist

- [ ] Clerk **production** instance keys on Vercel Production  
- [ ] Gemini key present on Production/Preview/Development  
- [ ] Stripe live keys + webhook endpoint on production URL (if leaving sandbox)  
- [ ] `NEXT_PUBLIC_APP_URL=https://keywordon.vercel.app`  
- [ ] Rotate any keys that may have leaked in chat/CI logs  
- [ ] Extension base URL → production  
