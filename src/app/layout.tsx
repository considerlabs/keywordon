import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Outfit, Source_Sans_3 } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  const shell = (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );

  return (
    <html
      lang="ko"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {isClerkConfigured() ? <ClerkProvider>{shell}</ClerkProvider> : shell}
      </body>
    </html>
  );
}