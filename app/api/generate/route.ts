import { env } from "cloudflare:workers";
import { db, owner, checkOrigin, failure } from "../../../lib/server";
import { provider, generateBlueprint } from "../../../lib/generate";
import { z } from "zod";
import { reserveGeneration, refundGeneration } from "../../../lib/credits";
async function wallet(user: string) {
  await db()
    .prepare("INSERT OR IGNORE INTO wallets(owner,credits) VALUES(?,3)")
    .bind(user)
    .run();
}
async function refund(user: string, id: string, error: string) {
  await refundGeneration(db(), user, id, error);
}
export async function GET() {
  try {
    const user = await owner();
    await wallet(user);
    const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const stale = await db()
      .prepare(
        "SELECT id FROM generations WHERE owner=? AND status='running' AND created_at<?",
      )
      .bind(user, cutoff)
      .all<{ id: string }>();
    for (const row of stale.results)
      await refund(
        user,
        row.id,
        "Generation was interrupted. Your credit has been restored.",
      );
    const row = await db()
      .prepare("SELECT credits FROM wallets WHERE owner=?")
      .bind(user)
      .first();
    const creations = await db()
      .prepare(
        "SELECT id,prompt,status,result,error FROM generations WHERE owner=? ORDER BY created_at DESC LIMIT 20",
      )
      .bind(user)
      .all();
    return Response.json({
      provider: provider(),
      credits: row!.credits,
      checkout: !!(
        env.STRIPE_SECRET_KEY &&
        env.STRIPE_PRICE_ID &&
        env.STRIPE_WEBHOOK_SECRET
      ),
      creations: creations.results.map((r) => ({
        ...r,
        result: r.result ? JSON.parse(r.result as string) : null,
      })),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  let user = "",
    id = "",
    reserved = false;
  try {
    checkOrigin(request);
    user = await owner();
    const input = z
      .object({
        id: z.string().uuid(),
        prompt: z.string().trim().min(8).max(1500),
      })
      .parse(await request.json());
    id = input.id;
    if (!provider())
      return Response.json(
        {
          error:
            "The AI studio is not connected yet. Add a server API key to enable custom generation.",
        },
        { status: 503 },
      );
    await wallet(user);
    const existing = await db()
      .prepare("SELECT * FROM generations WHERE id=? AND owner=?")
      .bind(id, user)
      .first();
    if (existing) {
      if (existing.status === "complete")
        return Response.json({
          blueprint: JSON.parse(existing.result as string),
        });
      return Response.json(
        {
          error:
            existing.status === "running"
              ? "This creation is still being built. Check My creations shortly."
              : "This attempt failed. Start a new generation.",
        },
        { status: 409 },
      );
    }
    const balance = await reserveGeneration(db(), user, id, input.prompt);
    if (!balance)
      return Response.json(
        { error: "You have no studio credits left." },
        { status: 402 },
      );
    reserved = true;
    const blueprint = await generateBlueprint(input.prompt);
    const result = await db()
      .prepare(
        "UPDATE generations SET status='complete',result=? WHERE id=? AND owner=? AND status='running'",
      )
      .bind(JSON.stringify(blueprint), id, user)
      .run();
    if (!result.meta.changes)
      throw new Error("Generation expired. Start again.");
    return Response.json({ blueprint, credits: balance.credits });
  } catch (e) {
    if (reserved)
      await refund(
        user,
        id,
        e instanceof Error ? e.message : "Generation failed.",
      );
    return failure(e);
  }
}
