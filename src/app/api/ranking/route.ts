import { NextRequest, NextResponse } from "next/server";
import { fetchNaverBlogRanking } from "@/lib/ranking/naver";

export async function GET(request: NextRequest) {
  const keyword = (request.nextUrl.searchParams.get("keyword") ?? "").trim();
  const platform = (request.nextUrl.searchParams.get("platform") ?? "all") as
    | "all"
    | "naver"
    | "tistory";
  const topN = Number(request.nextUrl.searchParams.get("topN") ?? 20);

  if (!keyword) {
    return NextResponse.json({ error: "키워드를 입력해 주세요." }, { status: 400 });
  }

  if (platform === "tistory") {
    return NextResponse.json(
      {
        error: "티스토리 순위 실검색은 아직 지원되지 않습니다. 네이버를 선택해 주세요.",
      },
      { status: 400 },
    );
  }

  try {
    const { entries, totalCount } = await fetchNaverBlogRanking(keyword, topN);
    return NextResponse.json({
      keyword,
      platform: "naver",
      source: "live",
      totalCount,
      entries,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "블로그 순위 조회에 실패했습니다.",
      },
      { status: 502 },
    );
  }
}
