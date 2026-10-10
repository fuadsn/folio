import { z } from "zod";

export const ROLES = ["none", "about", "project", "resume", "contact"] as const;
export type Role = (typeof ROLES)[number];
export const CATALOG = [
  {
    kind: "gallery",
    name: "Project gallery",
    category: "Buildings",
    color: "#e5a47b",
    role: "project",
    description: "A home for your best work",
  },
  {
    kind: "house",
    name: "Little studio",
    category: "Buildings",
    color: "#db835f",
    role: "about",
    description: "Make yourself at home",
  },
  {
    kind: "tower",
    name: "Lookout tower",
    category: "Buildings",
    color: "#b3a3d5",
    role: "none",
    description: "A different perspective",
  },
  {
    kind: "observatory",
    name: "Observatory",
    category: "Buildings",
    color: "#76b5b0",
    role: "project",
    description: "For your next big idea",
  },
  {
    kind: "cafe",
    name: "Corner café",
    category: "Buildings",
    color: "#e9b867",
    role: "contact",
    description: "Good conversations start here",
  },
  {
    kind: "arch",
    name: "Welcome arch",
    category: "Buildings",
    color: "#b9a9db",
    role: "none",
    description: "An entrance worth making",
  },
  {
    kind: "tree",
    name: "Round tree",
    category: "Nature",
    color: "#77a779",
    role: "none",
    description: "A little more green",
  },
  {
    kind: "pine",
    name: "Pine tree",
    category: "Nature",
    color: "#4b8977",
    role: "none",
    description: "A forest starts with one",
  },
  {
    kind: "palm",
    name: "Palm tree",
    category: "Nature",
    color: "#89b57a",
    role: "none",
    description: "A tropical state of mind",
  },
  {
    kind: "rock",
    name: "Rock garden",
    category: "Nature",
    color: "#aab4ad",
    role: "none",
    description: "Ground your world",
  },
  {
    kind: "flowers",
    name: "Wildflowers",
    category: "Nature",
    color: "#e8a3b7",
    role: "none",
    description: "Small things, big personality",
  },
  {
    kind: "pond",
    name: "Little pond",
    category: "Nature",
    color: "#86c4d5",
    role: "none",
    description: "A moment of calm",
  },
  {
    kind: "bench",
    name: "Park bench",
    category: "Objects",
    color: "#bc9073",
    role: "none",
    description: "Take your time",
  },
  {
    kind: "lamp",
    name: "Street light",
    category: "Objects",
    color: "#f2cd80",
    role: "none",
    description: "Light the way",
  },
  {
    kind: "sign",
    name: "Story board",
    category: "Objects",
    color: "#b89475",
    role: "resume",
    description: "Your journey so far",
  },
  {
    kind: "mailbox",
    name: "Mailbox",
    category: "Objects",
    color: "#9d8ac0",
    role: "contact",
    description: "Leave the door open",
  },
  {
    kind: "flag",
    name: "Little flag",
    category: "Objects",
    color: "#e18e76",
    role: "none",
    description: "Plant your flag",
  },
  {
    kind: "cube",
    name: "Block",
    category: "Shapes",
    color: "#afa0d5",
    role: "none",
    description: "The beginning of anything",
  },
  {
    kind: "sphere",
    name: "Sphere",
    category: "Shapes",
    color: "#e4aab5",
    role: "none",
    description: "Think outside the box",
  },
  {
    kind: "cone",
    name: "Cone",
    category: "Shapes",
    color: "#91ba9d",
    role: "none",
    description: "Build something unexpected",
  },
  {
    kind: "platform",
    name: "Platform",
    category: "Shapes",
    color: "#dfc6a8",
    role: "none",
    description: "A stage for your ideas",
  },
] as const;
export type Kind = (typeof CATALOG)[number]["kind"] | "custom";
const bounded = z.number().finite().min(-24).max(24);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const partSchema = z.object({
  name: z.string().max(60),
  shape: z.enum(["box", "sphere", "cylinder", "cone", "roof", "torus"]),
  position: z.tuple([
    z.number().min(-10).max(10),
    z.number().min(0).max(15),
    z.number().min(-10).max(10),
  ]),
  size: z.tuple([
    z.number().min(0.02).max(12),
    z.number().min(0.02).max(15),
    z.number().min(0.02).max(12),
  ]),
  rotation: z.tuple([
    z.number().min(-360).max(360),
    z.number().min(-360).max(360),
    z.number().min(-360).max(360),
  ]),
  color: hex,
});
export const blueprintSchema = z.object({
  name: z.string().min(1).max(80),
  parts: z.array(partSchema).min(1).max(80),
});
export type Blueprint = z.infer<typeof blueprintSchema>;
export const objectSchema = z.object({
  id: z.string().min(1).max(80),
  kind: z.enum(["custom", ...CATALOG.map((x) => x.kind)]),
  name: z.string().min(1).max(80),
  color: hex,
  position: z.tuple([bounded, z.number().finite().min(0).max(15), bounded]),
  rotation: z.number().finite().min(-360).max(360),
  scale: z.tuple([
    z.number().min(0.2).max(5),
    z.number().min(0.2).max(5),
    z.number().min(0.2).max(5),
  ]),
  role: z.enum(ROLES),
  title: z.string().max(120),
  text: z.string().max(5000),
  url: z.string().max(2000),
  asset: z
    .string()
    .regex(/^[a-f0-9-]{36}$/)
    .optional(),
  parts: z.array(partSchema).max(80).optional(),
});
export type WorldObject = z.infer<typeof objectSchema>;
export const worldSchema = z
  .object({
    version: z.literal(1),
    name: z.string().min(1).max(80),
    ownerName: z.string().max(80),
    tagline: z.string().max(200),
    sky: hex,
    ground: hex,
    water: hex,
    lighting: z.enum(["day", "sunset", "night"]),
    objects: z.array(objectSchema).max(150),
  })
  .superRefine((w, ctx) => {
    if (new Set(w.objects.map((o) => o.id)).size !== w.objects.length)
      ctx.addIssue({ code: "custom", message: "Object IDs must be unique" });
  });
