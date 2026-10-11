import { test, expect, type Page } from "@playwright/test";
import { Scene } from "three";
import { newObject, starterWorld, worldSchema } from "../lib/world";
import { terrainSchema } from "../lib/terrain";
import {
  initialVehicle,
  stepVehicle,
  type VehicleInput,
} from "../lib/vehicles";
import { DriftEffects } from "../lib/drift-effects";

const idle: VehicleInput = {
  throttle: 0,
  steer: 0,
  climb: 0,
  boost: false,
  brake: false,
};
const flat = terrainSchema.parse({ width: 48, depth: 48 });
test("handbrake creates real sideways travel, scores moving slides and regains grip", () => {
  for (const kind of ["car", "driftcar"] as const) {
    const car = newObject(kind),
      snapshot = JSON.stringify(car);
    let grip = { ...initialVehicle(car, flat), speed: 8 },
      slide = { ...grip };
    for (let i = 0; i < 45; i++) {
      grip = stepVehicle(
        grip,
        car,
        flat,
        { ...idle, throttle: 1, steer: 1 },
        1 / 60,
      ).state;
      slide = stepVehicle(
        slide,
        car,
        flat,
        { ...idle, throttle: 1, steer: 1, handbrake: true },
        1 / 60,
      ).state;
    }
    expect(slide.drifting).toBe(true);
    expect(Math.abs(slide.driftAngle)).toBeGreaterThan(0.5);
    expect(Math.abs(grip.driftAngle)).toBeLessThan(0.2);
    expect(grip.drifting).toBe(false);
    expect(Math.hypot(slide.x - grip.x, slide.z - grip.z)).toBeGreaterThan(0.5);
    expect(slide.driftScore).toBeGreaterThan(10);
    const points = slide.driftScore;
    for (let i = 0; i < 45; i++)
      slide = stepVehicle(
        slide,
        car,
        flat,
        { ...idle, throttle: 1 },
        1 / 60,
      ).state;
    expect(slide.drifting).toBe(false);
    expect(Math.abs(slide.driftAngle)).toBeLessThan(0.02);
    expect(slide.driftChain).toBe(0);
    expect(slide.bestDrift).toBeGreaterThan(0);
    expect(slide.driftScore).toBeGreaterThanOrEqual(points);
    expect(JSON.stringify(car)).toBe(snapshot);
  }
});

test("drifting respects obstacles, shores, brake priority and excludes boats/planes", () => {
  const car = newObject("driftcar"),
    initial = initialVehicle(car, flat);
  let moving = { ...initial, speed: 10 };
  for (let i = 0; i < 30; i++)
    moving = stepVehicle(
      moving,
      car,
      flat,
      { ...idle, throttle: 1, steer: 1, handbrake: true },
      1 / 60,
    ).state;
  const hit = stepVehicle(
    moving,
    car,
    flat,
    { ...idle, handbrake: true, steer: 1 },
    0.05,
    () => true,
  ).state;
  expect(hit.speed).toBe(0);
  expect(hit.drifting).toBe(false);
  expect(hit.driftScore).toBe(moving.driftScore);
  const shore = stepVehicle(
    { ...moving, x: 23.8 },
    car,
    flat,
    { ...idle, handbrake: true },
    0.05,
  ).state;
  expect(shore.x).toBe(23.8);
  expect(shore.speed).toBe(0);
  for (let i = 0; i < 90; i++)
    moving = stepVehicle(
      moving,
      car,
      flat,
      { ...idle, brake: true, handbrake: true, throttle: 1 },
      1 / 60,
    ).state;
  expect(moving.speed).toBe(0);
  expect(moving.drifting).toBe(false);
  expect(
    stepVehicle(
      initial,
      car,
      flat,
      { ...idle, handbrake: true, steer: 1 },
      0.05,
    ).state.driftScore,
  ).toBe(0);
  for (const kind of ["boat", "plane"] as const) {
    const object = newObject(kind, kind === "boat" ? [30, 0, 0] : [0, 0, 0]);
    const state = { ...initialVehicle(object, flat), speed: 7 };
    expect(
      stepVehicle(
        state,
        object,
        flat,
        { ...idle, steer: 1, handbrake: true },
        0.05,
      ).state,
    ).toEqual(
      stepVehicle(state, object, flat, { ...idle, steer: 1 }, 0.05).state,
    );
  }
  const legacy = starterWorld();
  legacy.objects = [newObject("car")];
  delete (legacy.objects[0].vehicle as { grip?: number }).grip;
  expect(worldSchema.parse(legacy).objects[0].vehicle?.grip).toBe(1);
});

