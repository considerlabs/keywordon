import crypto from "node:crypto";
import { analyzeKeyword, type Engine, type KeywordAnalysis } from "../keyword-engine";

interface NaverKeywordItem {
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

export function hasNaverCredentials() {
  return Boolean(
    process.env.NAVER_SEARCHAD_CUSTOMER_ID &&
      process.env.NAVER_SEARCHAD_API_KEY &&
      process.env.NAVER_SEARCHAD_SECRET_KEY,
  );
}

export function hasGoogleCredentials() {
  return Boolean(process.env.GOOGLE_ADS_DEVELOPER_TOKEN && process.env.GOOGLE_ADS_CUSTOMER_ID);
}

async function fetchNaverKeyword(keyword: string): Promise<KeywordAnalysis | null> {
  const customerId = process.env.NAVER_SEARCHAD_CUSTOMER_ID;
  const apiKey = process.env.NAVER_SEARCHAD_API_KEY;
  const secret = process.env.NAVER_SEARCHAD_SECRET_KEY;
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
  const list = payload.keywordList ?? [];
  const exact =
    list.find(
      (item) => item.relKeyword.replace(/\s+/g, "").toLowerCase() === keyword.replace(/\s+/g, "").toLowerCase(),
    ) ?? list[0];

  if (!exact) return null;

  const base = analyzeKeyword(keyword, "naver");
  const pcVolume = parseCount(exact.monthlyPcQcCnt);
  const mobileVolume = parseCount(exact.monthlyMobileQcCnt);
  const monthlyVolume = pcVolume + mobileVolume;
  const competitionMap: Record<string, KeywordAnalysis["adCompetition"]> = {
    높음: "심화",
    중간: "혼잡",
    낮음: "적당",
  };

  const related = list
    .filter((item) => item.relKeyword !== exact.relKeyword)
    .slice(0, 20)
    .map((item) => {
      const volume = parseCount(item.monthlyPcQcCnt) + parseCount(item.monthlyMobileQcCnt);
      return {
        keyword: item.relKeyword,
        monthlyVolume: volume,
        opportunityScore: Math.max(0, 30 - Math.floor(volume / 8000)),
        competition: competitionMap[item.compIdx ?? ""] ?? "적당",
        source: "serp" as const,
      };
    });

  // Keyword Tool does not return bid CPC; derive a coarse estimate from click share + ad depth.
  const clicks =
    parseCount(exact.monthlyAvePcClkCnt) + parseCount(exact.monthlyAveMobileClkCnt);
  const depth = Math.max(1, parseCount(exact.plAvgDepth));
  const estimatedCpc = Math.max(
    50,
    Math.round((clicks / Math.max(1, monthlyVolume)) * 1200 * depth),
  );

  return {
    ...base,
    monthlyVolume,
    pcVolume,
    mobileVolume,
    cpc: estimatedCpc,
    adCompetition: competitionMap[exact.compIdx ?? ""] ?? base.adCompetition,
    relatedSerp: related.slice(0, 10),
    relatedInternal: related.slice(0, 12).map((item) => ({ ...item, source: "internal" as const })),
    summary: `'${keyword}' 네이버 실검색량 기준 월간 약 ${monthlyVolume.toLocaleString("ko-KR")}회입니다. (SearchAd API · CPC는 입찰가가 아닌 클릭·노출 깊이 기반 추정값)`,
    deviceRatio: {
      pc: monthlyVolume ? Number(((pcVolume / monthlyVolume) * 100).toFixed(1)) : 0,
      mobile: monthlyVolume ? Number(((mobileVolume / monthlyVolume) * 100).toFixed(1)) : 0,
    },
  };
}

export async function resolveKeywordAnalysis(
  keyword: string,
  engine: Engine,
): Promise<{ data: KeywordAnalysis; source: "live" | "simulated" }> {
  if (engine === "naver" && hasNaverCredentials()) {
    try {
      const live = await fetchNaverKeyword(keyword);
      if (live) return { data: live, source: "live" };
    } catch (error) {
      console.error("Naver live fetch failed", error);
    }
  }

  // Google Ads Keyword Plan requires OAuth + developer token; fall back until credentials are complete.
  return { data: analyzeKeyword(keyword, engine), source: "simulated" };
}

export async function resolveBulk(
  keywords: string[],
  engine: Engine,
): Promise<{ results: KeywordAnalysis[]; source: "live" | "simulated" }> {
  const unique = [...new Set(keywords.map((k) => k.trim()).filter(Boolean))].slice(0, 50);
  const results: KeywordAnalysis[] = [];
  let anyLive = false;
  for (const keyword of unique) {
    const resolved = await resolveKeywordAnalysis(keyword, engine);
    if (resolved.source === "live") anyLive = true;
    results.push(resolved.data);
  }
  return { results, source: anyLive ? "live" : "simulated" };
}