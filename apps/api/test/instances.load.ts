/**
 * Load test: 500 players crowd one block, then all walk into one shop at once.
 *
 * Boots the built API (`dist/main`) on a throwaway Postgres database (created and dropped here),
 * connects one socket per player, and checks that:
 *   - every copy of the block and the shop stays at or under its cap
 *   - chat and movement reach everyone in the same copy, and nobody in other copies
 *   - joins, room changes and broadcasts stay fast (p95 limits below)
 *
 * Run with `npm run test:load --workspace=apps/api`. LOAD_PLAYERS changes the crowd size.
 * Uses DATABASE_HOST/PORT/USER/PASSWORD (defaults match local dev).
 */
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { Client } from "pg";
import { io, type Socket } from "socket.io-client";
import { isWalkable } from "@nyl/game-core";
import {
  DEFAULT_LOOK,
  GENDERS,
  ORIGINS,
  ROOMS,
  SEXUALITIES,
  STATUSES,
  STREET_ID,
  TRAITS,
  baseRoomId,
  buildRoomLayout,
} from "@nyl/content";

const PLAYERS = Number(process.env.LOAD_PLAYERS ?? 500);
const SHOP = "shop:crown-heights:patty";
const LIMITS = { joinP95: 1500, broadcastP95: 500, roomChangeP95: 15_000, occupantsP95: 300 };

const PORT = 3600 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DB = `nyl_load_${process.pid}`;
const pgConfig = {
  host: process.env.DATABASE_HOST ?? "localhost",
  port: Number(process.env.DATABASE_PORT ?? 5432),
  user: process.env.DATABASE_USER ?? "postgres",
  password: process.env.DATABASE_PASSWORD ?? "postgres",
  database: "postgres",
};

interface Player {
  jwt: string;
  id: string;
  roomId: string;
  socket: Socket;
}

const failures: string[] = [];
const check = (ok: boolean, message: string) => {
  console.log(`${ok ? "  ok  " : "  FAIL"} ${message}`);
  if (!ok) failures.push(message);
};

function p95(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]!);
}

