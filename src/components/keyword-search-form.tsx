"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Engine } from "@/lib/keyword-engine";

interface KeywordSearchFormProps {
  initialKeyword?: string;
  initialEngine?: Engine;
  size?: "hero" | "compact";
  className?: string;
}

export function KeywordSearchForm({
  initialKeyword = "",
  initialEngine = "naver",
  size = "hero",
  className,
}: KeywordSearchFormProps) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(initialKeyword);
  const [engine, setEngine] = useState<Engine>(initialEngine);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const q = keyword.trim();
    if (!q) return;
    router.push(`/analyze?q=${encodeURIComponent(q)}&engine=${engine}`);
  }

  const hero = size === "hero";

  return (
    <form
      onSubmit={onSubmit}
      className={cn("w-full", className)}
      aria-label="키워드 검색"
    >
      <div className="mb-3 flex gap-2">
        {(["naver", "google"] as Engine[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setEngine(value)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
              engine === value
                ? "bg-[var(--ink)] text-white"
                : "bg-white/70 text-[var(--muted)] ring-1 ring-black/10 hover:text-[var(--ink)]",
            )}
          >
            {value === "naver" ? "네이버" : "구글"}
          </button>
        ))}
      </div>

      <div
        className={cn(
          "flex items-stretch overflow-hidden rounded-2xl bg-white shadow-[0_20px_50px_rgba(15,40,50,0.12)] ring-1 ring-black/8",
          hero ? "min-h-16" : "min-h-12",
        )}
      >
        <div className="flex flex-1 items-center gap-3 px-4">
          <Search className="h-5 w-5 shrink-0 text-[var(--brand)]" />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="분석할 키워드를 입력하세요"
            className={cn(
              "w-full bg-transparent outline-none placeholder:text-[var(--muted)]",
              hero ? "text-lg" : "text-base",
            )}
          />
        </div>
        <button
          type="submit"
          className={cn(
            "shrink-0 bg-[var(--brand)] font-semibold text-white transition hover:bg-[var(--brand-ink)]",
            hero ? "px-8 text-base" : "px-5 text-sm",
          )}
        >
          분석하기
        </button>
      </div>
    </form>
  );
}