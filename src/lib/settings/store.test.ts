import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/index", () => ({
  hasDatabase: false,
  db: null,
}));

import {
  __resetSettingsMemoryForTests,
  getSetting,
  listSettingStatuses,
  setSetting,
} from "./store";

describe("settings store", () => {
  const originalEnc = process.env.SETTINGS_ENCRYPTION_KEY;

  beforeEach(() => {
    __resetSettingsMemoryForTests();
  });

  afterEach(() => {
    __resetSettingsMemoryForTests();
    if (originalEnc === undefined) delete process.env.SETTINGS_ENCRYPTION_KEY;
    else process.env.SETTINGS_ENCRYPTION_KEY = originalEnc;
    delete process.env.NAVER_SEARCHAD_API_KEY;
  });

  it("falls back to process.env when no DB override", async () => {
    process.env.NAVER_SEARCHAD_API_KEY = "env-key-value";
    expect(await getSetting("NAVER_SEARCHAD_API_KEY")).toBe("env-key-value");
  });

  it("prefers memory/DB override over env", async () => {
    process.env.SETTINGS_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
    process.env.NAVER_SEARCHAD_API_KEY = "env-key";
    const saved = await setSetting("NAVER_SEARCHAD_API_KEY", "db-override-key", "admin");
    expect(saved.ok).toBe(true);
    expect(await getSetting("NAVER_SEARCHAD_API_KEY")).toBe("db-override-key");
    const statuses = await listSettingStatuses();
    const row = statuses.find((s) => s.key === "NAVER_SEARCHAD_API_KEY");
    expect(row?.source).toBe("db");
    expect(row?.preview).toBe("db-o…-key");
  });

  it("rejects unknown keys", async () => {
    process.env.SETTINGS_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
    const result = await setSetting("DATABASE_URL", "x", "admin");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });
});
