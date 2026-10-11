# Change log

Record each meaningful project change during the event, newest first. Update this file in the same commit as the change. Use a real timestamp with timezone, for example `YYYY-MM-DDTHH:MM:SS+05:30`.

## Event build log

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
