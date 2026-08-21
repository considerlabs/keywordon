import { describe, expect, it } from "vitest";
import { CREATOR_SUBNAV, TOP_NAV, isNavActive } from "./nav";

describe("TOP_NAV", () => {
  it("exposes creator, automation, shortform, more", () => {
    expect(TOP_NAV.map((g) => g.id)).toEqual([
      "creator",
      "automation",
      "shortform",
      "more",
    ]);
  });

  it("includes every Phase-A destination href exactly once across groups", () => {
    const hrefs = TOP_NAV.flatMap((g) => [
      ...(g.href ? [g.href] : []),
      ...(g.children?.map((c) => c.href) ?? []),
    ]);
    const required = [
      "/analyze",
      "/write",
      "/blog",
      "/ranking",
      "/audit",
      "/persona",
      "/automation",
      "/shortform",
      "/bulk",
      "/discover",
      "/trends",
      "/calculator",
      "/site",
      "/account/usage",
      "/shop",
    ];
    for (const href of required) {
      expect(hrefs).toContain(href);
    }
  });

  it("marks shortform with new badge", () => {
    expect(TOP_NAV.find((g) => g.id === "shortform")?.badge).toBe("new");
  });
});

describe("CREATOR_SUBNAV", () => {
  it("lists creator tool tabs in order", () => {
    expect(CREATOR_SUBNAV.map((l) => l.href)).toEqual([
      "/analyze",
      "/write",
      "/blog",
      "/ranking",
      "/audit",
      "/persona",
    ]);
  });
});

describe("isNavActive", () => {
  it("matches nested paths except home", () => {
    expect(isNavActive("/write/image", "/write")).toBe(true);
    expect(isNavActive("/analyze", "/")).toBe(false);
    expect(isNavActive("/", "/")).toBe(true);
  });
});
