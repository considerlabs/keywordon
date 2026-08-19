import { NextRequest, NextResponse } from "next/server";
import { discoverKeywords } from "@/lib/keyword-engine";

export async function GET(request: NextRequest) {
  const seed = request.nextUrl.searchParams.get("q")?.trim() ?? "마케팅";
  const items = discoverKeywords(seed);
  return NextResponse.json({ seed, items });
}