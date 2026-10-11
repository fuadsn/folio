import { Box3 } from "three";
import { blueprintModel, disposeObject, model } from "./models";
import { terrainHeight } from "./terrain";
import { isLand, isVehicle } from "./vehicles";
import { newObject, type Kind, type World, type WorldObject } from "./world";

export const DRIFT_GREEN = { x: 42, z: 32, radius: 26 } as const;
export const NEIGHBORHOOD_PREFIX = "neighborhood-v1-";

/** Conservative horizontal envelope, including roofs, canopies and edited parts. */
export function footprintRadius(object: WorldObject): number {
  // Uploaded geometry is not available to this synchronous planner. Leave a large buffer.
  if (object.asset && !object.parts?.length)
    return 16 * Math.max(object.scale[0], object.scale[2]);
  const group = object.parts?.length
    ? blueprintModel(object.parts)
    : model(object.kind, object.color, object.details, object.npc);
  group.scale.fromArray(object.scale);
  const bounds = new Box3().setFromObject(group);
  const radius = Math.hypot(
    Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)),
    Math.max(Math.abs(bounds.min.z), Math.abs(bounds.max.z)),
  );
  disposeObject(group);
  return Math.max(0.6, radius);
}

/** Keep new scenery outside the drift lawn and the cross/loop driving corridors. */
export function inDrivingSpace(world: World, x: number, z: number, radius: number) {
  const { width, depth } = world.terrain;
  const loopDistance = Math.abs(Math.hypot(x / (width * 0.32), z / (depth * 0.32)) - 1)
    * Math.min(width, depth) * 0.32;
  return Math.abs(x) < 8 + radius || Math.abs(z - 0.3) < 8 + radius ||
    loopDistance < 8 + radius ||
    Math.hypot(x - DRIFT_GREEN.x, z - DRIFT_GREEN.z) < DRIFT_GREEN.radius + radius + 2;
}

