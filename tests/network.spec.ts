import { test, expect } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import {
  directorySQL,
  directoryBindings,
  directoryQuery,
  worldCardSchema,
} from "../lib/directory";
import { networkFixtures, networkSeedSQL } from "./fixtures/network.mjs";
import { starterWorld, worldSchema } from "../lib/world";
import { portalPosition } from "../lib/travel-portal";
import { isLand } from "../lib/vehicles";

test("directory exposes only opted-in snapshots, literal search and bounded pages", () => {
  const sql = new DatabaseSync(":memory:");
  try {
    sql.exec(readFileSync("drizzle/0000_fuzzy_celestials.sql", "utf8"));
    sql.exec(networkSeedSQL());
    const find = (q = "", page = 0) =>
      sql.prepare(directorySQL).all(...directoryBindings(q, page));
    expect(find().map((row) => row.name)).toEqual(["Luna Lab", "Harbor Works"]);
    expect(find("mira").map((row) => row.name)).toEqual(["Luna Lab"]);
    expect(find("PRIVATE DRAFT")).toEqual([]);
    for (const q of ["%", "_", "\\", "' OR 1=1 --"])
      expect(find(q)).toEqual([]);
    expect(worldCardSchema.parse(find()[0])).not.toHaveProperty("owner");
    expect(find()[0]).not.toHaveProperty("published");
    expect(find()[0]).not.toHaveProperty("draft");
    for (let i = 0; i < 25; i++)
      sql
        .prepare(
          "INSERT INTO worlds(id,owner,draft,published,revision,published_at,updated_at) VALUES(?,?,?, ?,0,?,?)",
        )
        .run(
          `paging-${String(i).padStart(2, "0")}`,
          `paging-owner-${i}`,
          "{}",
          JSON.stringify({
            ...networkFixtures[0].world,
            name: `Page fixture ${i}`,
          }),
          "2026-10-10",
          "2026-10-10",
        );
    const first = find("Page fixture", 0),
      second = find("Page fixture", 1);
    expect(first).toHaveLength(13); // one lookahead record, 12 visible cards
    expect(second).toHaveLength(13);
    expect(
      new Set(
        [...first.slice(0, 12), ...second.slice(0, 12)].map((row) => row.id),
      ).size,
    ).toBe(24);
    expect(directoryQuery.safeParse({ page: -1 }).success).toBe(false);
    expect(directoryQuery.safeParse({ page: 1.2 }).success).toBe(false);
    expect(directoryQuery.safeParse({ q: "x".repeat(101) }).success).toBe(
      false,
    );
    const legacy = starterWorld();
    delete (legacy as { discoverable?: boolean }).discoverable;
    expect(worldSchema.parse(legacy).discoverable).toBe(false);
  } finally {
    sql.close();
  }
});

test("travel portals choose free dry ground and do not modify the world", () => {
  const world = starterWorld(),
    before = JSON.stringify(world);
  const spot = portalPosition(world, (x) => x > 0);
  expect(spot).not.toBeNull();
  expect(spot![0]).toBeLessThanOrEqual(0);
  expect(isLand(world.terrain, spot![0], spot![2], 1.5)).toBe(true);
  expect(portalPosition(world, () => true)).toBeNull();
  expect(
    portalPosition(
      { ...world, terrain: { ...world.terrain, waterLevel: 2 } },
      () => false,
    ),
  ).toBeNull();
  expect(JSON.stringify(world)).toBe(before);
});