export type World = z.infer<typeof worldSchema>;
export const roleNames: Record<Role, string> = {
  none: "Decoration",
  about: "About me",
  project: "Project",
  resume: "Résumé",
  contact: "Contact",
};
export function safeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return ["https:", "http:", "mailto:"].includes(parsed.protocol)
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}
export function newObject(
  kind: Kind,
  position: [number, number, number] = [0, 0, 0],
): WorldObject {
  const item = CATALOG.find((x) => x.kind === kind);
  return {
    id: crypto.randomUUID(),
    kind,
    name: item?.name ?? "Custom creation",
    color: item?.color ?? "#b3a3d5",
    position,
    rotation: 0,
    scale: [1, 1, 1],
    role: item?.role ?? "none",
    title: item?.name ?? "Custom creation",
    text: "",
    url: "",
  };
}
export function essentialStatus(world: World) {
  return (["about", "project", "resume", "contact"] as Role[]).map((role) => ({
    role,
    label: roleNames[role],
    done: world.objects.some(
      (o) => o.role === role && (o.text.trim() || safeUrl(o.url)),
    ),
  }));
}
export function starterWorld(): World {
  const objects: WorldObject[] = [];
  function add(
    kind: Kind,
    x: number,
    z: number,
    values: Partial<WorldObject> = {},
  ) {
    objects.push({ ...newObject(kind, [x, 0, z]), ...values });
  }
  add("house", -5, -4, { name: "About me", title: "Hello, explorer." });
  add("gallery", 4, -4, { name: "Selected work", title: "Something I made" });
  add("cafe", 6, 4, {
    name: "Let’s talk",
    title: "Good things start with hello.",
  });
  add("sign", -5, 4, { name: "My journey", title: "The journey so far" });
  add("arch", 0, 9, { name: "Welcome home", scale: [1.2, 1.2, 1.2] });
  for (const [x, z] of [
    [-10, -7],
    [-9, -1],
    [-11, 6],
    [10, -8],
    [11, 0],
    [10, 8],
    [-6, -10],
    [5, -10],
  ])
    add("tree", x, z, { scale: [1.2, 1.2, 1.2] });
  add("pine", -10, 10);
  add("pine", 12, -5);
  add("pine", -3, -11);
  add("bench", -3, 1, { rotation: 90 });
  add("bench", 3, 1, { rotation: -90 });
  add("lamp", -1.8, 4);
  add("lamp", 1.8, -2);
  add("flowers", -7, 1);
  add("flowers", 7, -1);
  add("rock", 11, 4);
  add("pond", -9, 3, { scale: [1.3, 1, 1.3] });
  return {
    version: 1,
    name: "My little universe",
    ownerName: "Your name",
    tagline: "A few things I made. A world of things to explore.",
    sky: "#e5e9e2",
    ground: "#a9ba94",
    water: "#8ebec4",
    lighting: "day",
    objects,
  };
}
