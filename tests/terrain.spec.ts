import { test, expect, type Page } from "@playwright/test";
import {
  terrainSchema,
  terrainHeight,
  sculptTerrain,
  createTerrain,
  BIOMES,
  TERRAIN_POINTS,
  type TerrainBrush,
} from "../lib/terrain";
import {
  CATALOG,
  worldSchema,
  starterWorld,
  objectDetailsSchema,
  blueprintSchema,
} from "../lib/world";
import {
  modelParts,
  model,
  blueprintModel,
  disposeObject,
} from "../lib/models";
import { Box3, Vector3 } from "three";

test("legacy worlds gain independent terrain, weather, and character defaults", () => {
  const legacy = JSON.parse(JSON.stringify(starterWorld()));
  delete legacy.terrain;
  delete legacy.weather;
  delete legacy.character;
  legacy.objects.forEach((o: Record<string, unknown>) => {
    delete o.details;
    delete o.collidable;
  });
  const world = worldSchema.parse(legacy),
    other = worldSchema.parse(legacy);
  expect(world.terrain.heights).toHaveLength(TERRAIN_POINTS);
  expect(world.weather.type).toBe("clear");
  expect(world.character.spawn).toEqual([0, 6]);
  world.terrain.heights[0] = 1;
  expect(other.terrain.heights[0]).toBe(0);
  expect(
    worldSchema.safeParse({
      ...world,
      terrain: { ...world.terrain, heights: [0] },
    }).success,
  ).toBe(false);
  expect(
    worldSchema.safeParse({
      ...world,
      weather: { type: "snow", intensity: 100 },
    }).success,
  ).toBe(false);
});

test("biomes, brush edits, bounds, and interpolation are deterministic and immutable", () => {
  const signatures = BIOMES.map((b) =>
    JSON.stringify(createTerrain(b.id).heights),
  );
  expect(new Set(signatures).size).toBe(5);
  const terrain = terrainSchema.parse({});
  const brush: TerrainBrush = {
    tool: "raise",
    radius: 3,
    strength: 0.5,
    color: "#d4621a",
    level: 0,
  };
  const raised = sculptTerrain(terrain, 0, 0, brush);
  expect(terrainHeight(raised, 0, 0)).toBe(0.5);
  expect(terrainHeight(terrain, 0, 0)).toBe(0);
  expect(raised.heights[0]).toBe(0);
  expect(
    terrainHeight(
      sculptTerrain(raised, 0, 0, { ...brush, tool: "lower" }),
      0,
      0,
    ),
  ).toBe(0);
  const flattened = sculptTerrain(raised, 0, 0, { ...brush, tool: "flatten" });
  expect(terrainHeight(flattened, 0, 0)).toBe(0.25);
  const smoothed = sculptTerrain(raised, 0, 0, { ...brush, tool: "smooth" });
  expect(terrainHeight(smoothed, 0, 0)).toBeLessThan(0.5);
  const painted = sculptTerrain(raised, 0, 0, { ...brush, tool: "paint" });
  expect(painted.heights).toEqual(raised.heights);
  expect(painted.paint.filter(Boolean).length).toBeGreaterThan(0);
  expect(raised.paint.every((c) => c === null)).toBe(true);
  let tall = terrain;
  for (let i = 0; i < 30; i++) tall = sculptTerrain(tall, 0, 0, brush);
  expect(Math.max(...tall.heights)).toBe(10);
  expect(Number.isFinite(terrainHeight(tall, 500, -500))).toBe(true);
});

test("all built-in objects convert into valid editable pieces without changing bounds", () => {
  for (const item of CATALOG) {
    const details = objectDetailsSchema.parse({});
    const parts = modelParts(item.kind, item.color, details);
    expect(
      blueprintSchema.safeParse({ name: item.name, parts }).success,
      item.name,
    ).toBe(true);
    const original = model(item.kind, item.color, details),
      editable = blueprintModel(parts);
    const before = new Box3().setFromObject(original).getSize(new Vector3());
    const after = new Box3().setFromObject(editable).getSize(new Vector3());
    expect(before.distanceTo(after), item.name).toBeLessThan(0.06);
    disposeObject(original);
    disposeObject(editable);
  }
});

async function saved(page: Page) {
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
}
async function state(page: Page) {
  return (await page.request.get("/api/world")).json();
}
async function restore(page: Page, world: unknown) {
  await page.close();
  const latest = await state(page);
  expect(
    (
      await page.request.put("/api/world", {
        data: { world, revision: latest.revision },
      })
    ).ok(),
  ).toBe(true);
}