async function admin(sql: string) {
  const client = new Client(pgConfig);
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

/** Run something against the test database itself. */
async function withDb<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  const client = new Client({ ...pgConfig, database: DB });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function call<T>(method: string, route: string, jwt?: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${route}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${route} → ${res.status} ${text}`);
  return (text ? JSON.parse(text) : null) as T;
}

/** Run `fn` over items with at most `limit` in flight, like a crowd arriving over a few seconds. */
async function inBatches<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]!, i);
      }
    }),
  );
  return out;
}

const counts = (players: Player[]) => {
  const m = new Map<string, number>();
  for (const p of players) m.set(p.roomId, (m.get(p.roomId) ?? 0) + 1);
  return m;
};

function waitFor<T>(socket: Socket, event: string, match: (data: T) => boolean, timeoutMs: number): Promise<number> {
  const started = performance.now();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`timed out waiting for ${event}`));
    }, timeoutMs);
    const handler = (data: T) => {
      if (!match(data)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(performance.now() - started);
    };
    socket.on(event, handler);
  });
}

async function main() {
  console.log(`Load test: ${PLAYERS} players on one block, then into one shop\n`);
  await admin(`CREATE DATABASE "${DB}"`);
  let server: ChildProcess | undefined;
  let log = "";
  const players: Player[] = [];
  try {
    server = spawn(process.execPath, ["--import", "tsx", "dist/main"], {
      cwd: path.resolve(import.meta.dirname, ".."),
      env: {
        ...process.env,
        NODE_ENV: "test",
        PORT: String(PORT),
        DATABASE_HOST: pgConfig.host,
        DATABASE_PORT: String(pgConfig.port),
        DATABASE_USER: pgConfig.user,
        DATABASE_PASSWORD: pgConfig.password,
        DATABASE_NAME: DB,
        JWT_SECRET: "load-secret",
        DISABLE_THROTTLE: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout?.on("data", (d) => (log += d));
    server.stderr?.on("data", (d) => (log += d));
    for (let started = Date.now(); ; ) {
      if (server.exitCode !== null) throw new Error(`API exited early:\n${log}`);
      try {
        await fetch(`${BASE}/auth/me`);
        break;
      } catch {
        if (Date.now() - started > 60_000) throw new Error(`API didn't start within 60s:\n${log}`);
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    // 1. A crowd lands on the block: create players, then join, 50 at a time.
    const t0 = performance.now();
    const made = await inBatches(Array.from({ length: PLAYERS }), 50, async (_, i) => {
      const guest = await call<{ jwt: string }>("POST", "/auth/guest");
      const created = await call<{ character: { id: string }; jwt: string }>("POST", "/characters", guest.jwt, {
        name: `Load ${i}`,
        origin: ORIGINS[0]!.id,
        status: STATUSES[0]!.id,
        trait: TRAITS[0]!.id,
        gender: GENDERS[0]!.id,
        sexuality: SEXUALITIES[0]!.id,
        look: DEFAULT_LOOK,
      });
      return { jwt: created.jwt, id: created.character.id };
    });
    console.log(`Created ${PLAYERS} players in ${Math.round(performance.now() - t0)} ms`);

    const joinMs: number[] = [];
    let doubleJoinSplit = 0;
    await inBatches(made, 50, async (m) => {
      const started = performance.now();
      // Join twice at once, like React running the effect twice or a retried request: still one presence.
      const [{ roomId }, again] = await Promise.all([
        call<{ roomId: string }>("POST", "/world/join", m.jwt),
        call<{ roomId: string }>("POST", "/world/join", m.jwt),
      ]);
      if (again.roomId !== roomId) doubleJoinSplit++;
      joinMs.push(performance.now() - started);
      const socket = io(BASE, { auth: { token: m.jwt }, transports: ["websocket"], forceNew: true });
      await new Promise<void>((resolve, reject) => {
        socket.once("connect", () => resolve());
        socket.once("connect_error", reject);
      });
      socket.emit("room:subscribe", { roomId });
      players.push({ ...m, roomId, socket });
    });
    // Let the subscribes land.
    await new Promise((r) => setTimeout(r, 1000));

    const streetCap = ROOMS[STREET_ID]!.capacity;
    const street = counts(players);
    console.log(`\nOn the block (cap ${streetCap}): ${street.size} copies, sizes ${[...street.values()].join(" ")}`);
    check(players.every((p) => baseRoomId(p.roomId) === STREET_ID), "everyone landed on a copy of the block");
    check(Math.max(...street.values()) <= streetCap, `no copy of the block is over ${streetCap}`);
    check(street.size === Math.ceil(PLAYERS / streetCap), `copies are filled before new ones open (${street.size} for ${PLAYERS})`);
    check(p95(joinMs) <= LIMITS.joinP95, `join p95 ${p95(joinMs)} ms ≤ ${LIMITS.joinP95} ms`);
    const dupes = await withDb(async (db) => {
      const r = await db.query(`SELECT COUNT(*) - COUNT(DISTINCT "characterId") AS n FROM presence`);
      return Number(r.rows[0].n);
    });
    check(dupes === 0 && doubleJoinSplit === 0, `two joins at once give one presence in one room (${dupes} duplicate rows, ${doubleJoinSplit} split)`);

    // 2. Chat: one message per copy reaches that copy and nobody else. Messages from accounts under
    // 48 hours old are held for review, so age these players first (this is a throwaway database).
    await withDb((db) => db.query(`UPDATE characters SET "createdAt" = "createdAt" - 3 * 86400000`));
    const leaked: string[] = [];
    for (const p of players) {
      p.socket.on("chat:message", (msg: { roomId: string; body: string }) => {
        if (msg.roomId !== p.roomId) leaked.push(`${msg.body} → ${p.roomId}`);
      });
    }
    const chatMs: number[] = [];
    let missed = 0;
    await Promise.all(
      [...street.keys()].map(async (roomId) => {
        const here = players.filter((p) => p.roomId === roomId);
        const [sender, ...rest] = here;
        const body = `hello from ${roomId}`;
        const arrivals = rest.map((r) => waitFor<{ body: string }>(r.socket, "chat:message", (m) => m.body === body, 5000).catch(() => -1));
        sender!.socket.emit("chat:send", { roomId, body });
        for (const ms of await Promise.all(arrivals)) ms < 0 ? missed++ : chatMs.push(ms);
      }),
    );
    // Talking into a copy you're not in is refused.
    const outsider = players.find((p) => p.roomId !== [...street.keys()][0])!;
    let refused = false;
    try {
      await call("POST", "/chat/send", outsider.jwt, { roomId: [...street.keys()][0], body: "sneaky" });
    } catch {
      refused = true;
    }
    await new Promise((r) => setTimeout(r, 500));
    console.log("\nChat");
    check(missed === 0, `every message reached everyone in its copy (${missed} missed)`);
    check(leaked.length === 0, `no message reached another copy (${leaked.length} leaked)`);
    check(refused, "chat into a copy you're not in is refused");
    check(p95(chatMs) <= LIMITS.broadcastP95, `chat delivery p95 ${p95(chatMs)} ms ≤ ${LIMITS.broadcastP95} ms`);

    // 3. Movement: 100 players move at once; peers in the same copy see it.
    const { grid } = buildRoomLayout(ROOMS[STREET_ID]!, []);
    const open: { x: number; y: number }[] = [];
    for (let y = 0; y < grid.height; y++) for (let x = 0; x < grid.width; x++) if (isWalkable(grid, { x, y })) open.push({ x, y });
    const movers = players.filter((_, i) => i % Math.max(1, Math.floor(PLAYERS / 100)) === 0).slice(0, 100);
    const moveMs: number[] = [];
    let moveMissed = 0;
    let moveRefused = 0;
    await Promise.all(
      movers.map(async (m, i) => {
        const peer = players.find((p) => p.roomId === m.roomId && p.id !== m.id);
        if (!peer) return;
        const seen = waitFor<{ characterId: string }>(peer.socket, "occupant:move", (d) => d.characterId === m.id, 5000).catch(() => -1);
        const ack = (await m.socket.emitWithAck("world:move", { target: open[(i * 37) % open.length] })) as { ok: boolean };
        if (!ack.ok) return void moveRefused++;
        const ms = await seen;
        ms < 0 ? moveMissed++ : moveMs.push(ms);
      }),
    );
    console.log("\nMovement");
    check(moveRefused === 0, `every move to a walkable tile was accepted (${moveRefused} refused)`);
    check(moveMissed === 0, `every move reached a peer in the same copy (${moveMissed} missed)`);
    check(p95(moveMs) <= LIMITS.broadcastP95, `move broadcast p95 ${p95(moveMs)} ms ≤ ${LIMITS.broadcastP95} ms`);

    // 4. Everyone walks into the same shop at once.
    const shopCap = ROOMS[SHOP]!.capacity;
    const changeMs: number[] = [];
    let stuck = 0;
    await Promise.all(
      players.map(async (p) => {
        const changed = new Promise<{ roomId: string; ms: number } | null>((resolve) => {
          const started = performance.now();
          const timer = setTimeout(() => resolve(null), 60_000);
          p.socket.once("room:changed", (d: { roomId: string }) => {
            clearTimeout(timer);
            resolve({ roomId: d.roomId, ms: performance.now() - started });
          });
        });
        await call("POST", "/play/start", p.jwt, { target: "prop:patty", actionId: "enter_venue" });
        const r = await changed;
        if (!r) return void stuck++;
        changeMs.push(r.ms);
        p.roomId = r.roomId;
        p.socket.emit("room:subscribe", { roomId: r.roomId });
      }),
    );
    const shop = counts(players.filter((p) => baseRoomId(p.roomId) === SHOP));
    console.log(`\nInto the shop (cap ${shopCap}): ${shop.size} copies, sizes ${[...shop.values()].join(" ")}`);
    check(stuck === 0, `everyone got into the shop (${stuck} never moved)`);
    check(shop.size ? Math.max(...shop.values()) <= shopCap : false, `no copy of the shop is over ${shopCap}`);
    const sortedChange = [...changeMs].sort((a, b) => a - b);
    console.log(`  walk in + room change: fastest ${Math.round(sortedChange[0] ?? 0)} ms, median ${Math.round(sortedChange[sortedChange.length >> 1] ?? 0)} ms (the walk to the door is most of it)`);
    check(p95(changeMs) <= LIMITS.roomChangeP95, `walk in + room change p95 ${p95(changeMs)} ms ≤ ${LIMITS.roomChangeP95} ms`);

    // 5. Each copy's occupant list matches who's in it and comes back quickly.
    await new Promise((r) => setTimeout(r, 1000));
    const occMs: number[] = [];
    let mismatched = 0;
    for (const [roomId, n] of shop) {
      const started = performance.now();
      const list = await call<{ characterId: string }[]>("GET", `/world/occupants/${encodeURIComponent(roomId)}`);
      occMs.push(performance.now() - started);
      if (list.length !== n) mismatched++;
    }
    console.log("\nOccupant lists");
    check(mismatched === 0, `every copy's occupant list matches its players (${mismatched} off)`);
    check(p95(occMs) <= LIMITS.occupantsP95, `occupants p95 ${p95(occMs)} ms ≤ ${LIMITS.occupantsP95} ms`);
  } finally {
    for (const p of players) p.socket.disconnect();
    if (server && server.exitCode === null) {
      const exited = new Promise((r) => server!.once("exit", r));
      server.kill("SIGTERM");
      await exited;
    }
    await admin(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
  }

  console.log(failures.length ? `\n${failures.length} check(s) failed` : "\nAll checks passed");
  process.exit(failures.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
