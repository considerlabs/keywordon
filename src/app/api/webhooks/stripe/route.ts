import { NextRequest, NextResponse } from "next/server";
import { getStripe, planFromStripePrice } from "@/lib/stripe";
import { setUserPlan } from "@/lib/db/users";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe webhook 미설정" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "signature missing" }, { status: 400 });
  }

  const payload = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "invalid signature" },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const clerkId = session.metadata?.clerkId;
    const planId = session.metadata?.planId;
    if (clerkId && planId) {
      await setUserPlan(clerkId, planId as "basic" | "super" | "enterprise");
    }
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object;
    const priceId = subscription.items.data[0]?.price.id;
    const planId = planFromStripePrice(priceId);
    const clerkId = subscription.metadata?.clerkId;
    if (clerkId && planId) {
      await setUserPlan(clerkId, planId);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const clerkId = subscription.metadata?.clerkId;
    if (clerkId) {
      await setUserPlan(clerkId, "free");
    }
  }

  return NextResponse.json({ received: true });
}