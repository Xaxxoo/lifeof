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
  DELAY_CAP,
  SHIFT_MINUTES,
  STUDENT_SHIFTS_PER_WEEK,
  SUBWAY_FARE,
  SUBWAY_MOMENTS,
  goalTiles,
  homeRoomId,
  roomDef,
  route,
  type OpenHours,
} from "@nyl/content";
import { addMoney, currentNeeds, ensurePresence, getCity, loadRoom, presenceOf, requireCharacter } from "./lib";
import { advanceGig } from "./gigs";
import { arrivalMoodlets } from "./city";

const HOUR = 3_600_000;
/** Extra commute when the real L train is delayed (compressed time). */
const TRAIN_DELAY_MS = 2 * 60_000;
/** Phone actions have no object. */
export const PHONE_TARGET = "phone";

function newActivityId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function openNow(open: OpenHours | undefined, now: number) {
  if (!open) return true;
  const t = nycTime(now);
  if (open.days && !open.days.includes(t.weekday)) return false;
  return isOpenAt(open, t);
}

function hoursText(open: OpenHours) {
  const h = (n: number) => (n === 0 ? "midnight" : n === 12 ? "noon" : n < 12 ? `${n} AM` : `${n - 12} PM`);
  return `Open ${h(open.open)}–${h(open.close)}`;
}

/** Start an action on something in the room (or on the phone). Walks there first. */
export const start = mutation({
  args: { token: v.string(), target: v.string(), actionId: v.string(), dest: v.optional(v.string()) },
  handler: async (ctx, { token, target, actionId, dest }) => {
    let c = await requireCharacter(ctx, token);
    if (c.roomId === "work") throw new Error("You're at work");
    if (c.roomId === "transit") throw new Error("You're on the train");
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
    const room = loaded.room;
    const from = tileAt({ path: p.path, startedAt: p.startedAt }, now);
    let path = [from];

    if (target === PHONE_TARGET) {
      if (actionId !== "call_home") throw new Error("You can't do that from your phone");
    } else {
      const thing = loaded.interactables.get(target);
      if (!thing) throw new Error("That isn't here");
      const gigStep = c.gig && c.gig.roomId === p.roomId ? c.gig.steps[c.gig.step] : undefined;
      const isGigStop = !!gigStep && gigStep.target === target && gigStep.action === actionId;
      if (!thing.actions.includes(actionId) && !isGigStop) throw new Error("You can't do that here");

      if (target.startsWith("prop:")) {
        const prop = room.props.find((x) => `prop:${x.id}` === target);
        if (prop?.open && !openNow(prop.open, now)) throw new Error(`Closed right now. ${hoursText(prop.open)}`);
      }
      if (actionId === "talk_home") {
        const npc = room.npcs?.find((n) => `npc:${n.id}` === target);
        if (!npc?.origin || npc.origin !== c.origin) throw new Error("You're not from the same place");
      }
      const found = findPathToAny(loaded.grid, from, goalTiles(thing));
      if (!found) throw new Error("Can't get to that from here");
      path = found;
    }

    if (action.requires && skillLevel(c.skills[action.requires.key]) < action.requires.level) {
      throw new Error(`Needs ${action.requires.key} level ${action.requires.level}`);
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
    let rideMoment: string | undefined;
    let rideLines: string[] | undefined;
    let cost = action.cost ?? 0;

    if (action.kind === "travel") {
      if (actionId === "go_home") travelTo = homeRoomId(c._id);
      else if (actionId === "go_out") travelTo = room.exitTo?.roomId;
      else if (actionId === "enter_venue") travelTo = room.props.find((x) => `prop:${x.id}` === target)?.enter;
      const to = travelTo ? roomDef(travelTo) : null;
      if (!to || !travelTo) throw new Error("Can't go that way");
      if (to.open && !openNow(to.open, now)) throw new Error(`${to.name} is closed. ${hoursText(to.open)}`);
    }

    if (action.kind === "ride") {
      if (!dest) throw new Error("Pick where you're going");
      const r = route(p.roomId, dest);
      if (!r) throw new Error("No train goes there from here");
      const city = await getCity(ctx);
      const late = r.lines.some((line) => {
        const s = city?.subway.lines.find((x) => x.line === line)?.status;
        return s === "delays" || s === "suspended";
      });
      trainDelayed = late;
      rideLines = r.lines;
      travelTo = dest;
      cost = SUBWAY_FARE;
      const moment = SUBWAY_MOMENTS[Math.abs(hash(activityId)) % SUBWAY_MOMENTS.length]!;
      rideMoment = moment.id;
      endsAt = startsAt + Math.round(r.baseMs * (late ? 1 + DELAY_CAP : 1));
      status = `On the ${r.lines.join(" → ")} train 🚇`;
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
      const city = await getCity(ctx);
      const station = room.station?.lines ?? [];
      trainDelayed = station.some((line) => {
        const s = city?.subway.lines.find((x) => x.line === line)?.status;
        return s === "delays" || s === "suspended";
      });
      const needsNow = currentNeeds(c, now, city);
      moodMult = moodMultiplier(moodBand(computeMood(needsNow, c.moodlets, now)));
      startsAt = arrival + (trainDelayed ? TRAIN_DELAY_MS : 0);
      endsAt = startsAt + SHIFT_MINUTES * 60_000;
      status = `At work: ${career.levels[c.job.level - 1]!.title}`;
      needs = career.shiftNeeds;
    }

    if (cost) {
      await addMoney(ctx, c._id, -cost, actionId === "ride_subway" ? "transit:fare" : `buy:${actionId}`, `act:${activityId}`, {
        label: actionId === "ride_subway" ? `Subway fare to ${roomDef(dest!)?.neighborhood}` : action.label,
      });
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
        rideMoment,
        rideLines,
      },
    });

    if (action.kind === "work" || action.kind === "ride") {
      await ctx.scheduler.runAt(arrival, internal.play.board, { characterId: c._id, activityId });
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
    if (c.roomId === "transit") throw new Error("You're on the train. Sit tight.");
    if (c.activity) await cancelActivity(ctx, c, Date.now());
  },
});

