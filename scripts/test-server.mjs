// A fresh local database per test run. Never share the creator's working draft.
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { networkSeedSQL } from "../tests/fixtures/network.mjs";
import { demoSeedSQL } from "./demo-worlds.mjs";
const state = mkdtempSync(join(tmpdir(), "worldfolio-test-"));
const config = join(state, "wrangler.json");
const initSQL = join(state, "init.sql");
writeFileSync(
  initSQL,
  readFileSync("drizzle/0000_fuzzy_celestials.sql", "utf8") +
    "\n" +
    networkSeedSQL() + "\n" + demoSeedSQL(),
);
writeFileSync(
  config,
  JSON.stringify({
    name: "worldfolio-test",
    compatibility_date: "2026-05-15",
    d1_databases: [
      {
        binding: "DB",
        database_name: "site-creator-d1",
        database_id: "00000000-0000-4000-8000-000000000000",
      },
    ],
  }),
);
const init = spawnSync(
  process.execPath,
  [
    "--import",
    "./scripts/sites-env.mjs",
    "node_modules/wrangler/bin/wrangler.js",
    "d1",
    "execute",
    "DB",
    "--local",
    "--config",
    config,
    "--persist-to",
    state,
    "--file",
    initSQL,
  ],
  { stdio: "inherit" },
);
if (init.status !== 0) process.exit(init.status ?? 1);
const child = spawn(
  process.execPath,
  [
    "--import",
    "./scripts/sites-env.mjs",
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "5174",
    "--strictPort",
  ],
  { stdio: "inherit", env: { ...process.env, WORLDFOLIO_TEST_STATE: state } },
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