test("terrain brush, biomes, weather and day/night persist with one-stroke undo", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/editor");
  await expect(page.locator("canvas")).toBeVisible();
  const original = await state(page);
  try {
    await page.getByRole("button", { name: "Terrain", exact: true }).click();
    await page.getByRole("button", { name: /Snowy tundra/ }).click();
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-weather",
      "snow",
    );
    await saved(page);
    const tundra = await state(page);
    expect(tundra.world.objects).toEqual(
      worldSchema.parse(original.world).objects,
    );
    expect(Math.max(...tundra.world.terrain.heights)).toBeGreaterThan(1);
    await page.screenshot({ path: "test-results/tundra-day.png" });
    await page.getByRole("button", { name: "Dark mode — night" }).click();
    await expect(page.locator("main")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-lighting",
      "night",
    );
    await saved(page);
    await expect(page.locator(".topbar")).toHaveCSS(
      "background-color",
      "rgb(42, 26, 14)",
    );
    await page.screenshot({
      path: "test-results/tundra-night.png",
      animations: "disabled",
    });
    await page.reload();
    await expect(page.locator("main")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-weather",
      "snow",
    );
    await page.getByRole("button", { name: "Light mode — day" }).click();
    await expect(page.locator(".topbar")).toHaveCSS(
      "background-color",
      "rgb(254, 243, 226)",
    );
    await page.getByRole("button", { name: "Terrain", exact: true }).click();
    await page.getByRole("button", { name: "Top view", exact: true }).click();
    await page.getByRole("button", { name: "Raise", exact: true }).click();
    const box = (await page.locator("canvas").boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.54, box.y + box.height * 0.5, {
      steps: 8,
    });
    await page.mouse.up();
    await saved(page);
    const raised = await state(page);
    expect(raised.world.terrain.heights).not.toEqual(
      tundra.world.terrain.heights,
    );
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await saved(page);
    expect((await state(page)).world.terrain.heights).toEqual(
      tundra.world.terrain.heights,
    );
    await page.getByRole("button", { name: "Paint", exact: true }).click();
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await saved(page);
    expect((await state(page)).world.terrain.paint.some(Boolean)).toBe(true);
    expect(errors).toEqual([]);
    await page.getByRole("button", { name: "rain weather" }).click();
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-weather",
      "rain",
    );
    await saved(page);
    await page.reload();
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-weather",
      "rain",
    );
    expect((await state(page)).world.terrain.paint.some(Boolean)).toBe(true);
  } finally {
    await restore(page, original.world);
  }
});

test("building and tree styling, individual geometry and separate explorer work", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/editor");
  await expect(page.locator("canvas")).toBeVisible();
  const original = await state(page);
  try {
    await page.getByRole("button", { name: "Little studio Buildings" }).click();
    await page.getByLabel("Roof style").selectOption("spire");
    await page.getByLabel("Roof height", { exact: true }).fill("1.5");
    await saved(page);
    expect((await state(page)).world.objects.at(-1).details.roofStyle).toBe(
      "spire",
    );
    await page.getByRole("button", { name: "Edit individual pieces" }).click();
    await expect(page.locator(".parts-editor summary").first()).toBeVisible();
    await page.locator(".parts-editor summary").first().click();
    await page.getByLabel("Piece 1 size X").fill("4");
    await saved(page);
    expect((await state(page)).world.objects.at(-1).parts[0].size[0]).toBe(4);
    await page.getByRole("button", { name: "Round tree Nature" }).click();
    await page.getByLabel("Canopy size", { exact: true }).fill("1.5");
    await page.getByLabel("Trunk height", { exact: true }).fill("1.7");
    await saved(page);
    expect((await state(page)).world.objects.at(-1).details.foliage).toBe(1.5);
    await page.getByRole("button", { name: "Character", exact: true }).click();
    await page.getByLabel("Hat style").selectOption("cap");
    await page.getByLabel("Walking speed", { exact: true }).fill("5.5");
    await page.getByRole("button", { name: "Explore", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("link", { name: "Open editor" })).toBeVisible();
    await expect(page.locator(".library-panel")).toHaveCount(0);
    const canvas = page.locator("canvas");
    await expect(canvas).toHaveAttribute("data-player", /.+/);
    const start = await canvas.getAttribute("data-player");
    await page.keyboard.down("w");
    await page.waitForTimeout(600);
    await page.keyboard.up("w");
    expect(await canvas.getAttribute("data-player")).not.toBe(start);
    await page.keyboard.press("Space");
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-jump")))
      .toBeGreaterThan(0.1);
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-jump")))
      .toBe(0);
    await page.screenshot({ path: "test-results/explorer-desktop.png" });
    await page.getByRole("button", { name: "Return to spawn" }).click();
    await expect(canvas).toHaveAttribute("data-player", start!);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "test-results/explorer-mobile.png" });
    const viewport = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      width: innerWidth,
    }));
    expect(viewport.scroll).toBe(viewport.width);
    expect(errors).toEqual([]);
  } finally {
    await restore(page, original.world);
  }
});
