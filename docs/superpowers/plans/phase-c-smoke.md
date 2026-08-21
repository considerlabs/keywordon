# Phase C smoke checklist — AI Automation Kanban

기준 브랜치: `feature/phase-c-automation` (머지 후 `main`)

## 사전

```bash
npm install
vercel env pull .env.local --yes --scope briank-projects
npm run db:push   # automation_ideas / automation_drafts 반영
npm test
npm run build
npm run dev
```

## 수동

- [ ] `/automation` 로그인 시 3열(모바일은 세로) 칸반 표시
- [ ] 추천 글감 「추가」 또는 직접 추가로 글감 생성
- [ ] 일일 한도 초과 시 429 메시지 (free=3)
- [ ] 글감 「초안 생성」 → AI 초안 열에 ready 초안
- [ ] 발행 열: 복사 / MD / 네이버 붙여넣기 동작
- [ ] 「발행 완료로 표시」 → status exported
- [ ] 헤더·보드에 「크레딧」「캘린더」 문구 없음
- [ ] 알림톡 체크박스는 disabled placeholder
- [ ] 진단·숏폼 CTA 링크 동작 (스텁 OK)
- [ ] `/account/usage`에서 AI 사용량 증가 확인

## API

```bash
# 로그인 쿠키 필요 — 브라우저 DevTools에서 확인 권장
curl -s http://localhost:3000/api/automation/ideas | jq .
```
