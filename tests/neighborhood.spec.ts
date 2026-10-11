import { test, expect } from "@playwright/test";
import { DRIFT_GREEN, footprintRadius, inDrivingSpace, populateNeighborhood } from "../lib/neighborhood";
import { newObject, starterWorld, worldSchema } from "../lib/world";
import { terrainSchema } from "../lib/terrain";
import { initialVehicle, stepVehicle } from "../lib/vehicles";

test("neighborhood preserves existing work and reserves the lawn, roads, spawn and vehicle clearance", () => {
  const original = starterWorld();
  original.objects.push(newObject("driftcar", [0.5, 0, 4.5]), newObject("plane", [-1, 0, -15.5]));
  const snapshot = JSON.stringify(original);
  const result = populateNeighborhood(original);
  expect(result.added).toBeGreaterThanOrEqual(45);
  expect(JSON.stringify(original)).toBe(snapshot);
  expect(result.world.objects.slice(0, original.objects.length)).toEqual(original.objects);
  expect({ ...result.world, objects: original.objects }).toEqual(original);
  expect(worldSchema.safeParse(result.world).success).toBe(true);
  const added = result.world.objects.slice(original.objects.length);
  expect(added.filter((o) => o.kind === "npc")).toHaveLength(8);
  expect(added.filter((o) => ["house", "garage", "gallery", "cafe", "tower", "observatory"].includes(o.kind)).length).toBeGreaterThanOrEqual(8);
  const footprints = result.world.objects.map((object) => ({ object, r: footprintRadius(object) }));
  for (const object of added) {
    const r = footprintRadius(object), [x, , z] = object.position;
    expect(inDrivingSpace(original, x, z, r), object.name).toBe(false);
    for (const other of footprints) {
      if (other.object.id === object.id) continue;
      expect(Math.hypot(x - other.object.position[0], z - other.object.position[2]), object.name)
        .toBeGreaterThanOrEqual(r + other.r + 2);
    }
    for (const choice of object.npc?.choices ?? [])
      if (choice.targetId) expect(result.world.objects.some((o) => o.id === choice.targetId && o.role !== "none")).toBe(true);
  }
  expect(populateNeighborhood(result.world).added).toBe(0);
  expect(populateNeighborhood(result.world).world).toEqual(result.world);
});

test("unsafe lawns fail without mutation; occupied sites and capacity never replace objects", () => {
  const small = starterWorld();
  small.terrain = terrainSchema.parse({ width: 64, depth: 64 });
  expect(() => populateNeighborhood(small)).toThrow("192");
  const wet = starterWorld();
  wet.terrain.waterLevel = 1;
  expect(() => populateNeighborhood(wet)).toThrow("dry land");
  const uneven = starterWorld();
  uneven.terrain.heights[80 * 129 + 85] = 2;
  expect(() => populateNeighborhood(uneven)).toThrow("Flatten");
  const wetSite = starterWorld();
  wetSite.terrain.waterLevel = -0.1;
  // A shallow puddle only under the workshop's center, not its footprint edge.
  wetSite.terrain.heights[79 * 129 + 50] = -0.2;
  wetSite.terrain.heights[80 * 129 + 50] = -0.2;
  expect(populateNeighborhood(wetSite).world.objects.some((o) => o.id === "neighborhood-v1-garage")).toBe(false);
  const blocked = starterWorld();
  blocked.objects.push(newObject("house", [42, 0, 32]));
  const before = JSON.stringify(blocked);
  expect(() => populateNeighborhood(blocked)).toThrow("already contains objects");
  expect(JSON.stringify(blocked)).toBe(before);
  const occupied = starterWorld();
  occupied.objects.push(newObject("house", [-28, 0, 31]));
  const result = populateNeighborhood(occupied);
  expect(result.world.objects.find((o) => o.id === "neighborhood-v1-garage")).toBeUndefined();
  expect(result.world.objects.slice(0, occupied.objects.length)).toEqual(occupied.objects);
  expect(result.world.objects.find((o) => o.id === "neighborhood-v1-mechanic")?.npc?.choices[0].targetId).toBeUndefined();
  const full = starterWorld();
  full.objects = Array.from({ length: 150 }, () => newObject("tree", [-70, 0, -70]));
  expect(populateNeighborhood(full).world).toEqual(full);
  expect(populateNeighborhood(full).added).toBe(0);
});

