import { test, expect } from "@playwright/test";
import {
  resizeTerrain,
  createTerrain,
  sculptTerrain,
  terrainHeight,
  terrainSchema,
  terrainSegments,
} from "../lib/terrain";
import { starterWorld, worldSchema, newObject } from "../lib/world";
import {
  initialVehicle,
  stepVehicle,
  vehiclePlacement,
  isWater,
  isLand,
} from "../lib/vehicles";
import { travelLimit } from "../lib/world-size";
import { landscape } from "../lib/landscape";
import { disposeObject } from "../lib/models";

test("expansion preserves world-space hills and paint; old and large grids validate", () => {
  let old = terrainSchema.parse({ width: 32, depth: 32 });
  const brush = {
    tool: "raise" as const,
    radius: 4,
    strength: 0.5,
    color: "#d4621a",
    level: 0,
  };
  old = sculptTerrain(old, 4, 6, brush);
  old = sculptTerrain(old, 4, 6, { ...brush, tool: "paint" });
  const before = JSON.stringify(old),
    bigger = resizeTerrain(old, 256, 256);
  expect(terrainSegments(bigger)).toBe(128);
  expect(terrainHeight(bigger, 4, 6)).toBeCloseTo(terrainHeight(old, 4, 6), 6);
  expect(bigger.paint.filter(Boolean).length).toBeGreaterThan(0);
  expect(terrainHeight(bigger, 100, 100)).toBe(0);
  expect(JSON.stringify(old)).toBe(before);
  expect(terrainSchema.safeParse(old).success).toBe(true);
  expect(terrainSchema.safeParse(bigger).success).toBe(true);
  const largest = resizeTerrain(bigger, 512, 512);
  expect(terrainSegments(largest)).toBe(256);
  expect(terrainSchema.safeParse(largest).success).toBe(true);
  expect(
    terrainSchema.safeParse({ ...largest, paint: old.paint }).success,
  ).toBe(false);
  expect(terrainSchema.safeParse({ ...largest, width: 513 }).success).toBe(
    false,
  );
  const sculpted = sculptTerrain(largest, 120, 120, { ...brush, radius: 8 });
  expect(terrainHeight(sculpted, 120, 120)).toBe(0.5);
  expect(terrainHeight(largest, 120, 120)).toBe(0);
  expect(starterWorld().terrain.width).toBe(256);
  expect(starterWorld().terrain.depth).toBe(256);
});

test("large biome meshes match their grid, and ocean covers the expanded travel bounds", () => {
  for (const biome of [
    "meadow",
    "tundra",
    "desert",
    "alpine",
    "volcanic",
  ] as const) {
    const world = starterWorld();
    world.terrain = createTerrain(biome, 256, 256);
    expect(worldSchema.safeParse(world).success).toBe(true);
    const scene = landscape(world);
    expect(scene.ground.geometry.attributes.position.count).toBe(
      world.terrain.heights.length,
    );
    expect(scene.ground.geometry.boundingBox!.max.x).toBe(128);
    expect(scene.ground.geometry.boundingBox!.min.z).toBe(-128);
    const ocean = scene.group.children[2] as import("three").Mesh;
    ocean.geometry.computeBoundingBox();
    expect(ocean.geometry.boundingBox!.max.x).toBeGreaterThan(
      travelLimit(world.terrain),
    );
    disposeObject(scene.group);
  }
});

test("cars and aircraft move past old world limits; boat placement reaches the new shoreline", () => {
  const world = starterWorld(),
    input = { throttle: 1, steer: 0, climb: 0, boost: false, brake: false };
  for (const kind of ["car", "driftcar", "plane"] as const) {
    const object = newObject(kind, [80, 0, 55]);
    let state = { ...initialVehicle(object, world.terrain), speed: 10 };
    for (let frame = 0; frame < 120; frame++)
      state = stepVehicle(state, object, world.terrain, input, 1 / 60).state;
    expect(state.z).toBeGreaterThan(75);
    expect(state.x).toBe(80);
    expect(state.speed).toBeGreaterThan(0);
  }
  world.character.spawn = [90, 90];
  world.objects = [];
  for (const kind of ["car", "boat", "plane"] as const) {
    const p = vehiclePlacement(world, kind);
    expect(
      kind === "boat"
        ? isWater(world.terrain, p[0], p[2], 1.8)
        : isLand(world.terrain, p[0], p[2], 1),
    ).toBe(true);
    expect(Math.max(Math.abs(p[0]), Math.abs(p[2]))).toBeGreaterThan(23);
  }
  const boat = newObject("boat", [0, 0, travelLimit(world.terrain) - 0.1]);
  const boundary = stepVehicle(
    { ...initialVehicle(boat, world.terrain), speed: 8 },
    boat,
    world.terrain,
    input,
    0.05,
  );
  expect(boundary.message).toContain("World boundary");
});

