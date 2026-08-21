import Link from "next/link";
import { EmptyState } from "@/components/empty-state";

type FeaturePlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  showCreatorSubnav?: boolean;
};

export function FeaturePlaceholder({
  eyebrow,
  title,
  description,
}: FeaturePlaceholderProps) {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
        {eyebrow}
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--ink)]">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-[var(--muted)]">{description}</p>
      <div className="mt-10">
        <EmptyState
          title="곧 제공됩니다"
          description="이 기능은 다음 배포 단계에서 연결됩니다. 그동안 키워드 분석과 Copilot을 이용하세요."
          action={{ href: "/analyze", label: "키워드 분석으로 이동" }}
        />
      </div>
      <p className="mt-6 text-sm text-[var(--muted)]">
        플랜·한도가 궁금하면{" "}
        <Link href="/shop" className="font-semibold text-[var(--brand)]">
          플랜 보기
        </Link>
      </p>
    </div>
  );
}
