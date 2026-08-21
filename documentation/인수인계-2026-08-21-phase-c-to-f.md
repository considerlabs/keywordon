# KeywordOn 인수인계 — 2026-08-21 Phase C~F (스펙 전 Phase 완주)

> **대상:** 다음 세션 에이전트 / 휴먼  
> **기준:** `main` @ `263145f` · PR #2~#5 MERGED  
> **선행:** Phase A·B — [`인수인계-2026-08-21-phase-a.md`](./인수인계-2026-08-21-phase-a.md), [`인수인계-2026-08-21-phase-b.md`](./인수인계-2026-08-21-phase-b.md)

마스터: [`인수인계.md`](./인수인계.md)

---

## 1. 한 줄 요약

크리에이터·자동화·숏폼 설계 스펙의 **Phase A~F 전부** `main`에 머지됐다. 크레딧 UI·캘린더·OAuth 자동발행·서버 영상 렌더는 계속 비범위.

| Phase | PR | tip 머지 | 완료 기준 |
|-------|-----|----------|-----------|
| C 자동화 | [#2](https://github.com/considerlabs/keywordon/pull/2) | `5d5233b` | 글감→초안→발행 |
| D 숏폼 | [#3](https://github.com/considerlabs/keywordon/pull/3) | `1fc0c37` | URL→대본→내보내기 |
| E 진단·페르소나·순위 | [#4](https://github.com/considerlabs/keywordon/pull/4) | `dffdaa9` | 허용 URL 진단, persona→write |
| F 트렌드·계산·하드닝 | [#5](https://github.com/considerlabs/keywordon/pull/5) | `263145f` | 스냅샷·계산기·RPM |

테스트: `npm test` → **78** passed.

---

## 2. 배포 전 필수

```bash
vercel env pull .env.local --yes --scope briank-projects
npm run db:push   # automation_*, shortform_projects, blog_personas, post_audits, keyword_snapshots
# Vercel env: CRON_SECRET 설정 (스냅샷 크론)
```

`vercel.json`에 `/api/cron/snapshot` 시간별 cron 등록됨.

---

## 3. Phase별 핵심 경로

### C — `/automation`
- API: `/api/automation/ideas`, `/api/automation/drafts`
- 한도: `automationIdeasDaily` + `aiMonthly`
- UI: `src/components/automation/*`

### D — `/shortform`, `/shortform/[id]`
- API: `/api/shortform`, `/api/shortform/[id]`, `.../generate`
- SSRF: `src/lib/ssrf.ts` (네이버 블로그·티스토리)
- 한도: `shortformMonthly` + `aiMonthly`
- Export: CapCut MD / Canva TSV / 복사 (영상 렌더 없음)

### E — `/audit`, `/persona`, `/ranking`
- API: `/api/audit/post`, `/api/persona`, `/analyze`, `/status`
- `getActivePersona` → DB 페르소나 블록 (done일 때)
- 한도: `postAuditMonthly`, `personaMonthly` + `aiMonthly` / `blogAnalysis`

### F — `/trends`, `/trends/[keyword]`, `/calculator`
- API: `/api/trends`, `/api/trends/[keyword]`, `/api/cron/snapshot`
- 한도: `trendAccess`
- 하드닝: discover RPM, bulk 키워드당 RPM, 확장 프로덕션 URL + 축소된 host_permissions

---

## 4. 플랜 limit 신규 키 (`plans.ts`)

| limit | guest | free | basic | super | enterprise |
|-------|-------|------|-------|-------|------------|
| automationIdeasDaily | 0 | 3 | 7 | 15 | 30 |
| shortformMonthly | 0 | 0 | 5 | 15 | 40 |
| postAuditMonthly | 0 | 1 | 5 | 15 | 40 |
| personaMonthly | 0 | 1 | 4 | 8 | 20 |
| trendAccess | false | true | true | true | true |

AI 생성은 공통 `aiMonthly` + `tryConsumeAiUsage` (검증 후 차감).

---

## 5. 스모크 문서

- `docs/superpowers/plans/phase-c-smoke.md`
- `docs/superpowers/plans/phase-d-smoke.md`
- `docs/superpowers/plans/phase-e-smoke.md`
- `docs/superpowers/plans/phase-f-smoke.md`

---

## 6. 남은 일 (스펙 외·운영)

- Neon `db:push` + 프로덕션 배포 확인
- `CRON_SECRET` 실키 + 크론 1회 수동 호출로 스냅샷 적재
- Clerk production 전환, Turnstile/E2E
- 트렌드 실데이터 소스 (현재 `getRealtimeTrends` 시뮬 + 스냅샷 파이프라인)
- 알림톡 실발송, 페르소나 비동기 잡 큐 고도화
- 전체 `npm run lint` (기존 shop hooks 이슈 가능)

스펙 Phase 드롭 없이 A~F 구현 완료. 다음 작업은 운영 하드닝·실데이터·인수인계 운영 검증이다.
