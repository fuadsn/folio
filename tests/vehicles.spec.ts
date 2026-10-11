import { test, expect, type Page } from "@playwright/test";
import {
  newObject,
  starterWorld,
  worldSchema,
  type World,
  type WorldObject,
} from "../lib/world";
import { terrainSchema, type Terrain } from "../lib/terrain";
import {
  initialVehicle,
  stepVehicle,
  vehiclePlacement,
  isWater,
  isLand,
  exitVehiclePosition,
  vehicleSchema,
  TRAVEL_LIMIT,
  MAX_FLIGHT_HEIGHT,
  type VehicleInput,
  type VehicleState,
} from "../lib/vehicles";

const idle: VehicleInput = {
  throttle: 0,
  steer: 0,
  climb: 0,
  boost: false,
  brake: false,
};
function simulate(
  state: VehicleState,
  object: WorldObject,
  terrain: Terrain,
  input: Partial<VehicleInput>,
  frames = 60,
) {
  for (let i = 0; i < frames; i++)
    state = stepVehicle(
      state,
      object,
      terrain,
      { ...idle, ...input },
      1 / 60,
    ).state;
  return state;
}

test("vehicle schema, smart placement, acceleration, steering and braking preserve authored positions", () => {
  const world = starterWorld(),
    t = terrainSchema.parse({});
  for (const kind of ["car", "boat", "plane"] as const) {
    const p = vehiclePlacement(world, kind);
    expect(
      kind === "boat"
        ? isWater(world.terrain, p[0], p[2], 0.9)
        : isLand(world.terrain, p[0], p[2], 1),
    ).toBe(true);
    expect(
      worldSchema.safeParse({ ...world, objects: [newObject(kind, p)] })
        .success,
    ).toBe(true);
  }
  expect(vehicleSchema.safeParse({ speed: 200 }).success).toBe(false);
  const car = newObject("car"),
    original = JSON.stringify(car),
    start = initialVehicle(car, t);
  const moving = simulate(start, car, t, { throttle: 1 });
  expect(moving.z).toBeGreaterThan(3);
  expect(moving.speed).toBeGreaterThan(7);
  const turned = simulate(start, car, t, { throttle: 1, steer: 1 });
  expect(turned.yaw).toBeGreaterThan(0.5);
  expect(turned.x).toBeGreaterThan(1);
  const stopped = simulate(moving, car, t, { brake: true });
  expect(stopped.speed).toBe(0);
  const reverse = simulate(stopped, car, t, { throttle: -1 });
  expect(reverse.speed).toBeLessThan(0);
  expect(reverse.z).toBeLessThan(stopped.z);
  expect(JSON.stringify(car)).toBe(original);
  expect(start.z).toBe(0);
});

test("cars stop at shore and obstacles; boats float, turn and cannot cross land", () => {
  const t = terrainSchema.parse({}),
    car = newObject("car", [0, 0, 12]);
  const driving = simulate(
    initialVehicle(car, t),
    car,
    t,
    { throttle: 1 },
    240,
  );
  expect(driving.z).toBeLessThan(t.depth / 2);
  expect(driving.speed).toBe(0);
  const blocked = stepVehicle(
    { ...initialVehicle(car, t), speed: 8 },
    car,
    t,
    idle,
    0.05,
    () => true,
  );
  expect(blocked.state.z).toBe(12);
  expect(blocked.state.speed).toBe(0);
  const boat = newObject("boat", [0, 0, 18]);
  const cruising = simulate(
    initialVehicle(boat, t),
    boat,
    t,
    { throttle: 1 },
    180,
  );
  expect(cruising.z).toBeGreaterThan(25);
  expect(cruising.y).toBe(t.waterLevel);
  const nearShore = { ...initialVehicle(boat, t), yaw: Math.PI };
  const beached = simulate(nearShore, boat, t, { throttle: 1 }, 240);
  expect(beached.z).toBeGreaterThan(t.depth / 2);
  expect(beached.speed).toBe(0);
  expect(
    simulate(
      { ...initialVehicle(boat, t), z: TRAVEL_LIMIT - 1 },
      boat,
      t,
      { throttle: 1 },
      180,
    ).z,
  ).toBeLessThanOrEqual(TRAVEL_LIMIT);
});

