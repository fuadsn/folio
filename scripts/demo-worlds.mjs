// Original, fictional portfolios. Shared by the opt-in local seed and QA only;
// never injected as a fallback when the real directory is empty or unavailable.
const themes = [
  {
    slug: "dune", name: "Dune Circuit", creator: "Demo game developer",
    biome: "desert", ground: "#e9bd7b", sky: "#f3ddc0", water: "#5dafa8",
    accent: "#d4621a", lighting: "sunset", weather: "clear", tree: "palm",
    tagline: "Fictional sample · Game design, desert roads and a drift-ready tuner.",
    about: "A fictional game developer's garage. This sample explores readable environments, playful controls and the joy of taking the long way around. No real person or client work is represented.",
    project: ["Momentum Garage", "A sample arcade-driving concept: loose sand, broad turns and a central test strip. Start beside the orange tuner, press F, then use W/A/S/D. Hold Space while steering to drift."],
    remote: ["The Long Way Home", "A fictional level-design study built around distant landmarks. Follow the loop road out to the tower, or leave the road and find your own route across the dunes."],
    resume: "Sample skill map: gameplay prototyping, level layout, low-poly environments and interaction design. This is illustrative portfolio content, not a real employment history.",
  },
  {
    slug: "aurora", name: "Aurora Outpost", creator: "Demo creative technologist",
    biome: "tundra", ground: "#e5eef5", sky: "#cbdce9", water: "#83adc3",
    accent: "#7189c4", lighting: "night", weather: "snow", tree: "pine",
    tagline: "Fictional sample · Snowy research cabins, night skies and a survey plane.",
    about: "Welcome to a fictional creative technologist's winter field station. The buildings explore ways to make complex ideas inviting through space, light and interaction. All projects here are sample concepts.",
    project: ["Signal Observatory", "A sample interactive-data installation imagined as an observatory. Each building holds a different layer of the story, so visitors can choose their own order instead of scrolling through a slide deck."],
    remote: ["Field Notes from the Snow", "A fictional research-experience concept about exploring unfamiliar terrain. Drive the snow loop or find the purple survey plane on the west runway. W accelerates; Space climbs once you have speed."],
    resume: "Sample skill map: creative coding, data visualization, rapid prototyping and interaction research. Fictional demonstration only; no employers, credentials or client claims are implied.",
  },
  {
    slug: "tide", name: "Tide Studio", creator: "Demo product designer",
    biome: "meadow", ground: "#acc49b", sky: "#e5f1e9", water: "#63b9c0",
    accent: "#329e9b", lighting: "day", weather: "clear", tree: "palm",
    tagline: "Fictional sample · A tropical design studio with a harbor and motor boat.",
    about: "A fictional product designer's island studio. This sample organizes work around calm, accessible experiences: a studio for the introduction, a gallery for projects and a cafe for conversations.",
    project: ["Small Harbor", "A sample wayfinding concept for a waterfront community. The channel east of the village leads to the ocean. Walk toward the turquoise boat at the harbor, press F to board, and steer east into open water."],
    remote: ["Room to Breathe", "A fictional design-system exploration: warm materials, generous space and clear paths between stories. Drive out to the hillside gallery, then use Worlds or P to visit another sample portfolio."],
    resume: "Sample skill map: product strategy, visual systems, accessibility and prototyping. This fictional portfolio illustrates presentation possibilities, not a real person's qualifications.",
  },
];

