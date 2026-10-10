/** Keep balance changes and their idempotency records in one D1 transaction. */
export async function reserveGeneration(
  database: D1Database,
  user: string,
  id: string,
  prompt: string,
) {
  const results = await database.batch([
    database
      .prepare(
        "INSERT INTO generations(id,owner,prompt,status,created_at) SELECT ?,?,?,'running',? WHERE EXISTS(SELECT 1 FROM wallets WHERE owner=? AND credits>0)",
      )
      .bind(id, user, prompt, new Date().toISOString(), user),
    database
      .prepare(
        "UPDATE wallets SET credits=credits-1 WHERE owner=? AND changes()=1 RETURNING credits",
      )
      .bind(user),
  ]);
  return results[1].results[0] as { credits: number } | undefined;
}

export async function refundGeneration(
  database: D1Database,
  user: string,
  id: string,
  error: string,
) {
  await database.batch([
    database
      .prepare(
        "UPDATE wallets SET credits=credits+1 WHERE owner=? AND EXISTS(SELECT 1 FROM generations WHERE id=? AND owner=? AND status='running')",
      )
      .bind(user, id, user),
    database
      .prepare(
        "UPDATE generations SET status='failed',error=? WHERE id=? AND owner=? AND status='running'",
      )
      .bind(error, id, user),
  ]);
}

export async function grantPurchase(
  database: D1Database,
  user: string,
  sessionId: string,
  credits: number,
) {
  await database.batch([
    database
      .prepare("INSERT OR IGNORE INTO wallets(owner,credits) VALUES(?,3)")
      .bind(user),
    database
      .prepare(
        "INSERT OR IGNORE INTO purchases(session_id,owner,credits,created_at) VALUES(?,?,?,?)",
      )
      .bind(sessionId, user, credits, new Date().toISOString()),
    database
      .prepare(
        "UPDATE wallets SET credits=credits+? WHERE owner=? AND changes()=1",
      )
      .bind(credits, user),
  ]);
}
