import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAuthContext: mocks.getAuthContext,
}));

import { requireAdmin } from "./require-admin";

describe("requireAdmin", () => {
  beforeEach(() => {
    mocks.getAuthContext.mockReset();
    process.env.ADMIN_EMAILS = "considerlabs@gmail.com";
  });

  it("returns 401 when signed out", async () => {
    mocks.getAuthContext.mockResolvedValue({
      authEnabled: true,
      userId: null,
      email: null,
    });
    const result = await requireAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("returns 403 for non-admin email", async () => {
    mocks.getAuthContext.mockResolvedValue({
      authEnabled: true,
      userId: "user_1",
      email: "other@example.com",
    });
    const result = await requireAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("allows allowlisted email", async () => {
    mocks.getAuthContext.mockResolvedValue({
      authEnabled: true,
      userId: "user_1",
      email: "considerlabs@gmail.com",
    });
    const result = await requireAdmin();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.admin.email).toBe("considerlabs@gmail.com");
  });
});
