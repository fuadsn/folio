# Change log

Record each meaningful project change during the event, newest first. Update this file in the same commit as the change. Use a real timestamp with timezone, for example `YYYY-MM-DDTHH:MM:SS+05:30`.

## Event build log

## 2026-10-11T10:44:27+05:30 — Drift-friendly neighborhood for the creator's world

- Changed: Added an undoable Build → Add drift neighborhood action with eight editable NPCs, workshops, a café, gallery, lodge, lookout and courtyard props. Reserves a 52 m-diameter southeast drift lawn and wide cross/loop corridors. Preserves existing objects, terrain, stories, spawn and vehicle settings; skips unsuitable/occupied sites and never duplicates existing neighborhood IDs.
- Why: Populate the creator's own world while retaining room to drive and drift, rather than only enriching the separate demo worlds.
- Safety: Refuses small maps and occupied, flooded or uneven drift lawns; checks model footprints, land/slope, spawn clearance and the 150-object cap. Adds only to the draft, not published snapshots or other owners' worlds.
- Validation: All 46 regression tests, typecheck and build passed; all four focused neighborhood tests passed again with final wet-site/uneven-lawn coverage. Layout/physics tests check separation, capacity, idempotence and collision-free slides; browser checks cover save/undo/redo and actual drifting. Exported a verified backup to ignored `outputs/`, then added 45 objects (eight NPCs, nine buildings and 28 props) to the creator's local draft. Verified all 27 original objects and other world fields, published state and every other world row were unchanged. Inspected map, dialogue and driving screenshots.
- Corrections: Browser tests now wait for the lazy-loaded layout to appear before checking autosave, and distinguish the Objects rail from the catalog category.
- Limitations: Fixed neighborhood layout with skipped sites on customized terrain; no automatic relocation/flattening. Imported GLBs use conservative buffers. Future manual edits can occupy the reserved space. Localhost-only follow-up after the documented event cutoff; no submission claim.

## 2026-10-11T10:27:20+05:30 — NPC guides and populated demo scenes

- Changed: Added NPC guides with editable appearance, authored greetings, six dialogue choices and story links. Guides turn/wave, respond to click/E/touch, pause movement during conversations and handle missing links. Added project kiosks, workshop facades, picnic tables, campfires and supply crates; built-in pieces remain editable. Populated each demo with three guides and themed scene details; added an explicit, additive `--add-details` local upgrade.
- Why: Make the sample portfolios feel inhabited and give creators reusable interactive components in the editor.
- Validation: All 42 regression tests passed. After the final portal-spacing adjustment, nine focused NPC/network tests, typecheck and build passed again. Desktop/mobile screenshots inspected. Added 57 detail objects, including nine NPCs, across the three local demos; original sample content and creator content preserved. A repeat upgrade left all three demo rows unchanged. Verified conversations and linked-story choices on all three actual local pages.
- Corrections: Screenshot review caught a guide overlapping a portal; moved it and added NPC clearance checks. Normalized signed zero in JSON round-trip test expectations. Counted snapshot additions through database queries because Wrangler's local metadata omitted change counts.
- Limitations: Authored dialogue only; no AI calls, wandering/pathfinding, repair simulation or enterable workshop interiors. Piece conversion freezes NPC animation but keeps dialogue. Localhost only. This follow-up is recorded at its real time after the documented event wrap-up; no submission or eligibility claim.

## 2026-10-11T09:37:22+05:30 — Local sample portfolio worlds

