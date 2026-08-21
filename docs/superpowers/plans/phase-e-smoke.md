# Phase E smoke checklist — Audit · Persona · Ranking

기준 브랜치: `feature/phase-e-audit-persona-ranking` (머지 후 `main`)

> **Note:** Phase D(숏폼)가 `main`에 포함된 상태에서 착수했습니다.

## 사전

```bash
npm install
vercel env pull .env.local --yes --scope briank-projects
npm run db:push   # blog_personas, post_audits 반영
npm test
npm run build
npm run dev
```

## 수동 — `/audit`

- [ ] 로그인 + 무료 이상: 게시글 URL 입력 → SEO 진단 리포트(종합 점수·체크리스트)
- [ ] 허용 URL: `https://blog.naver.com/...`, `https://*.tistory.com/...`
- [ ] 차단 URL: `http://`, `https://example.com`, `https://127.0.0.1` → 400 + 안내
- [ ] 타겟 키워드 선택 입력 반영
- [ ] 월간 한도 초과 → 429 + QuotaBanner
- [ ] CreatorSubnav · 크레딧 UI 없음

## 수동 — `/persona`

- [ ] 블로그 URL 또는 글 붙여넣기 → 「학습 시작」
- [ ] 5단계 진행 UI (2초 간격 폴링): 본문 수집 → … → 리포트 생성
- [ ] 완료 후 tone/structure/audience/avoid 리포트 표시
- [ ] `/write`에서 usePersona=true 시 초안 톤 차이 (페르소나 유무 비교)
- [ ] failed 시 이전 done 리포트 유지(재분석 전)
- [ ] personaMonthly 한도 초과 → 429

## 수동 — `/ranking`

- [ ] 키워드·카테고리·플랫폼 필터 → 순위 테이블 갱신
- [ ] 시뮬 데이터 안내 문구 확인
- [ ] CreatorSubnav 표시

## API

```bash
# 로그인 쿠키 필요
curl -s -X POST http://localhost:3000/api/audit/post \
  -H 'Content-Type: application/json' \
  -d '{"postUrl":"https://blog.naver.com/example/1"}' | jq .

curl -s http://localhost:3000/api/persona/status | jq .
```

## 자동

- [ ] `ssrf.test.ts` — 허용/차단 URL
- [ ] `audit/monthly.test.ts`, `persona/monthly.test.ts`
- [ ] `audit/post/route.test.ts`, `persona/analyze/route.test.ts` — validate before quota
