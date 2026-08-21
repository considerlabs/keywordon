# KeywordOn 크리에이터 · AI 자동화 · 숏폼 설계 스펙

> 작성일: 2026-08-21  
> 상태: 초안 (사용자 리뷰 대기)  
> 벤치마크: [pandarank.net](https://pandarank.net) + `img/1.png`~`img/33.png`  
> 선행 문서: `docs/00-통합개발계획서.md` (실사·하드닝·데이터 해자 참고; 본 스펙이 IA·범위의 기준)

---

## 1. 목적과 성공 기준

KeywordOn에 판다랭크형 **크리에이터 / AI 자동화 / 숏폼** 메뉴·기능을 외과적으로 추가한다. 기존 Clerk·Stripe 플랜·Gemini Copilot·Neon 스택은 유지한다.

**성공 기준**

1. 상단 네비에서 세 축(크리에이터·AI 자동화·숏폼)과 더보기(기존 고급 도구)로 **누락 없이** 모든 합의 기능에 도달 가능
2. 핵심 3여정(글쓰기 · 칸반 자동화 · 숏폼 대본)이 로그인·플랜 게이팅·스트리밍까지 **실제로 동작**
3. 빈 상태·로딩·오류·쿼터 초과 UX가 전 메뉴에서 동일한 패턴으로, 모바일에서도 다음 행동이 명확
4. 크레딧 UI·캘린더 탭·네이버 OAuth 자동발행·숏폼 서버 영상 렌더는 **의도적으로 없음**

---

## 2. 확정된 결정

| 항목 | 결정 |
|---|---|
| 범위 | 판다랭크 근접 풀셋(옵션 C)에서 **크레딧·캘린더만 제외** |
| 발행 | **반자동(B)**: 복사 · 마크다운 · 네이버 글쓰기 딥링크 · 확장 프로그램 안내. OAuth 자동발행 없음 |
| 숏폼 산출물 | 대본(훅·씬·나레이션) + CapCut/Canva용 텍스트 내보내기. 서버 영상 렌더 없음 |
| 네비 | **하이브리드(C)**: 상단은 판다랭크형, `/bulk` `/discover` `/shop` 등은 더보기 |
| 구현 방식 | **외과적 확장(1번)**: 기존 라우트 유지·흡수, 신규만 추가. `/creator/*`로 일괄 이사는 하지 않음 |
| 쿼터 | 신규 크레딧 시스템 없음. 기존 `aiMonthly` + `plans.ts` limit 확장 + `/account/usage` |
| 캘린더 | **제외**. 판다랭크에서는 `/ai-flow` 서브탭 `홈 \| 캘린더`였음. KeywordOn AI 자동화는 **홈(칸반)만** |

---

## 3. 정보구조 (IA)

### 3.1 상단 네비

```
KeywordOn
├── 크리에이터 ▾
│   ├── 키워드 분석          → /analyze
│   ├── 글쓰기 AI            → /write
│   ├── 블로그 분석          → /blog
│   ├── 블로그 순위          → /ranking
│   ├── 게시글 진단          → /audit
│   └── 페르소나             → /persona
├── AI 자동화                → /automation   (서브탭: 홈만, 캘린더 없음)
├── 숏폼 [New]               → /shortform
└── 더보기 ▾
    ├── 대량 조회            → /bulk
    ├── 키워드 발굴          → /discover
    ├── 급상승 트렌드        → /trends
    ├── 수익 계산기          → /calculator
    ├── 사이트 진단          → /site
    ├── 사용량               → /account/usage
    └── 플랜                 → /shop
```

### 3.2 기능 완전성 맵 (누락 방지 체크리스트)

#### 크리에이터

| 판다랭크 대응 | KeywordOn | 비고 |
|---|---|---|
| 키워드 분석 | `/analyze` | 기존 유지 |
| 급상승/황금 키워드 | `/trends`, `/trends/[keyword]` | 신규; AI 자동화 CTA |
| 블로그 글쓰기 2.1 | `/write` | 글타입·고급설정·트렌드 주제·말투·페르소나 |
| AI 이미지 | `/write/image` | Gemini 이미지 |
| 쇼핑 커넥트 / 쿠팡 / 상품홍보 | `/write/commerce` | 링크→홍보글; 수익 추정은 계산기 연동 |
| 제목 / 스크립트 / SNS | `/write/tools` | 마이크로 툴 허브 |
| 블로그 분석·진단 리포트 | `/blog` 강화 | 점수·레이더·리포트 |
| 블로그 순위 | `/ranking` | TOP/카테고리; 초기 시뮬→실데이터 병행 |
| 게시글 SEO 진단 | `/audit` | SSRF 가드 |
| 내 스타일(페르소나) | `/persona` | 학습→글쓰기/자동화 주입 |
| (구) Copilot | `/copilot` → `/write` 리다이렉트 | |

#### AI 자동화 (`/automation`)

| 포함 | 제외 |
|---|---|
| 채널 요약 카드, 진단/숏폼 CTA, 확장 설치 안내 | 캘린더 탭 |
| 오늘의 글감 / 오늘의 키워드 / 직접 추가 | 크레딧·충전 UI |
| 칸반 3열: 글감 → AI 초안 → 발행 | 알림톡(후순위; 1차에 토글 UI만 placeholder 가능, 발송 미구현) |
| 발행: 복사 · MD · 네이버 딥링크 · 확장 안내 | OAuth 자동발행 |

#### 숏폼 (`/shortform`)

| 포함 | 제외 |
|---|---|
| 홈(링크 진입) · 내 프로젝트 | 크레딧 UI |
| 인기 숏폼 TOP (초기 큐레이션/목업→점진 실데이터) | 서버 영상 렌더 |
| 내 글 불러오기 모달 · URL 입력 | |
| 대본 생성·편집 · CapCut/Canva 내보내기 | |

#### 명시적 비범위 (전 Phase)

- 크레딧 충전/잔액 UI  
- AI 자동화 캘린더 탭  
- 네이버 OAuth 완전 자동 발행  
- 숏폼 영상 서버 렌더  
- 품앗이 · 체험단 · 셀러 마켓플레이스 (판다랭크 전용)

---

## 4. 사용자 여정

### 4.1 글쓰기

트렌드/키워드 → `/write` (타입·제목·키워드·고급설정) → 스트리밍 초안 → 복사/MD/네이버 딥링크 → (선택) `/audit`

### 4.2 AI 자동화

`/automation` → 글감 선택 → 초안 생성(페르소나 주입) → 발행 열(반자동 액션) → (선택) 숏폼/진단

### 4.3 숏폼

`/shortform` → URL 또는 내 글 불러오기 → 대본(훅·씬·나레이션) → 내보내기

---

## 5. 라우트

| 경로 | 역할 | 구분 |
|---|---|---|
| `/`, `/analyze`, `/bulk`, `/discover`, `/blog`, `/site`, `/shop`, `/sign-in`, `/sign-up` | 기존 | 유지 |
| `/copilot` | `/write`로 리다이렉트 | 변경 |
| `/write` | 블로그 글쓰기 2.1 | 신규 |
| `/write/image` | AI 이미지 | 신규 |
| `/write/commerce` | 커머스/홍보 글 | 신규 |
| `/write/tools` | 제목·스크립트·SNS | 신규 |
| `/automation` | AI 자동화 칸반(홈만) | 신규 |
| `/shortform` | 숏폼 허브 | 신규 |
| `/shortform/[id]` | 프로젝트 상세 | 신규 |
| `/trends`, `/trends/[keyword]` | 급상승·상세 4탭 | 신규 |
| `/audit` | 게시글 진단 | 신규 |
| `/persona` | 문체 학습·리포트 | 신규 |
| `/ranking` | 블로그 순위 | 신규 |
| `/calculator` | 애드포스트 수익 추정 | 신규 |
| `/account/usage` | 사용량·절약 리포트 | 신규 |

기존 URL은 북마크 호환을 위해 유지하고, 메뉴만 하이브리드 IA로 재배치한다.

---

## 6. API 설계

기존 `getAuthContext` · `assertFeature` · `tryConsumeAiUsage` 패턴을 재사용한다. 신규 크레딧 API는 만들지 않는다.

### 6.1 확장

| 메서드 | 경로 | 변경 |
|---|---|---|
| POST | `/api/copilot` | body에 `postType`, `title`, `keywords[]`, `charCount`, `tone`, `emphasis`, `usePersona`, `flags` 추가. 페르소나 블록 주입. 입력 길이 트림 |

### 6.2 신규

| 메서드 | 경로 | 역할 |
|---|---|---|
| GET/POST | `/api/automation/ideas` | 오늘의 글감·키워드·직접 추가 |
| GET/POST/PATCH | `/api/automation/drafts` | 초안 생성·상태·발행 메타 |
| GET/POST | `/api/shortform` | 프로젝트 목록·생성 |
| GET/PATCH | `/api/shortform/[id]` | 상세·대본 수정 |
| POST | `/api/shortform/[id]/generate` | URL/텍스트→대본 스트리밍 |
| POST | `/api/audit/post` | 게시글 SEO 진단 |
| POST | `/api/persona/analyze` | 학습 잡 시작 |
| GET | `/api/persona/status` | 폴링 |
| GET/PATCH | `/api/persona` | 조회·사용자 수정 |
| GET | `/api/trends` | 급상승 TOP |
| GET | `/api/trends/[keyword]` | 상세 |
| POST | `/api/cron/snapshot` | 시간별 스냅샷 (`CRON_SECRET`) |
| POST | `/api/write/image` | 이미지 생성 |
| POST | `/api/write/commerce` | 상품 링크→홍보글 |
| GET | `/api/account/usage` | 사용량·절약 리포트 |

### 6.3 SSRF 가드 (`/api/audit`, 숏폼 URL fetch)

- 허용 호스트: `blog.naver.com`, `m.blog.naver.com`, `tistory.com` (및 서브도메인)
- `https`만, `redirect: "manual"`, Location 재검증 1회
- 사설 IP 대역 해석 시 거부

### 6.4 소유권 (IDOR)

사용자 소유 테이블 조회·갱신은 반드시 `WHERE user_id = :authUserId` 스코프.

---

## 7. 데이터 모델 (Drizzle / Neon)

기존 `users`, `usage_events` 등을 유지하고 아래를 추가한다. FK는 `users.id`에 `onDelete: "cascade"`.

- `blog_personas` — status, blogUrl, tone/structure/audience/avoid(jsonb), editedByUser, timestamps  
- `automation_ideas` — userId, source, title, keyword, monthlyVolume, meta, createdAt  
- `automation_drafts` — userId, ideaId?, content, status(`draft`\|`ready`\|`exported`), exportedAt, meta  
- `shortform_projects` — userId, sourceUrl, title, script(jsonb), status, timestamps  
- `post_audits` — userId, postUrl, targetKeyword?, report(jsonb), createdAt  
- `keyword_snapshots` — keyword, engine, rank, monthlyVolume, changeRate, bucketHour, capturedAt  

`usage_events.action`에 `copilot`, `write_image`, `automation_draft`, `shortform_generate`, `post_audit`, `persona_analyze` 등을 기록한다.

### 7.1 플랜 limit 확장 (`plans.ts`)

신규(초안 수치, 착수 전 원가에 맞춰 조정 가능):

| limit | guest | free | basic | super | enterprise |
|---|---|---|---|---|---|
| `postAuditMonthly` | 0 | 1 | 5 | 15 | 40 |
| `personaMonthly` | 0 | 1 | 4 | 8 | 20 |
| `shortformMonthly` | 0 | 0 | 5 | 15 | 40 |
| `automationIdeasDaily` | 0 | 3 | 7 | 15 | 30 |
| `trendAccess` | false | true | true | true | true |

기존 `aiMonthly` / `copilot` / `blogAnalysis`는 유지하며 글쓰기·자동화 초안 생성에 공통 차감한다.

---

## 8. UI/UX

### 8.1 원칙

- 첫 뷰포트: 브랜드·한 줄 목적·**다음 행동 CTA 1개** 중심 (랜딩형 화면)
- 도구 화면: 판다랭크 수준의 정보 밀도 유지, 시각 언어는 KeywordOn CSS 변수(`--brand` 등)
- 카드는 상호작용 단위에만 사용
- 색만으로 상태를 구분하지 않음(점수·라벨 병기)
- 모션은 진입·스트리밍·칸반 이동 등 2~3개 의도적 모션만

### 8.2 공통 컴포넌트

`SiteHeader`(하이브리드) · `CreatorSubnav` · `QuotaBanner` · `EmptyState` · `StreamingOutput` · `PlanGate` · `ImportPostsModal`

### 8.3 화면 상태

| 화면 | 주요 상태 |
|---|---|
| `/write` | idle → streaming → done / error / quota |
| `/automation` | ideas·drafts 로드, generating, column move |
| `/shortform` | import → generate → edit → export |
| `/persona` | pending → 5단계 → done / failed (2초 폴링) |
| `/audit` | analyzing → report |
| `/trends` | 스냅샷 없음 빈 상태 → 테이블+스파크라인 |

### 8.4 반응형

- 칸반: `md+` 3열, 미만 세로 스텝 1→2→3  
- 글쓰기: 데스크탑 입력|미리보기 2열, 모바일 단일 컬럼  
- 드롭다운·모달: 키보드·포커스 트랩

### 8.5 에러 매트릭스

| 상황 | 처리 |
|---|---|
| 비로그인 | Clerk 모달, 의도 URL 유지 |
| 플랜 미허용 | PlanGate + `/shop` |
| AI 쿼터 초과 | 429 → QuotaBanner + `/account/usage`·`/shop` |
| SSRF/비허용 URL | 400 + 허용 호스트 안내 |
| Gemini 실패/빈 응답 | 재시도, 부분 출력 보존 |
| 페르소나 실패 | failed + 재분석, 이전 리포트 유지 |
| 트렌드 스냅샷 없음 | “수집 시작, N일 후 추이” |
| 확장 미설치 | 안내만, 플로우 차단 안 함 |

---

## 9. 구현 Phase

누락 없이 전 기능을 포함하되, 배포 가능한 단위로 나눈다.

| Phase | 내용 | 완료 기준 |
|---|---|---|
| **A** 셸 | 하이브리드 헤더, CreatorSubnav, QuotaBanner, 공통 Empty/PlanGate, `/account/usage` | 합의 IA의 모든 메뉴 진입 가능 |
| **B** 글쓰기 | `/write`(+image/commerce/tools), Copilot 확장, `/copilot` 리다이렉트 | 글타입·스트리밍·쿼터·내보내기 |
| **C** 자동화 | `/automation` 칸반, ideas/drafts API, 반자동 발행 | 글감→초안→발행 열 완주 |
| **D** 숏폼 | 허브·프로젝트·Import·대본·내보내기 | URL 1건→대본→내보내기 |
| **E** 진단·페르소나·순위 | `/audit`, `/persona`, `/blog` 강화, `/ranking` | 허용 URL 진단, 페르소나 유무 초안 비교 |
| **F** 트렌드·수익·플랜 | `/trends`+cron, `/calculator`, plans·shop, 하드닝 | 스파크라인·5단 플랜 스모크 |

권장 순서: A→B→C→D(체감 핵심) 후 E·F. E와 F는 병렬 가능. **어떤 Phase도 스펙상 기능을 드롭하지 않는다.**

참고: `docs/00`의 스냅샷 크론 선행 권고는 Phase F에 포함하되, A~D와 동시 착수해도 된다(시계열은 소급 불가이므로 인프라만 먼저 올려도 됨).

---

## 10. 테스트

### 10.1 Phase별 수동 스모크

- **A**: 전 메뉴·모바일 더보기·비로그인 게이트  
- **B**: 글타입↔트렌드, 스트리밍, 429, 내보내기  
- **C**: 칸반 이동, 빈 상태 CTA, 딥링크  
- **D**: URL/내 글→대본→내보내기, 프로젝트 목록  
- **E**: 허용/차단 URL, 페르소나 반영 비교, 순위 필터  
- **F**: 스냅샷 적재 후 스파크라인, guest~enterprise 게이팅  

### 10.2 자동화 우선순위

1. SSRF 가드 단위 테스트  
2. 쿼터·플랜 assert 단위 테스트  
3. userId 스코프(IDOR) API 테스트  
4. E2E: 글쓰기 · 칸반 · 숏폼 3여정만  

---

## 11. 보안 · 하드닝 (본 스펙과 함께)

`docs/00` §2에서 확인된 Low 항목을 Phase F(또는 해당 API 신설 시점)에 반영한다.

- `/api/discover`에 `checkNaverRateLimit`  
- bulk 다중 키워드 RPM/배치  
- `ensureUser` upsert  
- Copilot 입력 길이 트림 (Phase B에 포함)  
- 확장 `host_permissions` 축소·localhost 제거 (Phase C/F)

---

## 12. 열린 항목 (착수 전 확인, 스펙 차단 아님)

1. Vercel Cron 빈도(Hobby/Pro) — 스냅샷은 GitHub Actions 폴백 가능  
2. `NAVER_SEARCHAD_*` 실키 쿼터  
3. Gemini 원가에 따른 limit 숫자 미세 조정  
4. 애드포스트 계산기 계수는 추정치 표시 후 오픈 검수 시 교체  
5. 서비스 공개 시점의 특허·약관·개인정보 검수 (`docs/00` §3.3) — 본 구축 단계 범위 밖  

---

## 13. 셀프 리뷰 기록

- [x] Placeholder/TBD 없음 (열린 항목은 §12로 명시)  
- [x] 크레딧·캘린더·자동발행·영상렌더 제외가 §2·§3·§9와 일치  
- [x] IA 체크리스트·라우트·API·스키마·Phase가 동일 범위  
- [x] 단일 구현 계획으로 소화 가능(Phase A~F). writing-plans에서 태스크로 분해  

---

## 14. 다음 단계

1. 사용자 스펙 리뷰·수정  
2. `writing-plans` 스킬로 Phase A~F 구현 계획 작성  
3. Phase A부터 구현  
