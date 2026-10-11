import { z } from "zod";
import { MAX_WORLD_SIZE } from "./world-size";

export const TERRAIN_SEGMENTS = 32;
export const TERRAIN_POINTS = (TERRAIN_SEGMENTS + 1) ** 2;
const gridLengths = [32, 64, 128, 256].map((n) => (n + 1) ** 2);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const biomeIds = [
  "meadow",
  "tundra",
  "desert",
  "alpine",
  "volcanic",
] as const;
export const weatherIds = ["clear", "snow", "rain", "fog"] as const;
export const terrainSchema = z
  .object({
    biome: z.enum(biomeIds).default("meadow"),
    width: z.number().min(16).max(MAX_WORLD_SIZE).default(31),
    depth: z.number().min(16).max(MAX_WORLD_SIZE).default(28),
    waterLevel: z.number().min(-3).max(2).default(-1.6),
    paths: z.boolean().default(true),
    heights: z
      .array(z.number().finite().min(-3).max(10))
      .max(257 ** 2)
      .refine(
        (values) => gridLengths.includes(values.length),
        "Unsupported terrain grid",
      )
      .default(() => Array(TERRAIN_POINTS).fill(0)),
    paint: z
      .array(color.nullable())
      .max(257 ** 2)
      .default(() => Array(TERRAIN_POINTS).fill(null)),
  })
  .superRefine((terrain, ctx) => {
    if (terrain.paint.length !== terrain.heights.length)
      ctx.addIssue({
        code: "custom",
        path: ["paint"],
        message: "Paint and height grids must match",
      });
  });
export const weatherSchema = z
  .object({
    type: z.enum(weatherIds).default("clear"),
    intensity: z.number().min(0.1).max(1).default(0.55),
    wind: z.number().min(-1).max(1).default(0.2),
  })
  .default({});
export const characterSchema = z
  .object({
    coat: color.default("#d4621a"),
    skin: color.default("#d6a078"),
    hat: color.default("#f4ae52"),
    hatStyle: z.enum(["beanie", "cap", "none"]).default("beanie"),
    speed: z.number().min(2).max(7).default(4.5),
    spawn: z
      .tuple([
        z
          .number()
          .min(-MAX_WORLD_SIZE / 2)
          .max(MAX_WORLD_SIZE / 2),
        z
          .number()
          .min(-MAX_WORLD_SIZE / 2)
          .max(MAX_WORLD_SIZE / 2),
      ])
      .default([0, 6]),
  })
  .default({});
export type Terrain = z.infer<typeof terrainSchema>;
export type Weather = z.infer<typeof weatherSchema>;
export type Character = z.infer<typeof characterSchema>;
export type Biome = (typeof biomeIds)[number];
export type TerrainBrush = {
  tool: "raise" | "lower" | "smooth" | "flatten" | "paint";
  radius: number;
  strength: number;
  color: string;
  level: number;
};
export const BIOMES = [
  {
    id: "meadow",
    name: "Sunlit meadow",
    subtitle: "Soft hills & warm afternoons",
    ground: "#a9ba94",
    sky: "#e8eee4",
    water: "#8ebec4",
    weather: "clear",
    rock: "#bfae8f",
  },
  {
    id: "tundra",
    name: "Snowy tundra",
    subtitle: "Snowdrifts & frosted trees",
    ground: "#e5eef5",
    sky: "#cbdce9",
    water: "#83adc3",
    weather: "snow",
    rock: "#9caebc",
  },
  {
    id: "desert",
    name: "Amber dunes",
    subtitle: "Rolling sand & golden skies",
    ground: "#e9bd7b",
    sky: "#f3ddc0",
    water: "#5dafa8",
    weather: "clear",
    rock: "#b47a51",
  },
  {
    id: "alpine",
    name: "Alpine valley",
    subtitle: "Mountain ridges & cool mist",
    ground: "#90aa8c",
    sky: "#c5d8df",
    water: "#6ea0b1",
    weather: "fog",
    rock: "#7f9290",
  },
  {
    id: "volcanic",
    name: "Ember island",
    subtitle: "Basalt ridges & glowing seas",
    ground: "#726563",
    sky: "#c4a99c",
    water: "#d4621a",
    weather: "fog",
    rock: "#4e4140",
  },
] as const;

export function terrainSegments(terrain: Terrain) {
  return Math.sqrt(terrain.heights.length) - 1;
}

function segmentsForSize(width: number, depth: number) {
  return Math.min(
    256,
    Math.max(32, 2 ** Math.ceil(Math.log2(Math.max(width, depth) / 2))),
  );
}

export function terrainHeight(terrain: Terrain, x: number, z: number): number {
  const n = terrainSegments(terrain);
  const gx = Math.max(0, Math.min(n, (x / terrain.width + 0.5) * n));
  const gz = Math.max(0, Math.min(n, (z / terrain.depth + 0.5) * n));
  const ix = Math.min(n - 1, Math.floor(gx)),
    iz = Math.min(n - 1, Math.floor(gz));
  const tx = gx - ix,
    tz = gz - iz;
  const a = terrain.heights[iz * (n + 1) + ix],
    b = terrain.heights[iz * (n + 1) + ix + 1];
  const c = terrain.heights[(iz + 1) * (n + 1) + ix],
    d = terrain.heights[(iz + 1) * (n + 1) + ix + 1];
  // Match the two triangles in Three's PlaneGeometry, including steep brush edits.
  return tx + tz <= 1
    ? a + (b - a) * tx + (c - a) * tz
    : d + (c - d) * (1 - tx) + (b - d) * (1 - tz);
}

