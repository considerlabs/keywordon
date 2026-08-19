"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Link from "next/link";
import type { AnalysisViewModel } from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/utils";

export type { AnalysisViewModel };

function Metric({
  label,
  value,
  hint,
  locked,
}: {
  label: string;
  value: string;
  hint?: string;
  locked?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-[var(--panel)] p-5 ring-1 ring-black/5">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--ink)]">
        {locked ? "잠김" : value}
      </p>
      {locked ? (
        <Link href="/shop" className="mt-1 inline-block text-xs font-semibold text-[var(--brand)]">
          플랜 업그레이드
        </Link>
      ) : hint ? (
        <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5">
      <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--ink)]">
        {title}
      </h3>
      {description ? (
        <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
      ) : null}
    </div>
  );
}

export function AnalysisDashboard({ data }: { data: AnalysisViewModel }) {
  const changePositive = data.volumeChangeRate >= 0;
  const locked = data.locked;

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-bold text-[var(--brand-ink)]">
                {data.engine === "naver" ? "네이버" : "구글"}
              </span>
              <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                {data.category} · {data.subcategory}
              </span>
              {data.dataSource ? (
                <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                  {data.dataSource === "live" ? "실데이터" : "시뮬레이션"}
                </span>
              ) : null}
              {data.planName ? (
                <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                  {data.planName}
                </span>
              ) : null}
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--ink)] md:text-4xl">
              {data.keyword}
            </h1>
            <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-[var(--muted)]">
              {data.summary}
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--brand)] px-5 py-4 text-white shadow-[0_16px_40px_rgba(13,115,119,0.3)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
              기회지수
            </p>
            <p className="font-[family-name:var(--font-display)] text-4xl font-bold">
              {locked?.opportunityScore ? "—" : data.opportunityScore}
              <span className="text-lg font-medium text-white/70"> / 30</span>
            </p>
            {locked?.opportunityScore ? (
              <Link href="/shop" className="mt-1 inline-block text-xs text-white/90 underline">
                베이직 이상
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="월간 검색량"
          value={formatNumber(data.monthlyVolume)}
          hint={`PC ${formatNumber(data.pcVolume)} · Mobile ${formatNumber(data.mobileVolume)}`}
        />
        <Metric
          label="검색량 변동"
          value={`${changePositive ? "+" : ""}${data.volumeChangeRate}%`}
          hint="전월 대비"
        />
        <Metric
          label="CPC 단가"
          value={
            data.cpc === null || data.cpc === undefined
              ? "—"
              : data.cpc === 0
                ? "0원"
                : formatCurrency(data.cpc)
          }
          hint={data.adCompetition ? `광고 경쟁: ${data.adCompetition}` : undefined}
          locked={locked?.cpc}
        />
        <Metric
          label="이슈성"
          value={data.issueLevel ?? "—"}
          hint={data.issueScore != null ? `이슈 스코어 ${data.issueScore}` : undefined}
          locked={locked?.issueInfo}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5">
          <SectionTitle
            title="월간 검색량 추이"
            description="최근 12개월 PC/Mobile 검색량 변화"
          />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyTrend}>
                <defs>
                  <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0D7377" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0D7377" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7e0e2" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#7a8b90" />
                <YAxis tick={{ fontSize: 11 }} stroke="#7a8b90" />
                <Tooltip
                  formatter={(value) => formatNumber(Number(value ?? 0))}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.08)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="#0D7377"
                  strokeWidth={2.5}
                  fill="url(#volumeFill)"
                  name="검색량"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5">
          <SectionTitle title="연령 분포" description="추정 검색 유저 연령대" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.ageDistribution} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7e0e2" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#7a8b90" unit="%" />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={48}
                  tick={{ fontSize: 12 }}
                  stroke="#7a8b90"
                />
                <Tooltip
                  formatter={(value) => `${value}%`}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.08)",
                  }}
                />
                <Bar dataKey="value" fill="#E85D04" radius={[0, 8, 8, 0]} name="비율" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5">
          <SectionTitle
            title="콘텐츠 발행량"
            description="블로그 · 카페 · 지식인 기준 추정 발행량"
          />
          {locked?.contentVolume || !data.content ? (
            <div className="rounded-2xl bg-[var(--canvas)] px-4 py-8 text-center text-sm text-[var(--muted)]">
              베이직 이상 플랜에서 콘텐츠 발행량을 확인할 수 있습니다.{" "}
              <Link href="/shop" className="font-semibold text-[var(--brand)]">
                업그레이드
              </Link>
            </div>
          ) : (
          <div className="space-y-3">
            {[
              ["총 문서", data.content.totalDocs],
              ["블로그 (월/누적)", `${formatNumber(data.content.blogMonthly)} / ${formatNumber(data.content.blogTotal)}`],
              ["카페 (월/누적)", `${formatNumber(data.content.cafeMonthly)} / ${formatNumber(data.content.cafeTotal)}`],
              ["지식인 (월/누적)", `${formatNumber(data.content.kinMonthly)} / ${formatNumber(data.content.kinTotal)}`],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="flex items-center justify-between rounded-xl bg-[var(--canvas)] px-4 py-3"
              >
                <span className="text-sm text-[var(--muted)]">{label}</span>
                <span className="font-semibold text-[var(--ink)]">{value}</span>
              </div>
            ))}
          </div>
          )}
        </div>

        <div className="rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5">
          <SectionTitle title="검색어 분포" description="성별 · 디바이스 비율" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-[var(--canvas)] p-4">
              <p className="mb-3 text-sm font-semibold text-[var(--ink)]">성별</p>
              <div className="mb-2 flex h-3 overflow-hidden rounded-full">
                <div
                  className="bg-[var(--brand)]"
                  style={{ width: `${data.genderRatio.male}%` }}
                />
                <div
                  className="bg-[var(--accent)]"
                  style={{ width: `${data.genderRatio.female}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-[var(--muted)]">
                <span>남 {data.genderRatio.male}%</span>
                <span>여 {data.genderRatio.female}%</span>
              </div>
            </div>
            <div className="rounded-2xl bg-[var(--canvas)] p-4">
              <p className="mb-3 text-sm font-semibold text-[var(--ink)]">디바이스</p>
              <div className="mb-2 flex h-3 overflow-hidden rounded-full">
                <div
                  className="bg-[var(--ink)]"
                  style={{ width: `${data.deviceRatio.pc}%` }}
                />
                <div
                  className="bg-[var(--brand)]"
                  style={{ width: `${data.deviceRatio.mobile}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-[var(--muted)]">
                <span>PC {data.deviceRatio.pc}%</span>
                <span>Mobile {data.deviceRatio.mobile}%</span>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-3 text-sm font-semibold text-[var(--ink)]">
              비슷한 유저가 이어서 찾은 검색어
            </p>
            <div className="flex flex-wrap gap-2">
              {data.nextKeywords.map((keyword) => (
                <a
                  key={keyword}
                  href={`/analyze?q=${encodeURIComponent(keyword)}&engine=${data.engine}`}
                  className="rounded-full bg-[var(--canvas)] px-3 py-1.5 text-sm text-[var(--ink)] ring-1 ring-black/5 transition hover:bg-[var(--brand-soft)] hover:text-[var(--brand-ink)]"
                >
                  {keyword}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <RelatedList
          title="연관 검색어 (KeywordOn)"
          description="내부 빅데이터 기반 확장 키워드"
          items={data.relatedInternal}
          engine={data.engine}
        />
        <RelatedList
          title="연관 검색어 (SERP)"
          description="검색결과 페이지 기반 연관어"
          items={data.relatedSerp}
          engine={data.engine}
        />
      </section>

      <section className="rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5">
        <SectionTitle
          title="카테고리 인기 스마트블록 검색어"
          description="유사 카테고리에서 자주 노출되는 검색어"
        />
        <div className="flex flex-wrap gap-2">
          {data.smartBlockKeywords.map((keyword) => (
            <a
              key={keyword}
              href={`/analyze?q=${encodeURIComponent(keyword)}&engine=${data.engine}`}
              className="rounded-xl bg-[var(--canvas)] px-4 py-2 text-sm font-medium text-[var(--ink)] ring-1 ring-black/5 transition hover:bg-[var(--brand)] hover:text-white"
            >
              {keyword}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

function RelatedList({
  title,
  description,
  items,
  engine,
}: {
  title: string;
  description: string;
  items: AnalysisViewModel["relatedInternal"];
  engine: AnalysisViewModel["engine"];
}) {
  return (
    <div className="rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5">
      <SectionTitle title={title} description={description} />
      <div className="overflow-hidden rounded-2xl ring-1 ring-black/5">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--canvas)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">키워드</th>
              <th className="px-4 py-3 font-medium">검색량</th>
              <th className="px-4 py-3 font-medium">기회</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.keyword} className="border-t border-black/5">
                <td className="px-4 py-3">
                  <a
                    href={`/analyze?q=${encodeURIComponent(item.keyword)}&engine=${engine}`}
                    className="font-medium text-[var(--ink)] hover:text-[var(--brand)]"
                  >
                    {item.keyword}
                  </a>
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {formatNumber(item.monthlyVolume)}
                </td>
                <td className="px-4 py-3 font-semibold text-[var(--brand-ink)]">
                  {item.opportunityScore}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}