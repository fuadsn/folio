import {
  db,
  owner,
  checkOrigin,
  failure,
  checkAssets,
} from "../../../lib/server";
import { starterWorld, worldSchema } from "../../../lib/world";
import { z } from "zod";
export async function GET() {
  try {
    const user = await owner();
    let row = await db()
      .prepare("SELECT * FROM worlds WHERE owner=?")
      .bind(user)
      .first();
    if (!row) {
      const id = crypto.randomUUID();
      await db()
        .prepare(
          "INSERT OR IGNORE INTO worlds(id,owner,draft,revision,updated_at) VALUES(?,?,?,0,?)",
        )
        .bind(
          id,
          user,
          JSON.stringify(starterWorld()),
          new Date().toISOString(),
        )
        .run();
      row = await db()
        .prepare("SELECT * FROM worlds WHERE owner=?")
        .bind(user)
        .first();
    }
    return Response.json({
      id: row!.id,
      world: JSON.parse(row!.draft as string),
      revision: row!.revision,
      publishedAt: row!.published_at,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(request: Request) {
  try {
    checkOrigin(request);
    const user = await owner();
    const body = z
      .object({ world: worldSchema, revision: z.number().int().nonnegative() })
      .parse(await request.json());
    const world = body.world;
    await checkAssets(world, user);
    const result = await db()
      .prepare(
        "UPDATE worlds SET draft=?,revision=revision+1,updated_at=? WHERE owner=? AND revision=?",
      )
      .bind(
        JSON.stringify(world),
        new Date().toISOString(),
        user,
        body.revision,
      )
      .run();
    if (!result.meta.changes)
      return Response.json(
        {
          error:
            "Your world changed in another tab. Export a backup, then reload to get the saved version.",
        },
        { status: 409 },
      );
    return Response.json({ revision: body.revision + 1 });
  } catch (e) {
    return failure(e);
  }
}
