import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
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
import { Character } from "../entities/character.entity";
import { Presence } from "../entities/presence.entity";
import { WorldService } from "../world/world.service";
import { BankService } from "../bank/bank.service";
import { GigsService } from "../gigs/gigs.service";
import { CityService } from "../city/city.service";

const HOUR = 3_600_000;
const TRAIN_DELAY_MS = 2 * 60_000;
const PHONE_TARGET = "phone";

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

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

@Injectable()
export class PlayService {
  private pendingTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    @InjectRepository(Character) private characters: Repository<Character>,
    @InjectRepository(Presence) private presenceRepo: Repository<Presence>,
    private world: WorldService,
    private bank: BankService,
    private gigs: GigsService,
    private city: CityService,
  ) {}

  async start(token: string, target: string, actionId: string, dest?: string) {
    let c = await this.requireByToken(token);
    if (c.roomId === "work") throw new BadRequestException("You're at work");
    if (c.roomId === "transit") throw new BadRequestException("You're on the train");
    const action = ACTIONS[actionId];
    if (!action) throw new BadRequestException("Unknown action");
    const now = Date.now();

    if (c.activity) {
      await this.cancelActivity(c, now);
      c = await this.characters.findOneByOrFail({ id: c.id });
    }

    const p = await this.world.ensurePresence(c, now);
    if (!p) throw new BadRequestException("Not in a room");

    const loaded = await this.world.loadRoom(p.roomId);
    const room = loaded.room;
    const from = tileAt({ path: p.path, startedAt: Number(p.startedAt) }, now);
    let path = [from];

    if (target === PHONE_TARGET) {
      if (actionId !== "call_home") throw new BadRequestException("You can't do that from your phone");
    } else {
      const thing = loaded.interactables.get(target);
      if (!thing) throw new BadRequestException("That isn't here");
      const gigStep = c.gig && c.gig.roomId === p.roomId ? c.gig.steps[c.gig.step] : undefined;
      const isGigStop = !!gigStep && gigStep.target === target && gigStep.action === actionId;
      if (!thing.actions.includes(actionId) && !isGigStop) throw new BadRequestException("You can't do that here");

      if (target.startsWith("prop:")) {
        const prop = room.props.find((x) => `prop:${x.id}` === target);
        if (prop?.open && !openNow(prop.open, now)) throw new BadRequestException(`Closed right now. ${hoursText(prop.open)}`);
      }
      if (actionId === "talk_home") {
        const npc = room.npcs?.find((n) => `npc:${n.id}` === target);
        if (!npc?.origin || npc.origin !== c.origin) throw new BadRequestException("You're not from the same place");
      }
      const found = findPathToAny(loaded.grid, from, goalTiles(thing));
      if (!found) throw new BadRequestException("Can't get to that from here");
      path = found;
    }

    if (action.requires && skillLevel(c.skills[action.requires.key]) < action.requires.level) {
      throw new BadRequestException(`Needs ${action.requires.key} level ${action.requires.level}`);
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
      if (actionId === "go_home") travelTo = homeRoomId(c.id);
      else if (actionId === "go_out") travelTo = room.exitTo?.roomId;
      else if (actionId === "enter_venue") travelTo = room.props.find((x) => `prop:${x.id}` === target)?.enter;
      const to = travelTo ? roomDef(travelTo) : null;
      if (!to || !travelTo) throw new BadRequestException("Can't go that way");
      if (to.open && !openNow(to.open, now)) throw new BadRequestException(`${to.name} is closed. ${hoursText(to.open)}`);
    }

    if (action.kind === "ride") {
      if (!dest) throw new BadRequestException("Pick where you're going");
      const r = route(p.roomId, dest);
      if (!r) throw new BadRequestException("No train goes there from here");
      const cityState = await this.city.get();
      const late = r.lines.some((line) => {
        const s = cityState?.subway.lines.find((x) => x.line === line)?.status;
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
      if (!c.job) throw new BadRequestException("You don't have a job yet. Open Phone → Jobs");
      const career = CAREERS[c.job.careerId]!;
      if (!isOpenAt(career.hours, nycTime(now))) {
        throw new BadRequestException(`The kitchen is closed. Shifts start ${career.hours.open}:00–${career.hours.close}:00`);
      }
      const period = rentPeriodKey(now);
      const worked = c.shiftWeek.period === period ? c.shiftWeek.count : 0;
      if (c.status === "student" && worked >= STUDENT_SHIFTS_PER_WEEK) {
        throw new BadRequestException(`Student visa: max ${STUDENT_SHIFTS_PER_WEEK} shifts a week`);
      }
      const cityState = await this.city.get();
      const station = room.station?.lines ?? [];
      trainDelayed = station.some((line) => {
        const s = cityState?.subway.lines.find((x) => x.line === line)?.status;
        return s === "delays" || s === "suspended";
      });
      const needsNow = this.world.currentNeeds(c, now, cityState);
      moodMult = moodMultiplier(moodBand(computeMood(needsNow, c.moodlets, now)));
      startsAt = arrival + (trainDelayed ? TRAIN_DELAY_MS : 0);
      endsAt = startsAt + SHIFT_MINUTES * 60_000;
      status = `At work: ${career.levels[c.job.level - 1]!.title}`;
      needs = career.shiftNeeds;
    }

    if (cost) {
      await this.bank.addMoney(
        c.id,
        -cost,
        actionId === "ride_subway" ? "transit:fare" : `buy:${actionId}`,
        `act:${activityId}`,
        { label: actionId === "ride_subway" ? `Subway fare to ${roomDef(dest!)?.neighborhood}` : action.label },
      );
    }

    await this.presenceRepo.update(p.id, { path, startedAt: now, updatedAt: now });
    await this.characters.update(c.id, {
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
      this.scheduleTimer(arrival - now, () => this.board(c.id, activityId));
    }
    this.scheduleTimer(endsAt - now, () => this.complete(c.id, activityId));

    return { activityId, arrival, startsAt, endsAt, trainDelayed: !!trainDelayed };
  }

  async stop(token: string) {
    const c = await this.requireByToken(token);
    if (c.roomId === "transit") throw new BadRequestException("You're on the train. Sit tight.");
    if (c.activity) await this.cancelActivity(c, Date.now());
  }

  async board(characterId: string, activityId: string) {
    const c = await this.characters.findOneBy({ id: characterId });
    if (!c?.activity || c.activity.id !== activityId) return;
    const p = await this.world.presenceOf(characterId);
    if (p) await this.presenceRepo.delete(p.id);
    let moodlets = c.moodlets;
    if (c.activity.trainDelayed) {
      moodlets = upsertMoodlet(
        moodlets,
        { id: "train-late", label: "The train was late (for real)", value: -8, expiresAt: Date.now() + 2 * HOUR },
        Date.now(),
      );
    }
    await this.characters.update(characterId, {
      roomId: c.activity.kind === "work" ? "work" : "transit",
      moodlets,
    });
  }

  async complete(characterId: string, activityId: string) {
    const c = await this.characters.findOneBy({ id: characterId });
    if (!c?.activity || c.activity.id !== activityId) return;
    await this.finishActivity(c, Math.max(Date.now(), c.activity.endsAt), false);
  }

  async cancelActivity(c: Character, now: number) {
    await this.finishActivity(c, now, true);
  }

  async finishActivity(c: Character, now: number, early: boolean) {
    const a = c.activity;
    if (!a) return;
    const action = ACTIONS[a.actionId];
    const progress = activityProgress(a, now);
    const cityState = await this.city.get();
    let needs: Needs = this.world.currentNeeds(c, now, cityState);
    let skills: Skills = { ...c.skills };
    let moodlets: Moodlet[] = c.moodlets;
    const patch: Partial<Character> = {};

    if (a.kind === "use" && action) {
      needs = applyNeedDelta(needs, scaleDelta(a.needs, progress));
      if (action.skill) skills[action.skill.key] += Math.round(action.skill.xp * progress);
      if (action.moodlet && progress >= 0.99) {
        moodlets = upsertMoodlet(
          moodlets,
          {
            id: action.moodlet.id,
            label: action.moodlet.label,
            value: action.moodlet.value,
            expiresAt: now + action.moodlet.hours * HOUR,
          },
          now,
        );
      }
      if (a.actionId.startsWith("gig_") && progress >= 0.99 && c.gig) {
        const r = await this.gigs.advanceGig(c, now, cityState, skills, moodlets);
        skills = r.skills;
        moodlets = r.moodlets;
        patch.gig = r.gig;
        if (r.gigStats) patch.gigStats = r.gigStats;
      }
    }

    if (a.kind === "travel" && a.travelTo && now >= a.startsAt) {
      const from = roomDef(a.roomId);
      const at = a.actionId === "go_out" ? from?.exitTo?.at : undefined;
      await this.world.moveToRoom(c.id, a.travelTo, now, at);
      patch.roomId = a.travelTo;
      moodlets = this.city.arrivalMoodlets(cityState, a.travelTo, moodlets, now);
    }

    if (a.kind === "ride") {
      if (c.roomId === "transit" && a.travelTo) {
        const to = roomDef(a.travelTo);
        await this.world.moveToRoom(c.id, a.travelTo, now, to?.arrivals?.subway);
        patch.roomId = a.travelTo;
        moodlets = this.city.arrivalMoodlets(cityState, a.travelTo, moodlets, now);
      } else if (early) {
        await this.bank.addMoney(c.id, SUBWAY_FARE, "transit:refund", `refund:${a.id}`, {
          label: "Fare refund (didn't board)",
        });
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
          await this.bank.addMoney(c.id, pay, "work:shift", `shift:${a.id}`, {
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
          moodlets = upsertMoodlet(
            moodlets,
            { id: "promoted", label: `Promoted to ${next.title}!`, value: 15, expiresAt: now + 12 * HOUR },
            now,
          );
        }
        if ((a.moodMultiplier ?? 1) >= 1.2 && !early) {
          moodlets = upsertMoodlet(
            moodlets,
            { id: "employee-of-shift", label: "Employee of the shift ⭐", value: 6, expiresAt: now + 4 * HOUR },
            now,
          );
        }
        patch.job = job;
        const station = roomDef(a.roomId);
        await this.world.moveToRoom(c.id, a.roomId, now, station?.arrivals?.subway);
        patch.roomId = a.roomId;
      }
    }

    await this.characters.update(c.id, {
      ...patch,
      needs,
      needsUpdatedAt: now,
      skills,
      moodlets,
      activity: null,
    });
  }

  /** In-process timer to replace Convex scheduler. */
  private scheduleTimer(delayMs: number, fn: () => Promise<void>) {
    const id = setTimeout(async () => {
      this.pendingTimers.delete(String(id));
      try {
        await fn();
      } catch (err) {
        console.warn("scheduled timer failed", err);
      }
    }, Math.max(0, delayMs));
    this.pendingTimers.set(String(id), id);
  }

  private async requireByToken(token: string): Promise<Character> {
    const c = await this.characters.findOne({ where: { token } });
    if (!c) throw new BadRequestException("No character for this session");
    return c;
  }
}
