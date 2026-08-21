import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  values: vi.fn(),
  onConflictDoNothing: vi.fn(),
  returning: vi.fn(),
}));

vi.mock("./index", () => ({
  hasDatabase: true,
  db: {
    select: mocks.select,
    insert: mocks.insert,
  },
}));

import { ensureUser } from "./users";

describe("ensureUser — signup race condition", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const selectChain = {
      from: mocks.from.mockReturnThis(),
      where: mocks.where.mockReturnThis(),
      limit: mocks.limit,
    };
    mocks.select.mockReturnValue(selectChain);

    const insertChain = {
      values: mocks.values.mockReturnThis(),
      onConflictDoNothing: mocks.onConflictDoNothing.mockReturnThis(),
      returning: mocks.returning,
    };
    mocks.insert.mockReturnValue(insertChain);
  });

  it("re-selects when insert loses the race (empty returning)", async () => {
    mocks.limit
      .mockResolvedValueOnce([]) // first select: no user
      .mockResolvedValueOnce([
        {
          id: 42,
          clerkId: "user_race",
          email: "race@example.com",
          plan: "free",
          aiUsedMonth: 0,
          googleUsedMonth: 0,
          usageMonthKey: "2026-08",
        },
      ]);
    mocks.returning.mockResolvedValue([]); // conflict → no row

    const result = await ensureUser("user_race", "race@example.com");

    expect(mocks.onConflictDoNothing).toHaveBeenCalled();
    expect(result.id).toBe(42);
    expect(result.clerkId).toBe("user_race");
  });

  it("returns inserted row when insert wins", async () => {
    mocks.limit.mockResolvedValueOnce([]);
    mocks.returning.mockResolvedValue([
      {
        id: 7,
        clerkId: "user_solo",
        email: null,
        plan: "free",
        aiUsedMonth: 0,
        googleUsedMonth: 0,
        usageMonthKey: "2026-08",
      },
    ]);

    const result = await ensureUser("user_solo");

    expect(result.id).toBe(7);
    expect(mocks.limit).toHaveBeenCalledTimes(1);
  });
});
