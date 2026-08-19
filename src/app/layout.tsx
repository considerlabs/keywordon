import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Outfit, Source_Sans_3 } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { isClerkConfigured } from "@/lib/auth";
import "./globals.css";

const display = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "KeywordOn — 키워드 인텔리전스 플랫폼",
  description:
    "네이버·구글 키워드 검색량, 경쟁도, 기회지수, 연관어, AI 글쓰기까지 한 번에.",
};

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-[var(--muted)] md:flex-row md:items-center md:justify-between">
          <p className="font-[family-name:var(--font-display)] font-semibold text-[var(--ink)]">
            KeywordOn
          </p>
          <p>SEO · 콘텐츠 마케팅 · 키워드 발굴 · AI Copilot</p>
        </div>
      </footer>
    </>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  const content = (
    <html
      lang="ko"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );

  if (!isClerkConfigured()) {
    return content;
  }

  return <ClerkProvider>{content}</ClerkProvider>;
}