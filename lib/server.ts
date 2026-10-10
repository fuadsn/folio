import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../app/chatgpt-auth";
export function db() {
  if (!env.DB)
    throw new Error(
      "Database is unavailable. Apply the local migration before starting.",
    );
  return env.DB;
}
export function bucket() {
  if (!env.BUCKET) throw new Error("Asset storage is unavailable.");
  return env.BUCKET;
}
export async function owner() {
  const user = await getChatGPTUser();
  if (!user) throw new Response("Sign in to continue.", { status: 401 });
  return user.userId;
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    throw new Response("Cross-origin write rejected.", { status: 403 });
}
export function failure(error: unknown) {
  if (error instanceof Response) return error;
  return Response.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Unable to complete this request.",
    },
    { status: 400 },
  );
}
export async function checkAssets(
  world: { objects: { asset?: string }[] },
  user: string,
) {
  for (const id of new Set(world.objects.map((x) => x.asset).filter(Boolean))) {
    const row = await db()
      .prepare("SELECT id FROM assets WHERE id=? AND owner=?")
      .bind(id, user)
      .first();
    if (!row) throw new Error("This world references a model you do not own.");
  }
}
