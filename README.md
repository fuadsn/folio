# Worldfolio Studio

Build a little 3D world around your work. Every object can tell a story; a portfolio needs an introduction, project, résumé, and contact details, but their shapes are up to you.

## Run locally

Node 22.13+ is required. From `hackathon`, run `npm run dev`, or from this directory:

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_fuzzy_celestials.sql
npm run dev
```

Apply that SQL only once on a fresh local database. The current checkout already has its database initialized. Open http://127.0.0.1:5173. Local-only sign-in simulates one account, `local_seedy`. Do not expose the development server to the internet. Production identity is provided by Sites, not this development cookie.

## What works

- 21 placeable building, nature, prop, and geometric objects; click or drag to add.
- 3D move/rotate/scale handles, grid snapping, numerical transforms, duplicate, delete, undo/redo.
- Editable world name, owner, introduction, colors and day/sunset/night atmosphere. An optional empty landscape, with undo.
- Any object can hold About, Project, Résumé, or Contact content. Text is rendered safely and links allow only HTTP, HTTPS, and mailto.
- Autosaved drafts in D1; optimistic revisions prevent another tab silently overwriting your work.
- Walkable preview with WASD/arrows, Shift to run, E or click to open stories; touch controls and an accessible conventional portfolio view.
- Publishing saves a snapshot at `/w/<world-id>`. Draft changes stay private until republished. Unpublishing removes the snapshot, not the draft.
- Self-contained GLB uploads stored in R2. Uploads remain private unless referenced by a published snapshot.
- JSON export/import for layout and stories. GLB files remain in their original account on this server.
- Optional Gemini/OpenAI building generation into validated, editable 3D primitives; no generated executable code.
- Optional Stripe Checkout for 10-credit packs; verified webhooks grant credits exactly once.

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

**Hosting boundary:** a new Sites deployment is owner-private. Its sharing policy also applies to published portfolio links. Stripe cannot call an owner-private Site directly, so hosted payments require an intentionally public, webhook-reachable deployment. Do not switch sharing just to bypass this restriction. Runtime credentials must be set through Sites secrets, not the hosting manifest or source control. The local mock login is never used in production.

## Verify

With `npm run dev` running in another terminal:

```sh
npm run typecheck
npm test
npm run build
```

Playwright uses installed Google Chrome on macOS and its normal Chromium on other systems. Tests cover editor rendering, edits, undo/redo, GLB upload, backup import/export, editable building pieces, required portfolio stories, publish/unpublish, snapshot isolation, anonymous read-only access, stale writes, unowned assets, and unconfigured-provider behavior. SQLite-backed accounting tests cover payment retries, failed-generation refunds and duplicate reservations. The mutation test uses the local demo account and restores its draft; do not run it against a production deployment.

## Architecture and hackathon scope

React + Vinext, Three.js, Cloudflare Workers, D1/Drizzle, R2. Routes live in `app/api`, shared world validation in `lib/world.ts`, rendering in `lib/scene.ts` and `lib/models.ts`, provider adapters in `lib/generate.ts`, atomic credit operations in `lib/credits.ts`.

The editor is desktop-first; published portfolios support touch. One world per account, 150 placed objects, 80 pieces per generated building, 15 MB per uploaded GLB, 30 uploaded models per account. Collision is approximate; this is a portfolio worldbuilder, not a general-purpose physics or multiplayer game engine. There are no subscriptions, billing administration, arbitrary scripting, collaboration, or custom domains in this hackathon version.

Sites publication uses `.openai/hosting.json`, the retained build integration, and the official Sites source/package/deploy workflow. Production migrations are applied by deployment. Local database and upload state are ignored and are not deployed. See [README.framework.md](README.framework.md) for framework operations.
