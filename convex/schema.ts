import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const tile = v.object({ x: v.number(), y: v.number() });

export const needs = v.object({
  hunger: v.number(),
  energy: v.number(),
  hygiene: v.number(),
  bladder: v.number(),
  fun: v.number(),
  social: v.number(),
});

export const partialNeeds = v.object({
  hunger: v.optional(v.number()),
  energy: v.optional(v.number()),
  hygiene: v.optional(v.number()),
  bladder: v.optional(v.number()),
  fun: v.optional(v.number()),
  social: v.optional(v.number()),
});

export const skills = v.object({
  cooking: v.number(),
  charisma: v.number(),
  fitness: v.number(),
  coding: v.number(),
  creativity: v.number(),
  hustle: v.number(),
});

export const look = v.object({
  skin: v.string(),
  shirt: v.string(),
  pants: v.string(),
  hair: v.string(),
  hairColor: v.string(),
});

export const moodlet = v.object({ id: v.string(), label: v.string(), value: v.number(), expiresAt: v.number() });

/** What a character is doing right now. Walking happens first; the action runs from startsAt to endsAt. */
export const activity = v.object({
  id: v.string(),
  actionId: v.string(),
  kind: v.union(v.literal("use"), v.literal("travel"), v.literal("work")),
  roomId: v.string(),
  target: v.string(),
  startsAt: v.number(),
  endsAt: v.number(),
  needs: v.optional(partialNeeds),
  pose: v.optional(v.union(v.literal("stand"), v.literal("sit"), v.literal("sleep"))),
  status: v.string(),
  travelTo: v.optional(v.string()),
  /** Work only: mood multiplier at clock-in and whether the real L delay excused a late start. */
  moodMultiplier: v.optional(v.number()),
  trainDelayed: v.optional(v.boolean()),
});

const lineStatus = v.object({
  line: v.string(),
  status: v.union(v.literal("good"), v.literal("delays"), v.literal("suspended"), v.literal("planned")),
  text: v.string(),
});

export default defineSchema({
  /**
   * Guest identity for now: the browser keeps a random token and sends it with every call.
   * Real auth (email code + Google) replaces this before beta.
   */
  characters: defineTable({
    token: v.string(),
    name: v.string(),
    origin: v.string(),
    status: v.string(),
    trait: v.string(),
    look,
    cash: v.number(),
    needs,
    needsUpdatedAt: v.number(),
    lastSeenAt: v.number(),
    skills,
    moodlets: v.array(moodlet),
    /** Where the character is: a room id, or "work" during a shift. */
    roomId: v.string(),
    activity: v.optional(activity),
    job: v.optional(
      v.object({ careerId: v.string(), level: v.number(), shiftsAtLevel: v.number(), totalShifts: v.number() }),
    ),
    /** Shifts worked in the current rent period (student visa cap). */
    shiftWeek: v.object({ period: v.string(), count: v.number() }),
    autopilotDay: v.optional(v.string()),
    rent: v.object({ perWeek: v.number(), lastPeriod: v.string(), owed: v.number(), missedWeeks: v.number() }),
  })
    .index("by_token", ["token"])
    .index("by_last_seen", ["lastSeenAt"]),

  /** One row per online character. Movement is synced as a path + start time, never per-frame positions. */
  presence: defineTable({
    characterId: v.id("characters"),
    roomId: v.string(),
    path: v.array(tile),
    startedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_character", ["characterId"])
    .index("by_room", ["roomId"])
    .index("by_updated", ["updatedAt"]),

  /** Placed furniture. Rotation is in 90° steps (0–3). */
  objects: defineTable({
    roomId: v.string(),
    itemId: v.string(),
    x: v.number(),
    y: v.number(),
    rot: v.number(),
    /** Price paid, so selling refunds the right amount. Starter items are 0. */
    paid: v.number(),
  }).index("by_room", ["roomId"]),

  /** Append-only money log. requestId makes every money change idempotent. */
  ledger: defineTable({
    characterId: v.id("characters"),
    delta: v.number(),
    balanceAfter: v.number(),
    reason: v.string(),
    label: v.optional(v.string()),
    requestId: v.string(),
  })
    .index("by_character", ["characterId"])
    .index("by_request", ["requestId"]),

  messages: defineTable({
    roomId: v.string(),
    characterId: v.id("characters"),
    name: v.string(),
    body: v.string(),
  }).index("by_room", ["roomId"]),

  /** One document (key "nyc") that every client subscribes to. */
  cityState: defineTable({
    key: v.string(),
    subway: v.object({
      lines: v.array(lineStatus),
      source: v.union(v.literal("live"), v.literal("simulated")),
      updatedAt: v.number(),
      lastLiveAt: v.number(),
    }),
    weather: v.object({
      tempF: v.number(),
      summary: v.string(),
      precipChance: v.number(),
      alerts: v.array(v.string()),
      source: v.union(v.literal("live"), v.literal("simulated")),
      updatedAt: v.number(),
      lastLiveAt: v.number(),
    }),
    blockEvents: v.object({
      items: v.array(v.object({ type: v.string(), count: v.number() })),
      source: v.union(v.literal("live"), v.literal("simulated")),
      updatedAt: v.number(),
      lastLiveAt: v.number(),
    }),
  }).index("by_key", ["key"]),
});
