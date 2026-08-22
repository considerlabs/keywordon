import crypto from "node:crypto";
import {
  emptyKeywordAnalysis,
  type AdCompetition,
  type Engine,
  type KeywordAnalysis,
  type RelatedKeyword,
} from "../keyword-engine";
import { getSetting } from "../settings/store";

export interface NaverKeywordItem {
  relKeyword: string;
  monthlyPcQcCnt: string | number;
  monthlyMobileQcCnt: string | number;
  monthlyAvePcClkCnt?: string | number;
  monthlyAveMobileClkCnt?: string | number;
  monthlyAvePcCtr?: string | number;
  monthlyAveMobileCtr?: string | number;
  plAvgDepth?: string | number;
  compIdx?: string;
}

function parseCount(value: string | number | undefined): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") return value;
  if (value.includes("<")) return 10;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function signNaver(timestamp: string, method: string, uri: string, secret: string) {
  const message = `${timestamp}.${method}.${uri}`;
  return crypto.createHmac("sha256", secret).update(message).digest("base64");
}

const COMPETITION: Record<string, AdCompetition> = {
  높음: "심화",
  중간: "혼잡",
  낮음: "적당",
};

export async function hasNaverCredentials() {
  const [customerId, apiKey, secret] = await Promise.all([
    getSetting("NAVER_SEARCHAD_CUSTOMER_ID"),
    getSetting("NAVER_SEARCHAD_API_KEY"),
    getSetting("NAVER_SEARCHAD_SECRET_KEY"),
  ]);
  return Boolean(customerId && apiKey && secret);
}

export async function hasGoogleCredentials() {
  const [token, customerId] = await Promise.all([
    getSetting("GOOGLE_ADS_DEVELOPER_TOKEN"),
    getSetting("GOOGLE_ADS_CUSTOMER_ID"),
  ]);
  return Boolean(token && customerId);
}

export function analysisFromNaverList(
  keyword: string,
  list: NaverKeywordItem[],
): KeywordAnalysis | null {
  const exact =
    list.find(
      (item) =>
        item.relKeyword.replace(/\s+/g, "").toLowerCase() ===
        keyword.replace(/\s+/g, "").toLowerCase(),
    ) ?? list[0];
  if (!exact) return null;

  const pcVolume = parseCount(exact.monthlyPcQcCnt);
  const mobileVolume = parseCount(exact.monthlyMobileQcCnt);
  const monthlyVolume = pcVolume + mobileVolume;
  const adCompetition = COMPETITION[exact.compIdx ?? ""] ?? "없음";

  const related: RelatedKeyword[] = list
    .filter((item) => item.relKeyword !== exact.relKeyword)
    .slice(0, 20)
    .map((item) => {
      const volume = parseCount(item.monthlyPcQcCnt) + parseCount(item.monthlyMobileQcCnt);
      return {
        keyword: item.relKeyword,
        monthlyVolume: volume,
        opportunityScore: 0,
        competition: COMPETITION[item.compIdx ?? ""] ?? "없음",
        source: "serp" as const,
      };
    });

  const base = emptyKeywordAnalysis(keyword, "naver");
  return {
    ...base,
    monthlyVolume,
    pcVolume,
    mobileVolume,
    volumeChangeRate: 0,
    cpc: 0,
    adCompetition,
    opportunityScore: 0,
    issueLevel: "없음",
    issueScore: 0,
    relatedSerp: related.slice(0, 10),
    relatedInternal: related.slice(0, 12).map((item) => ({ ...item, source: "internal" as const })),
    smartBlockKeywords: related.slice(0, 6).map((item) => item.keyword),
    nextKeywords: related.slice(0, 5).map((item) => item.keyword),
    deviceRatio: {
      pc: monthlyVolume ? Number(((pcVolume / monthlyVolume) * 100).toFixed(1)) : 0,
      mobile: monthlyVolume ? Number(((mobileVolume / monthlyVolume) * 100).toFixed(1)) : 0,
    },
    summary: `'${keyword}' 네이버 검색광고 실측 월간 검색량 ${monthlyVolume.toLocaleString("ko-KR")}회 · 광고 경쟁 ${adCompetition}. CPC·인구통계·발행량은 API가 제공하지 않아 표시하지 않습니다.`,
  };
}

async function fetchNaverKeyword(keyword: string): Promise<KeywordAnalysis | null> {
  const customerId = await getSetting("NAVER_SEARCHAD_CUSTOMER_ID");
  const apiKey = await getSetting("NAVER_SEARCHAD_API_KEY");
  const secret = await getSetting("NAVER_SEARCHAD_SECRET_KEY");
  if (!customerId || !apiKey || !secret) return null;

  const uri = "/keywordstool";
  const method = "GET";
  const timestamp = String(Date.now());
  const signature = signNaver(timestamp, method, uri, secret);
  const url = `https://api.naver.com${uri}?hintKeywords=${encodeURIComponent(keyword.replace(/\s+/g, ""))}&showDetail=1`;

  const response = await fetch(url, {
    headers: {
      "X-Timestamp": timestamp,
      "X-API-KEY": apiKey,
      "X-Customer": customerId,
      "X-Signature": signature,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Naver SearchAd error", response.status, await response.text());
    return null;
  }

  const payload = (await response.json()) as { keywordList?: NaverKeywordItem[] };
  return analysisFromNaverList(keyword, payload.keywordList ?? []);
}

export async function resolveKeywordAnalysis(
  keyword: string,
  engine: Engine,
): Promise<{ data: KeywordAnalysis; source: "live" }> {
  if (engine === "google") {
    throw new Error("구글 키워드 실데이터는 연결되어 있지 않습니다. 네이버 검색을 이용해 주세요.");
  }
  if (!(await hasNaverCredentials())) {
    throw new Error("네이버 검색광고 API 키가 없습니다. 관리자 설정에서 키를 등록해 주세요.");
  }

  const live = await fetchNaverKeyword(keyword);
  if (!live) {
    throw new Error("네이버 검색광고에서 해당 키워드 실측값을 찾지 못했습니다.");
  }
  return { data: live, source: "live" };
}

export async function resolveBulk(
  keywords: string[],
  engine: Engine,
): Promise<{ results: KeywordAnalysis[]; source: "live" }> {
  const unique = [...new Set(keywords.map((k) => k.trim()).filter(Boolean))].slice(0, 50);
  const results: KeywordAnalysis[] = [];
  for (const keyword of unique) {
    const resolved = await resolveKeywordAnalysis(keyword, engine);
    results.push(resolved.data);
  }
  return { results, source: "live" };
}

export async function discoverLiveKeywords(seedKeyword: string): Promise<RelatedKeyword[]> {
  const { data } = await resolveKeywordAnalysis(seedKeyword || "마케팅", "naver");
  return [...data.relatedInternal, ...data.relatedSerp]
    .sort((a, b) => b.monthlyVolume - a.monthlyVolume)
    .slice(0, 30);
}
