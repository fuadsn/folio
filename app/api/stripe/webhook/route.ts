import Stripe from "stripe";
import { env } from "cloudflare:workers";
import { db } from "../../../../lib/server";
import { stripe, CREDIT_PACK } from "../../../../lib/payments";
import { grantPurchase } from "../../../../lib/credits";

export async function POST(request: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY)
    return Response.json(
      { error: "Payments are not configured." },
      { status: 503 },
    );
  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(
      await request.text(),
      request.headers.get("stripe-signature") || "",
      env.STRIPE_WEBHOOK_SECRET,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch {
    return Response.json(
      { error: "Invalid webhook signature." },
      { status: 400 },
    );
  }
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  )
    return Response.json({ received: true });
  const session = event.data.object as Stripe.Checkout.Session;
  const user = session.metadata?.owner;
  if (
    session.mode !== "payment" ||
    session.payment_status !== "paid" ||
    session.metadata?.purpose !== "worldfolio_credits" ||
    session.metadata?.credits !== String(CREDIT_PACK) ||
    !user
  )
    return Response.json({ received: true });
  try {
    // A single transaction: Stripe retries cannot grant the same pack twice.
    await grantPurchase(db(), user, session.id, CREDIT_PACK);
    return Response.json({ received: true });
  } catch {
    // Non-2xx asks Stripe to retry a transient storage failure.
    return Response.json(
      { error: "Could not apply credits yet." },
      { status: 500 },
    );
  }
}
