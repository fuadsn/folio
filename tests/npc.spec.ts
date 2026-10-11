import { test, expect } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { demoWorlds, demoDetailsSQL } from "../scripts/demo-worlds.mjs";
import { npcSchema } from "../lib/npc";
import { newObject, worldSchema } from "../lib/world";
import { portalPosition } from "../lib/travel-portal";

test("NPC defaults and limits validate; sample dialogue links resolve", () => {
  expect(newObject("npc").npc?.motion).toBe("wave");
  expect(npcSchema.safeParse({ choices: Array(7).fill({ label: "Hi", answer: "Hello" }) }).success).toBe(false);
  expect(npcSchema.safeParse({ greeting: "x".repeat(1501) }).success).toBe(false);
  expect(npcSchema.safeParse({ skin: "red" }).success).toBe(false);
  for (const demo of demoWorlds) {
    const world = worldSchema.parse(demo.world);
    const npcs = world.objects.filter((o) => o.kind === "npc");
    expect(npcs).toHaveLength(3);
    const portal = portalPosition(world, () => false)!;
    for (const npc of npcs)
      expect(Math.hypot(npc.position[0] - portal[0], npc.position[2] - portal[2])).toBeGreaterThanOrEqual(5.8);
    for (const npc of npcs) for (const choice of npc.npc!.choices) {
      if (choice.targetId) expect(world.objects.some((o) => o.id === choice.targetId && o.role !== "none")).toBe(true);
    }
    for (const kind of ["garage", "kiosk", "picnic", "campfire", "crate"])
      expect(world.objects.some((o) => o.kind === kind)).toBe(true);
  }
});

test("demo detail upgrades are additive, idempotent, capacity-bounded and never publish drafts", () => {
  // Compare persisted JSON values, where JavaScript -0 is normalized to 0.
  const samples = JSON.parse(JSON.stringify(demoWorlds)) as typeof demoWorlds;
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(readFileSync("drizzle/0000_fuzzy_celestials.sql", "utf8"));
    const insert = db.prepare("INSERT INTO worlds(id,owner,draft,published,revision,updated_at) VALUES(?,?,?,?,0,'original')");
    const legacyWorlds = samples.map((demo) => ({ ...demo.world, objects: demo.world.objects.filter((o) => !o.id.includes("-detail-")) }));
    for (const [index, demo] of samples.entries()) {
      const world = JSON.stringify(legacyWorlds[index]);
      insert.run(demo.id, demo.owner, world, index === 1 ? null : world);
    }
    insert.run("creator", "local_seedy", "private creator draft", null);
    const creator = db.prepare("SELECT * FROM worlds WHERE id='creator'").get();
    db.exec(demoDetailsSQL());
    const records = db.prepare("SELECT * FROM worlds ORDER BY id").all();
    expect(db.prepare("SELECT * FROM worlds WHERE id='creator'").get()).toEqual(creator);
    for (const [index, demo] of samples.entries()) {
      const row = db.prepare("SELECT * FROM worlds WHERE id=?").get(demo.id)!;
      const draft = JSON.parse(row.draft as string);
      expect(draft.objects).toEqual(demo.world.objects);
      expect({ ...draft, objects: legacyWorlds[index].objects }).toEqual(legacyWorlds[index]);
      expect(worldSchema.safeParse(draft).success).toBe(true);
      if (index === 1) expect(row.published).toBeNull();
      else expect(JSON.parse(row.published as string).objects).toEqual(draft.objects);
    }
    db.exec(demoDetailsSQL("2026-10-12T00:00:00Z"));
    expect(db.prepare("SELECT * FROM worlds ORDER BY id").all()).toEqual(records);
    const first = samples[0];
    const customized = structuredClone(first.world);
    customized.objects.find((o) => o.id.endsWith("detail-welcome"))!.name = "Keep my edited guide";
    db.prepare("UPDATE worlds SET draft=? WHERE id=?").run(JSON.stringify(customized), first.id);
    db.exec(demoDetailsSQL());
    expect(JSON.parse(db.prepare("SELECT draft FROM worlds WHERE id=?").get(first.id)!.draft as string)).toEqual(customized);
    const full = { ...legacyWorlds[0], objects: Array.from({ length: 150 }, (_, i) => ({ ...legacyWorlds[0].objects[0], id: `full-${i}` })) };
    db.prepare("UPDATE worlds SET draft=? WHERE id=?").run(JSON.stringify(full), first.id);
    db.exec(demoDetailsSQL());
    expect(JSON.parse(db.prepare("SELECT draft FROM worlds WHERE id=?").get(first.id)!.draft as string)).toEqual(full);
  } finally { db.close(); }
});

