import { db } from "../../../lib/server";
import { notFound } from "next/navigation";
import Viewer from "../../viewer";
import { worldSchema } from "../../../lib/world";
export const dynamic = "force-dynamic";
export default async function WorldPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await db()
    .prepare(
      "SELECT published FROM worlds WHERE id=? AND published IS NOT NULL",
    )
    .bind(id)
    .first();
  if (!row) notFound();
  return (
    <Viewer
      world={worldSchema.parse(JSON.parse(row.published as string))}
      worldId={id}
    />
  );
}
