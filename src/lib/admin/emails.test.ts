import { afterEach, describe, expect, it } from "vitest";
import { isAdminEmail, parseAdminEmails, pickAccountEmail } from "./emails";

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

  it("always keeps considerlabs@gmail.com even if ADMIN_EMAILS omits it", () => {
    process.env.ADMIN_EMAILS = "ops@example.com";
    expect(parseAdminEmails()).toEqual(["considerlabs@gmail.com", "ops@example.com"]);
    expect(isAdminEmail("considerlabs@gmail.com")).toBe(true);
  });
});

describe("pickAccountEmail", () => {
  it("prefers considerlabs@gmail.com even when it is not Clerk's first address", () => {
    const email = pickAccountEmail({
      primaryEmailAddressId: "1",
      emailAddresses: [
        { id: "1", emailAddress: "alias@keywordon.app" },
        { id: "2", emailAddress: "considerlabs@gmail.com" },
      ],
    });
    expect(email).toBe("considerlabs@gmail.com");
  });

  it("treats Gmail dots and plus-aliases as the super-admin address", () => {
    expect(isAdminEmail("consider.labs+admin@gmail.com")).toBe(true);
    expect(isAdminEmail("considerlabs@googlemail.com")).toBe(true);
  });
});
