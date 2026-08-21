"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CREATOR_SUBNAV, isNavActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function CreatorSubnav() {
  const pathname = usePathname();
  return (
    <div className="border-b border-[var(--line)] bg-[var(--surface)]">
      <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-5">
        {CREATOR_SUBNAV.map((item) => {
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition",
                active
                  ? "border-[var(--brand)] text-[var(--brand-ink)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