test("anonymous visitors discover and travel between creators, with keyboard and mobile access", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/discover");
  await expect(
    page.getByRole("link", { name: "Travel to Luna Lab" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Travel to Harbor Works" }),
  ).toBeVisible();
  await expect(page.getByText("PRIVATE DRAFT MUST NOT LEAK")).toHaveCount(0);
  await page.getByLabel("Search portfolios").fill("mira");
  await expect(page.locator(".world-card")).toHaveCount(1);
  await page.getByLabel("Search portfolios").fill("");
  await expect(page.locator(".world-card")).toHaveCount(2);
  await page.screenshot({ path: "test-results/world-network.png" });
  await page.getByRole("link", { name: "Travel to Luna Lab" }).click();
  await expect(page).toHaveURL(new RegExp(`/w/${networkFixtures[0].id}$`));
  await expect(
    page.getByRole("heading", { name: "Mira", exact: true }),
  ).toBeVisible();
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-travel-portal", /,/, {
    timeout: 15000,
  });
  await page.screenshot({ path: "test-results/world-travel-portal.png" });
  await canvas.focus();
  await page.keyboard.press("p");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("You’re here", { exact: true })).toBeVisible();
  const stopped = await canvas.getAttribute("data-player");
  await page.keyboard.down("w");
  await page.waitForTimeout(250);
  await page.keyboard.up("w");
  expect(await canvas.getAttribute("data-player")).toBe(stopped);
  await page.getByRole("link", { name: "Travel to Harbor Works" }).click();
  await expect(
    page.getByRole("heading", { name: "Noah", exact: true }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-travel-portal",
    /,/,
    { timeout: 15000 },
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Worlds", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Travel to Luna Lab" }),
  ).toBeVisible();
  const bounds = await page.getByRole("dialog").boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "test-results/world-network-mobile.png" });
  await page.getByRole("link", { name: "Travel to Luna Lab" }).click();
  await expect(
    page.getByRole("heading", { name: "Mira", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Noah", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("network publication is opt-in, snapshot-isolated, removable and read-only to visitors", async ({
  page,
  request,
}) => {
  await page.goto("/editor");
  const current = async () => (await page.request.get("/api/world")).json();
  const original = await current();
  expect(original.publishedAt).toBeNull();
  const listing = async () => (await request.get("/api/worlds")).json();
  try {
    const world = worldSchema.parse({
      ...networkFixtures[1].world,
      name: "My linked neighborhood",
      discoverable: false,
    });
    expect(
      (
        await page.request.put("/api/world", {
          data: { world, revision: original.revision },
        })
      ).ok(),
    ).toBe(true);
    await page.reload();
    await page
      .getByRole("button", { name: "Publish world", exact: true })
      .click();
    const optIn = page.getByRole("checkbox", {
      name: /Join the world network/,
    });
    await expect(optIn).not.toBeChecked();
    await optIn.check();
    await page
      .getByRole("button", { name: "Publish my world", exact: true })
      .click();
    await expect(
      page.getByRole("link", { name: "Open published world" }),
    ).toBeVisible();
    expect(
      (await listing()).worlds.some(
        (w: { id: string }) => w.id === original.id,
      ),
    ).toBe(true);
    const saved = await current();
    const draft = { ...saved.world, name: "Hidden new draft title" };
    expect(
      (
        await page.request.put("/api/world", {
          data: { world: draft, revision: saved.revision },
        })
      ).ok(),
    ).toBe(true);
    expect(
      (await listing()).worlds.find((w: { id: string }) => w.id === original.id)
        .name,
    ).toBe("My linked neighborhood");
    await page.reload();
    await page
      .getByRole("button", { name: "Publish world", exact: true })
      .click();
    await optIn.uncheck();
    await page
      .getByRole("button", { name: "Publish latest changes", exact: true })
      .click();
    await expect
      .poll(async () =>
        (await listing()).worlds.some(
          (w: { id: string }) => w.id === original.id,
        ),
      )
      .toBe(false);
    expect((await request.get(`/w/${original.id}`)).status()).toBe(200);
    expect(
      (await request.post("/api/publish", { data: { revision: 0 } })).status(),
    ).toBe(401);
    expect(
      (
        await request.put("/api/world", { data: { world, revision: 0 } })
      ).status(),
    ).toBe(401);
    expect((await request.delete("/api/publish")).status()).toBe(401);
    expect((await page.request.delete("/api/publish")).ok()).toBe(true);
    expect((await request.get(`/w/${original.id}`)).status()).toBe(404);
    expect((await current()).world.name).toBe("Hidden new draft title");
  } finally {
    await page.close();
    await page.request.delete("/api/publish");
    const last = await current();
    expect(
      (
        await page.request.put("/api/world", {
          data: { world: original.world, revision: last.revision },
        })
      ).ok(),
    ).toBe(true);
  }
});

test("directory handles empty results, failures and retry without inventing worlds", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/worlds?page=-1")).status()).toBe(400);
  await page.route("**/api/worlds?**", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("/discover");
  await expect(page.getByRole("alert")).toContainText("Could not load");
  await page.unroute("**/api/worlds?**");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator(".world-card")).toHaveCount(2);
  await page.getByLabel("Search portfolios").fill("no-such-test-world");
  await expect(page.getByText("No worlds match yet.")).toBeVisible();
  expect((await request.get(`/w/${networkFixtures[3].id}`)).status()).toBe(404);
  expect((await request.get(`/w/${networkFixtures[2].id}`)).status()).toBe(200);
});
