import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  activityProgress,
  applyNeedDelta,
  computeMood,
  findPathToAny,
  isOpenAt,
  moodBand,
  moodMultiplier,
  nycTime,
  pathDurationMs,
  rentPeriodKey,
  scaleDelta,
  skillLevel,
  tileAt,
  upsertMoodlet,
  type Moodlet,
  type Needs,
  type Skills,
} from "@nyl/game-core";
import {
  ACTIONS,
  CAREERS,
  SHIFT_MINUTES,
  STREET_ARRIVALS,
  STREET_ID,
  STUDENT_SHIFTS_PER_WEEK,
  homeRoomId,
  isHomeRoom,
  roomDef,
  sideTiles,
} from "@nyl/content";
import { addMoney, currentNeeds, ensurePresence, loadRoom, presenceOf, requireCharacter } from "./lib";

const HOUR = 3_600_000;
/** Extra commute when the real L train is delayed (compressed time). */
const TRAIN_DELAY_MS = 2 * 60_000;
/** Phone actions have no object. */
export const PHONE_TARGET = "phone";

function newActivityId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Start an action on something in the room (or on the phone). Walks there first. */
export const start = mutation({
  args: { token: v.string(), target: v.string(), actionId: v.string() },
  handler: async (ctx, { token, target, actionId }) => {
    let c = await requireCharacter(ctx, token);
    if (c.roomId === "work") throw new Error("You're at work");
    const action = ACTIONS[actionId];
    if (!action) throw new Error("Unknown action");
    const now = Date.now();
    if (c.activity) {
      await cancelActivity(ctx, c, now);
      c = (await ctx.db.get(c._id))!;
    }
    const p = await ensurePresence(ctx, c, now);
    if (!p) throw new Error("Not in a room");

    const loaded = await loadRoom(ctx, p.roomId);
    const from = tileAt({ path: p.path, startedAt: p.startedAt }, now);
    let path = [from];
    if (target !== PHONE_TARGET) {
      const thing = loaded.interactables.get(target);
      if (!thing || !thing.actions.includes(actionId)) throw new Error("You can't do that here");
      const found = findPathToAny(loaded.grid, from, sideTiles(thing.tiles));
      if (!found) throw new Error("Can't get to that from here");
      path = found;
    } else if (actionId !== "call_home") {
      throw new Error("You can't do that from your phone");
    }

    const activityId = newActivityId();
    const arrival = now + pathDurationMs(path);
    let startsAt = arrival;
    let endsAt = arrival + action.durationMs;
    let travelTo: string | undefined;
    let moodMult: number | undefined;
    let trainDelayed: boolean | undefined;
    let status = action.status;
    let needs = action.needs;

    if (action.kind === "travel") {
      if (actionId === "go_home") travelTo = homeRoomId(c._id);
      else if (actionId === "go_out") travelTo = STREET_ID;
      else throw new Error("Unknown destination");
    }

    if (action.kind === "work") {
      if (!c.job) throw new Error("You don't have a job yet. Open Phone → Jobs");
      const career = CAREERS[c.job.careerId]!;
      if (!isOpenAt(career.hours, nycTime(now))) {
        throw new Error(`The kitchen is closed. Shifts start ${career.hours.open}:00–${career.hours.close}:00`);
      }
      const period = rentPeriodKey(now);
      const worked = c.shiftWeek.period === period ? c.shiftWeek.count : 0;
      if (c.status === "student" && worked >= STUDENT_SHIFTS_PER_WEEK) {
        throw new Error(`Student visa: max ${STUDENT_SHIFTS_PER_WEEK} shifts a week`);
      }
      const city = await ctx.db
        .query("cityState")
        .withIndex("by_key", (q) => q.eq("key", "nyc"))
        .unique();
      const l = city?.subway.lines.find((x) => x.line === "L");
      trainDelayed = !!l && l.status !== "good" && l.status !== "planned";
      const needsNow = currentNeeds(c, now);
      moodMult = moodMultiplier(moodBand(computeMood(needsNow, c.moodlets, now)));
      startsAt = arrival + (trainDelayed ? TRAIN_DELAY_MS : 0);
      endsAt = startsAt + SHIFT_MINUTES * 60_000;
      status = `At work: ${career.levels[c.job.level - 1]!.title}`;
      needs = career.shiftNeeds;
    }

    if (action.cost) {
      await addMoney(ctx, c._id, -action.cost, `buy:${actionId}`, `act:${activityId}`, { label: action.label });
    }

    await ctx.db.patch(p._id, { path, startedAt: now, updatedAt: now });
    await ctx.db.patch(c._id, {
      lastSeenAt: now,
      activity: {
        id: activityId,
        actionId,
        kind: action.kind,
        roomId: p.roomId,
        target,
        startsAt,
        endsAt,
        needs,
        pose: action.pose,
        status,
        travelTo,
        moodMultiplier: moodMult,
        trainDelayed,
      },
    });

    if (action.kind === "work") {
      await ctx.scheduler.runAt(arrival, internal.play.clockIn, { characterId: c._id, activityId });
    }
    await ctx.scheduler.runAt(endsAt, internal.play.complete, { characterId: c._id, activityId });
    return { activityId, arrival, startsAt, endsAt, trainDelayed: !!trainDelayed };
  },
});

/** Stop what you're doing. Timed actions pay the share done; leaving a shift early pays a bit less. */
export const stop = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const c = await requireCharacter(ctx, token);
    if (c.activity) await cancelActivity(ctx, c, Date.now());
  },
});