export function populateNeighborhood(world: World) {
  if (Math.min(world.terrain.width, world.terrain.depth) < 192)
    throw new Error("Expand your terrain to at least 192 × 192 m before adding a drift neighborhood.");
  const occupied = world.objects.map((object) => ({ object, radius: footprintRadius(object) }));
  if (occupied.some(({ object: o, radius }) => !isVehicle(o.kind) &&
    Math.hypot(o.position[0] - DRIFT_GREEN.x, o.position[2] - DRIFT_GREEN.z) < DRIFT_GREEN.radius + radius))
    throw new Error("The southeast drift lawn already contains objects. Move those out of the 26 m radius around X 42, Z 32 first; your layout has not been changed.");
  const lawnHeights: number[] = [];
  for (let x = -26; x <= 26; x += 2) for (let z = -26; z <= 26; z += 2) {
    if (Math.hypot(x, z) > DRIFT_GREEN.radius) continue;
    if (!isLand(world.terrain, DRIFT_GREEN.x + x, DRIFT_GREEN.z + z, 2))
      throw new Error("The southeast drift lawn needs dry land. Adjust the terrain around X 42, Z 32 first; nothing was changed.");
    lawnHeights.push(terrainHeight(world.terrain, DRIFT_GREEN.x + x, DRIFT_GREEN.z + z));
  }
  if (Math.max(...lawnHeights) - Math.min(...lawnHeights) > 1.5)
    throw new Error("Flatten the southeast drift lawn around X 42, Z 32 first; this layout does not overwrite your sculpting.");

  const candidates: WorldObject[] = [];
  function add(key: string, kind: Kind, x: number, z: number, name: string, extra: Partial<WorldObject> = {}) {
    const object = { ...newObject(kind, [x, 0, z]), id: `${NEIGHBORHOOD_PREFIX}${key}`, name,
      role: "none" as const, title: name, ...extra };
    candidates.push(object);
    return object.id;
  }
  const workshop = add("garage", "garage", -28, 31, "Drift workshop", {
    scale: [1.5, 1.5, 1.5], role: "project", title: "Your next build starts here",
    text: "An editable workshop for your next project. Replace this starter story with your own work. The open drift lawn is southeast at X 42, Z 32; accelerate, hold Space and steer to slide. This facade is scenery, not a repair service.",
  });
  add("garage-two", "garage", -47, 30, "Customs shop", { color: "#4d969e", rotation: 25, scale: [1.3, 1.3, 1.3] });
  add("cafe", "cafe", -43, -31, "Sunbeam café", { scale: [1.4, 1.4, 1.4], color: "#f4ae52" });
  add("studio", "house", -27, -32, "Maker's cottage", { scale: [1.4, 1.4, 1.4], color: "#d4621a" });
  add("gallery", "gallery", 28, -37, "Exhibition hall", { scale: [1.6, 1.6, 1.6], color: "#f4ae52" });
  add("observatory", "observatory", 47, -30, "Sky lab", { scale: [1.4, 1.4, 1.4] });
  add("tower", "tower", 30, 62, "Drift lookout", { color: "#d4621a" });
  add("lodge", "house", -30, 53, "Trailside lodge", { color: "#4b8977", rotation: -20, scale: [1.3, 1.3, 1.3] });
  add("hangar", "garage", 21, -53, "Flight workshop", { color: "#f4ae52", rotation: 180 });
  const directions = add("map", "kiosk", -17, 23, "Neighborhood map", { role: "project",
    title: "A village built around the drive",
    text: "West: workshops and café. Northeast: exhibition hall and sky lab. Southeast: a 52 m-wide open drift lawn centered at X 42, Z 32. Use the main paths or head off-road. NPCs and props stay outside the driving corridors. Every new object is editable; this is starter scenery, not a claim about your projects.",
  });
  const project = world.objects.find((o) => o.role === "project")?.id;
  const about = world.objects.find((o) => o.role === "about")?.id;
  const contact = world.objects.find((o) => o.role === "contact")?.id;
  function npc(key: string, name: string, x: number, z: number, greeting: string, targetId?: string) {
    add(key, "npc", x, z, name, { color: ["#d4621a", "#4d969e", "#9d8ac0"][candidates.length % 3],
      npc: { skin: "#d6a078", hat: "#f4ae52", hatStyle: "cap", motion: "wave", greeting,
        choices: [
          { label: "Show me around", answer: "Pick a story, visit the village, or take your car out to the open drift lawn.", targetId },
          { label: "Where can I drift?", answer: "Head southeast to X 42, Z 32. There is a 26 m-radius open lawn. W accelerates; hold Space and steer with A/D to drift. Release Space to regain grip. B brakes." },
        ] },
    });
  }
  npc("guide", "Mika · neighborhood guide", -18, 17, "Welcome! I'm your fictional neighborhood guide. Your original portfolio is still in the village; the new districts surround it.", about);
  npc("mechanic", "Axel · pit crew", -27, 23, "Welcome to the paddock. Park beside the workshop, then take a lap. I can explain the controls; I don't repair or modify vehicles.", workshop);
  npc("barista", "Sol · café host", -43, -22, "Take a breather at Sunbeam café. The tables are tucked away from the roads.", contact);
  npc("curator", "Nova · curator", 27, -28, "Welcome to the exhibition quarter. Want to see the creator's work?", project);
  npc("maker", "Rue · maker", -27, -23, "Every building here can be moved, recolored or rebuilt in the editor. Make this corner yours.", directions);
  npc("spotter", "Jules · drift spotter", 20, 60, "I'm watching from outside the drift lawn. The green space south of the village is yours to slide across.", directions);
  npc("ranger", "Fern · trail guide", -27, 45, "The camp is off the road, so there's space to drive past or stop for a conversation.", about);
  npc("pilot", "Ari · flight guide", 20, -45, "The central approach stays clear of new scenery. Your plane is still where you parked it.", directions);

  for (const [key, x, z] of [["cafe-a", -51, -23], ["cafe-b", -51, -36], ["lodge", -40, 49]] as const)
    add(`table-${key}`, "picnic", x, z, "Courtyard picnic table");
  add("fire", "campfire", -44, 41, "Campfire circle");
  add("camp-bench", "bench", -39, 40, "Fireside seat", { rotation: 90 });
  add("gallery-bench", "bench", 37, -23, "Gallery bench", { rotation: 180 });
  add("cafe-bench", "bench", -34, -20, "Café bench");
  for (const [i, x, z] of [[1, -39, 28], [2, -38, 32], [3, 28, -52]] as const)
    add(`crate-${i}`, "crate", x, z, "Workshop supplies");
  for (const [i, x, z] of [[1, -17, 32], [2, -36, -32], [3, 19, -35], [4, 42, -39], [5, -40, 54], [6, 18, -56]] as const)
    add(`lamp-${i}`, "lamp", x, z, "Neighborhood light");
  for (const [i, x, z] of [[1, -55, 20], [2, -55, 39], [3, -54, -28], [4, -34, -43], [5, -21, -43], [6, 38, -43], [7, 53, -21], [8, -21, 56], [9, 18, -65], [10, -48, 48]] as const)
    add(`tree-${i}`, world.terrain.biome === "tundra" ? "pine" : "tree", x, z, "Roadside grove", { scale: [1.3, 1.3, 1.3] });
  for (const [i, x, z] of [[1, -47, -19], [2, -22, -31], [3, 34, -28], [4, -22, 48]] as const)
    add(`flowers-${i}`, "flowers", x, z, "Courtyard wildflowers");
  // Mark the perimeter without placing solid objects inside the driving area.
  for (const [i, x, z] of [[1, 12, 20], [2, 12, 38], [3, 60, 59], [4, 68, 49]] as const)
    add(`flag-${i}`, "flag", x, z, "Drift lawn boundary", { color: "#f4ae52" });

  const objects = [...world.objects];
  let skipped = 0;
  for (const object of candidates) {
    if (objects.some((o) => o.id === object.id)) continue;
    const [x, , z] = object.position;
    const radius = footprintRadius(object);
    const ground = terrainHeight(world.terrain, x, z);
    const safeGround = isLand(world.terrain, x, z, 1) && Array.from({ length: 16 }, (_, i) => {
      const angle = i * Math.PI / 8;
      const px = x + Math.cos(angle) * radius, pz = z + Math.sin(angle) * radius;
      return isLand(world.terrain, px, pz, 1) && Math.abs(terrainHeight(world.terrain, px, pz) - ground) < 0.65;
    }).every(Boolean);
    if (objects.length >= 150 || inDrivingSpace(world, x, z, radius) || !safeGround ||
      Math.hypot(x - world.character.spawn[0], z - world.character.spawn[1]) < radius + 5 ||
      occupied.some(({ object: other, radius: r }) =>
        Math.hypot(x - other.position[0], z - other.position[2]) < radius + r + 2)) {
      skipped++;
      continue;
    }
    objects.push(object);
    occupied.push({ object, radius });
  }
  // A blocked workshop/kiosk must not leave dangling links in newly added dialogue.
  const ids = new Set(objects.filter((o) => o.role !== "none").map((o) => o.id));
  const added = objects.slice(world.objects.length).map((o) => o.npc ? { ...o, npc: { ...o.npc,
    choices: o.npc.choices.map((c) => c.targetId && !ids.has(c.targetId) ? { ...c, targetId: undefined } : c),
  } } : o);
  return { world: { ...world, objects: [...world.objects, ...added] }, added: added.length, skipped };
}
