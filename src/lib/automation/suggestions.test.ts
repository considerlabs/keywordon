import { describe, expect, it } from "vitest";
import { getCuratedSuggestions, mergeTrendSuggestions } from "./suggestions";

describe("getCuratedSuggestions", () => {
  it("returns at least 5 Korean blog ideas with title and keyword", () => {
    const items = getCuratedSuggestions();
    expect(items.length).toBeGreaterThanOrEqual(5);
    for (const item of items) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.keyword.length).toBeGreaterThan(0);
      expect(item.id.length).toBeGreaterThan(0);
    }
  });
});

describe("mergeTrendSuggestions", () => {
  it("dedupes by keyword and caps at 12", () => {
    const merged = mergeTrendSuggestions(
      Array.from({ length: 20 }, (_, i) => ({ keyword: `키워드${i}`, volume: i })),
    );
    expect(merged.length).toBeLessThanOrEqual(12);
    const keys = merged.map((m) => m.keyword);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
