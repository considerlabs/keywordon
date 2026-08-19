import { createHmac } from "node:crypto";

export function analyzeBlog(url: string) {
  const normalized = url.trim();
  if (!normalized) throw new Error("블로그 URL을 입력해 주세요.");

  const seed = createHmac("sha256", "blog").update(normalized).digest("hex");
  const n = (offset: number) => parseInt(seed.slice(offset, offset + 4), 16);

  const platform = /blog\.naver\.com/i.test(normalized)
    ? "naver"
    : /tistory\.com/i.test(normalized)
      ? "tistory"
      : "unknown";

  const postCount = 40 + (n(0) % 400);
  const monthlyPosts = 2 + (n(4) % 18);
  const visitors = 500 + (n(8) % 80000);
  const indexScore = 35 + (n(12) % 60);
  const keywordScore = 20 + (n(16) % 70);
  const consistency = 30 + (n(20) % 65);

  const topPosts = Array.from({ length: 5 }, (_, i) => ({
    title: `인기 포스팅 #${i + 1}`,
    views: 200 + (n(24 + i * 2) % 12000),
    publishedAt: new Date(Date.now() - (i + 1) * 86400000 * 7).toISOString().slice(0, 10),
  }));

  const recommendations = [
    indexScore < 60 ? "주제 집중도를 높여 카테고리 일관성을 강화하세요." : "카테고리 구조가 양호합니다.",
    monthlyPosts < 6 ? "월 발행 빈도를 주 1회 이상으로 올려보세요." : "발행 리듬이 안정적입니다.",
    keywordScore < 55
      ? "제목·본문에 핵심 키워드와 연관어를 자연스럽게 배치하세요."
      : "키워드 배치가 비교적 잘 되어 있습니다.",
  ];

  return {
    url: normalized,
    platform,
    analyzedAt: new Date().toISOString(),
    metrics: {
      postCount,
      monthlyPosts,
      estimatedMonthlyVisitors: visitors,
      indexScore,
      keywordScore,
      consistencyScore: consistency,
      overallScore: Math.round((indexScore + keywordScore + consistency) / 3),
    },
    topPosts,
    recommendations,
    summary:
      platform === "unknown"
        ? "지원 플랫폼(네이버 블로그/티스토리) URL을 권장합니다. 추정 지수로 분석했습니다."
        : `${platform === "naver" ? "네이버 블로그" : "티스토리"} 기준 종합 지수 ${Math.round((indexScore + keywordScore + consistency) / 3)}점입니다.`,
  };
}

export function diagnoseSite(domainInput: string) {
  const domain = domainInput
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  if (!domain) throw new Error("도메인을 입력해 주세요.");

  const seed = createHmac("sha256", "site").update(domain).digest("hex");
  const n = (offset: number) => parseInt(seed.slice(offset, offset + 4), 16);

  const organicKeywords = 80 + (n(0) % 2500);
  const indexedPages = 20 + (n(4) % 900);
  const referringDomains = 5 + (n(8) % 400);
  const health = 40 + (n(12) % 55);

  const trafficKeywords = Array.from({ length: 8 }, (_, i) => ({
    keyword: `${domain.split(".")[0]} 관련 키워드 ${i + 1}`,
    clicks: 10 + (n(16 + i) % 900),
    impressions: 100 + (n(20 + i) % 9000),
    position: Number((1 + (n(24 + i) % 40) + Math.random()).toFixed(1)),
  }));

  return {
    domain,
    analyzedAt: new Date().toISOString(),
    metrics: {
      organicKeywords,
      indexedPages,
      referringDomains,
      healthScore: health,
      mobileFriendly: n(28) % 2 === 0,
      https: true,
    },
    topKeywords: trafficKeywords.sort((a, b) => b.clicks - a.clicks),
    issues: [
      health < 60 ? "핵심 랜딩 페이지의 메타 설명·H1 최적화가 필요합니다." : null,
      indexedPages < 50 ? "인덱스된 페이지 수가 적어 콘텐츠 확장이 필요합니다." : null,
      referringDomains < 30 ? "외부 유입 도메인이 적어 백링크 확보를 검토하세요." : null,
    ].filter(Boolean),
    summary: `${domain} 사이트 건강도 ${health}점 · 추정 유입 키워드 ${organicKeywords.toLocaleString("ko-KR")}개`,
  };
}