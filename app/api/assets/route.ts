import { db, owner, bucket, checkOrigin, failure } from "../../../lib/server";
function validateGlb(bytes: ArrayBuffer) {
  const view = new DataView(bytes);
  if (
    bytes.byteLength < 20 ||
    view.getUint32(0, true) !== 0x46546c67 ||
    view.getUint32(4, true) !== 2 ||
    view.getUint32(8, true) !== bytes.byteLength
  )
    throw new Error("Upload a valid, self-contained GLB 2.0 model.");
  const len = view.getUint32(12, true);
  if (view.getUint32(16, true) !== 0x4e4f534a || len > bytes.byteLength - 20)
    throw new Error("Invalid GLB JSON chunk.");
  const data = JSON.parse(
    new TextDecoder().decode(new Uint8Array(bytes, 20, len)),
  );
  if (
    [...(data.images ?? []), ...(data.buffers ?? [])].some(
      (r: { uri?: string }) => r.uri && !r.uri.startsWith("data:"),
    )
  )
    throw new Error(
      "Use a GLB with embedded textures; external asset links are not supported.",
    );
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await owner();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size > 15 * 1024 * 1024)
      throw new Error("Choose a GLB model smaller than 15 MB.");
    const bytes = await file.arrayBuffer();
    validateGlb(bytes);
    const count = await db()
      .prepare("SELECT COUNT(*) as n FROM assets WHERE owner=?")
      .bind(user)
      .first<{ n: number }>();
    if ((count?.n ?? 0) >= 30)
      throw new Error("This demo allows 30 uploaded models per account.");
    const id = crypto.randomUUID();
    await bucket().put(id, bytes, {
      httpMetadata: { contentType: "model/gltf-binary" },
    });
    await db()
      .prepare("INSERT INTO assets(id,owner,name,created_at) VALUES(?,?,?,?)")
      .bind(id, user, file.name.slice(0, 100), new Date().toISOString())
      .run();
    return Response.json({ id, name: file.name });
  } catch (e) {
    return failure(e);
  }
}
