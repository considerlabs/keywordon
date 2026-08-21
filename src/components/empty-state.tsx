import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: {
    href: string;
    label: string;
  };
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-6 py-12 text-center">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--ink)]">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
        {description}
      </p>
      {action ? (
        <Link
          href={action.href}
          className="mt-6 inline-flex rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-ink)]"
        >
          {action.label}
        </Link>
      ) : null}
    </section>
  );
}
