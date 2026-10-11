import { test, expect } from "@playwright/test";
import { newObject, starterWorld } from "../lib/world";
import {
  biomeIds,
  terrainHeight,
  terrainSchema,
  TERRAIN_POINTS,
  TERRAIN_SEGMENTS,
} from "../lib/terrain";
import {
  initialVehicle,
  stepVehicle,
  type VehicleInput,
} from "../lib/vehicles";

const drive: VehicleInput = {
  throttle: 1,
  steer: 0,
  climb: 0,
  boost: false,
  brake: false,
};
function hillside() {
  return terrainSchema.parse({
    width: 48,
    depth: 48,
    paths: false,
    heights: Array.from({ length: TERRAIN_POINTS }, (_, i) => {
      const x = ((i % (TERRAIN_SEGMENTS + 1)) / TERRAIN_SEGMENTS - 0.5) * 48;
      const z =
        (Math.floor(i / (TERRAIN_SEGMENTS + 1)) / TERRAIN_SEGMENTS - 0.5) * 48;
      return Math.max(0, Math.min(10, z * 2.2 + (x - 10) * 0.25));
    }),
  });
}

test("both cars climb off-road hills in every biome with paths on or off", () => {
  for (const kind of ["car", "driftcar"] as const) {
    for (const biome of biomeIds) {
      for (const paths of [true, false]) {
        const terrain = { ...hillside(), biome, paths };
        const car = newObject(kind, [10, 0, 0]);
        const authored = JSON.stringify({ terrain, car });
        let state = { ...initialVehicle(car, terrain), speed: 8 };
        for (let frame = 0; frame < 12; frame++) {
          const next = stepVehicle(state, car, terrain, drive, 1 / 60);
          expect(next.message).toBe("");
          state = next.state;
          expect(state.y).toBeCloseTo(
            terrainHeight(terrain, state.x, state.z),
            6,
          );
        }
        expect(state.z).toBeGreaterThan(1.6);
        expect(state.y).toBeGreaterThan(3.5);
        expect(state.pitch).toBeLessThan(-0.9);
        expect(state.roll).toBeGreaterThan(0.1);
        // Reverse back down the same slope without leaving the ground.
        state.speed = -4;
        const height = state.y;
        for (let frame = 0; frame < 12; frame++)
          state = stepVehicle(
            state,
            car,
            terrain,
            { ...drive, throttle: -1 },
            1 / 60,
          ).state;
        expect(state.y).toBeLessThan(height);
        expect(state.y).toBeCloseTo(
          terrainHeight(terrain, state.x, state.z),
          6,
        );
        expect(JSON.stringify({ terrain, car })).toBe(authored);
      }
    }
  }
});

test("off-road freedom does not allow cars to creep up cliffs or remove plane runway limits", () => {
  const cliff = terrainSchema.parse({
    width: 16,
    depth: 16,
    paths: false,
    heights: Array.from({ length: TERRAIN_POINTS }, (_, i) =>
      Math.floor(i / (TERRAIN_SEGMENTS + 1)) >= TERRAIN_SEGMENTS / 2 ? 10 : 0,
    ),
  });
  for (const kind of ["car", "driftcar"] as const) {
    const car = newObject(kind, [0, 0, -0.5]);
    let state = initialVehicle(car, cliff);
    for (let frame = 0; frame < 60; frame++) {
      const next = stepVehicle(state, car, cliff, drive, 1 / 60);
      expect(next.message).toContain("Too steep");
      state = next.state;
    }
    expect(state.speed).toBe(0);
    expect(state.z).toBe(-0.5);
    expect(state.y).toBe(0);
  }
  const terrain = hillside(),
    plane = newObject("plane", [10, 0, 1.5]);
  const start = { ...initialVehicle(plane, terrain), speed: 10 };
  const next = stepVehicle(start, plane, terrain, drive, 0.05);
  expect(next.message).toContain("Too steep");
  expect(next.state.z).toBe(start.z);
  expect(next.state.airborne).toBe(false);
});

test("test drive climbs a road-free hill without changing the saved portfolio", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/editor");
  await expect(page.locator("canvas")).toBeVisible();
  const current = async () => (await page.request.get("/api/world")).json();
  const original = await current();
  try {
    const world = starterWorld();
    world.objects = [];
    world.terrain = hillside();
    expect(
      (
        await page.request.put("/api/world", {
          data: { world, revision: original.revision },
        })
      ).ok(),
    ).toBe(true);
    await page.reload();
    await page.getByRole("button", { name: "Vehicles", exact: true }).click();
    await page
      .getByRole("button", { name: "Tokyo drift tuner Vehicles" })
      .click();
    await page.getByLabel("Position X", { exact: true }).fill("10");
    await page.getByLabel("Position Z", { exact: true }).fill("-1");
    // Smart placement may face the car toward the spawn; aim it up this hill.
    await page.getByLabel("Object rotation", { exact: true }).fill("0");
    await expect(
      page.getByRole("button", { name: "Saved", exact: true }),
    ).toBeVisible();
    const authored = await current();
    await page.getByRole("button", { name: "Test drive", exact: true }).click();
    const canvas = page.locator("canvas");
    await expect(canvas).toHaveAttribute("data-vehicle", "driftcar");
    const position = async () =>
      (await canvas.getAttribute("data-vehicle-position"))!
        .split(",")
        .map(Number);
    await page.keyboard.down("w");
    try {
      await expect.poll(async () => (await position())[1]).toBeGreaterThan(4);
    } finally {
      await page.keyboard.up("w");
    }
    await page.keyboard.down("b");
    await expect(page.locator(".vehicle-instruments b").first()).toHaveText(
      "0",
    );
    await page.keyboard.up("b");
    const [x, y, z] = await position();
    expect(x).toBeCloseTo(10, 1);
    expect(z).toBeGreaterThan(1.8);
    expect(y).toBeCloseTo(terrainHeight(world.terrain, x, z), 1);
    await page.screenshot({ path: "test-results/offroad-hill.png" });
    await page
      .getByRole("button", { name: "Return to spawn", exact: true })
      .click();
    expect((await current()).world).toEqual(authored.world);
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
