# 인수인계 — 2026-08-22 실데이터 · 슈퍼관리자 · 사이트 진단

실측만 쓰고 추정·HMAC 시뮬을 제거한 뒤, `considerlabs@gmail.com`을 제한 없는 슈퍼관리자로 두고, 사이트 진단이 실제로 HTML을 가져오도록 고친 세션입니다.

**프로덕션:** https://keywordon.vercel.app (`main` `6f9a3b8`, Ready)  
**테스트:** `npm test` — 137 passed

## 무엇이 바뀌었나

### 가짜 데이터 제거

| 기능 | 이전 | 지금 |
|------|------|------|
| 키워드 분석 / 대량 / 발굴 | HMAC 시뮬 폴백, CPC·기회지수 추정 | **네이버 검색광고 API만**. 키 없거나 구글이면 오류 |
| 급상승 트렌드 | 고정 풀 셔플 | **signal.bz 실시간 순위**. 실패 시 빈 목록/502 |
| 사이트 진단 | HMAC 난수 리포트 | 실제 HTML·사이트맵 점검 |
| 블로그 진단 | `방문자 = 글수×350` 추정 | RSS 발행 건수만 |
| 자동화·숏폼 추천 | 실데이터 실패 시 큐레이션 가짜 글감 | 실패하면 **빈 목록** |
| 계산기 | 예시 기본값(3만 조회 등) | 입력값만 곱함. 기본 0 |

없는 지표(성별·연령·12개월 추이·문서 발행량·입찰 CPC)는 숫자를 만들지 않고 「제공 없음」입니다.

### 슈퍼관리자

- 이메일: **`considerlabs@gmail.com`** (`SUPER_ADMIN_EMAIL`)
- Gmail `googlemail.com` 별칭·Clerk 다중 이메일도 동일 계정으로 인식
- `ADMIN_EMAILS`에 없어도 항상 관리자 목록에 포함
- 로그인하면 DB 플랜과 무관하게 `superAdminPlan()` (이름 **슈퍼관리자**, `unrestricted: true`)
- 기능 게이트·대량 한도·네이버 RPM·분석 필드 잠금 **전부 우회**
- `/account`에 현재 플랜·무제한 안내·업그레이드(`/shop`) 표시
- 관리자 콘솔(`/admin`)도 동일 이메일로 통과

구현: `src/lib/admin/emails.ts`, `src/lib/plans.ts` `superAdminPlan()`, `src/lib/auth.ts`, `src/lib/quota.ts`, `src/app/account/page.tsx`

### 사이트 진단 (내 사이트 진단)

사용자에게 보이던 `(307)` / `fetch failed` / 인증서 오류는 **증상**이었다. 리다이렉트 추종·TLS 재시도·에러 문구 정리를 여러 번 올렸지만, 프로덕션에서 요청이 사이트에 닿지 않았다.

**실제 원인:** `src/lib/ssrf.ts` `https.request` custom DNS `lookup`이 Node 20+에서 `{ all: true }`로 호출되면 `(err, address, family)` 형태로 응답해 연결 IP가 `undefined`가 됨 (`ERR_INVALID_IP_ADDRESS`). 307을 따라가는 코드는 실행되지 않음.

**수정 (`6f9a3b8`):** custom lookup 제거, `family: 4`만 사용. `ipv4first` 유지. 로컬에서 `naver.com` HTML을 가져와 건강도 71점 확인.

**하지 말 것:** `https.request`에 custom `lookup`을 다시 넣지 말 것. IPv4가 필요하면 `family: 4` 또는 `dns.setDefaultResultOrder("ipv4first")`만 쓴다.

**배포 함정:** `8cd9941` 등 307 추종 커밋은 `next build`가 `*.test.ts` 목의 콜백 타입을 검사해 실패했다. `tsconfig.json` `exclude: ["**/*.test.ts"]`로 앱 빌드에서 테스트를 빼야 프로덕션에 반영된다.

관련 파일: `src/lib/ssrf.ts`, `src/app/api/site/route.ts`, `src/app/site/page.tsx`, `src/lib/analysis-tools.ts`

## 운영자가 알아야 할 것

1. 키워드 분석이 되려면 Vercel에 **네이버 검색광고 3키**가 있어야 함. 없으면 시뮬로 넘어가지 않고 에러.
2. 급상승은 signal.bz 공개 API. 장애 시 홈은 빈 리스트, `/api/trends`는 502.
3. 사이트 진단은 대상 사이트의 공개 HTTPS HTML. 사설 IP는 차단.
4. 테스트: `npm test` (137).

## 관련 커밋

| SHA | 내용 |
|-----|------|
| `2168b34` | HMAC/시뮬 키워드 데이터 제거, 슈퍼관리자 해제 |
| `92632ae` | Clerk 다중 이메일에서도 슈퍼관리자 매칭 |
| `190cc55` | `/account` 현재 플랜·업그레이드 |
| `654aa8d` ~ `9713704` | 307·TLS·에러 문구·테스트 제외 배포 수정 (증상) |
| `6f9a3b8` | **사이트 진단 실제 연결** (custom lookup 제거) |
