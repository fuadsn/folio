# Project submission preparation

This is a source-code and local-demo handoff, not confirmation of an organizer submission or event eligibility. Participant details and the organizer's submission steps require human confirmation.

## Project

- **Project name:** Worldfolio Studio
- **Description:** A browser-based 3D portfolio builder. Creators sculpt terrain, edit buildings and stories, and publish playable worlds with characters and drivable vehicles. An opt-in network lets visitors discover and travel between published portfolios.
- **Code repository:** https://github.com/fuadsn/folio
- **Earlier network checkpoint:** `25457af7ad3379e9752c24c5096c525d8215a105` (30 tests, typecheck and build passed). Subsequent milestones include larger driving worlds and optional local demo portfolios, documented in CHANGELOG. No formal final submission has been made by Codex.
- **Working demo:** Local only: http://127.0.0.1:5173. No public hosting deployment is included in this handoff.
- **Access:** Node 22.13+, npm, a browser with WebGL. Local sign-in simulates one account and must not be exposed as production authentication.

## Participants

Repository owner: `@fuadsn`. Participant names, team membership, and individual contributions are pending creator confirmation. Do not treat repository ownership as a verified event roster.

## Run and demonstrate

Follow the fresh-clone installation and database commands in [README.md](README.md), then run `npm run dev` from the repository root.

1. Open `/editor`; edit a building's About, Project, Résumé, or Contact story.
2. New worlds are 256 × 256 m. For an older world, choose Terrain → Expand for driving. Dimensions support up to 512 × 512 m. Sculpt terrain, select a biome and weather, and toggle Day/Night.
3. Add a Tokyo drift tuner from Build → Vehicles. Test drive with W/A/S/D, Space to drift, B to brake; drive off-road. Boats and planes are also available.
4. Add the four required portfolio stories. In Publish, enable **Join the world network** and publish a snapshot.
5. Open **Worlds** or `/discover`; enter a listed portfolio. Click its glowing portal or press P to browse another destination. Only opted-in portfolios published on this same server appear.
6. Run `npm run seed:worlds` to add three clearly labeled fictional sample portfolios to the local directory without changing your draft. Visit Dune Circuit, Aurora Outpost and Tide Studio; press F beside each spawn car, then P to choose another world. Use `npm test -- tests/demo-worlds.spec.ts tests/network.spec.ts` for isolated sample/network checks. Test runs never seed your working database.

**Environment:** No API keys are needed for the editor, terrain, vehicles or networking. Optional `GEMINI_API_KEY` or `OPENAI_API_KEY` enables procedural building generation; see `.dev.vars.example`. Optional Stripe test variables are documented in README; no real payment was made or verified.

**Checks:** All 38 regression tests, typecheck and build passed after adding the local sample worlds. Desktop/mobile network, sample worlds and large-world screenshots were visually inspected. Local seeding preserved the original world row exactly; a second seed left all four rows unchanged. The build reports a large-client-chunk warning and a Vinext classification warning for `/discover`, but succeeds.

**Known limitations:** Local only; one mock local account. Real multi-user access requires a shared deployment and production authentication. World travel is page/portal navigation, not live multiplayer or a seamless map. Cars and audio stay in their originating world. AI/provider billing and payment integrations are not live-tested. The previous private Sites copy is not confirmed removed. Spotify controls depend on the service's playback availability; commercial audio is not bundled.

## Libraries, services and attribution

- [React](https://react.dev/), [Vinext](https://github.com/cloudflare/vinext), [Vite](https://vite.dev/) for the application and build.
- [Three.js](https://threejs.org/) for procedural 3D rendering; [Lucide](https://lucide.dev/) for icons.
- [Cloudflare Workers, D1 and R2](https://developers.cloudflare.com/) for server/runtime storage; [Drizzle](https://orm.drizzle.team/) and [Zod](https://zod.dev/) for schemas/validation.
- [Playwright](https://playwright.dev/) for automated browser checks.
- The retained Sites/Vinext starter supplies framework, local authentication and hosting integration; this is not claimed as original project code. Retained licenses live in `build/` and `vendor/`.
- The tuner is an original procedural model inspired by Tokyo Drift, not an official licensed replica. The radio uses Spotify's official opt-in embed, not a copied recording. No public dataset is used.

## Records and human checklist

- [AI_USAGE.md](AI_USAGE.md), [CHANGELOG.md](CHANGELOG.md), [RULES.md](RULES.md), [HACKATHON.md](HACKATHON.md).
- [ ] Confirm participant names, team size, attendance and event eligibility.
- [ ] Review the implementation and demo locally.
- [ ] Confirm the permitted use/disclosure of the retained framework starter with the event rules.
- [ ] Record the final submitted commit and follow the organizers' actual submission method.
