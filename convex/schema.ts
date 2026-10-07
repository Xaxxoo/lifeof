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

const lineStatus = v.object({
  line: v.string(),
  status: v.union(v.literal("good"), v.literal("delays"), v.literal("suspended"), v.literal("planned")),
  text: v.string(),
});

export default defineSchema({
  /**
   * M0 uses guest identity: the browser keeps a random token and sends it with every call.
   * Real auth (email code + Google) replaces this in M1.
   */
  characters: defineTable({
    token: v.string(),
    name: v.string(),
    origin: v.string(),
    status: v.string(),
    trait: v.string(),
    look: v.object({ skin: v.string(), shirt: v.string() }),
    cash: v.number(),
    needs,
    needsUpdatedAt: v.number(),
    lastSeenAt: v.number(),
  }).index("by_token", ["token"]),

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

  /** Append-only money log. requestId makes every money mutation idempotent. */
  ledger: defineTable({
    characterId: v.id("characters"),
    delta: v.number(),
    balanceAfter: v.number(),
    reason: v.string(),
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