test("the seeded lawn supports moving slides without scenery collisions", () => {
  const world = populateNeighborhood(starterWorld()).world;
  const car = newObject("driftcar", [DRIFT_GREEN.x, 0, DRIFT_GREEN.z]);
  const footprints = world.objects.map((o) => ({ o, r: footprintRadius(o) }));
  let hits = 0;
  const blocked = (x: number, z: number, _y: number, radius: number) => {
    const hit = footprints.some(({ o, r }) => Math.hypot(x - o.position[0], z - o.position[2]) < r + radius);
    if (hit) hits++;
    return hit;
  };
  let state = { ...initialVehicle(car, world.terrain), speed: 10 };
  for (let frame = 0; frame < 240; frame++) {
    state = stepVehicle(state, car, world.terrain,
      { throttle: 1, steer: 1, handbrake: true, boost: false, brake: false, climb: 0 }, 1 / 60, blocked).state;
    expect(Math.hypot(state.x - DRIFT_GREEN.x, state.z - DRIFT_GREEN.z)).toBeLessThan(DRIFT_GREEN.radius);
  }
  expect(hits).toBe(0);
  expect(state.driftScore).toBeGreaterThan(50);
});

test("editor seeding saves, undoes, redoes and reruns without duplication; seeded car can drift", async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/editor");
  const current = async () => (await page.request.get("/api/world")).json();
  const original = await current();
  const saved = async () => expect(page.getByRole("button", { name: "Saved", exact: true })).toBeVisible();
  const world = starterWorld();
  // Isolated test car starts on the reserved lawn; never moves the user's actual vehicle.
  world.objects.push(newObject("driftcar", [42, 0, 32]));
  try {
    expect((await page.request.put("/api/world", { data: { world, revision: original.revision } })).ok()).toBe(true);
    await page.reload();
    await page.getByRole("button", { name: "Add drift neighborhood", exact: true }).click();
    // The layout helper is lazy-loaded; wait for the scene change before the save indicator.
    await expect(page.locator("canvas")).toHaveAttribute("data-npc-count", "8");
    await saved();
    const seeded = await current();
    expect(seeded.world.objects.length).toBeGreaterThan(world.objects.length + 44);
    await expect(page.locator("canvas")).toHaveAttribute("data-npc-count", "8");
    await page.getByRole("button", { name: "Top view", exact: true }).click();
    await page.getByRole("button", { name: "Zoom in", exact: true }).click({ clickCount: 3 });
    await page.screenshot({ path: "test-results/neighborhood-overview.png" });
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await saved();
    expect((await current()).world).toEqual(world);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await saved();
    expect((await current()).world).toEqual(seeded.world);
    await page.getByRole("button", { name: "Add drift neighborhood", exact: true }).click();
    await expect(page.getByText(/No additions: these objects are already present/)).toBeVisible();
    expect((await current()).revision).toBe(seeded.revision + 2);
    await page.reload();
    await expect(page.locator("canvas")).toHaveAttribute("data-npc-count", "8");
    await page.getByLabel("Objects", { exact: true }).click();
    await page.locator(".object-list").getByRole("button", { name: "Tokyo drift tuner" }).click();
    await page.getByRole("button", { name: "Test drive", exact: true }).click();
    await expect(page.locator("canvas")).toHaveAttribute("data-vehicle", "driftcar");
    await page.keyboard.down("w");
    try {
      await expect.poll(async () => Number(await page.locator(".vehicle-instruments b").first().textContent())).toBeGreaterThan(22);
      await page.keyboard.down("Space");
      await page.keyboard.down("a");
      await expect(page.locator("canvas")).toHaveAttribute("data-drifting", "true");
      await expect.poll(async () => Number(await page.locator("canvas").getAttribute("data-drift-score"))).toBeGreaterThan(15);
      await page.screenshot({ path: "test-results/neighborhood-drift.png" });
    } finally {
      await page.keyboard.up("a");
      await page.keyboard.up("Space");
      await page.keyboard.up("w");
    }
    expect((await current()).world).toEqual(seeded.world);
    expect(errors).toEqual([]);
  } finally {
    await page.close();
    const last = await current();
    expect((await page.request.put("/api/world", { data: { world: original.world, revision: last.revision } })).ok()).toBe(true);
  }
});
