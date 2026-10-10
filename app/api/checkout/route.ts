import { env } from "cloudflare:workers";
import { owner, checkOrigin, failure } from "../../../lib/server";
import { stripe, CREDIT_PACK } from "../../../lib/payments";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await owner();
    if (
      !env.STRIPE_PRICE_ID ||
      !env.STRIPE_WEBHOOK_SECRET ||
      !env.STRIPE_SECRET_KEY
    )
      return Response.json(
        { error: "Credit purchases are not connected yet." },
        { status: 503 },
      );
    const origin = new URL(request.url).origin;
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
      metadata: {
        purpose: "worldfolio_credits",
        owner: user,
        credits: String(CREDIT_PACK),
      },
    });
    if (!session.url) throw new Error("Checkout could not be opened.");
    return Response.json({ url: session.url });
  } catch (error) {
    return failure(error);
  }
}