test("planes take off, respect altitude, land slowly and recover after impacts", () => {
  const t = terrainSchema.parse({ width: 48, depth: 48 }),
    plane = newObject("plane", [0, 0, -10]);
  const start = initialVehicle(plane, t);
  const flying = simulate(start, plane, t, { throttle: 1, climb: 1 }, 120);
  expect(flying.airborne).toBe(true);
  expect(flying.y).toBeGreaterThan(5);
  const high = stepVehicle(
    { ...flying, y: MAX_FLIGHT_HEIGHT },
    plane,
    t,
    { ...idle, throttle: 1, climb: 1 },
    0.05,
  );
  expect(high.state.y).toBe(MAX_FLIGHT_HEIGHT);
  const landed = stepVehicle(
    { ...flying, x: 0, z: 0, y: 0.1, speed: 6 },
    plane,
    t,
    { ...idle, climb: -1 },
    0.05,
  );
  expect(landed.state.airborne).toBe(false);
  expect(landed.state.y).toBe(0);
  const crash = stepVehicle(
    { ...flying, y: 0.1, speed: 15 },
    plane,
    t,
    { ...idle, climb: -1 },
    0.05,
  );
  expect(crash.reset).toBe(true);
  expect(crash.state).toEqual(start);
  const obstacle = stepVehicle(flying, plane, t, idle, 0.05, () => true);
  expect(obstacle.reset).toBe(true);
  const water = stepVehicle(
    { ...flying, x: 30, y: t.waterLevel + 0.1, speed: 6 },
    plane,
    t,
    { ...idle, climb: -1 },
    0.05,
  );
  expect(water.reset).toBe(true);
});

test("exits require a stopped vehicle and nearby unobstructed dry land", () => {
  const t = terrainSchema.parse({}),
    boat = newObject("boat", [0, 0, 16]);
  const docked = initialVehicle(boat, t);
  const exit = exitVehiclePosition(docked, t, () => false);
  expect(exit).not.toBeNull();
  expect(isLand(t, exit![0], exit![2])).toBe(true);
  expect(
    exitVehiclePosition({ ...docked, speed: 4 }, t, () => false),
  ).toBeNull();
  expect(
    exitVehiclePosition({ ...docked, airborne: true }, t, () => false),
  ).toBeNull();
  expect(exitVehiclePosition({ ...docked, z: 40 }, t, () => false)).toBeNull();
  expect(exitVehiclePosition(docked, t, () => true)).toBeNull();
});

async function state(page: Page) {
  return (await page.request.get("/api/world")).json();
}
async function put(page: Page, world: World) {
  const current = await state(page);
  expect(
    (
      await page.request.put("/api/world", {
        data: { world, revision: current.revision },
      })
    ).ok(),
  ).toBe(true);
}
async function saved(page: Page) {
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
}
async function position(page: Page) {
  return (await page.locator("canvas").getAttribute("data-vehicle-position"))!
    .split(",")
    .map(Number);
}
async function pressUntil(
  page: Page,
  keys: string[],
  condition: () => Promise<void>,
) {
  for (const key of keys) await page.keyboard.down(key);
  try {
    await condition();
  } finally {
    for (const key of keys) await page.keyboard.up(key);
  }
}