function makeWorld(theme) {
  const n = 64, width = 256, heights = [], paint = [];
  for (let row = 0; row <= n; row++) {
    for (let col = 0; col <= n; col++) {
      const x = (col / n - 0.5) * width, z = (row / n - 0.5) * width;
      const roadDistance = Math.min(Math.abs(x), Math.abs(z), Math.abs(Math.hypot(x, z) - 82));
      const blend = Math.min(1, Math.max(0, (roadDistance - 5) / 12)) *
        Math.min(1, Math.max(0, (Math.hypot(x, z) - 30) / 24));
      let height = (1 + Math.sin(x * 0.07 + Math.cos(z * 0.05))) *
        (theme.biome === "desert" ? 2 : theme.biome === "tundra" ? 2.7 : 1.2) * blend;
      const runway = Math.abs(x + 28) <= 6 && z >= -90 && z <= 34;
      if (runway) height = 0;
      // A navigable inlet, not a decorative pond. The boat has a dry shore nearby.
      if (theme.slug === "tide" && x >= 16 && Math.abs(z) <= 12) {
        height = -2.6 * Math.min(1, (x - 16) / 4) * Math.min(1, (12 - Math.abs(z)) / 4);
      }
      heights.push(Math.round(height * 1000) / 1000);
      paint.push(runway ? (theme.slug === "aurora" ? "#8799ab" : "#c4b093") : null);
    }
  }
  const objects = [];
  function add(kind, x, z, values = {}) {
    objects.push({
      id: `${theme.slug}-${objects.length + 1}`, kind,
      name: kind, color: theme.accent, position: [x, 0, z], rotation: 0,
      scale: [1, 1, 1], role: "none", title: "", text: "", url: "",
      ...values,
    });
  }
  const story = (kind, x, z, role, title, text) => add(kind, x, z, {
    name: title, role, title, text,
    details: { body: "#fef3e2", snow: theme.slug === "aurora" ? 0.85 : 0 },
  });
  story("house", -12, -8, "about", "Meet the sample creator", theme.about);
  story(theme.slug === "aurora" ? "observatory" : "gallery", 12, -14, "project", ...theme.project);
  story("sign", -11, 10, "resume", "A sample journey", theme.resume);
  story("cafe", 13, 18, "contact", "A place to say hello", "This is a fictional demo portfolio; there is no real inbox or client behind it. In your own world, add your email or portfolio link to a Contact building. Use Worlds or P to visit the other sample worlds.");
  story("gallery", -60, -52, "project", ...theme.remote);
  story("tower", 62, 52, "project", "The lookout", "A sample landmark at the far end of the drive. This 256 by 256 metre world has a loop road and open terrain to explore. Cars stay in this world when you travel through the portfolio directory.");
  add("arch", 0, -22, { name: "Village entrance", scale: [1.4, 1.4, 1.4] });
  add(theme.slug === "dune" ? "driftcar" : "car", 0, 10, {
    name: theme.slug === "dune" ? "Dune drift tuner" : theme.slug === "aurora" ? "Snow rover" : "Island cruiser",
    vehicle: { enabled: true, speed: 1.2, handling: 1.1, grip: theme.slug === "dune" ? 0.7 : 1 },
  });
  add("plane", -28, 24, { name: "Survey plane", rotation: 180 });
  if (theme.slug === "tide") add("boat", 21, 0, { name: "Harbor boat", rotation: 90 });
  for (const [x, z] of [[-6, 4], [6, 4], [-6, -8], [6, -8]])
    add("lamp", x, z, { name: "Village light", color: "#f4ae52" });
  for (const [x, z] of [[-20, -15], [-19, 18], [23, 24], [24, -24], [-9, -28], [10, -30]])
    add(theme.tree, x, z, { name: "Village tree", color: theme.slug === "aurora" ? "#527a79" : "#79a374", scale: [1.6, 1.6, 1.6], details: { snow: theme.slug === "aurora" ? 0.9 : 0 } });
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    const x = Math.round(Math.cos(angle) * 106), z = Math.round(Math.sin(angle) * 106);
    if (theme.slug === "tide" && x > 16 && Math.abs(z) < 18) continue;
    add(i % 3 === 0 ? "rock" : theme.tree, x, z, {
      name: "Outer trail landmark", color: i % 3 === 0 ? "#a89983" : "#70916c",
      scale: [2.5, 2.5, 2.5], details: { snow: theme.slug === "aurora" ? 0.9 : 0 },
    });
  }
  return {
    version: 1, name: `${theme.name} · Demo`, ownerName: theme.creator,
    tagline: theme.tagline, discoverable: true,
    sky: theme.sky, ground: theme.ground, water: theme.water, lighting: theme.lighting,
    terrain: { biome: theme.biome, width, depth: width, waterLevel: -1.6, paths: true, heights, paint },
    weather: { type: theme.weather, intensity: 0.35, wind: 0.15 },
    character: { spawn: [2.8, 10], coat: theme.accent, hat: "#f4ae52" },
    objects,
  };
}

export const demoWorlds = themes.map((theme, i) => ({
  id: `d3e00000-0000-4000-8000-00000000000${i + 1}`,
  owner: `worldfolio-demo-${theme.slug}`,
  world: makeWorld(theme),
}));

export function demoSeedSQL(now = new Date().toISOString()) {
  if (!Number.isFinite(Date.parse(now))) throw new Error("Invalid seed timestamp");
  const quote = (value) => `'${value.replaceAll("'", "''")}'`;
  return demoWorlds.map(({ id, owner, world }) => {
    const snapshot = quote(JSON.stringify(world));
    // Insert only: reruns preserve existing demos as well as all creator records.
    // Reuse one literal to stay under D1's SQL-statement size limit.
    return `INSERT INTO worlds(id,owner,draft,published,revision,published_at,updated_at) SELECT ${quote(id)},${quote(owner)},snapshot,snapshot,0,${quote(now)},${quote(now)} FROM (SELECT ${snapshot} AS snapshot) WHERE true ON CONFLICT DO NOTHING;`;
  }).join("\n");
}
