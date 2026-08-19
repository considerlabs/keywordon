import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { getStripe, resolveStripePriceId, stripeConfigured } from "@/lib/stripe";
import { PAID_PLANS, type PlanId } from "@/lib/plans";

export async function POST(request: NextRequest) {
  const authContext = await getAuthContext();
  if (!authContext.userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (!stripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Stripe가 아직 연동되지 않았습니다. Vercel에서 Stripe 약관 수락 후 연동해 주세요.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    planId?: PlanId;
    interval?: "monthly" | "yearly";
  };

  const planId = body.planId;
  const interval = body.interval ?? "monthly";
  if (!planId || !PAID_PLANS.includes(planId)) {
    return NextResponse.json({ error: "유효하지 않은 플랜입니다." }, { status: 400 });
  }

  const priceId = resolveStripePriceId(planId, interval);
  if (!priceId) {
    return NextResponse.json(
      {
        error: `가격 ID가 없습니다. 환경변수 ${planId.toUpperCase()}용 Stripe Price를 설정하세요.`,
      },
      { status: 503 },
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe 설정 오류" }, { status: 503 });
  }

  const origin = request.nextUrl.origin;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: authContext.email ?? undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/shop?success=1&plan=${planId}`,
    cancel_url: `${origin}/shop?canceled=1`,
    metadata: {
      clerkId: authContext.userId,
      planId,
      interval,
    },
  });

  return NextResponse.json({ url: session.url });
}