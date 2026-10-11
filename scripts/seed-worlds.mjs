import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { demoWorlds, demoSeedSQL } from "./demo-worlds.mjs";

const args = process.argv.slice(2);
if (args.length && !(args.length === 2 && args[0] === "--persist-to" && !args[1].startsWith("--")))
  throw new Error("Usage: npm run seed:worlds -- [--persist-to <local-state-directory>]. Remote seeding is not supported.");
const root = fileURLToPath(new URL("../", import.meta.url));
const state = resolve(root, args[1] ?? ".wrangler/state");
const temporary = mkdtempSync(join(tmpdir(), "worldfolio-demo-seed-"));
const config = join(temporary, "wrangler.json");
writeFileSync(config, JSON.stringify({
  name: "worldfolio-local-demo-seed", compatibility_date: "2026-05-15",
  d1_databases: [{ binding: "DB", database_name: "site-creator-d1", database_id: "00000000-0000-4000-8000-000000000000" }],
}));
function execute(sql) {
  const file = join(temporary, "seed.sql");
  writeFileSync(file, sql);
  const result = spawnSync(process.execPath, [
    "--import", "./scripts/sites-env.mjs", "node_modules/wrangler/bin/wrangler.js",
    "d1", "execute", "DB", "--local", "--config", config, "--persist-to", state, "--file", file, "--json",
  ], { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Local seeding failed. Initialize the local database using README first.\n${result.stderr || result.stdout}`);
  return JSON.parse(result.stdout);
}
try {
  const select = `SELECT id,owner FROM worlds WHERE id IN (${demoWorlds.map((d) => `'${d.id}'`).join(",")}) OR owner IN (${demoWorlds.map((d) => `'${d.owner}'`).join(",")});`;
  const existing = execute(select)[0].results;
  if (existing.some((row) => !demoWorlds.some((d) => d.id === row.id && d.owner === row.owner)))
    throw new Error("A demo ID or owner is already used by another record. Nothing was changed.");
  execute(demoSeedSQL());
  if (execute(select)[0].results.length !== demoWorlds.length)
    throw new Error("Could not verify all three demo records. Existing worlds were not overwritten.");
  console.log(`Local samples: ${demoWorlds.length - existing.length} added, ${existing.length} already present (left unchanged).`);
  for (const { id, world } of demoWorlds) console.log(`${world.name}: http://127.0.0.1:5173/w/${id}`);
  console.log("Open http://127.0.0.1:5173/discover. Your own draft and publication were not changed. No deployment performed.");
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
