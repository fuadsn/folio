import Stripe from "stripe";
import { env } from "cloudflare:workers";

export function stripe() {
  if (!env.STRIPE_SECRET_KEY)
    throw new Error("Payments are not configured yet.");
  return new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export const CREDIT_PACK = 10;
