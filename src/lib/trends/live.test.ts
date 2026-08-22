import { describe, expect, it } from "vitest";
import { parseSignalRealtime } from "./live";

describe("parseSignalRealtime", () => {
  it("maps signal.bz ranks without inventing keywords or deltas", () => {
    const items = parseSignalRealtime({
      top10: [
        { rank: 2, keyword: "손태진", state: "+" },
        { rank: 1, keyword: "제주 실종", state: "n" },
        { rank: 3, keyword: "KLPGA", state: "-" },
      ],
    });

    expect(items.map((item) => item.keyword)).toEqual(["제주 실종", "손태진", "KLPGA"]);
    expect(items[0]?.change).toBe("same");
    expect(items[1]?.change).toBe("up");
    expect(items[2]?.change).toBe("down");
    expect(items.every((item) => item.delta === 0)).toBe(true);
  });

  it("returns empty for malformed payloads", () => {
    expect(parseSignalRealtime(null)).toEqual([]);
    expect(parseSignalRealtime({ top10: [] })).toEqual([]);
  });
});