/** Arrived at the subway: the character leaves the map for the length of the shift. */
export const clockIn = internalMutation({
  args: { characterId: v.id("characters"), activityId: v.string() },
  handler: async (ctx, { characterId, activityId }) => {
    const c = await ctx.db.get(characterId);
    if (!c?.activity || c.activity.id !== activityId) return;
    const p = await presenceOf(ctx, characterId);
    if (p) await ctx.db.delete(p._id);
    let moodlets = c.moodlets;
    if (c.activity.trainDelayed) {
      moodlets = upsertMoodlet(moodlets, { id: "l-late", label: "The L was late (for real)", value: -8, expiresAt: Date.now() + 2 * HOUR }, Date.now());
    }
    await ctx.db.patch(characterId, { roomId: "work", moodlets });
  },
});

export const complete = internalMutation({
  args: { characterId: v.id("characters"), activityId: v.string() },
  handler: async (ctx, { characterId, activityId }) => {
    const c = await ctx.db.get(characterId);
    if (!c?.activity || c.activity.id !== activityId) return;
    await finishActivity(ctx, c, Math.max(Date.now(), c.activity.endsAt), false);
  },
});

/** Ends the current activity early (walked away, started something else, or tapped Stop). */
export async function cancelActivity(ctx: MutationCtx, c: Doc<"characters">, now: number) {
  await finishActivity(ctx, c, now, true);
}

async function finishActivity(ctx: MutationCtx, c: Doc<"characters">, now: number, early: boolean) {
  const a = c.activity;
  if (!a) return;
  const action = ACTIONS[a.actionId];
  const progress = activityProgress(a, now);
  let needs: Needs = currentNeeds(c, now);
  let skills: Skills = { ...c.skills };
  let moodlets: Moodlet[] = c.moodlets;
  const patch: Partial<Doc<"characters">> = {};

  if (a.kind === "use" && action) {
    needs = applyNeedDelta(needs, scaleDelta(a.needs, progress));
    if (action.skill) skills[action.skill.key] += Math.round(action.skill.xp * progress);
    if (action.moodlet && progress >= 0.99) {
      moodlets = upsertMoodlet(moodlets, { id: action.moodlet.id, label: action.moodlet.label, value: action.moodlet.value, expiresAt: now + action.moodlet.hours * HOUR }, now);
    }
  }

  if (a.kind === "travel" && a.travelTo && now >= a.startsAt) {
    await moveToRoom(ctx, c._id, a.travelTo, a.roomId, now);
    patch.roomId = a.travelTo;
  }

  if (a.kind === "work") {
    const clockedIn = c.roomId === "work";
    if (clockedIn && c.job) {
      const career = CAREERS[c.job.careerId]!;
      const level = career.levels[c.job.level - 1]!;
      needs = applyNeedDelta(needs, scaleDelta(a.needs, progress));
      skills[career.skill] += Math.round(career.skillXpPerShift * progress);
      const pay = Math.round(level.payPerShift * (a.moodMultiplier ?? 1) * progress * (early ? 0.9 : 1));
      if (pay > 0) {
        await addMoney(ctx, c._id, pay, "work:shift", `shift:${a.id}`, {
          label: `${early ? "Partial shift" : "Shift"} as ${level.title}`,
        });
      }
      let job = { ...c.job };
      const period = rentPeriodKey(now);
      const counts = progress >= 0.5;
      if (counts) {
        job = { ...job, shiftsAtLevel: job.shiftsAtLevel + 1, totalShifts: job.totalShifts + 1 };
        patch.shiftWeek = { period, count: (c.shiftWeek.period === period ? c.shiftWeek.count : 0) + 1 };
      }
      const next = career.levels[job.level];
      if (counts && next && job.shiftsAtLevel >= next.shiftsAtPrevLevel && skillLevel(skills[career.skill]) >= next.cookingLevel) {
        job = { ...job, level: job.level + 1, shiftsAtLevel: 0 };
        moodlets = upsertMoodlet(moodlets, { id: "promoted", label: `Promoted to ${next.title}!`, value: 15, expiresAt: now + 12 * HOUR }, now);
      }
      if ((a.moodMultiplier ?? 1) >= 1.2 && !early) {
        moodlets = upsertMoodlet(moodlets, { id: "employee-of-shift", label: "Employee of the shift ⭐", value: 6, expiresAt: now + 4 * HOUR }, now);
      }
      patch.job = job;
      // Back on the street by the subway.
      await moveToRoom(ctx, c._id, STREET_ID, null, now, STREET_ARRIVALS.subway);
      patch.roomId = STREET_ID;
    }
    // Cancelled while still walking to the train: nothing happens.
  }

  await ctx.db.patch(c._id, {
    ...patch,
    needs,
    needsUpdatedAt: now,
    skills,
    moodlets,
    activity: undefined,
  });
}

async function moveToRoom(
  ctx: MutationCtx,
  characterId: Id<"characters">,
  toRoomId: string,
  fromRoomId: string | null,
  now: number,
  at?: { x: number; y: number },
) {
  const to = roomDef(toRoomId);
  if (!to) return;
  const spawn = at ?? (toRoomId === STREET_ID && fromRoomId && isHomeRoom(fromRoomId) ? STREET_ARRIVALS.home : to.spawn);
  const p = await presenceOf(ctx, characterId);
  if (p) await ctx.db.patch(p._id, { roomId: toRoomId, path: [spawn], startedAt: now, updatedAt: now });
  else await ctx.db.insert("presence", { characterId, roomId: toRoomId, path: [spawn], startedAt: now, updatedAt: now });
}
