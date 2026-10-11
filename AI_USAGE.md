# AI usage record

Use Codex during the hackathon and briefly document its actual contribution here. Add a row after each meaningful task or milestone. Keep summaries concise and omit secrets, private data, and full chat transcripts.

## Event build log

Human review remains pending. These entries record actual assistance; they do not establish event eligibility or replace participant confirmation.

| Date and time with timezone | Tool / model, if known | Task | Assistance and affected files | Human review / corrections | Validation and result |
| --- | --- | --- | --- | --- | --- |
| 2026-10-11T10:27:20+05:30 | Codex | Add components and NPCs to the sample worlds/editor | Added six catalog objects, authored NPC dialogue and appearance editing, proximity animation, story links, populated sample scenes, an additive local upgrade and regression tests. | Pending creator review; corrected portal/NPC overlap from screenshot inspection, signed-zero JSON test expectations and upgrade count reporting. Follow-up after the documented event cutoff. | All 42 tests passed; nine focused NPC/network tests, typecheck and build passed again after final portal spacing. Screenshots inspected. Upgraded and verified all three local demos; original content preserved and repeat upgrade left demo rows unchanged. |
| 2026-10-11T09:37:22+05:30 | Codex | Seed a few explorable portfolio worlds | Authored three fictional sample worlds with terrain, vehicles and stories; added a local insert-only seed command, regression tests and documentation. Seeded the requested local database while preserving the creator's record. | Pending creator review; fixed SQL statement size, an invalid JSON fixture and a pre-hydration browser-test race. | All 38 tests, typecheck and build passed; screenshots inspected, local listings/pages verified. Original-world and repeat-seed row hashes unchanged. Remote/invalid seed arguments rejected. |
| 2026-10-11T09:11:29+05:30 | Codex | Make portfolio worlds much larger for driving | Added adaptive terrain expansion, larger defaults/bounds, loop roads, editor controls and large-map regression tests. Backed up and expanded the requested local draft without moving objects. Recorded the request to commit each completed tested change. | Pending creator review; increased the backup import cap after identifying fully painted large exports can exceed 2 MB. | Full 34-test regression run passed; after the backup-cap fix, five targeted tests, typecheck and build passed. Expanded-world/driving screenshots and preservation of draft content inspected. |
| 2026-10-11T08:58:48+05:30 | Codex | Prepare the requested GitHub push | Preserved both genuine Git histories, retained the event README/rules, combined repository guidance, checked credential patterns, and wrote truthful local demo/submission instructions. | Pending creator review; participant details and formal submission are not inferred. | Implementation checkpoint `25457af` passed 30 tests, typecheck and build. No commit dates were overridden. |
| 2026-10-11T08:55:02+05:30 | Codex | Worldfolio local editor and connected portfolios | Implemented terrain/weather/avatar editing, vehicles and drifting, opt-in radio, published-world directory, travel portals, snapshot privacy tests, and local documentation. Earlier retained Site source commits are preserved. | Pending creator review; corrected a hill-driving test that initially faced away from the hill. | Typecheck, all 30 combined tests, and production build passed. Five focused network tests also passed. Desktop/mobile network and portal screenshots inspected. |

## Template preparation

On 10 October 2026, Codex prepared this documentation template from the organizer's supplied rules and checked the linked Luma page for the event name and dates. This covered `README.md`, `RULES.md`, `AGENTS.md`, `CHANGELOG.md`, `AI_USAGE.md`, `SUBMISSION.md`, `.gitignore`, and the pull request checklist. Agent validation covered local links, event consistency, required documents, and diff whitespace; organizer review is pending.

This preparation is separate from participant project implementation and participant AI usage during the event.