test("visitors talk to NPCs with E or touch, follow story links and cannot move during dialogue", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`/w/${demoWorlds[0].id}`);
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-npc-count", "3", { timeout: 15000 });
  await expect(page.getByRole("button", { name: /Talk to Riley/ })).toBeVisible();
  await page.screenshot({ path: "test-results/npc-world.png" });
  await canvas.focus();
  await page.keyboard.press("e");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Talk to Riley" })).toBeVisible();
  const position = await canvas.getAttribute("data-player");
  await page.keyboard.down("w");
  await page.waitForTimeout(250);
  await page.keyboard.up("w");
  expect(await canvas.getAttribute("data-player")).toBe(position);
  await dialog.getByRole("button", { name: "Show me a project", exact: true }).click();
  await expect(dialog).toContainText("Let's explore Momentum Garage");
  await page.screenshot({ path: "test-results/npc-conversation.png" });
  await dialog.getByRole("button", { name: "Open Momentum Garage", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: "Momentum Garage", exact: true })).toHaveCount(2);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: /Talk to Riley/ }).click();
  await expect(dialog.getByRole("button", { name: "Where can I drive?" })).toBeVisible();
  await page.screenshot({ path: "test-results/npc-mobile.png", animations: "disabled" });
  expect(errors).toEqual([]);
});

test("NPC editor persists dialogue and appearance; missing story links fail safely", async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/editor");
  const current = async () => (await page.request.get("/api/world")).json();
  const saved = async () => expect(page.getByRole("button", { name: "Saved", exact: true })).toBeVisible();
  await saved();
  const original = await current();
  try {
    await page.getByRole("button", { name: "People", exact: true }).click();
    await page.getByRole("button", { name: "NPC guide People", exact: true }).click();
    await page.getByLabel("Object name", { exact: true }).fill("Test guide");
    await page.getByLabel("NPC greeting").fill("Welcome! This greeting is editable.");
    await page.getByLabel("NPC hat", { exact: true }).selectOption("beanie");
    await page.getByLabel("NPC animation").selectOption("still");
    await page.getByLabel("NPC skin color").fill("#bb8866");
    await page.getByLabel("NPC question 1").fill("Show your work");
    await page.getByLabel("NPC answer 1").fill("This story explains the project.");
    const project = original.world.objects.find((o: { role: string }) => o.role === "project");
    await page.getByLabel("NPC story 1").selectOption(project.id);
    await page.getByRole("button", { name: /Add dialogue choice/ }).click();
    await page.getByLabel("NPC question 2").fill("Where am I?");
    await page.getByLabel("NPC answer 2").fill("In an editable portfolio world.");
    await saved();
    const edited = await current();
    const guide = edited.world.objects.find((o: { kind: string }) => o.kind === "npc");
    expect(guide.npc).toMatchObject({ motion: "still", skin: "#bb8866", hatStyle: "beanie", choices: [{ label: "Show your work", targetId: project.id }, { label: "Where am I?" }] });
    await page.getByRole("button", { name: "Preview conversation" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Show your work" }).click();
    await expect(page.getByRole("dialog").getByRole("button", { name: `Open ${project.name}` })).toBeVisible();
    await page.getByRole("button", { name: "Close dialog" }).click();
    await page.screenshot({ path: "test-results/npc-editor.png" });
    await page.reload();
    expect((await current()).world.objects.find((o: { id: string }) => o.id === guide.id)).toEqual(guide);
    const state = await current();
    expect((await page.request.put("/api/world", { data: { revision: state.revision, world: { ...state.world, objects: state.world.objects.filter((o: { id: string }) => o.id !== project.id) } } })).ok()).toBe(true);
    await page.goto("/play");
    await expect(page.locator("canvas")).toHaveAttribute("data-npc-count", "1", { timeout: 15000 });
    // This default placement is six metres from spawn; walk closer to talk.
    await page.locator("canvas").focus();
    await page.keyboard.down("w");
    try { await expect(page.getByRole("button", { name: /Talk to Test guide/ })).toBeVisible(); }
    finally { await page.keyboard.up("w"); }
    await page.getByRole("button", { name: /Talk to Test guide/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Show your work" }).click();
    await expect(page.getByRole("dialog")).toContainText("This linked story is no longer available.");
    expect(errors).toEqual([]);
  } finally {
    await page.close();
    const state = await current();
    expect((await page.request.put("/api/world", { data: { world: original.world, revision: state.revision } })).ok()).toBe(true);
  }
});
