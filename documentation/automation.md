# Automation (Copilot / Gemini)

## Agent: Copilot draft writer

| Field | Value |
|-------|--------|
| Trigger | User clicks “초안 생성하기” on `/copilot` |
| Owner | App server (`POST /api/copilot`) |
| Auto-run? | No — only on authenticated user request |
| Inputs | `keyword`, `tone`, `intent` + analysis snippet (volume, category, related) |
| Tools / APIs | Single outbound call: Gemini `generateContent` for `gemini-3.6-flash` |
| Steering | System + user prompt strings in `route.ts` |
| Hard guardrails | Plan feature flag; monthly AI quota; requires login; API key server-only; model URL hardcoded (no 2.0-flash) |
| Output contract | Plain text body; empty → 502; Gemini error → 502 with message |
| App side effects | `incrementAiUsage(clerkId)` after success |
| Kill switch | Remove/rotate `GOOGLE_GENERATIVE_AI_API_KEY` or set plan `copilot: false` / lower quota |
| Observability | `GET /api/copilot` live ping; Vercel function logs |

No other embedded agents, tool-calling loops, or cron automations in the MVP.
