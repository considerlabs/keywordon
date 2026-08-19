import { NextResponse } from "next/server";
import { getRealtimeTrends } from "@/lib/keyword-engine";

export async function GET() {
  const trends = getRealtimeTrends();
  return NextResponse.json({
    updatedAt: new Date().toISOString(),
    items: trends,
  });
}