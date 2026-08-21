"use client";

import { useCallback, useEffect, useState } from "react";

type TrendTopic = {
  rank: number;
  keyword: string;
};

type TrendTopicsProps = {
  onPick: (topic: string) => void;
  onTopicsChange?: (topics: string[]) => void;
};

export function TrendTopics({ onPick, onTopicsChange }: TrendTopicsProps) {
  const [topics, setTopics] = useState<TrendTopic[]>([]);
  const [updatedAt, setUpdatedAt] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadTopics = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/trends");
      if (!response.ok) throw new Error("트렌드를 불러오지 못했습니다.");

      const payload = (await response.json()) as {
        items?: TrendTopic[];
        updatedAt?: string;
      };
      const items = Array.isArray(payload.items) ? payload.items : [];
      setTopics(items);
      onTopicsChange?.(items.map((item) => item.keyword));
      setUpdatedAt(payload.updatedAt ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "트렌드를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [onTopicsChange]);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/trends")
      .then(async (response) => {
        if (!response.ok) throw new Error("트렌드를 불러오지 못했습니다.");
        return (await response.json()) as { items?: TrendTopic[]; updatedAt?: string };
      })
      .then((payload) => {
        if (!isMounted) return;
        const items = Array.isArray(payload.items) ? payload.items : [];
        setTopics(items);
        onTopicsChange?.(items.map((item) => item.keyword));
        setUpdatedAt(payload.updatedAt ?? "");
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "트렌드를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [onTopicsChange]);

  const timeLabel = updatedAt
    ? new Date(updatedAt).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">지금 주목받는 주제</p>
          {timeLabel ? <p className="mt-1 text-xs text-[var(--muted)]">{timeLabel} 기준</p> : null}
        </div>
        <button
          type="button"
          onClick={() => void loadTopics()}
          disabled={isLoading}
          className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)] transition hover:border-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "불러오는 중" : "새로고침"}
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-[var(--accent)]">{error}</p> : null}

      {!error && !isLoading && topics.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">표시할 트렌드가 없습니다.</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {topics.map((topic) => (
          <button
            key={topic.keyword}
            type="button"
            onClick={() => onPick(topic.keyword)}
            className="rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-left text-sm text-[var(--ink)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            <span className="mr-1.5 text-xs font-semibold text-[var(--brand)]">{topic.rank}</span>
            {topic.keyword}
          </button>
        ))}
      </div>
    </section>
  );
}
