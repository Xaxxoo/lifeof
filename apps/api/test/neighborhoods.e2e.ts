/**
 * End-to-end: founding a neighborhood, buying lots, building shops, and owners getting paid.
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
import {
  BUILD_COST,
  DEFAULT_LOOK,
  FOUND_COST,
  GENDERS,
  LOT_COST,
  ORIGINS,
  OWNER_SHARE,
  SEXUALITIES,
  STATUSES,
  TRAITS,
  baseRoomId,
  lotPropId,
  type PlayerBlockDoc,
} from "@nyl/content";

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



const cash = async (jwt: string) => Number((await ok<Character>("GET", "/characters/me", jwt)).cash);
const cafe = { name: "Hook Coffee", template: "cafe", color: "#2a9d8f", arch: "warehouse" };

test("found a neighborhood, buy lots, build shops, and get paid when neighbors shop there", { timeout: 120_000 }, async () => {
  const founder = await guestWithCharacter("Founder");
  const neighbor = await guestWithCharacter("Neighbor");
  const startFounder = await cash(founder.jwt);

  // Founding picks a real street and opens six lots; the founder's first is free.
  assert.equal((await call("POST", "/neighborhoods/found", founder.jwt, { neighborhoodId: "red-hook", street: "Fake St" })).status, 400);
  const block = await ok<PlayerBlockDoc>("POST", "/neighborhoods/found", founder.jwt, { neighborhoodId: "red-hook", street: "Van Brunt St" });
  assert.equal(block.lots.length, 6);
  assert.equal(block.lots[0]!.ownerId, founder.character.id);
  assert.equal(await cash(founder.jwt), startFounder - FOUND_COST);
  assert.equal((await call("POST", "/neighborhoods/found", neighbor.jwt, { neighborhoodId: "red-hook", street: "Conover St" })).status, 400, "founded once");
  assert.equal((await call("POST", "/neighborhoods/found", founder.jwt, { neighborhoodId: "greenpoint", street: "Franklin St" })).status, 400, "one each");

  // It's public: anyone loading the game sees it.
  const list = await ok<{ blocks: PlayerBlockDoc[]; foundable: { id: string; founded: boolean }[] }>("GET", "/neighborhoods");
  assert.equal(list.blocks.find((b) => b.id === "red-hook")?.street, "Van Brunt St");
  assert.equal(list.foundable.find((f) => f.id === "red-hook")?.founded, true);

  // Lots: one buyer each, two lots at most.
  assert.equal((await call("POST", "/neighborhoods/red-hook/lots/0/buy", neighbor.jwt)).status, 400, "the founder's lot is taken");
  const startNeighbor = await cash(neighbor.jwt);
  await ok("POST", "/neighborhoods/red-hook/lots/1/buy", neighbor.jwt);
  await ok("POST", "/neighborhoods/red-hook/lots/2/buy", neighbor.jwt);
  assert.equal((await call("POST", "/neighborhoods/red-hook/lots/3/buy", neighbor.jwt)).status, 400, "max two lots");
  assert.equal(await cash(neighbor.jwt), startNeighbor - 2 * LOT_COST);

  // Building: only on your own lot, with a clean name.
  assert.equal((await call("POST", "/neighborhoods/red-hook/lots/1/build", founder.jwt, cafe)).status, 400, "not your lot");
  assert.equal((await call("POST", "/neighborhoods/red-hook/lots/0/build", founder.jwt, { ...cafe, name: "x" })).status, 400);
  assert.equal((await call("POST", "/neighborhoods/red-hook/lots/0/build", founder.jwt, { ...cafe, template: "casino" })).status, 400);
  const built = await ok<PlayerBlockDoc>("POST", "/neighborhoods/red-hook/lots/0/build", founder.jwt, cafe);
  assert.equal(built.lots[0]!.shop?.name, "Hook Coffee");
  const afterBuild = await cash(founder.jwt);
  assert.equal(afterBuild, startFounder - FOUND_COST - BUILD_COST);

  // A neighbor rides out to Red Hook, walks into the café and buys a coffee: the owner gets their share.
  let me = await act(neighbor.jwt, "prop:subway", "ride_subway", "red-hook");
  assert.equal(baseRoomId(me.roomId), "red-hook");
  me = await act(neighbor.jwt, `prop:${lotPropId(0)}`, "enter_venue");
  assert.equal(baseRoomId(me.roomId), "shop:red-hook:lot-1");
  me = await act(neighbor.jwt, "prop:counter", "pb_coffee");
  assert.equal(await cash(founder.jwt), afterBuild + Math.round(5 * OWNER_SHARE));

  // Lot menus open on the phone, never as an action.
  assert.equal((await call("POST", "/play/start", neighbor.jwt, { target: "prop:door", actionId: "lot_open" })).status, 400);
});
