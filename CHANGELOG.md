# Change log

Record each meaningful project change during the event, newest first. Update this file in the same commit as the change. Use a real timestamp with timezone, for example `YYYY-MM-DDTHH:MM:SS+05:30`.

## Event build log

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