export function createTerrain(biome: Biome, width = 36, depth = 32): Terrain {
  const n = segmentsForSize(width, depth);
  const heights = Array.from({ length: (n + 1) ** 2 }, (_, i) => {
    const x = ((i % (n + 1)) / n - 0.5) * width;
    const z = (Math.floor(i / (n + 1)) / n - 0.5) * depth;
    // Leave a gentle central village area; the perimeter gives each biome its silhouette.
    const edge = Math.max(
      0,
      Math.min(1, (Math.hypot(x / width, z / depth) - 0.19) * 4),
    );
    let height = 0;
    if (biome === "meadow")
      height = (Math.sin(x * 0.23) * Math.cos(z * 0.18) + 1) * 0.55 * edge;
    if (biome === "tundra")
      height =
        (Math.sin(x * 0.32 + z * 0.16) + Math.cos(z * 0.31) + 2) * 0.48 * edge;
    if (biome === "desert")
      height = (Math.sin(x * 0.35 + Math.sin(z * 0.19)) + 1) * 1.35 * edge;
    if (biome === "alpine")
      height =
        (Math.abs(Math.sin(x * 0.24) * Math.cos(z * 0.25)) * 5.5 + 0.4) * edge;
    if (biome === "volcanic")
      height =
        (Math.abs(Math.sin(x * 0.36 + 0.8) * Math.sin(z * 0.3)) * 3.8 + 0.2) *
        edge;
    return Math.round(height * 1000) / 1000;
  });
  return terrainSchema.parse({
    biome,
    width,
    depth,
    heights,
    paint: Array(heights.length).fill(null),
    paths: biome === "meadow",
  });
}

/** Expand around the existing village, not by stretching its objects or hills.
 * Heights/paint are resampled at world coordinates; Undo retains the exact old grid.
 */
export function resizeTerrain(
  terrain: Terrain,
  width: number,
  depth: number,
): Terrain {
  width = Math.max(16, Math.min(MAX_WORLD_SIZE, width));
  depth = Math.max(16, Math.min(MAX_WORLD_SIZE, depth));
  if (width === terrain.width && depth === terrain.depth) return terrain;
  const n = segmentsForSize(width, depth),
    oldN = terrainSegments(terrain);
  const heights: number[] = [],
    paint: (string | null)[] = [];
  for (let row = 0; row <= n; row++)
    for (let col = 0; col <= n; col++) {
      const x = (col / n - 0.5) * width,
        z = (row / n - 0.5) * depth;
      const dx = Math.max(0, Math.abs(x) - terrain.width / 2);
      const dz = Math.max(0, Math.abs(z) - terrain.depth / 2);
      const blend = Math.min(1, Math.hypot(dx, dz) / 16);
      const border = terrainHeight(terrain, x, z);
      heights.push(
        Math.round(
          (border * (1 - blend) +
            Math.max(0, terrain.waterLevel + 0.25) * blend) *
            1000,
        ) / 1000,
      );
      const ix = Math.round((x / terrain.width + 0.5) * oldN);
      const iz = Math.round((z / terrain.depth + 0.5) * oldN);
      paint.push(dx || dz ? null : terrain.paint[iz * (oldN + 1) + ix]);
    }
  return { ...terrain, width, depth, heights, paint };
}

export function sculptTerrain(
  terrain: Terrain,
  x: number,
  z: number,
  brush: TerrainBrush,
): Terrain {
  const heights = [...terrain.heights],
    paint = [...terrain.paint];
  const n = terrainSegments(terrain);
  for (let row = 0; row <= n; row++)
    for (let col = 0; col <= n; col++) {
      const px = (col / n - 0.5) * terrain.width,
        pz = (row / n - 0.5) * terrain.depth;
      const distance = Math.hypot(px - x, pz - z);
      if (distance > brush.radius) continue;
      const i = row * (n + 1) + col;
      const falloff = Math.pow(1 - distance / brush.radius, 1.5);
      const amount = brush.strength * falloff;
      if (brush.tool === "paint") {
        paint[i] = brush.color;
        continue;
      }
      if (brush.tool === "raise") heights[i] += amount;
      if (brush.tool === "lower") heights[i] -= amount;
      if (brush.tool === "flatten")
        heights[i] += (brush.level - heights[i]) * Math.min(1, amount);
      if (brush.tool === "smooth") {
        let sum = 0,
          count = 0;
        for (let dz = -1; dz <= 1; dz++)
          for (let dx = -1; dx <= 1; dx++) {
            if (row + dz < 0 || row + dz > n || col + dx < 0 || col + dx > n)
              continue;
            sum += terrain.heights[(row + dz) * (n + 1) + col + dx];
            count++;
          }
        heights[i] += (sum / count - heights[i]) * Math.min(1, amount * 2);
      }
      heights[i] =
        Math.round(Math.max(-3, Math.min(10, heights[i])) * 1000) / 1000;
    }
  return { ...terrain, heights, paint };
}
