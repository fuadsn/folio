# Worldfolio Studio

Build a little 3D world around your work. Every object can tell a story; a portfolio needs an introduction, project, résumé, and contact details, but their shapes are up to you.

Repository: [fuadsn/folio](https://github.com/fuadsn/folio). The original event README is preserved in [HACKATHON.md](HACKATHON.md); see [RULES.md](RULES.md), [AI_USAGE.md](AI_USAGE.md), [CHANGELOG.md](CHANGELOG.md), and [SUBMISSION.md](SUBMISSION.md) for the event record and demo handoff.

**Current mode: localhost only.** Do not deploy or push to hosted Sites unless explicitly requested. The earlier private hosted copy is awaiting manual removal because the available management tools do not expose deletion. The in-app Publish button saves a local portfolio snapshot; it does not deploy the application.

## Run locally

Node 22.13+ is required. Clone `https://github.com/fuadsn/folio` and run these commands from the repository root:

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_fuzzy_celestials.sql
npm run dev
```

Apply that SQL only once on a fresh local database. The current checkout already has its database initialized. Open http://127.0.0.1:5173. Local-only sign-in simulates one account, `local_seedy`. Do not expose the development server to the internet. Production identity is provided by Sites, not this development cookie.

The home page (also `/play`) is the clean, playable draft. Open `/editor` for the dedicated building workspace. **Explore** saves your latest draft before opening it. No cloud deployment occurs.

## What works

- 21 placeable building, nature, prop, and geometric objects; click or drag to add.
- 3D move/rotate/scale handles, grid snapping, numerical transforms, duplicate, delete, undo/redo.
- Editable world name, owner, introduction, colors and day/sunset/night atmosphere. An optional empty landscape, with undo.
- Cream-first editor palette (`#FEF3E2`, `#F4AE52`, `#D4621A`, `#2A1A0E`). Light mode is world daylight; dark mode is world nighttime.
- Five terrain presets: meadow, snowy tundra, desert dunes, alpine valley, and volcanic island. Presets preserve objects and stories; replacing terrain can be undone.
- Direct raise/lower/smooth/flatten/paint brushes, island dimensions, water level, and paths. One completed brush stroke is one undo step. Objects follow the ground; their Y coordinate is an offset above it.
- Independent clear, snow, rain, and fog weather with intensity and wind controls.
- Building materials and roof styling, tree trunk/canopy/snow controls, independent XYZ scaling, and editable primitive geometry for every built-in object. Imported GLBs can be transformed but not remodeled internally.
- Customizable animated explorer (jacket, skin, hat, speed, spawn), terrain-following movement, Space/touch jump, and reset-to-spawn.
- Placeable, editable cars, motor boats and propeller planes in **Build → Vehicles**. Tune speed/steering or open **Test drive** in the inspector. Visitors press **F** near a vehicle to enter/exit; **W/S** accelerate/slow (reverse on cars/boats), **A/D** steer, **B** brakes, **Shift** boosts. Planes use **Space** to climb and **C** to descend; slow down to land. Touch controls are included. Boats need ocean water or a sculpted lake, and a nearby shore for getting out. Vehicle motion is session-only: **Return to spawn** restores their authored positions. This is arcade movement, not a full physics simulator.
- Any object can hold About, Project, Résumé, or Contact content. Text is rendered safely and links allow only HTTP, HTTPS, and mailto.
- Autosaved drafts in D1; optimistic revisions prevent another tab silently overwriting your work.
- Walkable preview with WASD/arrows, Shift to run, E or click to open stories; touch controls and an accessible conventional portfolio view.
- Publishing saves a snapshot at `/w/<world-id>`. Draft changes stay private until republished. Unpublishing removes the snapshot, not the draft.
- Self-contained GLB uploads stored in R2. Uploads remain private unless referenced by a published snapshot.
- JSON export/import for layout and stories. GLB files remain in their original account on this server.
- Optional Gemini/OpenAI building generation into validated, editable 3D primitives; no generated executable code.
- Optional Stripe Checkout for 10-credit packs; verified webhooks grant credits exactly once.

## Larger driving worlds

New worlds start at **256 × 256 m**, about 75 times the original 31 × 28 m area. For an existing draft, choose **Terrain → Expand for driving · 256 m**. This adds terrain around the existing layout instead of moving or scaling its buildings and stories. Undo restores the exact previous terrain; export a backup before making major size changes.

**Island dimensions & paths** supports up to **512 × 512 m**. Larger worlds get wider central paths and a loop route when paths are enabled; cars can still go off-road. The terrain grid adapts from 33 × 33 to at most 257 × 257 points so brushes continue working over the new ground. Resizing resamples heights/paint at their world positions; shrinking crops the terrain, not the saved objects. Fine sculpting can change slightly through resampling.

Object placement, spawn controls, vehicle movement, boat placement, camera distance and ocean bounds all support the larger map. Planes can climb to 96 m. Rain/snow and nearby shadows follow the explorer so they still work far from the village. Use **Top view** for a map overview and **Return to spawn** to get home. Existing worlds keep their saved dimensions until expanded; published snapshots do not change until republished.

World JSON backups up to 16 MB can be imported, including fully painted 512 m maps. Uploaded GLB limits remain unchanged.

## Drift cars & radio

The **Tokyo drift tuner** in **Build → Vehicles** is an original low-poly, orange-and-black coupe inspired by Tokyo Drift (not an official licensed replica). Both it and the adventure car can drift: accelerate with **W**, hold **Space** and steer with **A/D**, then release Space to regain grip. **B** remains the brake. Tire grip, top speed and steering are editable; smoke, temporary skid marks and a session-only drift score accompany real lateral movement. Return to spawn clears the score and effects without changing the saved layout.

Both cars also drive **off-road** across grass, sand, snow and sculpted hills. Paths are optional decoration, not a driving restriction. The body tilts with hills and side slopes; steep cliffs, deep water and solid objects still block the car. Boats remain the way to cross water.

Car **Radio** includes an opt-in [Spotify player for Tokyo Drift by Teriyaki Boyz](https://open.spotify.com/track/5kfNNvRHnxiSwkcSfImN5s), using [Spotify's official embed](https://developer.spotify.com/documentation/embeds/tutorials/creating-an-embed). It makes no Spotify request until the visitor selects it. Availability and full-track/preview playback depend on Spotify and the listener's account/region. No commercial song audio is bundled or downloaded. Alternatively, select a permitted local audio file (up to 25 MB): it plays from a browser object URL, never uploads or publishes, and is forgotten on reload. Closing the radio or leaving the vehicle stops playback.

## Connected portfolio worlds

Open **Worlds** or `/discover` to browse and search the network. In the Publish dialog, enable **Join the world network**, then publish. Only opted-in published snapshots appear. Existing worlds remain unlisted until their creator opts in; draft edits never change the listing until republished. Uncheck the option and republish to remove the listing while keeping the direct link. **Unpublish** removes both.

Playable worlds have a glowing **World Portal** on free dry ground near the spawn. Click it, press **P**, or use the **Worlds** button to choose a destination. The button remains available if there is no safe space for a portal. Travel opens the selected portfolio at its spawn point; the old world's vehicles and radio do not travel with you. The directory also works without WebGL and supports keyboard and touch.

This connects portfolios on the **same application server**, not unrelated websites or GitHub repositories. Local sign-in still represents one account, so the working local directory will show only portfolios actually published and opted in there. Automated tests seed two explicitly synthetic creators into their isolated database to verify cross-world travel; those fixtures are never added to your working world. Shared hosting with real authentication is required for multiple people to publish from different devices. This is portal navigation between portfolios, not synchronized multiplayer or one seamless continuous map. No hosting deployment is included in the GitHub push.

### Optional local sample worlds

After initializing the local database, run `npm run seed:worlds`. Open http://127.0.0.1:5173/discover or **Worlds** to visit three original, explicitly fictional demo portfolios:

- **Dune Circuit · Demo** — sunset dunes, a drift tuner, loop roads and game-design stories.
- **Aurora Outpost · Demo** — snowy night terrain, a rover, a survey plane and creative-technology stories.
- **Tide Studio · Demo** — a sunny palm-lined design island, a cruiser and a motor boat in a navigable harbor channel.

Each is 256 × 256 m, has the four essential portfolio sections, a car beside spawn, a survey plane on the west runway and a world portal. Press **F** beside the car to drive; **P** opens the directory. The samples use only built-in geometry; no API key, external model, music download or real person's information is needed. The harbor boat faces east toward open ocean.

The seed command is **local-only and insert-only**: it neither replaces your world nor publishes your draft, and reruns leave existing samples unchanged. It uses three reserved demo owners, separate from the one mock local account; the samples are visitor destinations, not additional signed-in users or editable drafts for your account. They are never substituted for failed/empty API responses. No automatic seeding or hosting deployment occurs. For an isolated initialized test state, `npm run seed:worlds -- --persist-to /absolute/path/to/local-state` uses the same local-only behavior. The test suite includes its own copies in the temporary port-5174 database.

## Connect AI locally

Copy `.dev.vars.example` to `.dev.vars`, then fill **one** provider's key locally. Never paste a secret into chat or put it in browser code. Restart the dev server after changing configuration.

| Variable         | Purpose                                                                  |
| ---------------- | ------------------------------------------------------------------------ |
| `GEMINI_API_KEY` | Gemini server key; chosen if both provider keys exist                    |
| `GEMINI_MODEL`   | Configurable model; default `gemini-3.8-flash`                           |
| `OPENAI_API_KEY` | OpenAI server key                                                        |
| `OPENAI_MODEL`   | Responses API model supporting structured outputs; default `gpt-4o-mini` |

Provider API availability, billing and model access depend on your account. The app starts with three demo credits per account. Missing credentials disable generation without spending credits. Each successful building costs one app credit; failed or expired generations restore it. Prompts are sent to the selected provider. No generation has been live-tested with a paid provider key yet.

This is procedural 3D generation: a model plans colored boxes, roofs, spheres, cylinders, cones, and rings. It is not arbitrary photorealistic text-to-mesh generation. Each generated piece can be edited, deleted, or supplemented in the inspector. Detailed externally-created models can be uploaded as GLB.

## Optional paid credits

Use Stripe **test mode** for the hackathon. Create a one-time Price for a 10-credit pack, then configure `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, and `STRIPE_WEBHOOK_SECRET` on the server. Price/currency are shown in Stripe's hosted checkout; the browser cannot choose the price or credit quantity.

Webhook endpoint: `/api/stripe/webhook`. Subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Only paid sessions with this app's metadata grant credits. Raw request signatures are verified, and the unique Checkout Session ID makes repeated webhook delivery harmless. The checkout return URL does not grant credits. Reopen Create or refresh My creations to see an updated balance.

For local test webhooks, use Stripe CLI forwarding to `http://127.0.0.1:5173/api/stripe/webhook`; use the signing secret printed by that listener. No real checkout or payment has been performed in development.

**Hosting boundary:** the [Sites rules](https://learn.chatgpt.com/docs/sites#understand-limits-and-unsupported-uses) prohibit enabling financial transactions. Do not enable Stripe on a Sites deployment, even if public. A future paid version needs another hosting platform and appropriate production authentication. The current app runs locally; its mock login is development-only.

## Verify

Run:

```sh
npm run typecheck
npm test
npm run build
```

Playwright starts its own server on port 5174 with a fresh temporary local database, independent of your working world on 5173. It uses installed Google Chrome on macOS and its normal Chromium on other systems. Tests cover terrain brushes and undo, biome/weather/theme persistence, character movement and jumping, object-to-piece conversion, editor rendering, GLB uploads, backups, required portfolio stories, publish/unpublish, snapshot isolation, anonymous read-only access, stale writes, unowned assets, and unconfigured-provider behavior. SQLite-backed accounting tests cover payment retries, failed-generation refunds and duplicate reservations. The test server is stopped after the suite; temporary databases are retained in the OS temporary directory for debugging.

## Architecture and hackathon scope

React + Vinext, Three.js, Cloudflare Workers, D1/Drizzle, R2. Routes live in `app/api`, shared world validation in `lib/world.ts`, rendering in `lib/scene.ts` and `lib/models.ts`, provider adapters in `lib/generate.ts`, atomic credit operations in `lib/credits.ts`.

The editor is desktop-first; playable portfolios support touch. Terrain uses a bounded 33×33 to 257×257 height field, not a voxel editor: no caves or overhangs. Snow is a visual weather effect and biome treatment, not accumulating physics. One world per account, 150 placed objects, 80 pieces per editable building, 15 MB per uploaded GLB, 30 uploaded models per account. Collision is approximate; this is a portfolio worldbuilder, not a general-purpose physics or multiplayer game engine. There are no subscriptions, billing administration, arbitrary scripting, collaboration, or custom domains in this hackathon version.

Sites publication uses `.openai/hosting.json`, the retained build integration, and the official Sites source/package/deploy workflow. Production migrations are applied by deployment. Local database and upload state are ignored and are not deployed. See [README.framework.md](README.framework.md) for framework operations.
