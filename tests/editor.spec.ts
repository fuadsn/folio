import { test, expect } from "@playwright/test";
import { starterWorld, newObject } from "../lib/world";

test("studio renders its world without client errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/editor");
  await expect(
    page.getByRole("button", { name: "Publish world", exact: true }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(
    page.locator(".library-subhead").getByText("25 objects", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/studio-desktop.png" });
  expect(errors).toEqual([]);
});

test("edit, undo, upload, back up, publish a snapshot, and unpublish", async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/editor");
  await expect(
    page.getByRole("button", { name: "Publish world", exact: true }),
  ).toBeVisible();
  const original = await (await page.request.get("/api/world")).json();
  test.skip(
    !!original.publishedAt,
    "Run mutation tests against an unpublished local demo world.",
  );
  const reset = await page.request.put("/api/world", {
    data: { world: starterWorld(), revision: original.revision },
  });
  expect(reset.ok()).toBeTruthy();
  try {
    await page.reload();
    await expect(page.locator("canvas")).toBeVisible();
    await page
      .getByRole("button", { name: "Publish world", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Publish my world", exact: true }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Close dialog" }).click();
    await page.getByRole("button", { name: "Lookout tower Buildings" }).click();
    await page.getByLabel("Object name", { exact: true }).fill("QA lookout");
    await page.getByLabel("Position X", { exact: true }).fill("9");
    await page.getByLabel("Position Z", { exact: true }).fill("-9");
    await page.getByRole("button", { name: "Duplicate", exact: true }).click();
    await expect(page.getByLabel("Object name", { exact: true })).toHaveValue(
      "QA lookout copy",
    );
    await page.getByRole("button", { name: "Delete object" }).click();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    for (const [role, story] of [
      ["About me", "I make useful things and playful worlds."],
      ["Project", "A portfolio that you can explore like a game."],
      ["Résumé", "Designer and developer. Building since 2022."],
      ["Contact", "Say hello at hello@example.com."],
    ]) {
      await page
        .locator(".essentials")
        .getByRole("button", { name: new RegExp(`^${role}`) })
        .click();
      await page.getByLabel("Your story", { exact: true }).fill(story);
      await page.getByRole("button", { name: "Deselect object" }).click();
    }
    await expect(page.getByText("4/4", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "World", exact: true }).click();
    await page
      .getByLabel("World name", { exact: true })
      .fill("QA Makers Island");
    await page.getByLabel("Your name", { exact: true }).fill("Demo Builder");
    await page.getByRole("button", { name: "Saved", exact: true }).waitFor();
    const downloadEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export world backup" }).click();
    const download = await downloadEvent;
    const stream = await download.createReadStream();
    let backup = "";
    for await (const chunk of stream!) backup += chunk.toString();
    const savedWorld = JSON.parse(backup);
    expect(savedWorld.name).toBe("QA Makers Island");
    savedWorld.objects.push({
      ...newObject("custom", [9, 0, 6]),
      name: "Test pavilion",
      parts: [
        {
          name: "Roof",
          shape: "roof",
          color: "#afa0d5",
          position: [0, 2, 0],
          size: [3, 1, 3],
          rotation: [0, 0, 0],
        },
      ],
    });
    await page.locator('input[type="file"][accept=".json"]').setInputFiles({
      name: "world.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(savedWorld)),
    });
    await page.getByRole("button", { name: "Objects", exact: true }).click();
    await page
      .locator(".object-list")
      .getByRole("button", { name: "Test pavilion" })
      .click();
    await page.locator(".parts-editor summary").click();
    await page.getByLabel("Roof size X", { exact: true }).fill("4");
    await page
      .getByRole("button", { name: "Add a piece", exact: true })
      .click();
    await expect(page.locator(".parts-editor summary")).toHaveCount(2);
    await page.screenshot({ path: "test-results/custom-building.png" });
    await page.getByRole("button", { name: "Build", exact: true }).click();
    await page.locator('input[type="file"][accept=".glb"]').setInputFiles({
      name: "triangle.glb",
      mimeType: "model/gltf-binary",
      buffer: triangleGlb(),
    });
    await expect(page.getByLabel("Object name", { exact: true })).toHaveValue(
      "triangle",
    );
    await page.getByLabel("Position X", { exact: true }).fill("-10");
    await page.getByRole("button", { name: "Saved", exact: true }).waitFor();
    const state = await (await page.request.get("/api/world")).json();
    expect(
      state.world.objects.find((o: { name: string }) => o.name === "QA lookout")
        .position,
    ).toEqual([9, 0, -9]);
    const uploaded = state.world.objects.find(
      (o: { name: string }) => o.name === "triangle",
    );
    expect(
      (await page.request.get(`/api/assets/${uploaded.asset}`)).status(),
    ).toBe(200);
    expect(
      (
        await page.request.put("/api/world", {
          data: { world: state.world, revision: state.revision - 1 },
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await page.request.put("/api/world", {
          headers: { Origin: "https://untrusted.example" },
          data: state,
        })
      ).status(),
    ).toBe(403);
    const invalid = structuredClone(state.world);
    invalid.objects[0].asset = "00000000-0000-4000-8000-000000000099";
    expect(
      (
        await page.request.put("/api/world", {
          data: { world: invalid, revision: state.revision },
        })
      ).status(),
    ).toBe(400);
    await page
      .getByRole("button", { name: "Play preview", exact: true })
      .click();
    await page.keyboard.down("w");
    await page.waitForTimeout(800);
    await page.keyboard.up("w");
    await expect(
      page.getByRole("button", { name: "Back to editor" }),
    ).toBeVisible();
    await page.screenshot({ path: "test-results/play-preview.png" });
    await page.getByRole("button", { name: "Back to editor" }).click();
    await page
      .getByRole("button", { name: "Publish world", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Publish my world", exact: true })
      .click();
    const link = page.getByRole("link", { name: "Open published world" });
    await expect(link).toBeVisible();
    const path = (await link.getAttribute("href"))!;
    const guest = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const visitor = await guest.newPage();
    visitor.on("pageerror", (error) => errors.push(error.message));
    try {
      expect(
        (await guest.request.get("http://127.0.0.1:5174/api/world")).status(),
      ).toBe(401);
      await visitor.goto(`http://127.0.0.1:5174${path}`);
      await expect(
        visitor.getByRole("heading", { name: "Demo Builder" }),
      ).toBeVisible();
      // A second cold WebGL context can take longer under software rendering.
      await expect(visitor.locator("canvas")).toBeVisible({ timeout: 15000 });
      await visitor.screenshot({ path: "test-results/published-mobile.png" });
      await visitor.getByRole("button", { name: "View portfolio" }).click();
      await expect(
        visitor.getByText("I make useful things and playful worlds.", {
          exact: true,
        }),
      ).toBeVisible();
      await visitor.getByRole("button", { name: "Close dialog" }).click();
      await page.getByRole("button", { name: "Close dialog" }).click();
      await page.getByRole("button", { name: "World", exact: true }).click();
      await page
        .getByLabel("Your name", { exact: true })
        .fill("Unpublished draft name");
      await page.getByRole("button", { name: "Saved", exact: true }).waitFor();
      await visitor.reload();
      await expect(
        visitor.getByRole("heading", { name: "Demo Builder" }),
      ).toBeVisible();
      await page.reload();
      await page.getByRole("button", { name: "World", exact: true }).click();
      await expect(page.getByLabel("Your name", { exact: true })).toHaveValue(
        "Unpublished draft name",
      );
      await page
        .getByRole("button", { name: "Publish world", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Unpublish this world", exact: true })
        .click();
      await expect(link).not.toBeVisible();
      expect(
        (await guest.request.get(`http://127.0.0.1:5174${path}`)).status(),
      ).toBe(404);
      expect(
        (
          await guest.request.get(
            `http://127.0.0.1:5174/api/assets/${uploaded.asset}`,
          )
        ).status(),
      ).toBe(404);
    } finally {
      await guest.close();
    }
    expect(errors).toEqual([]);
  } finally {
    // This local demo account is restored; uploads are synthetic test fixtures only.
    await page.close();
    const current = await (await page.request.get("/api/world")).json();
    await page.request.put("/api/world", {
      data: { world: original.world, revision: current.revision },
    });
    await page.request.delete("/api/publish");
  }
});

test("missing credentials never charge credits or simulate generation", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  const before = await (await page.request.get("/api/generate")).json();
  test.skip(!!before.provider, "This test covers the unconfigured state only.");
  await expect(
    page.getByRole("button", { name: /Create something new/ }),
  ).toBeDisabled();
  const generation = await page.request.post("/api/generate", {
    data: { id: crypto.randomUUID(), prompt: "A tiny test house" },
  });
  expect(generation.status()).toBe(503);
  const after = await (await page.request.get("/api/generate")).json();
  expect(after.credits).toBe(before.credits);
  expect(after.creations).toEqual(before.creations);
  if (!before.checkout)
    expect((await page.request.post("/api/checkout")).status()).toBe(503);
});

test("Saved always refers to the latest draft, including an edit during a write", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "World", exact: true }).click();
  const original = await page
    .getByLabel("World name", { exact: true })
    .inputValue();
  let releaseWrite!: () => void;
  const writeGate = new Promise<void>((resolve) => {
    releaseWrite = resolve;
  });
  let interceptFirst = true;
  await page.route("**/api/world", async (route) => {
    if (route.request().method() === "PUT" && interceptFirst) {
      interceptFirst = false;
      await writeGate;
    }
    await route.continue();
  });
  try {
    await page
      .getByLabel("World name", { exact: true })
      .fill("First pending draft");
    await expect(
      page.getByRole("button", { name: "Saved", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Saving…", exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("World name", { exact: true })
      .fill("Latest draft must survive");
    releaseWrite();
    await page.getByRole("button", { name: "Saved", exact: true }).waitFor();
    await page.reload();
    await page.getByRole("button", { name: "World", exact: true }).click();
    await expect(page.getByLabel("World name", { exact: true })).toHaveValue(
      "Latest draft must survive",
    );
    await page
      .getByRole("button", { name: "Start with an empty landscape" })
      .click();
    await page.getByRole("button", { name: "Clear draft objects" }).click();
    await expect(page.locator(".stage-bottom")).toContainText("0 objects");
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(page.locator(".stage-bottom")).not.toContainText("0 objects");
  } finally {
    releaseWrite();
    await page.getByLabel("World name", { exact: true }).fill(original);
    await page.getByRole("button", { name: "Saved", exact: true }).waitFor();
  }
});

function triangleGlb() {
  const json = JSON.stringify({
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    buffers: [{ byteLength: 36 }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: "VEC3",
        min: [0, 0, 0],
        max: [1, 1, 0],
      },
    ],
  });
  const padded = Buffer.from(json.padEnd(Math.ceil(json.length / 4) * 4, " "));
  const vertices = Buffer.from(
    new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer,
  );
  const file = Buffer.alloc(12 + 8 + padded.length + 8 + vertices.length);
  file.writeUInt32LE(0x46546c67, 0);
  file.writeUInt32LE(2, 4);
  file.writeUInt32LE(file.length, 8);
  file.writeUInt32LE(padded.length, 12);
  file.writeUInt32LE(0x4e4f534a, 16);
  padded.copy(file, 20);
  file.writeUInt32LE(vertices.length, 20 + padded.length);
  file.writeUInt32LE(0x004e4942, 24 + padded.length);
  vertices.copy(file, 28 + padded.length);
  return file;
}
