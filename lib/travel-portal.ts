import * as T from "three";
import { isLand } from "./vehicles";
import { terrainHeight } from "./terrain";
import { labelSprite } from "./models";
import type { World } from "./world";

export function portalPosition(
  world: World,
  blocked: (x: number, z: number) => boolean,
) {
  const [sx, sz] = world.character.spawn;
  for (const radius of [4, 6, 8, 12]) {
    for (let i = 0; i < 16; i++) {
      const x = sx + Math.cos((i * Math.PI) / 8) * radius;
      const z = sz + Math.sin((i * Math.PI) / 8) * radius;
      if (
        isLand(world.terrain, x, z, 1.5) &&
        [
          [0, 0],
          [1.5, 0],
          [-1.5, 0],
          [0, 1.5],
          [0, -1.5],
        ].every(([dx, dz]) => !blocked(x + dx, z + dz))
      ) {
        return [x, terrainHeight(world.terrain, x, z), z] as const;
      }
    }
  }
  return null; // The always-available Worlds button is the fallback on a full island.
}

export function travelPortal() {
  const group = new T.Group();
  const rim = new T.MeshStandardMaterial({
    color: "#f4ae52",
    emissive: "#d4621a",
    emissiveIntensity: 0.65,
    roughness: 0.45,
  });
  const ring = new T.Mesh(new T.TorusGeometry(1.35, 0.14, 8, 48), rim);
  ring.position.y = 1.6;
  group.add(ring);
  const glow = new T.Mesh(
    new T.CircleGeometry(1.2, 40),
    new T.MeshBasicMaterial({
      color: "#f4ae52",
      transparent: true,
      opacity: 0.18,
      side: T.DoubleSide,
      depthWrite: false,
    }),
  );
  glow.position.y = 1.6;
  group.add(glow);
  const base = new T.Mesh(
    new T.CylinderGeometry(1.65, 1.85, 0.18, 32),
    new T.MeshStandardMaterial({ color: "#fef3e2", roughness: 0.85 }),
  );
  base.position.y = 0.09;
  group.add(base);
  const label = labelSprite("WORLD PORTAL · P");
  label.position.y = 3.5;
  group.add(label);
  return group;
}
