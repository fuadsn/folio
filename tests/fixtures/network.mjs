// Synthetic worlds for the isolated port-5174 test database only.
// Never imported by application/runtime code or seeded into a creator's database.
export const networkFixtures = [
  ["Luna Lab", "Mira", true, true],
  ["Harbor Works", "Noah", true, true],
  ["Unlisted Retreat", "Unlisted creator", false, true],
  ["Secret Draft", "Private creator", true, false],
].map(([name, ownerName, discoverable, published], index) => {
  const world = {
    version: 1,
    name,
    ownerName,
    discoverable,
    tagline: "Synthetic portfolio used only in automated tests.",
    sky: "#e8eee4",
    ground: index === 0 ? "#e5eef5" : "#a9ba94",
    water: "#8ebec4",
    lighting: index === 0 ? "night" : "day",
    terrain: { biome: index === 0 ? "tundra" : "meadow" },
    objects: ["about", "project", "resume", "contact"].map((role, i) => ({
      id: `story-${i}`,
      kind: "house",
      name: role,
      role,
      color: "#d4621a",
      position: [-6 + i * 4, 0, -5],
      rotation: 0,
      scale: [1, 1, 1],
      title: `${ownerName}'s ${role}`,
      text: "This is synthetic test portfolio content.",
      url: "",
    })),
  };
  return {
    id: `10000000-0000-4000-8000-00000000000${index + 1}`,
    owner: `test-creator-${index}`,
    world,
    published,
  };
});

export function networkSeedSQL() {
  const quote = (value) => `'${value.replaceAll("'", "''")}'`;
  return networkFixtures
    .map(({ id, owner, world, published }) => {
      const snapshot = quote(JSON.stringify(world));
      const draft = quote(
        JSON.stringify({ ...world, name: "PRIVATE DRAFT MUST NOT LEAK" }),
      );
      return `INSERT INTO worlds(id,owner,draft,published,revision,published_at,updated_at) VALUES (${quote(id)},${quote(owner)},${draft},${published ? snapshot : "NULL"},0,'2026-10-11T00:00:00.000Z','2026-10-11T00:00:00.000Z');`;
    })
    .join("\n");
}
