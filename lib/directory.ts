import { z } from "zod";
import { biomeIds } from "./terrain";

export const DIRECTORY_PAGE_SIZE = 12;
export const directoryQuery = z.object({
  q: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(0).max(1000).default(0),
});
export const worldCardSchema = z.object({
  id: z.string().uuid(),
  name: z.string().max(80),
  ownerName: z.string().max(80),
  tagline: z.string().max(200),
  biome: z.enum(biomeIds).catch("meadow"),
  lighting: z.enum(["day", "sunset", "night"]).catch("day"),
  ground: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .catch("#a9ba94"),
  publishedAt: z.string(),
});
export type WorldCard = z.infer<typeof worldCardSchema>;
export const directoryResponse = z.object({
  worlds: z.array(worldCardSchema),
  hasMore: z.boolean(),
});

// Only public snapshot metadata crosses this boundary: never drafts, account
// identifiers, contact details, uploaded files, or arbitrary destination URLs.
export const directorySQL = `
  SELECT id, published_at AS publishedAt,
    json_extract(published, '$.name') AS name,
    json_extract(published, '$.ownerName') AS ownerName,
    json_extract(published, '$.tagline') AS tagline,
    json_extract(published, '$.terrain.biome') AS biome,
    json_extract(published, '$.lighting') AS lighting,
    json_extract(published, '$.ground') AS ground
  FROM worlds
  WHERE published IS NOT NULL
    AND json_extract(published, '$.discoverable') = 1
    AND (json_extract(published, '$.name') LIKE ? ESCAPE '\\'
      OR json_extract(published, '$.ownerName') LIKE ? ESCAPE '\\'
      OR json_extract(published, '$.tagline') LIKE ? ESCAPE '\\')
  ORDER BY published_at DESC, id ASC LIMIT ? OFFSET ?`;

export function directoryBindings(q: string, page: number) {
  const match = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  return [
    match,
    match,
    match,
    DIRECTORY_PAGE_SIZE + 1,
    page * DIRECTORY_PAGE_SIZE,
  ];
}
