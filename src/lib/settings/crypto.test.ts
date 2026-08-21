import { afterEach, describe, expect, it } from "vitest";
import { decryptSetting, encryptSetting, hasEncryptionKey } from "./crypto";

describe("settings crypto", () => {
  const original = process.env.SETTINGS_ENCRYPTION_KEY;

  afterEach(() => {
    if (original === undefined) delete process.env.SETTINGS_ENCRYPTION_KEY;
    else process.env.SETTINGS_ENCRYPTION_KEY = original;
  });

  it("round-trips plaintext when encryption key is set", () => {
    process.env.SETTINGS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    expect(hasEncryptionKey()).toBe(true);
    const sealed = encryptSetting("secret-value");
    expect(sealed).not.toContain("secret-value");
    expect(decryptSetting(sealed)).toBe("secret-value");
  });

  it("throws when encryption key is missing", () => {
    delete process.env.SETTINGS_ENCRYPTION_KEY;
    expect(hasEncryptionKey()).toBe(false);
    expect(() => encryptSetting("x")).toThrow(/SETTINGS_ENCRYPTION_KEY/);
  });
});
