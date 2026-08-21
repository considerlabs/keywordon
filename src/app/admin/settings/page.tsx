"use client";

import { useEffect, useState } from "react";

type SettingRow = {
  key: string;
  configured: boolean;
  source: "db" | "env" | "none";
  preview: string | null;
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [encryptionReady, setEncryptionReady] = useState(false);
  const [note, setNote] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/settings");
    const json = (await res.json()) as {
      settings?: SettingRow[];
      encryptionReady?: boolean;
      note?: string;
      error?: string;
    };
    if (!res.ok) {
      setMessage(json.error ?? "설정을 불러오지 못했습니다.");
      return;
    }
    setSettings(json.settings ?? []);
    setEncryptionReady(Boolean(json.encryptionReady));
    setNote(json.note ?? "");
    setMessage("");
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  async function save(key: string, value: string) {
    setBusyKey(key);
    try {
      const res = await fetch(`/api/admin/settings/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(json.error ?? "저장 실패");
        return;
      }
      setDrafts((prev) => ({ ...prev, [key]: "" }));
      await load();
      setMessage(value.trim() ? `${key} 저장됨` : `${key} DB 오버라이드 삭제됨`);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">설정</h1>
        <p className="mt-2 text-[var(--muted)]">
          API 키·시크릿을 DB에 암호화 저장합니다. 저장 후 평문 전체는 다시 볼 수 없습니다.
        </p>
        {note ? <p className="mt-2 text-sm text-amber-800">{note}</p> : null}
        {!encryptionReady ? (
          <p className="mt-2 text-sm text-rose-700">
            SETTINGS_ENCRYPTION_KEY가 없어 저장할 수 없습니다. Vercel env에 추가하세요.
          </p>
        ) : null}
      </div>

      {message ? <p className="text-sm text-[var(--brand-ink)]">{message}</p> : null}

      <div className="space-y-3">
        {settings.map((row) => (
          <div
            key={row.key}
            className="rounded-2xl bg-[var(--panel)] p-4 ring-1 ring-black/5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <code className="text-sm font-semibold">{row.key}</code>
              <span className="text-xs text-[var(--muted)]">
                {row.configured
                  ? `${row.source} · ${row.preview ?? "****"}`
                  : "미설정"}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="password"
                autoComplete="off"
                placeholder="새 값 (비우면 삭제)"
                value={drafts[row.key] ?? ""}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [row.key]: e.target.value }))
                }
                className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={!encryptionReady || busyKey === row.key}
                onClick={() => void save(row.key, drafts[row.key] ?? "")}
                className="rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                저장
              </button>
              <button
                type="button"
                disabled={!encryptionReady || busyKey === row.key || row.source !== "db"}
                onClick={() => void save(row.key, "")}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[var(--muted)] ring-1 ring-black/10 disabled:opacity-40"
              >
                DB 삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
