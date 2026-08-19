# KeywordOn

로워드(loword.co.kr)급 키워드 인텔리전스 플랫폼 MVP입니다.

## 기능

- 키워드 분석 (네이버/구글, 플랜별 쿼터·잠금)
- 기회지수 / CPC / 이슈성 / 콘텐츠 발행량
- 월간 추이 차트, 연관어, 실시간 검색어
- 대량 조회 + CSV
- 키워드 발굴
- 블로그 분석 / 사이트 진단
- Copilot AI 글쓰기 (AI Gateway)
- 멤버십 플랜 + Stripe 체크아웃
- Clerk 로그인
- Chrome 확장 (`extension/`)

## 실행

```bash
npm install
npm run dev
```

## 필수 연동 (Vercel Marketplace)

아래 약관을 브라우저에서 수락한 뒤 재설치하세요.

1. Neon: https://vercel.com/briank-projects/~/integrations/accept-terms/neon?source=cli
2. Clerk: https://vercel.com/briank-projects/~/integrations/accept-terms/clerk?source=cli
3. Stripe: https://vercel.com/briank-projects/~/integrations/accept-terms/stripe?source=cli

```bash
vercel integration add neon --no-claim
vercel integration add clerk --no-claim
vercel integration add stripe --no-claim
vercel env pull .env.local --yes
npm run db:push
```

## 실데이터 (선택)

`.env.local`에 네이버 검색광고 API 키를 넣으면 키워드 검색량이 실데이터로 전환됩니다.

```
NAVER_SEARCHAD_CUSTOMER_ID=
NAVER_SEARCHAD_API_KEY=
NAVER_SEARCHAD_SECRET_KEY=
```

## Chrome 확장

`extension/README.md` 참고.
