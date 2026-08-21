import { describe, expect, it } from "vitest";
import { isSettingsKey, SETTINGS_KEYS, maskSecret } from "./keys";

describe("settings keys", () => {
  it("accepts whitelist keys only", () => {
    expect(isSettingsKey("NAVER_SEARCHAD_API_KEY")).toBe(true);
    expect(isSettingsKey("DATABASE_URL")).toBe(false);
    expect(isSettingsKey("CLERK_SECRET_KEY")).toBe(false);
    expect(SETTINGS_KEYS).toContain("CRON_SECRET");
  });

  it("masks previews without leaking full secrets", () => {
    expect(maskSecret("abcd1234wxyz")).toBe("abcd…wxyz");
    expect(maskSecret("short")).toBe("****");
    expect(maskSecret("")).toBe(null);
  });
});
