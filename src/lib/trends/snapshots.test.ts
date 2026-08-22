import { describe, expect, it } from "vitest";
import type { TrendItem } from "@/lib/keyword-engine";
import { mergeTrendItems } from "./snapshots";

describe("mergeTrendItems", () => {
  it("keeps the live ranking and does not emit duplicate ranks from stale snapshots", () => {
    const live: TrendItem[] = [
      { rank: 1, keyword: "아이폰 출시", change: "up", delta: 2 },
      { rank: 2, keyword: "캠핑 용품", change: "down", delta: 1 },
    ];
    const fromDb: TrendItem[] = [
      { rank: 1, keyword: "부동산 정책", change: "same", delta: 0 },
      { rank: 2, keyword: "아이폰 출시", change: "same", delta: 0 },
    ];

    const { items, hasHistory } = mergeTrendItems(live, fromDb);

    expect(hasHistory).toBe(true);
    expect(items.map((item) => item.keyword)).toEqual(["아이폰 출시", "캠핑 용품"]);
    expect(items.map((item) => item.rank)).toEqual([1, 2]);
  });
});
