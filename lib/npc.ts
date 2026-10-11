import { z } from "zod";

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const npcSchema = z.object({
  skin: color.default("#d6a078"),
  hat: color.default("#f4ae52"),
  hatStyle: z.enum(["cap", "beanie", "none"]).default("cap"),
  motion: z.enum(["wave", "still"]).default("wave"),
  greeting: z.string().max(1500).default("Hey, explorer! Welcome to this world. What would you like to know?"),
  choices: z.array(z.object({
    label: z.string().max(80),
    answer: z.string().max(2000),
    targetId: z.string().max(80).optional(),
  })).max(6).default([
    { label: "How do I explore?", answer: "Use W/A/S/D to walk, E to interact, and F near a vehicle to ride. Press P to visit another portfolio." },
  ]),
});
export type Npc = z.infer<typeof npcSchema>;