test("smoke and skid marks use bounded pools and reset cleanly", () => {
  const scene = new Scene(),
    effects = new DriftEffects(scene),
    car = newObject("driftcar");
  const state = { ...initialVehicle(car, flat), speed: 8, drifting: true };
  for (let i = 0; i < 400; i++)
    effects.tick(
      0.05,
      { ...state, x: Math.sin(i / 20) * 4, z: Math.cos(i / 20) * 4 },
      flat,
    );
  expect(effects.group.children).toHaveLength(41);
  expect(effects.positions.length).toBe(256 * 6);
  expect(effects.smoke.some((p) => p.mesh.visible)).toBe(true);
  effects.reset();
  expect(effects.positions.every((v) => v === 0)).toBe(true);
  expect(effects.smoke.every((p) => !p.mesh.visible)).toBe(true);
  effects.dispose();
  expect(scene.children).toHaveLength(0);
});

async function current(page: Page) {
  return (await page.request.get("/api/world")).json();
}
function wav() {
  // A synthetic, original test tone, not a commercial recording.
  const frames = 16000,
    buffer = Buffer.alloc(44 + frames * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(8000, 24);
  buffer.writeUInt32LE(16000, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(frames * 2, 40);
  for (let i = 0; i < frames; i++)
    buffer.writeInt16LE(
      Math.round(Math.sin((i * Math.PI * 2 * 220) / 8000) * 100),
      44 + i * 2,
    );
  return buffer;
}

test("tuner editing, keyboard/touch drift and opt-in radio stay local and session-only", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let spotifyRequests = 0;
  // The external player is tested at the integration boundary, not by bypassing a streaming service.
  await page.route("https://open.spotify.com/**", async (route) => {
    spotifyRequests++;
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<p>Streaming service test boundary</p>",
    });
  });
  await page.goto("/editor");
  await expect(page.locator("canvas")).toBeVisible();
  const original = await current(page);
  try {
    const world = starterWorld();
    world.objects = [];
    world.terrain = flat;
    world.ground = "#737574";
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
    await page.getByLabel("Position X", { exact: true }).fill("0");
    await page.getByLabel("Position Z", { exact: true }).fill("0");
    await page.getByLabel("Tire grip", { exact: true }).fill("0.65");
    await expect(
      page.getByRole("button", { name: "Saved", exact: true }),
    ).toBeVisible();
    const authored = await current(page);
    expect(authored.world.objects[0].vehicle.grip).toBe(0.65);
    await page.screenshot({ path: "test-results/tokyo-tuner-editor.png" });
    await page.getByRole("button", { name: "Test drive", exact: true }).click();
    const canvas = page.locator("canvas");
    await expect(canvas).toHaveAttribute("data-vehicle", "driftcar");
    await page.keyboard.down("w");
    await expect
      .poll(async () =>
        Number(
          await page.locator(".vehicle-instruments b").first().textContent(),
        ),
      )
      .toBeGreaterThan(22);
    await page.keyboard.down("Space");
    await page.keyboard.down("a");
    await expect(canvas).toHaveAttribute("data-drifting", "true");
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-drift-score")))
      .toBeGreaterThan(15);
    await page.screenshot({ path: "test-results/tokyo-drifting.png" });
    await page.keyboard.up("a");
    await page.keyboard.up("Space");
    await page.keyboard.up("w");
    await page.keyboard.down("b");
    await expect(page.locator(".vehicle-instruments b").first()).toHaveText(
      "0",
    );
    await page.keyboard.up("b");
    await expect(canvas).toHaveAttribute("data-drifting", "false");
    expect((await current(page)).world.objects).toEqual(authored.world.objects);

    await page
      .getByRole("button", { name: "Open car radio", exact: true })
      .click();
    expect(spotifyRequests).toBe(0);
    await expect(page.locator(".car-radio iframe")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Load Tokyo Drift on Spotify", exact: true })
      .click();
    await expect(page.getByTitle("Tokyo Drift — Spotify player")).toBeVisible();
    await expect.poll(() => spotifyRequests).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Stop Spotify player" }).click();
    await expect(page.locator(".car-radio iframe")).toHaveCount(0);
    await page.getByLabel("Local music file", { exact: true }).setInputFiles({
      name: "not-a-song.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not audio"),
    });
    await expect(page.getByRole("alert")).toContainText("Choose an audio file");
    await page.getByLabel("Local music file", { exact: true }).setInputFiles({
      name: "original-test-tone.wav",
      mimeType: "audio/wav",
      buffer: wav(),
    });
    const audio = page.getByLabel("Local music player", { exact: true });
    await expect(audio).toHaveAttribute("src", /^blob:/);
    await expect
      .poll(() => audio.evaluate((el: HTMLAudioElement) => el.readyState))
      .toBeGreaterThanOrEqual(2);
    await audio.evaluate(async (el: HTMLAudioElement) => {
      await el.play();
    });
    await expect
      .poll(() => audio.evaluate((el: HTMLAudioElement) => el.paused))
      .toBe(false);
    const playback = await audio.elementHandle();
    await page
      .getByRole("button", { name: "Close car radio", exact: true })
      .click();
    await expect(audio).toHaveCount(0);
    await expect
      .poll(() => playback!.evaluate((el) => (el as HTMLAudioElement).paused))
      .toBe(true);
    await playback?.dispose();

    await page
      .getByRole("button", { name: "Return to spawn", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Open car radio" }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Back to editor", exact: true })
      .click();
    await page.getByRole("button", { name: "Test drive", exact: true }).click();
    await expect(canvas).toHaveAttribute("data-drift-score", "0");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.keyboard.down("w");
    await page.keyboard.down("a");
    const drift = page.getByRole("button", {
      name: "Handbrake drift",
      exact: true,
    });
    await drift.dispatchEvent("pointerdown", {
      pointerId: 1,
      pointerType: "touch",
    });
    await expect(canvas).toHaveAttribute("data-drifting", "true");
    await drift.dispatchEvent("pointerup", {
      pointerId: 1,
      pointerType: "touch",
    });
    await page.keyboard.up("w");
    await page.keyboard.up("a");
    await page.screenshot({ path: "test-results/tokyo-drift-mobile.png" });
    await page.getByRole("button", { name: "Open car radio" }).click();
    const panel = await page.locator(".radio-content").boundingBox();
    expect(panel!.x).toBeGreaterThanOrEqual(0);
    expect(panel!.x + panel!.width).toBeLessThanOrEqual(390);
    await page.screenshot({ path: "test-results/car-radio-mobile.png" });
    await page.getByRole("button", { name: "Close car radio" }).click();
    await page
      .getByRole("button", { name: "Return to spawn", exact: true })
      .click();
    expect((await current(page)).world.objects).toEqual(authored.world.objects);
    expect(errors).toEqual([]);
  } finally {
    await page.close();
    const last = await current(page);
    expect(
      (
        await page.request.put("/api/world", {
          data: { world: original.world, revision: last.revision },
        })
      ).ok(),
    ).toBe(true);
  }
});