test("expand, undo, resize, distant placement and long-distance test driving persist", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/editor");
  const current = async () => (await page.request.get("/api/world")).json();
  const original = await current();
  const saved = async () =>
    expect(
      page.getByRole("button", { name: "Saved", exact: true }),
    ).toBeVisible({ timeout: 15000 });
  try {
    const world = starterWorld();
    world.terrain = terrainSchema.parse({});
    expect(
      (
        await page.request.put("/api/world", {
          data: { world, revision: original.revision },
        })
      ).ok(),
    ).toBe(true);
    await page.reload();
    await page.getByRole("button", { name: "Terrain", exact: true }).click();
    await page
      .getByRole("button", { name: "Expand for driving · 256 m", exact: true })
      .click();
    await saved();
    const expanded = await current();
    expect(expanded.world.terrain.width).toBe(256);
    expect(expanded.world.terrain.depth).toBe(256);
    expect(expanded.world.objects).toEqual(world.objects);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await saved();
    expect((await current()).world.terrain).toEqual(world.terrain);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await saved();
    await page.getByText("Island dimensions & paths", { exact: true }).click();
    await page.getByLabel("Island width", { exact: true }).fill("512");
    await page.getByLabel("Island depth", { exact: true }).fill("512");
    await saved();
    expect((await current()).world.terrain.heights).toHaveLength(257 ** 2);
    await page.reload();
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-world-size",
      "512,512",
      { timeout: 20000 },
    );
    await page.getByRole("button", { name: "Top view", exact: true }).click();
    await page.screenshot({ path: "test-results/large-world-overview.png" });
    await page.getByRole("button", { name: "Vehicles", exact: true }).click();
    await page
      .getByRole("button", { name: "Tokyo drift tuner Vehicles" })
      .click();
    await page.getByLabel("Position X", { exact: true }).fill("80");
    await page.getByLabel("Position Z", { exact: true }).fill("60");
    await page.getByLabel("Object rotation", { exact: true }).fill("0");
    await saved();
    const authored = await current();
    await page.getByRole("button", { name: "Test drive", exact: true }).click();
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-vehicle",
      "driftcar",
    );
    await page.keyboard.down("w");
    try {
      await expect
        .poll(
          async () =>
            Number(
              (await page
                .locator("canvas")
                .getAttribute("data-vehicle-position"))!.split(",")[2],
            ),
          { timeout: 15000 },
        )
        .toBeGreaterThan(78);
    } finally {
      await page.keyboard.up("w");
    }
    await page.screenshot({ path: "test-results/large-world-driving.png" });
    expect((await current()).world.objects).toEqual(authored.world.objects);
    expect(errors).toEqual([]);
  } finally {
    await page.close();
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

test("a fully painted large-world backup over 2 MB can be exported and reimported", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/editor");
  const current = async () => (await page.request.get("/api/world")).json();
  const original = await current();
  try {
    const world = starterWorld();
    world.terrain = resizeTerrain(world.terrain, 512, 512);
    world.terrain.heights.fill(1.23456789);
    world.terrain.paint.fill("#d4621a");
    expect(
      (
        await page.request.put("/api/world", {
          data: { world, revision: original.revision },
        })
      ).ok(),
    ).toBe(true);
    await page.reload();
    await page.getByRole("button", { name: "World", exact: true }).click();
    const downloadEvent = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export world backup", exact: true })
      .click();
    const download = await downloadEvent,
      stream = await download.createReadStream();
    const parts: Buffer[] = [];
    for await (const part of stream!) parts.push(Buffer.from(part));
    const buffer = Buffer.concat(parts);
    expect(buffer.length).toBeGreaterThan(2_000_000);
    expect(JSON.parse(buffer.toString()).terrain.paint).toEqual(
      world.terrain.paint,
    );
    const backup = JSON.parse(buffer.toString());
    backup.name = "Reimported large-world backup";
    await page
      .locator('input[accept=".json"]')
      .setInputFiles({
        name: "large.worldfolio.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(backup, null, 2)),
      });
    await expect(
      page.getByRole("button", { name: "Saved", exact: true }),
    ).toBeVisible({ timeout: 15000 });
    await expect
      .poll(async () => (await current()).world.name)
      .toBe(backup.name);
    expect((await current()).world.terrain).toEqual(world.terrain);
  } finally {
    await page.close();
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