test("vehicle library, editor settings, test drive and session-only movement persist correctly", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/editor");
  await expect(page.locator("canvas")).toBeVisible();
  const original = await state(page);
  try {
    const world = starterWorld();
    world.objects = [];
    world.terrain = terrainSchema.parse({});
    await put(page, world);
    await page.reload();
    await page.getByRole("button", { name: "Vehicles", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Adventure car Vehicles" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Adventure car Vehicles" }).click();
    await page.getByLabel("Object name", { exact: true }).fill("Amber cruiser");
    await page.getByLabel("Top speed", { exact: true }).fill("1.3");
    await page.getByLabel("Visitors can drive", { exact: true }).uncheck();
    await expect(
      page.getByRole("button", { name: "Test drive", exact: true }),
    ).toBeDisabled();
    await saved(page);
    expect((await state(page)).world.objects[0].vehicle.enabled).toBe(false);
    await page.getByLabel("Visitors can drive", { exact: true }).check();
    await saved(page);
    const parked = await state(page);
    expect(parked.world.objects[0].vehicle.speed).toBe(1.3);
    await page.screenshot({ path: "test-results/vehicle-editor.png" });
    await page.getByRole("button", { name: "Test drive", exact: true }).click();
    await expect(page.locator("canvas")).toHaveAttribute("data-vehicle", "car");
    const start = await position(page);
    await pressUntil(page, ["w"], async () => {
      await expect
        .poll(async () => Math.abs((await position(page))[2] - start[2]))
        .toBeGreaterThan(2);
    });
    await page.screenshot({ path: "test-results/driving-car.png" });
    await pressUntil(page, ["b"], async () => {
      await expect(page.locator(".vehicle-instruments b").first()).toHaveText(
        "0",
      );
    });
    await page.keyboard.press("f");
    await expect(page.locator("canvas")).not.toHaveAttribute("data-vehicle");
    await page.keyboard.press("f");
    await expect(page.locator("canvas")).toHaveAttribute("data-vehicle", "car");
    await page
      .getByRole("button", { name: "Portfolio view", exact: true })
      .click();
    const frozen = await position(page);
    await page.keyboard.down("w");
    await page.waitForTimeout(350);
    await page.keyboard.up("w");
    expect(await position(page)).toEqual(frozen);
    await page.getByRole("button", { name: "Close dialog" }).click();
    await page
      .getByRole("button", { name: "Return to spawn", exact: true })
      .click();
    await expect(page.locator("canvas")).not.toHaveAttribute("data-vehicle");
    await page
      .getByRole("button", { name: "Back to editor", exact: true })
      .click();
    expect((await state(page)).world.objects).toEqual(parked.world.objects);
    await page.reload();
    await page.getByRole("button", { name: "Vehicles", exact: true }).click();
    await page.getByRole("button", { name: "Motor boat Vehicles" }).click();
    await page
      .getByRole("button", { name: "Edit individual pieces", exact: true })
      .click();
    await saved(page);
    expect(
      (await state(page)).world.objects.find(
        (o: WorldObject) => o.kind === "boat",
      ).parts.length,
    ).toBeGreaterThan(3);
    await page.getByRole("button", { name: "Test drive", exact: true }).click();
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-vehicle",
      "boat",
    );
    expect((await position(page))[1]).toBeCloseTo(world.terrain.waterLevel, 1);
    // Smart placement points the boat out toward open water.
    const boatStart = await position(page);
    await pressUntil(page, ["w"], async () => {
      await expect
        .poll(async () => (await position(page))[2] - boatStart[2])
        .toBeGreaterThan(1);
    });
    await page.screenshot({ path: "test-results/driving-boat.png" });
    await page
      .getByRole("button", { name: "Return to spawn", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Back to editor", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Propeller plane Vehicles" })
      .click();
    // Give the plane a clear runway away from the parked car.
    await page.getByLabel("Position X", { exact: true }).fill("6");
    await page.getByLabel("Position Z", { exact: true }).fill("6");
    await saved(page);
    await page.getByRole("button", { name: "Test drive", exact: true }).click();
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-vehicle",
      "plane",
    );
    await pressUntil(page, ["w", "Space"], async () => {
      await expect
        .poll(async () => (await position(page))[1], { timeout: 10000 })
        .toBeGreaterThan(3);
    });
    await page.keyboard.press("f");
    await expect(
      page.getByText("Land your plane before getting out.", { exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: "test-results/flying-plane.png" });
    await page
      .getByRole("button", { name: "Return to spawn", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Back to editor", exact: true })
      .click();
    expect(
      (await state(page)).world.objects.filter((o: WorldObject) => o.vehicle),
    ).toHaveLength(3);
    expect(errors).toEqual([]);
  } finally {
    await page.close();
    await put(page, original.world);
  }
});

test("visitor boarding and touch vehicle controls work on a small screen", async ({
  page,
}) => {
  await page.goto("/editor");
  await expect(page.locator("canvas")).toBeVisible();
  const original = await state(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    const world = starterWorld();
    world.objects = [newObject("car", [0, 0, 3])];
    world.terrain = terrainSchema.parse({});
    world.objects[0].rotation = 180;
    await put(page, world);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Drive car F" }).click();
    await expect(page.locator("canvas")).toHaveAttribute("data-vehicle", "car");
    const start = await position(page),
      forward = page.locator(".touch-w");
    await forward.dispatchEvent("pointerdown", {
      pointerId: 1,
      pointerType: "touch",
    });
    await expect
      .poll(async () => Math.abs((await position(page))[2] - start[2]))
      .toBeGreaterThan(1);
    await forward.dispatchEvent("pointerup", {
      pointerId: 1,
      pointerType: "touch",
    });
    await page.screenshot({ path: "test-results/vehicle-mobile.png" });
    const hud = await page.locator(".vehicle-hud").boundingBox();
    expect(hud!.x).toBeGreaterThanOrEqual(0);
    expect(hud!.x + hud!.width).toBeLessThanOrEqual(390);
    await page
      .getByRole("button", { name: "Return to spawn", exact: true })
      .click();
    await expect(page.locator("canvas")).not.toHaveAttribute("data-vehicle");
    expect((await state(page)).world.objects).toEqual(world.objects);
    expect(errors).toEqual([]);
  } finally {
    await page.close();
    await put(page, original.world);
  }
});
