# Phase D smoke checklist — Shortform

기준 브랜치: `feature/phase-d-shortform` (머지 후 `main`)

## 사전

```bash
npm install
vercel env pull .env.local --yes --scope briank-projects
npm run db:push   # shortform_projects 반영
npm test
npm run build
npm run dev
```

## 수동

- [ ] `/shortform` 로그인 + 베이직 이상: 허브·프로젝트 목록·인기 TOP 목업 표시
- [ ] 무료 플랜: PlanGate (shortformMonthly=0)
- [ ] URL 입력(네이버/티스토리 https) → 프로젝트 생성 → `/shortform/[id]` 이동
- [ ] 허용되지 않은 URL → 400 + 안내 메시지
- [ ] 「내 글 불러오기」→ AI 자동화 초안 목록 → 본문 시드
- [ ] 「대본 생성」→ 훅·씬·나레이션·CTA 채워짐
- [ ] 편집 후 「저장」→ PATCH 반영
- [ ] CapCut/Canva/전체 복사·CapCut 다운로드
- [ ] 월간 한도 초과 시 429 + QuotaBanner
- [ ] 헤더에 「크레딧」 문구 없음
- [ ] `/account/usage`에서 AI·shortform_generate 이벤트 확인 (DB 연결 시)

## API

```bash
# 로그인 쿠키 필요
curl -s http://localhost:3000/api/shortform | jq .
```
