import Stripe from "stripe";
import { PAID_PLANS, PLANS, type PlanId } from "./plans";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export function resolveStripePriceId(planId: PlanId, interval: "monthly" | "yearly") {
  const plan = PLANS[planId];
  const envName = plan.stripePriceEnv?.[interval];
  if (!envName) return null;
  return process.env[envName] ?? null;
}

export function planFromStripePrice(priceId: string | undefined | null): PlanId | null {
  if (!priceId) return null;
  for (const id of PAID_PLANS) {
    const monthly = resolveStripePriceId(id, "monthly");
    const yearly = resolveStripePriceId(id, "yearly");
    if (priceId === monthly || priceId === yearly) return id;
  }
  return null;
}

export const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);