# New York Life

A multiplayer life sim in the browser. You just landed in New York with two suitcases and some savings. The city is real, live and shared with every other player. Make it.

- **Product spec:** [`docs/PRD.md`](docs/PRD.md) (the editable team copy lives in Claude Docs; link at the top of the file)
- **Current milestone:** M0 Spike: an isometric Brooklyn block, guest characters, tap-to-move multiplayer, room chat, and live MTA + weather + 311 feeds.

## What's in M0

| Area | Status |
| --- | --- |
| Character creation (name, look, origin, status, trait) | Done |
| Isometric Bushwick street block (R3F, orthographic camera) | Done |
| Tap-to-move with A* pathfinding, synced as intents (path + start time) | Done |
| Multiplayer presence, heartbeats, stale cleanup | Done |
| Room chat with speech bubbles | Done (placeholder filter; full moderation in M3) |
| Live City: MTA subway alerts, NWS weather, NYC 311 | Done, with simulated fallback |
| Real NYC clock drives daylight; real rain/snow renders | Done |
| Needs decay + mood (shared `game-core`, unit tested) | Done (display only; actions come in M1) |
| Auth | Guest token in localStorage; real auth in M1 |

## Repo layout

```
apps/web/            Next.js 16 app: UI, phone HUD, React Three Fiber scene
packages/game-core/  Pure TS rules shared by client and server: needs, mood, pathfinding, movement, clock
packages/content/    Typed game data: origins, statuses, traits, rooms
convex/              Backend: schema, mutations, queries, feed pollers, crons
docs/                PRD and diagrams
```

Rule of thumb: **game rules go in `game-core`** (no I/O, tested), **data goes in `content`** (no logic), **the server decides** (Convex mutations call `game-core`; clients only predict for smooth animation).

## Getting started

Requires Node 20+ and npm.

```bash
npm install

# 1. Backend. First run asks you to log in and create/link a Convex project.
npx convex dev
#    No account yet? Run a local backend instead:
#    CONVEX_AGENT_MODE=anonymous npx convex dev

# 2. Point the web app at it (the URL is printed by convex dev and saved to .env.local at the repo root)
cp apps/web/.env.example apps/web/.env.local   # then edit NEXT_PUBLIC_CONVEX_URL

# 3. Web app
npm run dev        # http://localhost:3000
```

To try multiplayer on one machine, open a second browser profile or a private window (each browser keeps its own guest session). To test on your phone, open the LAN URL that `next dev` prints.

Live feeds poll on crons. To fill the city state right away:

```bash
npx convex run city:pollSubway
npx convex run city:pollWeather
npx convex run city:poll311
```

### Environment variables (Convex dashboard → Settings → Environment variables)

| Variable | Needed? | Purpose |
| --- | --- | --- |
| `NWS_USER_AGENT` | Recommended | NWS asks every client to identify itself, e.g. `NewYorkLife (you@example.com)` |
| `SOCRATA_APP_TOKEN` | Recommended | NYC Open Data app token for 311. Without it, 311 requests may be refused and the game uses simulated block events |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run dev:convex` | Convex dev (push functions on save) |
| `npm test` | `game-core` unit tests (Vitest) |
| `npm run typecheck` | Typecheck every package |
| `npm run build` | Production build of the web app |

## Working agreements

- Short-lived branches off `main`, PR review before merge.
- `game-core` changes need tests.
- Commercial venues use parody names. No real business names or logos.
- Copy for an origin is reviewed by someone from that place before it ships.
