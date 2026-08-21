# KeywordOn 관리자 콘솔 설계

**날짜:** 2026-08-21  
**상태:** 승인됨 (채팅 섹션 1–3)  
**경로:** `https://keywordon.vercel.app/admin`  
**방식:** Neon `app_settings` + AES-GCM 암호화 · DB 값이 `process.env`보다 우선

## 1. 목표

허용 목록에 있는 운영자가 한곳에서 다음을 할 수 있게 한다.

1. 회원·사용량 모니터링 (대시보드 + 회원 목록)
2. 회원 플랜 변경 및 월간 AI/구글 사용량 리셋
3. 서버 시크릿·설정을 UI에서 관리 (Vercel Dashboard만이 아닌)

1차 비범위:

- Stripe 라이브 전환 마법사, Clerk production 전환, 임의 SQL 콘솔
- 저장 후 시크릿 **전체 평문 재조회** (마스킹 + 덮어쓰기만)
- 공개 헤더에 Admin 링크 (URL 직접 접근만)

## 2. 권한

- Clerk 로그인 필수
- 이메일이 `ADMIN_EMAILS`(쉼표 구분)에 포함되어야 함. 기본: `considerlabs@gmail.com`
- 헬퍼: `requireAdmin()` — 모든 `/api/admin/*` 및 관리자 레이아웃/페이지에서 사용
- `src/proxy.ts`: `/admin(.*)`에 `auth.protect()` (로그인 유도). 관리 API는 JSON 401/403을 위해 `requireAdmin()`도 검사
- 로그인했지만 비관리자: 403 페이지 / `{ error }` JSON

## 3. 라우트

| 경로 | 역할 |
|------|------|
| `/admin` | 대시보드: 회원 수, 플랜 분포, 설정 충족률, 네이버/Gemini 설정 여부 |
| `/admin/users` | 회원 목록, 플랜 변경, 사용량 리셋 |
| `/admin/settings` | 화이트리스트 설정 CRUD (마스킹 미리보기 + 저장/삭제) |

관리자 셸: 전용 레이아웃 + 서브내비(대시보드 / 회원 / 설정). 마케팅 메가메뉴는 쓰지 않고, 최소 브랜드 + UserButton 정도만.

## 4. 데이터 모델

### `app_settings`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | serial PK | |
| `key` | text unique | 설정 키 이름 |
| `value_encrypted` | text | AES-256-GCM 페이로드 (iv + ciphertext + tag, 인코딩) |
| `updated_at` | timestamp | |
| `updated_by` | text | Clerk user id 또는 email |

마이그레이션: `npm run db:push`

### 암호화

- 마스터키: `SETTINGS_ENCRYPTION_KEY` — Vercel / `.env.local`에만 존재 (관리자 UI에서 수정 불가)
- 알고리즘: Node `crypto` AES-256-GCM
- 마스터키 없음: GET은 env 기준 `configured` 상태만 표시, PUT은 503

### 설정 화이트리스트 (이 키만 관리)

관리자 UI에서 쓰기 가능:

- `NAVER_SEARCHAD_CUSTOMER_ID`
- `NAVER_SEARCHAD_API_KEY`
- `NAVER_SEARCHAD_SECRET_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_ADS_DEVELOPER_TOKEN`
- `GOOGLE_ADS_CUSTOMER_ID`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_BASIC_MONTHLY` / `_YEARLY`
- `STRIPE_PRICE_SUPER_MONTHLY` / `_YEARLY`
- `STRIPE_PRICE_ENTERPRISE_MONTHLY` / `_YEARLY`
- `CRON_SECRET`
- `NEXT_PUBLIC_APP_URL`

DB 관리 제외 (부팅·인증에 필요 — Vercel env 고정):

- `DATABASE_URL` / Neon 보조 변수
- `NEXT_PUBLIC_CLERK_*`, `CLERK_SECRET_KEY`
- `SETTINGS_ENCRYPTION_KEY`, `ADMIN_EMAILS`

## 5. 런타임 해석

```
getSetting(key) → DB 행이 있으면 복호화 → 없으면 process.env[key]
```

- 짧은 인메모리 캐시, PUT/DELETE 시 invalidate
- 서버 시크릿 읽기를 `getSetting`으로 교체:
  - `src/lib/providers/keyword-data.ts` (네이버)
  - `src/lib/gemini.ts` 및 write/copilot/shortform/automation의 Gemini 키 검사
  - `src/lib/stripe.ts`, Stripe webhook 시크릿, checkout의 `NEXT_PUBLIC_APP_URL`
  - `src/app/api/cron/snapshot/route.ts` (`CRON_SECRET`)

`NEXT_PUBLIC_*` 클라이언트 번들은 빌드 시점 env를 그대로 씀. 관리자에 저장된 `NEXT_PUBLIC_APP_URL`은 **서버** 사용처(예: checkout success URL)에만 적용. 설정 UI에 이 제한을 안내한다.

## 6. API

모두 `requireAdmin()` 필요.

| 메서드 | 경로 | 동작 |
|--------|------|------|
| GET | `/api/admin/overview` | 집계, 플랜 히스토그램, 설정 configured 맵 |
| GET | `/api/admin/users?q=&page=` | 회원 페이지네이션 |
| PATCH | `/api/admin/users/[id]` | body: `{ plan?: PlanId, resetUsage?: boolean }` — `guest` 제외 |
| GET | `/api/admin/settings` | 화이트리스트: `{ key, configured, source: "db"\|"env"\|"none", preview }` |
| PUT | `/api/admin/settings/[key]` | body: `{ value: string }` — 빈 문자열이면 DB 행 삭제 (env 폴백) |

미리보기: 길이 > 8이면 앞 4 + `…` + 뒤 4, 아니면 `****`. 시크릿 전체는 절대 반환하지 않음.

## 7. UI 동작

- **설정:** 키별 상태, password 입력, 저장 / 삭제(DB 오버라이드 제거)
- **회원:** 플랜 `<select>`, 「사용량 리셋」 버튼
- **대시보드:** 숫자 카드 + 누락 중요 설정 목록 (네이버 3종, Gemini, Stripe secret)

비주얼: 기존 KeywordOn 토큰(`--brand`, `--ink`, 패널) 유지. 기능형 관리 UI (새 마케팅 랜딩 아님).

## 8. 추가 환경변수

```
ADMIN_EMAILS=considerlabs@gmail.com
SETTINGS_ENCRYPTION_KEY=<32바이트 시크릿, base64 또는 hex>
```

암호화 키는 배포 시 한 번 생성해 Vercel + 로컬 `.env.local`에만 보관.

## 9. 테스트

- 유닛: 암·복호화 round-trip, 화이트리스트 거부, `requireAdmin` 허용/거부 (auth mock)
- 라우트: 비인가 PATCH users, 알 수 없는 키 PUT → 400, 빈 값이면 오버라이드 삭제
- 수동: 비관리자 403, 관리자가 네이버 키 저장 후 `/api/analyze`가 `dataSource: "live"` 유지/전환

## 10. 롤아웃

1. Vercel에 env 추가 (Production / Preview / Development)
2. `app_settings`용 `db:push`
3. 배포 후 허용 이메일로 `/admin` 스모크
4. (선택) UI에서 기존 Vercel 시크릿을 DB로 이전 — env는 삭제하기 전까지 폴백으로 유지

## 11. 보안 메모

- 채팅에 붙여 넣은 시크릿은 재발급 권장. 관리 UI는 채팅 붙여넣기를 줄이지만 XSS/세션 위험은 커지므로, 공개 내비에 Admin을 넣지 않고 서버에서만 allowlist를 강제한다.
- 복호화된 값을 로그에 남기지 않는다.
- v1 레이트 리밋은 범위 밖 — Clerk + 소수 운영자에 의존.
