import { afterEach, describe, expect, it } from "vitest";
import { isAdminEmail, parseAdminEmails } from "./emails";

describe("admin emails", () => {
  const original = process.env.ADMIN_EMAILS;

  afterEach(() => {
    if (original === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = original;
  });

  it("parses comma-separated allowlist case-insensitively", () => {
    process.env.ADMIN_EMAILS = " considerlabs@gmail.com , Other@Example.com ";
    expect(parseAdminEmails()).toEqual(["considerlabs@gmail.com", "other@example.com"]);
    expect(isAdminEmail("ConsiderLabs@gmail.com")).toBe(true);
    expect(isAdminEmail("nope@example.com")).toBe(false);
  });

  it("defaults to considerlabs@gmail.com when unset", () => {
    delete process.env.ADMIN_EMAILS;
    expect(parseAdminEmails()).toEqual(["considerlabs@gmail.com"]);
  });
});
