import { db, bucket } from "../../../../lib/server";
import { getChatGPTUser } from "../../../chatgpt-auth";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id))
    return new Response("Not found", { status: 404 });
  const row = await db()
    .prepare("SELECT owner FROM assets WHERE id=?")
    .bind(id)
    .first();
  if (!row) return new Response("Not found", { status: 404 });
  const user = await getChatGPTUser();
  if (user?.userId !== row.owner) {
    const world = await db()
      .prepare(
        "SELECT published FROM worlds WHERE owner=? AND published IS NOT NULL",
      )
      .bind(row.owner)
      .first();
    if (
      !world ||
      !JSON.parse(world.published as string).objects.some(
        (o: { asset?: string }) => o.asset === id,
      )
    )
      return new Response("Not found", { status: 404 });
  }
  const file = await bucket().get(id);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(file.body, {
    headers: {
      "Content-Type": "model/gltf-binary",
      "Cache-Control": "private, max-age=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
