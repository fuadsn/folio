export const DRIVING_WORLD_SIZE = 256;
export const MAX_WORLD_SIZE = 512;
export const WORLD_POSITION_LIMIT = MAX_WORLD_SIZE / 2 + 40;

export function travelLimit(terrain: { width: number; depth: number }) {
  return Math.max(58, terrain.width / 2 + 40, terrain.depth / 2 + 40);
}
