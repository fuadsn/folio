import { test, expect } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { demoWorlds, demoSeedSQL } from "../scripts/demo-worlds.mjs";
import { essentialStatus, worldSchema } from "../lib/world";
import { directoryBindings, directorySQL } from "../lib/directory";
import { isLand, isWater, initialVehicle, exitVehiclePosition, stepVehicle } from "../lib/vehicles";
import { portalPosition } from "../lib/travel-portal";

test("sample worlds are complete, distinct, honest and ready to drive", () => {
  expect(new Set(demoWorlds.map((d) => d.id)).size).toBe(3);
  expect(new Set(demoWorlds.map((d) => d.owner)).size).toBe(3);
  expect(new Set(demoWorlds.map((d) => d.world.terrain.biome)).size).toBe(3);
  for (const { world: source } of demoWorlds) {
    const world = worldSchema.parse(source);
    expect(world.name).toContain("Demo");
    expect(world.tagline).toContain("Fictional sample");
    expect(world.discoverable).toBe(true);
    expect(world.terrain.width).toBe(256);
    expect(essentialStatus(world).every((s) => s.done)).toBe(true);
    expect(world.objects.every((o) => !o.asset && !o.url)).toBe(true);
    const [sx, sz] = world.character.spawn;
    expect(isLand(world.terrain, sx, sz, 0.5)).toBe(true);
    expect(portalPosition(world, (x, z) => world.objects.some((o) =>
      Math.hypot(o.position[0] - x, o.position[2] - z) < 3,
    ))).not.toBeNull();
    const car = world.objects.find((o) => o.kind === "car" || o.kind === "driftcar")!;
    expect(Math.hypot(car.position[0] - sx, car.position[2] - sz)).toBeLessThan(6);
    const input = { throttle: 1, steer: 0, climb: 0, boost: false, brake: false };
    let drive = initialVehicle(car, world.terrain);
    for (let i = 0; i < 300; i++) drive = stepVehicle(drive, car, world.terrain, input, 1 / 60).state;
    expect(drive.z).toBeGreaterThan(60);
    const plane = world.objects.find((o) => o.kind === "plane")!;
    expect(isLand(world.terrain, plane.position[0], plane.position[2], 2)).toBe(true);
    let flight = initialVehicle(plane, world.terrain);
    for (let i = 0; i < 300; i++) flight = stepVehicle(flight, plane, world.terrain, { ...input, climb: 1 }, 1 / 60).state;
    expect(flight.airborne).toBe(true);
    for (const boat of world.objects.filter((o) => o.kind === "boat")) {
      expect(isWater(world.terrain, boat.position[0], boat.position[2], 1.8)).toBe(true);
      expect(exitVehiclePosition(initialVehicle(boat, world.terrain), world.terrain, () => false)).not.toBeNull();
      let sailing = initialVehicle(boat, world.terrain);
      for (let i = 0; i < 300; i++) sailing = stepVehicle(sailing, boat, world.terrain, input, 1 / 60).state;
      expect(sailing.x).toBeGreaterThan(50);
    }
  }
});

test("local demo seed inserts once and never overwrites creator data or edited samples", () => {
  for (const statement of demoSeedSQL().split(";\n"))
    expect(Buffer.byteLength(statement, "utf8")).toBeLessThan(100000);
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(readFileSync("drizzle/0000_fuzzy_celestials.sql", "utf8"));
    db.prepare("INSERT INTO worlds(id,owner,draft,published,revision,updated_at) VALUES(?,?,?,?,?,?)")
      .run("existing", "local_seedy", '{"private":"original"}', '{"discoverable":false}', 42, "original time");
    const original = db.prepare("SELECT * FROM worlds WHERE id='existing'").get();
    db.exec(demoSeedSQL());
    const records = db.prepare("SELECT * FROM worlds ORDER BY id").all();
    db.exec(demoSeedSQL("2026-10-12T00:00:00Z"));
    expect(db.prepare("SELECT * FROM worlds ORDER BY id").all()).toEqual(records);
    expect(db.prepare("SELECT * FROM worlds WHERE id='existing'").get()).toEqual(original);
    // User changes to a sample are intentionally not reset on a later run.
    db.prepare("UPDATE worlds SET published=NULL,draft='edited demo',revision=7 WHERE id=?").run(demoWorlds[0].id);
    db.exec(demoSeedSQL());
    const edited = db.prepare("SELECT draft,published,revision FROM worlds WHERE id=?").get(demoWorlds[0].id);
    expect(edited).toEqual({ draft: "edited demo", published: null, revision: 7 });
    const directory = db.prepare(directorySQL).all(...directoryBindings("Fictional sample", 0));
    expect(directory).toHaveLength(2);
    expect(directory.map((d) => d.name)).toEqual(expect.arrayContaining(demoWorlds.slice(1).map((d) => d.world.name)));
  } finally {
    db.close();
  }
});

test("visitors can discover, drive and portal between all three samples", async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/discover");
  // Cards are client-loaded; wait for hydration before typing into the search.
  await expect(page.getByRole("link", { name: `Travel to ${demoWorlds[0].world.name}` })).toBeVisible();
  await page.getByLabel("Search portfolios").fill("Fictional sample");
  await expect(page.locator(".world-card")).toHaveCount(3);
  await page.screenshot({ path: "test-results/demo-directory.png" });
  for (const [index, { id, world }] of demoWorlds.entries()) {
    await page.getByRole("link", { name: `Travel to ${world.name}` }).click();
    await expect(page).toHaveURL(new RegExp(`/w/${id}$`));
    await expect(page.getByRole("heading", { name: world.ownerName, exact: true })).toBeVisible();
    const canvas = page.locator("canvas");
    await expect(canvas).toHaveAttribute("data-world-size", "256,256", { timeout: 15000 });
    await expect(canvas).toHaveAttribute("data-travel-portal", /,/);
    await expect(page.getByRole("button", { name: /Drive car/ })).toBeVisible();
    await page.screenshot({ path: `test-results/demo-world-${index + 1}.png` });
    await page.getByRole("button", { name: "View portfolio", exact: true }).click();
    for (const title of ["Meet the sample creator", "A sample journey", "A place to say hello"])
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("fictional");
    await page.getByRole("button", { name: "Close dialog" }).click();
    await page.getByRole("button", { name: /Drive car/ }).click();
    await expect(canvas).toHaveAttribute("data-vehicle", /car/);
    await canvas.focus();
    await page.keyboard.down("w");
    try {
      await expect.poll(async () => Number((await canvas.getAttribute("data-vehicle-position"))?.split(",")[2]), { timeout: 15000 }).toBeGreaterThan(24);
    } finally {
      await page.keyboard.up("w");
    }
    await page.keyboard.press("p");
    await expect(page.getByRole("dialog")).toContainText("You’re here");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("link", { name: `Travel to ${demoWorlds[0].world.name}` })).toBeVisible();
  await page.screenshot({ path: "test-results/demo-directory-mobile.png" });
  expect(errors).toEqual([]);
});
