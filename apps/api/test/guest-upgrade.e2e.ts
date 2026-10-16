/**
 * End-to-end: a guest plays, then saves with an email + password and keeps their character.
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
import { DEFAULT_LOOK, GENDERS, ORIGINS, SEXUALITIES, STATUSES, TRAITS } from "@nyl/content";

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

type Character = { id: string; name: string; cash: number | string; userId: string | null };

const newCharacter = (name: string) => ({
  name,
  origin: ORIGINS[0]!.id,
  status: STATUSES[0]!.id,
  trait: TRAITS[0]!.id,
  gender: GENDERS[0]!.id,
  sexuality: SEXUALITIES[0]!.id,
  look: DEFAULT_LOOK,
});

const email = (tag: string) => `${tag}-${process.pid}@example.com`;

async function guestWithCharacter(name: string) {
  const guest = await ok<{ jwt: string }>("POST", "/auth/guest");
  const created = await ok<{ character: Character; jwt: string }>("POST", "/characters", guest.jwt, newCharacter(name));
  return { jwt: created.jwt, character: created.character };
}

test("a guest upgrades to an account and keeps their character on any device", async () => {
  const { jwt, character } = await guestWithCharacter("Guesty");
  const before = await ok<Character>("GET", "/characters/me", jwt);
  assert.equal(before.id, character.id);

  const up = await ok<{ jwt: string; userId: string; characterId: string }>("POST", "/auth/upgrade", jwt, {
    email: email("Saver"),
    password: "hunter22",
  });
  assert.equal(up.characterId, character.id);

  // Same browser, new token: still the same character and cash.
  const same = await ok<Character>("GET", "/characters/me", up.jwt);
  assert.equal(same.id, character.id);
  assert.equal(Number(same.cash), Number(before.cash));
  const session = await ok<{ userId?: string; email?: string }>("GET", "/auth/me", up.jwt);
  assert.equal(session.userId, up.userId);
  assert.equal(session.email, email("saver"));

  // Another device: log in and get the guest's character back.
  const login = await ok<{ jwt: string; characterId: string }>("POST", "/auth/login", undefined, {
    email: email("saver"),
    password: "hunter22",
  });
  assert.equal(login.characterId, character.id);
  const elsewhere = await ok<Character>("GET", "/characters/me", login.jwt);
  assert.equal(elsewhere.id, character.id);
  assert.equal(Number(elsewhere.cash), Number(before.cash));

  // The old guest token still works in the original browser.
  assert.equal((await ok<Character>("GET", "/characters/me", jwt)).id, character.id);
});

test("an account can't be upgraded again, and a character can't be claimed twice", async () => {
  const { jwt } = await guestWithCharacter("Twice");
  const up = await ok<{ jwt: string }>("POST", "/auth/upgrade", jwt, { email: email("twice"), password: "hunter22" });

  const again = await call("POST", "/auth/upgrade", up.jwt, { email: email("twice2"), password: "hunter22" });
  assert.equal(again.status, 400);

  // The pre-upgrade guest JWT has no userId, but its character is taken now.
  const stale = await call("POST", "/auth/upgrade", jwt, { email: email("twice3"), password: "hunter22" });
  assert.equal(stale.status, 400);
  const login = await call("POST", "/auth/login", undefined, { email: email("twice3"), password: "hunter22" });
  assert.equal(login.status, 401, "the refused upgrade must not leave an account behind");
});

test("upgrade refuses an email that's taken and bad credentials", async () => {
  const { jwt } = await guestWithCharacter("Taken");
  await ok("POST", "/auth/signup", undefined, { email: email("taken"), password: "hunter22" });

  assert.equal((await call("POST", "/auth/upgrade", jwt, { email: email("taken"), password: "hunter22" })).status, 400);
  assert.equal((await call("POST", "/auth/upgrade", jwt, { email: "not-an-email", password: "hunter22" })).status, 400);
  assert.equal((await call("POST", "/auth/upgrade", jwt, { email: email("short"), password: "123" })).status, 400);
  assert.equal((await call("POST", "/auth/upgrade", undefined, { email: email("nojwt"), password: "hunter22" })).status, 401);

  // Still a guest, still has the character, and can upgrade with a free email.
  const up = await ok<{ characterId: string }>("POST", "/auth/upgrade", jwt, { email: email("taken-ok"), password: "hunter22" });
  assert.ok(up.characterId);
});

test("a guest who saves before creating a character gets it on their account", async () => {
  const guest = await ok<{ jwt: string }>("POST", "/auth/guest");
  const up = await ok<{ jwt: string; characterId: string | null }>("POST", "/auth/upgrade", guest.jwt, {
    email: email("early"),
    password: "hunter22",
  });
  assert.equal(up.characterId, null);

  const created = await ok<{ character: Character }>("POST", "/characters", up.jwt, newCharacter("Early"));
  const login = await ok<{ characterId: string }>("POST", "/auth/login", undefined, { email: email("early"), password: "hunter22" });
  assert.equal(login.characterId, created.character.id);
});
