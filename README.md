# Queens 4 My Queen

A Queens logic puzzle. The game runs entirely in the browser; the only backend is the leaderboard.

## Architecture

| Path | Role |
| --- | --- |
| `src/` | Next.js app, built as a static export into `out/` |
| `src/domain/scoring.ts` | Score formula, shared by the game and the API |
| `api/` | Cloudflare Worker serving `/api/leaderboard` |
| `migrations/` | D1 schema |

The Worker is the anti-cheat boundary: `api/leaderboard/submission.ts` validates every field and recomputes the score. Only `/api/*` reaches it; pages come straight from the asset store. The board refreshes by polling every 30 seconds while the tab is visible.

## Development

```bash
npm install
npm run dev:api   # Worker and local D1 on :8787
npm run dev       # Next.js on :3000, proxies /api to the Worker
```

`npm run preview` builds and serves the production output from a local Worker, service worker included.

```bash
npm test            # runs in workerd against a real local D1
npm run typecheck
npm run lint
```

## Deployment

One-time setup:

```bash
npx wrangler login
npx wrangler d1 create queens   # put the printed id in wrangler.jsonc
```

Then, for each release:

```bash
npm run deploy    # build, apply D1 migrations, deploy the Worker
```

## Importing data from Supabase

1. In Supabase, export `leaderboard`, `leaderboard_telemetry` and `leaderboard_solve_log` as CSV into one folder, named after each table.
2. Convert and load them:

```bash
node --experimental-strip-types scripts/import-supabase.ts <folder> import.sql
npx wrangler d1 execute queens --remote --file=import.sql
```
