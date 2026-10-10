import { test, expect } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import {
  grantPurchase,
  reserveGeneration,
  refundGeneration,
} from "../lib/credits";
import {
  blueprintSchema,
  essentialStatus,
  starterWorld,
  worldSchema,
  safeUrl,
} from "../lib/world";

function database() {
  const sql = new DatabaseSync(":memory:");
  sql.exec(readFileSync("drizzle/0000_fuzzy_celestials.sql", "utf8"));
  const adapter = {
    prepare(query: string) {
      return {
        query,
        values: [] as any[],
        bind(...values: any[]) {
          this.values = values;
          return this;
        },
      };
    },
    async batch(statements: { query: string; values: any[] }[]) {
      sql.exec("BEGIN");
      try {
        const results = statements.map(({ query, values }) => {
          const statement = sql.prepare(query);
          if (/RETURNING/.test(query))
            return { results: statement.all(...values) };
          statement.run(...values);
          return { results: [] };
        });
        sql.exec("COMMIT");
        return results;
      } catch (e) {
        sql.exec("ROLLBACK");
        throw e;
      }
    },
  } as unknown as D1Database;
  const balance = (owner = "alice") =>
    (
      sql.prepare("SELECT credits FROM wallets WHERE owner=?").get(owner) as
        { credits: number } | undefined
    )?.credits;
  return { sql, adapter, balance };
}

test("one purchase grants one pack even when Stripe retries", async () => {
  const { sql, adapter, balance } = database();
  await grantPurchase(adapter, "alice", "session_1", 10);
  expect(balance()).toBe(13);
  await grantPurchase(adapter, "alice", "session_1", 10);
  expect(balance()).toBe(13);
  await grantPurchase(adapter, "alice", "session_2", 10);
  expect(balance()).toBe(23);
  sql.close();
});

test("generation reservation and refunds are atomic and idempotent", async () => {
  const { sql, adapter, balance } = database();
  sql.prepare("INSERT INTO wallets(owner,credits) VALUES('alice',1)").run();
  expect(await reserveGeneration(adapter, "alice", "first", "A house")).toEqual(
    { credits: 0 },
  );
  expect(
    await reserveGeneration(adapter, "alice", "second", "A tree"),
  ).toBeUndefined();
  expect(balance()).toBe(0);
  await refundGeneration(adapter, "alice", "first", "Provider timeout");
  await refundGeneration(adapter, "alice", "first", "Provider timeout");
  expect(balance()).toBe(1);
  await expect(
    reserveGeneration(adapter, "alice", "first", "A duplicate"),
  ).rejects.toThrow();
  expect(balance()).toBe(1);
  await reserveGeneration(adapter, "alice", "third", "A completed house");
  sql
    .prepare("UPDATE generations SET status='complete' WHERE id='third'")
    .run();
  await refundGeneration(adapter, "alice", "third", "Late timeout");
  expect(balance()).toBe(0);
  sql.close();
});

test("world validation protects limits and requires real portfolio content", () => {
  const world = starterWorld();
  expect(worldSchema.safeParse(world).success).toBe(true);
  expect(essentialStatus(world).every((x) => !x.done)).toBe(true);
  expect(safeUrl("javascript:alert(1)")).toBeNull();
  expect(safeUrl("mailto:hello@example.com")).toBeTruthy();
  world.objects.push(world.objects[0]);
  expect(worldSchema.safeParse(world).success).toBe(false);
  expect(
    blueprintSchema.safeParse({ name: "Unsafe", parts: [{ shape: "script" }] })
      .success,
  ).toBe(false);
});
