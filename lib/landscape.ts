import * as T from "three";
import {
  BIOMES,
  terrainSegments,
  terrainHeight,
  type Terrain,
} from "./terrain";
import type { World } from "./world";
import { travelLimit } from "./world-size";

export function landscape(world: World) {
  const group = new T.Group();
  const t = world.terrain;
  const geometry = new T.PlaneGeometry(
    t.width,
    t.depth,
    terrainSegments(t),
    terrainSegments(t),
  );
  geometry.rotateX(-Math.PI / 2);
  geometry.setAttribute(
    "color",
    new T.Float32BufferAttribute(
      new Float32Array(geometry.attributes.position.count * 3),
      3,
    ),
  );
  const ground = new T.Mesh(
    geometry,
    new T.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      flatShading: true,
      side: T.DoubleSide,
    }),
  );
  ground.receiveShadow = true;
  group.add(ground);
  const skirt = new T.Mesh(
    new T.BufferGeometry(),
    new T.MeshStandardMaterial({
      color: BIOMES.find((b) => b.id === t.biome)!.rock,
      roughness: 1,
      flatShading: true,
      side: T.DoubleSide,
    }),
  );
  skirt.receiveShadow = true;
  group.add(skirt);
  const sea = new T.Mesh(
    new T.PlaneGeometry((travelLimit(t) + 160) * 2, (travelLimit(t) + 160) * 2),
    new T.MeshStandardMaterial({
      color: world.water,
      roughness: 0.38,
      metalness: 0.15,
    }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = t.waterLevel;
  sea.receiveShadow = true;
  group.add(sea);
  updateLandscape(ground, skirt, t, world.ground);
  return { group, ground, skirt };
}

export function updateLandscape(
  ground: T.Mesh,
  skirt: T.Mesh,
  t: Terrain,
  groundColor: string,
) {
  const positions = ground.geometry.attributes.position;
  const colors = ground.geometry.attributes.color;
  const base = new T.Color(groundColor),
    paint = new T.Color(),
    path = new T.Color("#e7d7b6");
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      z = positions.getZ(i),
      h = t.heights[i];
    positions.setY(i, h);
    const roadWidth = Math.max(t.width, t.depth) > 64 ? 3.5 : 1.25;
    const loop = Math.abs(
      Math.hypot(x / (t.width * 0.32), z / (t.depth * 0.32)) - 1,
    );
    const isPath =
      t.paths &&
      ((Math.abs(x) < roadWidth && Math.abs(z) < t.depth * 0.44) ||
        (Math.abs(z - 0.3) < roadWidth && Math.abs(x) < t.width * 0.34) ||
        Math.hypot(x, z - 0.3) < roadWidth * 2 ||
        (Math.min(t.width, t.depth) >= 96 &&
          loop < roadWidth / (Math.min(t.width, t.depth) * 0.32)));
    if (t.paint[i]) paint.set(t.paint[i]!);
    else if (isPath) paint.copy(path);
    else
      paint
        .copy(base)
        .multiplyScalar(
          0.96 + Math.sin(x * 0.7 + z * 0.9) * 0.025 + Math.min(h, 5) * 0.018,
        );
    colors.setXYZ(i, paint.r, paint.g, paint.b);
  }
  positions.needsUpdate = colors.needsUpdate = true;
  ground.geometry.computeVertexNormals();
  ground.geometry.computeBoundingSphere();
  ground.geometry.computeBoundingBox();
  const vertices: number[] = [];
  const s = terrainSegments(t),
    stride = s + 1;
  const edges = [
    Array.from({ length: stride }, (_, i) => i),
    Array.from({ length: stride }, (_, i) => i * stride + s),
    Array.from({ length: stride }, (_, i) => s * stride + s - i),
    Array.from({ length: stride }, (_, i) => (s - i) * stride),
  ];
  for (const edge of edges)
    for (let i = 0; i < s; i++) {
      const a = edge[i],
        b = edge[i + 1];
      const ax = positions.getX(a),
        az = positions.getZ(a),
        ay = positions.getY(a);
      const bx = positions.getX(b),
        bz = positions.getZ(b),
        by = positions.getY(b);
      vertices.push(
        ax,
        ay,
        az,
        ax,
        -4,
        az,
        bx,
        by,
        bz,
        bx,
        by,
        bz,
        ax,
        -4,
        az,
        bx,
        -4,
        bz,
      );
    }
  skirt.geometry.dispose();
  skirt.geometry = new T.BufferGeometry();
  skirt.geometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(vertices, 3),
  );
  skirt.geometry.computeVertexNormals();
}

export function groundY(t: Terrain, x: number, z: number) {
  return terrainHeight(t, x, z);
}
