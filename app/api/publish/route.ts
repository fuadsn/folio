import { db, owner, checkOrigin, failure } from "../../../lib/server";
import { essentialStatus, worldSchema } from "../../../lib/world";
import { z } from "zod";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await owner();
    const { revision } = z
      .object({ revision: z.number().int().nonnegative() })
      .parse(await request.json());
    const row = await db()
      .prepare("SELECT * FROM worlds WHERE owner=?")
      .bind(user)
      .first();
    if (!row || row.revision !== revision)
      return Response.json(
        { error: "Save your latest changes before publishing." },
        { status: 409 },
      );
    const world = worldSchema.parse(JSON.parse(row.draft as string));
    const missing = essentialStatus(world).filter((x) => !x.done);
    if (missing.length)
      return Response.json(
        {
          error: `Add content for ${missing.map((x) => x.label).join(", ")} before publishing.`,
        },
        { status: 400 },
      );
    const now = new Date().toISOString();
    const r = await db()
      .prepare(
        "UPDATE worlds SET published=draft,published_at=? WHERE owner=? AND revision=?",
      )
      .bind(now, user, revision)
      .run();
    if (!r.meta.changes)
      return Response.json(
        { error: "World changed during publishing. Save and try again." },
        { status: 409 },
      );
    return Response.json({ path: `/w/${row.id}`, publishedAt: now });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    const user = await owner();
    await db()
      .prepare(
        "UPDATE worlds SET published=NULL,published_at=NULL WHERE owner=?",
      )
      .bind(user)
      .run();
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