/** Reached the station (or the train to work): the character leaves the map. */
export const board = internalMutation({
  args: { characterId: v.id("characters"), activityId: v.string() },
  handler: async (ctx, { characterId, activityId }) => {
    const c = await ctx.db.get(characterId);
    if (!c?.activity || c.activity.id !== activityId) return;
    const p = await presenceOf(ctx, characterId);
    if (p) await ctx.db.delete(p._id);
    let moodlets = c.moodlets;
    if (c.activity.trainDelayed) {
      moodlets = upsertMoodlet(
        moodlets,
        { id: "train-late", label: "The train was late (for real)", value: -8, expiresAt: Date.now() + 2 * HOUR },
        Date.now(),
      );
    }
    await ctx.db.patch(characterId, { roomId: c.activity.kind === "work" ? "work" : "transit", moodlets });
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
  const city = await getCity(ctx);
  let needs: Needs = currentNeeds(c, now, city);
  let skills: Skills = { ...c.skills };
  let moodlets: Moodlet[] = c.moodlets;
  const patch: Partial<Doc<"characters">> = {};

  if (a.kind === "use" && action) {
    needs = applyNeedDelta(needs, scaleDelta(a.needs, progress));
    if (action.skill) skills[action.skill.key] += Math.round(action.skill.xp * progress);
    if (action.moodlet && progress >= 0.99) {
      moodlets = upsertMoodlet(moodlets, { id: action.moodlet.id, label: action.moodlet.label, value: action.moodlet.value, expiresAt: now + action.moodlet.hours * HOUR }, now);
    }
    if (a.actionId.startsWith("gig_") && progress >= 0.99 && c.gig) {
      const r = await advanceGig(ctx, c, now, city, skills, moodlets);
      skills = r.skills;
      moodlets = r.moodlets;
      patch.gig = r.gig;
      if (r.gigStats) patch.gigStats = r.gigStats;
    }
  }

  if (a.kind === "travel" && a.travelTo && now >= a.startsAt) {
    const from = roomDef(a.roomId);
    const at = a.actionId === "go_out" ? from?.exitTo?.at : undefined;
    await moveToRoom(ctx, c._id, a.travelTo, now, at);
    patch.roomId = a.travelTo;
    moodlets = arrivalMoodlets(city, a.travelTo, moodlets, now);
  }

  if (a.kind === "ride") {
    if (c.roomId === "transit" && a.travelTo) {
      const to = roomDef(a.travelTo);
      await moveToRoom(ctx, c._id, a.travelTo, now, to?.arrivals?.subway);
      patch.roomId = a.travelTo;
      moodlets = arrivalMoodlets(city, a.travelTo, moodlets, now);
    } else if (early) {
      // Walked away before reaching the platform: refund the fare.
      await addMoney(ctx, c._id, SUBWAY_FARE, "transit:refund", `refund:${a.id}`, { label: "Fare refund (didn't board)" });
    }
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
      // Back where you got on the train.
      const station = roomDef(a.roomId);
      await moveToRoom(ctx, c._id, a.roomId, now, station?.arrivals?.subway);
      patch.roomId = a.roomId;
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

async function moveToRoom(ctx: MutationCtx, characterId: Id<"characters">, toRoomId: string, now: number, at?: { x: number; y: number }) {
  const to = roomDef(toRoomId);
  if (!to) return;
  const spawn = at ?? to.spawn;
  const p = await presenceOf(ctx, characterId);
  if (p) await ctx.db.patch(p._id, { roomId: toRoomId, path: [spawn], startedAt: now, updatedAt: now });
  else await ctx.db.insert("presence", { characterId, roomId: toRoomId, path: [spawn], startedAt: now, updatedAt: now });
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
