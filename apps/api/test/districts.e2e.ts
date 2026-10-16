/**
 * End-to-end: walking from Brooklyn to Manhattan over the Manhattan Bridge, and the club door rules.
 *
 * Boots the built API (`dist/main`) against a throwaway Postgres database, which it creates
 * and drops itself. Uses the DATABASE_HOST/PORT/USER/PASSWORD env vars (defaults match local dev).
 * Run with `npm run test:e2e --workspace=apps/api`.
 */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { Client } from "pg";
import { DEFAULT_LOOK, GENDERS, ORIGINS, ROOMS, SEXUALITIES, STATUSES, TRAITS, baseRoomId } from "@nyl/content";
import { clubDoor } from "../src/play/play.service";

const PORT = 3600 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DB = `nyl_e2e_${process.pid}`;
const pgConfig = {
  host: process.env.DATABASE_HOST ?? "localhost",
  port: Number(process.env.DATABASE_PORT ?? 5432),
  user: process.env.DATABASE_USER ?? "postgres",
  password: process.env.DATABASE_PASSWORD ?? "postgres",
  database: "postgres",
};

let server: ChildProcess;
let serverLog = "";

async function admin(sql: string) {
  const client = new Client(pgConfig);
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

before(async () => {
  await admin(`CREATE DATABASE "${DB}"`);
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
      JWT_SECRET: "e2e-secret",
      DISABLE_THROTTLE: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout?.on("data", (d) => (serverLog += d));
  server.stderr?.on("data", (d) => (serverLog += d));

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`API exited early:\n${serverLog}`);
    try {
      await fetch(`${BASE}/auth/me`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  throw new Error(`API didn't start within 60s:\n${serverLog}`);
});

after(async () => {
  if (server && server.exitCode === null) {
    const exited = new Promise((r) => server.once("exit", r));
    server.kill("SIGTERM");
    await exited;
  }
  await admin(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
});

async function call<T>(method: string, route: string, jwt?: string, body?: unknown): Promise<{ status: number; data: T }> {
  const headers: Record<string, string> = {};
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${route}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, data: (text ? JSON.parse(text) : null) as T };
}

async function ok<T>(method: string, route: string, jwt?: string, body?: unknown): Promise<T> {
  const { status, data } = await call<T>(method, route, jwt, body);
  assert.ok(status < 300, `${method} ${route} → ${status} ${JSON.stringify(data)}`);
  return data;
}

type Character = { id: string; name: string; cash: number | string; userId: string | null; roomId: string; activity: { endsAt: number } | null };

const newCharacter = (name: string) => ({
  name,
  origin: ORIGINS[0]!.id,
  status: STATUSES[0]!.id,
  trait: TRAITS[0]!.id,
  gender: GENDERS[0]!.id,
  sexuality: SEXUALITIES[0]!.id,
  look: DEFAULT_LOOK,
});


async function guestWithCharacter(name: string) {
  const guest = await ok<{ jwt: string }>("POST", "/auth/guest");
  const created = await ok<{ character: Character; jwt: string }>("POST", "/characters", guest.jwt, newCharacter(name));
  await ok("POST", "/world/join", created.jwt);
  return { jwt: created.jwt, character: created.character };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Start an action and wait for the server to finish it. */
async function act(jwt: string, target: string, actionId: string, dest?: string) {
  const r = await ok<{ endsAt: number }>("POST", "/play/start", jwt, { target, actionId, dest });
  await sleep(Math.max(0, r.endsAt - Date.now()) + 600);
  const me = await ok<Character>("GET", "/characters/me", jwt);
  if (me.activity) await call("POST", "/play/finish", jwt);
  return ok<Character>("GET", "/characters/me", jwt);
}

async function myTile(jwt: string, roomId: string) {
  const me = await ok<Character>("GET", "/characters/me", jwt);
  const occ = await ok<{ characterId: string; path: { x: number; y: number }[] }[]>("GET", `/world/occupants/${encodeURIComponent(roomId)}`, jwt);
  const mine = occ.find((o) => o.characterId === me.id);
  return mine?.path[mine.path.length - 1];
}

test("walks from DUMBO over the Manhattan Bridge into Chinatown", { timeout: 120_000 }, async () => {
  const { jwt } = await guestWithCharacter("Walker");
  // Nostrand Ave can't be walked out of: there's no crossing there.
  assert.equal((await call("POST", "/play/start", jwt, { target: "prop:bridge", actionId: "walk_over" })).status, 400);

  let me = await act(jwt, "prop:subway", "ride_subway", "dumbo");
  assert.equal(baseRoomId(me.roomId), "dumbo");

  me = await act(jwt, "prop:bridge", "walk_over");
  assert.equal(baseRoomId(me.roomId), "manhattan-bridge");
  const dumboStairs = ROOMS["dumbo"]!.props.find((p) => p.id === "bridge")!;
  assert.deepEqual(await myTile(jwt, me.roomId), dumboStairs.walkTo!.at, "lands at the Brooklyn end of the walkway");

  me = await act(jwt, "prop:to-chinatown", "walk_over");
  assert.equal(baseRoomId(me.roomId), "chinatown");
  assert.deepEqual(await myTile(jwt, me.roomId), { x: 2, y: 13 }, "comes out by the bridge arch on Canal St");

  // And back again.
  me = await act(jwt, "prop:bridge", "walk_over");
  assert.equal(baseRoomId(me.roomId), "manhattan-bridge");
});

test("club door: shower first, then cover unless you're early or on the list", () => {
  const club = ROOMS["venue:neon-lotus"]!;
  const rules = club.club!;
  const nobody = { skills: { cooking: 0, charisma: 0, fitness: 0, coding: 0, creativity: 0, hustle: 0 } };
  assert.throws(() => clubDoor(rules, club.open, nobody, rules.minHygiene - 1, 0), /shower/);
  assert.equal(clubDoor(rules, club.open, nobody, 80, 1).cover, rules.cover, "full cover at 1 AM");
  assert.equal(clubDoor(rules, club.open, nobody, 80, club.open!.open).cover, 0, "free in the first hour");
  const regular = { skills: { ...nobody.skills, charisma: 1_000_000 } };
  assert.equal(clubDoor(rules, club.open, regular, 80, 1).cover, 0, "on the list");
  assert.throws(() => clubDoor(rules, club.open, regular, 5, 1), /shower/, "the list doesn't get you in smelling like that");
});
