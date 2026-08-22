import type { TrendItem } from "@/lib/keyword-engine";

const SIGNAL_REALTIME_URL = "https://api.signal.bz/news/realtime";

type SignalRankItem = {
  rank?: number;
  keyword?: string;
  state?: string;
};

function mapState(state: string | undefined): TrendItem["change"] {
  if (state === "+") return "up";
  if (state === "-") return "down";
  if (state === "new") return "new";
  return "same";
}

export function parseSignalRealtime(payload: unknown): TrendItem[] {
  if (!payload || typeof payload !== "object") return [];
  const top10 = (payload as { top10?: SignalRankItem[] }).top10;
  if (!Array.isArray(top10)) return [];

  const items: TrendItem[] = [];
  for (const row of top10) {
    const keyword = String(row.keyword ?? "").trim();
    if (!keyword) continue;
    items.push({
      rank: Number(row.rank) || items.length + 1,
      keyword,
      change: mapState(row.state),
      delta: 0,
    });
  }
  return items.sort((a, b) => a.rank - b.rank);
}

export async function fetchRealtimeTrends(): Promise<TrendItem[]> {
  const response = await fetch(SIGNAL_REALTIME_URL, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "KeywordOn/1.0",
    },
  });
  if (!response.ok) {
    throw new Error(`실시간 트렌드를 불러오지 못했습니다. (${response.status})`);
  }
  const items = parseSignalRealtime(await response.json());
  if (items.length === 0) {
    throw new Error("실시간 트렌드 목록이 비어 있습니다.");
  }
  return items;
}
