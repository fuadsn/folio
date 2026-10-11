import { z } from "zod";

export const TERRAIN_SEGMENTS = 32;
export const TERRAIN_POINTS = (TERRAIN_SEGMENTS + 1) ** 2;
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const biomeIds = [
  "meadow",
  "tundra",
  "desert",
  "alpine",
  "volcanic",
] as const;
export const weatherIds = ["clear", "snow", "rain", "fog"] as const;
export const terrainSchema = z.object({
  biome: z.enum(biomeIds).default("meadow"),
  width: z.number().min(16).max(48).default(31),
  depth: z.number().min(16).max(48).default(28),
  waterLevel: z.number().min(-3).max(2).default(-1.6),
  paths: z.boolean().default(true),
  heights: z
    .array(z.number().finite().min(-3).max(10))
    .length(TERRAIN_POINTS)
    .default(() => Array(TERRAIN_POINTS).fill(0)),
  paint: z
    .array(color.nullable())
    .length(TERRAIN_POINTS)
    .default(() => Array(TERRAIN_POINTS).fill(null)),
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
      .tuple([z.number().min(-23).max(23), z.number().min(-23).max(23)])
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

export function terrainHeight(terrain: Terrain, x: number, z: number): number {
  const n = TERRAIN_SEGMENTS;
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
  const heights = Array.from({ length: TERRAIN_POINTS }, (_, i) => {
    const x = ((i % 33) / 32 - 0.5) * width;
    const z = (Math.floor(i / 33) / 32 - 0.5) * depth;
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
    paths: biome === "meadow",
  });
}

export function sculptTerrain(
  terrain: Terrain,
  x: number,
  z: number,
  brush: TerrainBrush,
): Terrain {
  const heights = [...terrain.heights],
    paint = [...terrain.paint];
  for (let row = 0; row <= 32; row++)
    for (let col = 0; col <= 32; col++) {
      const px = (col / 32 - 0.5) * terrain.width,
        pz = (row / 32 - 0.5) * terrain.depth;
      const distance = Math.hypot(px - x, pz - z);
      if (distance > brush.radius) continue;
      const i = row * 33 + col;
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
            if (row + dz < 0 || row + dz > 32 || col + dx < 0 || col + dx > 32)
              continue;
            sum += terrain.heights[(row + dz) * 33 + col + dx];
            count++;
          }
        heights[i] += (sum / count - heights[i]) * Math.min(1, amount * 2);
      }
      heights[i] =
        Math.round(Math.max(-3, Math.min(10, heights[i])) * 1000) / 1000;
    }
  return { ...terrain, heights, paint };
}
