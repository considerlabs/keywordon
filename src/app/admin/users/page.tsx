"use client";

import { useCallback, useEffect, useState } from "react";

type UserRow = {
  id: number;
  clerkId: string;
  email: string | null;
  plan: string;
  aiUsedMonth: number;
  googleUsedMonth: number;
};

const PLANS = ["free", "basic", "super", "enterprise"] as const;

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async (query: string) => {
    const res = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`);
    const json = (await res.json()) as { users?: UserRow[]; total?: number; error?: string };
    if (!res.ok) {
      setMessage(json.error ?? "목록을 불러오지 못했습니다.");
      return;
    }
    setUsers(json.users ?? []);
    setTotal(json.total ?? 0);
    setMessage("");
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load("");
  }, [load]);

  async function patch(id: number, body: { plan?: string; resetUsage?: boolean }) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(json.error ?? "저장 실패");
        return;
      }
      await load(q);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">회원</h1>
        <p className="mt-2 text-[var(--muted)]">플랜 변경 · AI/구글 월간 사용량 리셋</p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load(q);
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이메일 / clerk id / 플랜 검색"
          className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-xl bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white"
        >
          검색
        </button>
      </form>

      {message ? <p className="text-sm text-rose-700">{message}</p> : null}
      <p className="text-sm text-[var(--muted)]">총 {total}명</p>

      <div className="overflow-x-auto rounded-2xl bg-[var(--panel)] ring-1 ring-black/5">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--canvas)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">이메일</th>
              <th className="px-4 py-3">플랜</th>
              <th className="px-4 py-3">AI</th>
              <th className="px-4 py-3">구글</th>
              <th className="px-4 py-3">동작</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-black/5">
                <td className="px-4 py-3">
                  <div className="font-medium">{user.email ?? "(이메일 없음)"}</div>
                  <div className="text-xs text-[var(--muted)]">{user.clerkId}</div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={user.plan}
                    disabled={busyId === user.id}
                    onChange={(e) => void patch(user.id, { plan: e.target.value })}
                    className="rounded-lg border border-[var(--line)] bg-white px-2 py-1"
                  >
                    {PLANS.map((plan) => (
                      <option key={plan} value={plan}>
                        {plan}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">{user.aiUsedMonth}</td>
                <td className="px-4 py-3">{user.googleUsedMonth}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={busyId === user.id}
                    onClick={() => void patch(user.id, { resetUsage: true })}
                    className="text-sm font-semibold text-[var(--brand)] disabled:opacity-50"
                  >
                    사용량 리셋
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