- Changed: Added three original fictional 256 × 256 m portfolios: Dune Circuit (desert/drifting), Aurora Outpost (snow/night) and Tide Studio (tropical harbor). Each includes real in-app story content, a spawn car, a survey plane, a loop road and portal navigation. Added `npm run seed:worlds`, shared deterministic sample data, isolated regression coverage and local demo instructions.
- Why: Give the local portfolio network useful destinations without posing samples as real people or replacing the creator's world.
- Validation: Typecheck, all 38 regression tests and build passed; desktop/mobile sample screenshots inspected. Seeded three records on localhost and verified all three listings/pages. Compared complete existing-world row hashes before/after; the original draft, revision and publication were unchanged. Re-ran the seed and verified all four rows remained byte-for-byte identical. Invalid/remote seed arguments were rejected before database access.
- Corrections: Reused one JSON literal per insert to remain below D1's statement-size limit. Corrected an invalid JSON test fixture and made browser search wait for client-loaded cards before typing.
- Limitations: Local-only, fictional samples, not additional authenticated users. Insert-only reruns do not reset edited samples. Travel still changes worlds through the directory, without carrying vehicles or providing live multiplayer. No hosting deployment.

## 2026-10-11T09:11:29+05:30 — Larger driving worlds

- Changed: Added 256 × 256 m new worlds, an undoable expansion control, a 512 × 512 m maximum, adaptive terrain grids and wider loop roads. Expanded object/spawn/vehicle limits, camera and ocean bounds; weather and nearby shadows follow the explorer. Added the user's preference to commit completed, tested changes to `AGENTS.md`.
- Why: Give cars room to cruise and drift without hitting the original small-world bounds while preserving authored building/story positions.
- Validation: The full 34-test regression suite passed. After raising the world-backup import cap to 16 MB, all five focused large-world tests passed, including an actual export/import round trip over 2 MB; typecheck and build passed again. Expanded-map and driving screenshots inspected. Applied the requested local draft expansion after exporting a backup to ignored `outputs/`; objects/stories and publication state were verified unchanged.
- Limitations: Resizing resamples terrain and paint; shrinking crops terrain. Existing published snapshots do not expand automatically. Geometry and object counts remain bounded; no infinite streaming world.

## 2026-10-11T08:58:48+05:30 — Preserve the GitHub event history and prepare the handoff

- Changed: Merged the existing `fuadsn/folio` event-template history with the local app history. Kept the original event README as `HACKATHON.md`, retained the rules and pull-request checklist, combined agent guidance/ignore rules, and documented the demo and implementation checkpoint.
- Why: Add the app to the requested repository without replacing remote work, force-pushing, or changing genuine earlier commit dates.
- Validation: Source credential-pattern scans passed for current files and existing history. Runtime data and secrets are ignored. The implementation checkpoint is `25457af7ad3379e9752c24c5096c525d8215a105`, which passed typecheck, all 30 tests and build. Merge changes are documentation/ignore rules only.
- Limitations: No public app deployment or formal event submission. Participant details and human review remain pending.

## 2026-10-11T08:55:02+05:30 — Worldfolio local editor and connected portfolios

- Changed: Checkpoint the existing local 3D editor, terrain/weather/avatar tools, editable vehicles, off-road/drift handling, opt-in Spotify/local-file radio, and the new published-world network. Added `/discover`, metadata-only `/api/worlds`, publish opt-in, in-world portals, search and pagination.
- Why: Let creators build playable portfolios and let visitors travel between opted-in published worlds without exposing drafts or unlisted portfolios.
- Validation: `npm run typecheck`, all 30 tests via `npm test`, and `npm run build` passed. The new network also passed 5 focused tests; desktop/mobile screenshots inspected. Build reports the existing large-client-chunk warning and a Vinext route-classification warning for `/discover`; neither fails the build.
- Limitations: Localhost only; no cloud deployment. Local sign-in represents one account. Cross-creator tests use explicitly synthetic fixtures on an isolated test database. Travel changes portfolio pages, not synchronized multiplayer; vehicles stay in their own worlds. Provider/payment integrations are not live-tested. No commit timestamps are altered or invented.

## Template setup — 10 October 2026

- Changed: Added the event README, rules, agent guide, change log, AI usage record, submission checklist, Git ignore rules, and pull request checklist.
- Why: Give participants a consistent starting point for event rules, basic coding patterns, documented changes, and regular commits.
- Validation: Checked local Markdown links, event detail consistency, required documents, and diff whitespace before publishing.
- Limitations: Documentation scaffolding only; no participant project, application, or working demo is included. GitHub publication and template status are verified separately after creation.
