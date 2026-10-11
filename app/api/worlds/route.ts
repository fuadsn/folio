import { db, failure } from "../../../lib/server";
import {
  DIRECTORY_PAGE_SIZE,
  directoryQuery,
  directorySQL,
  directoryBindings,
  worldCardSchema,
} from "../../../lib/directory";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const { q, page } = directoryQuery.parse({
      q: params.get("q") ?? "",
      page: params.get("page") ?? 0,
    });
    const { results } = await db()
      .prepare(directorySQL)
      .bind(...directoryBindings(q, page))
      .all();
    return Response.json(
      {
        worlds: results
          .slice(0, DIRECTORY_PAGE_SIZE)
          .map((row) => worldCardSchema.parse(row)),
        hasMore: results.length > DIRECTORY_PAGE_SIZE,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
