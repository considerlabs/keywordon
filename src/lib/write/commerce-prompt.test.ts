import { describe, expect, it } from "vitest";
import { assertCommerceUrl } from "./commerce-prompt";

describe("assertCommerceUrl", () => {
  it("accepts an https product URL", () => {
    expect(() => assertCommerceUrl("https://shop.example.com/products/camping-chair")).not.toThrow();
  });

  it.each(["", "example.com/product", "http://shop.example.com/product"])(
    "rejects a missing or non-https URL: %s",
    (value) => {
      expect(() => assertCommerceUrl(value)).toThrow();
    },
  );
});
