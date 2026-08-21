import Stripe from "stripe";
import { PAID_PLANS, PLANS, type PlanId } from "./plans";
import { getSetting } from "./settings/store";

export async function getStripe() {
  const key = await getSetting("STRIPE_SECRET_KEY");
  if (!key) return null;
  return new Stripe(key);
}

export async function resolveStripePriceId(planId: PlanId, interval: "monthly" | "yearly") {
  const plan = PLANS[planId];
  const envName = plan.stripePriceEnv?.[interval];
  if (!envName) return null;
  return (await getSetting(envName)) ?? null;
}

export async function planFromStripePrice(
  priceId: string | undefined | null,
): Promise<PlanId | null> {
  if (!priceId) return null;
  for (const id of PAID_PLANS) {
    const monthly = await resolveStripePriceId(id, "monthly");
    const yearly = await resolveStripePriceId(id, "yearly");
    if (priceId === monthly || priceId === yearly) return id;
  }
  return null;
}

export async function stripeConfigured() {
  return Boolean(await getSetting("STRIPE_SECRET_KEY"));
}