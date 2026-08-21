import { describe, expect, it } from "vitest";
import {
  buildSparklinePolyline,
  rankHistoryToSparkline,
  truncateToHour,
} from "./sparkline";

describe("truncateToHour", () => {
  it("zeroes out minutes, seconds, and milliseconds", () => {
    const input = new Date("2026-08-21T13:47:32.501Z");
    const result = truncateToHour(input);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
    expect(result.getHours()).toBe(input.getHours());
  });
});

describe("rankHistoryToSparkline", () => {
  it("maps rank rows to sparkline points and skips null ranks", () => {
    const points = rankHistoryToSparkline([
      { bucketHour: "2026-08-21T10:00:00.000Z", rank: 3 },
      { bucketHour: "2026-08-21T11:00:00.000Z", rank: null },
      { bucketHour: "2026-08-21T12:00:00.000Z", rank: 1 },
    ]);

    expect(points).toHaveLength(2);
    expect(points[0].value).toBe(3);
    expect(points[1].value).toBe(1);
  });
});

describe("buildSparklinePolyline", () => {
  it("returns empty string for no points", () => {
    expect(buildSparklinePolyline([], 100, 40)).toBe("");
  });

  it("builds coordinates for two or more points", () => {
    const polyline = buildSparklinePolyline(
      [
        { label: "a", value: 5 },
        { label: "b", value: 1 },
      ],
      100,
      40,
    );

    expect(polyline).toContain("4,");
    expect(polyline.split(" ").length).toBe(2);
  });
});
