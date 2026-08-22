import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getRealtimeTrends } from "./keyword-engine";

describe("getRealtimeTrends", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a stable ranking within the same UTC hour", () => {
    vi.setSystemTime(new Date("2026-08-22T12:10:00.000Z"));
    const first = getRealtimeTrends();
    vi.setSystemTime(new Date("2026-08-22T12:50:00.000Z"));
    const second = getRealtimeTrends();

    expect(first.map((item) => item.keyword)).toEqual(second.map((item) => item.keyword));
  });

  it("sets change and delta from the previous hour ranking, not random labels", () => {
    vi.setSystemTime(new Date("2026-08-22T13:00:00.000Z"));
    const current = getRealtimeTrends();
    vi.setSystemTime(new Date("2026-08-22T12:00:00.000Z"));
    const previous = getRealtimeTrends();
    const prevRank = new Map(previous.map((item) => [item.keyword, item.rank]));

    expect(current).toHaveLength(10);

    for (const item of current) {
      const prev = prevRank.get(item.keyword);
      if (prev == null) {
        expect(item.change).toBe("new");
        expect(item.delta).toBe(0);
        continue;
      }
      if (prev > item.rank) {
        expect(item.change).toBe("up");
        expect(item.delta).toBe(prev - item.rank);
      } else if (prev < item.rank) {
        expect(item.change).toBe("down");
        expect(item.delta).toBe(item.rank - prev);
      } else {
        expect(item.change).toBe("same");
        expect(item.delta).toBe(0);
      }
    }
  });
});
