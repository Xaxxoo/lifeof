import { describe, expect, it } from "vitest";
import { findPathToAny, footprintTiles, isWalkable } from "@nyl/game-core";
import {
  ACTIONS,
  BASEMENT_STARTER,
  GIGS,
  HOME_TIERS,
  ITEM_BY_ID,
  ITEMS,
  LOTS,
  ROOMS,
  SHOPS,
  STREETS,
  VENUES,
  buildRoomLayout,
  emptyLotLayout,
  goalTiles,
  homeRoomDef,
  roomDef,
  route,
} from "./index";

const homes = [
  ...HOME_TIERS.map((t) => homeRoomDef(`home:${t.id}`, { id: t.id, kind: "rental", defId: t.id, layout: t.layout })),
  ...LOTS.map((l) => homeRoomDef(`home:${l.id}`, { id: l.id, kind: "lot", defId: l.id, layout: emptyLotLayout(l) })),
];
const all = [...STREETS, ...VENUES, ...SHOPS, ...homes];

describe("rooms", () => {
  for (const room of all) {
    describe(room.id, () => {
      const objects = room.id === "home:basement" ? BASEMENT_STARTER.map((s, i) => ({ _id: `o${i}`, ...s })) : [];
      const { grid, interactables } = buildRoomLayout(room, objects);

      it("keeps props in bounds and solid props apart", () => {
        const seen = new Map<string, string>();
        for (const p of room.props) {
          for (const t of footprintTiles(p.x, p.y, p.w, p.h)) {
            expect(t.x >= 0 && t.y >= 0 && t.x < room.width && t.y < room.height, `${p.id} out of bounds`).toBe(true);
            if (p.walkable) continue;
            const k = `${t.x},${t.y}`;
            expect(seen.get(k), `${p.id} overlaps ${seen.get(k)} at ${k}`).toBeUndefined();
            seen.set(k, p.id);
          }
        }
      });

      it("puts spawn and arrivals on walkable tiles", () => {
        expect(isWalkable(grid, room.spawn)).toBe(true);
        for (const a of Object.values(room.arrivals ?? {})) if (a) expect(isWalkable(grid, a), JSON.stringify(a)).toBe(true);
      });

      it("only uses actions that exist", () => {
        for (const p of room.props) for (const a of p.actions ?? []) expect(ACTIONS[a], `${p.id}: ${a}`).toBeDefined();
      });

      it("can reach everything you can tap from spawn", () => {
        for (const thing of interactables.values()) {
          if (!thing.actions.length && !thing.tags?.length) continue;
          expect(findPathToAny(grid, room.spawn, goalTiles(thing)), `${thing.key} unreachable`).not.toBeNull();
        }
      });

      it("leaves no tile walled off", () => {
        if (!room.home) return;
        for (let x = 1; x < room.width; x++) {
          for (let y = 0; y < room.height; y++) {
            if (!grid.blocked.has(`${x},${y}`)) expect(findPathToAny(grid, room.spawn, [{ x, y }]), `${x},${y}`).not.toBeNull();
          }
        }
      });

      it("links doors both ways", () => {
        for (const p of room.props) if (p.enter) expect(roomDef(p.enter)?.exitTo?.roomId).toBe(room.id);
        if (room.exitTo) {
          const out = ROOMS[room.exitTo.roomId];
          expect(out).toBeDefined();
          const outGrid = buildRoomLayout(out!, []).grid;
          expect(isWalkable(outGrid, room.exitTo.at), `${room.id} exits onto a blocked tile`).toBe(true);
        }
      });

      it("keeps NPCs in bounds", () => {
        for (const n of room.npcs ?? []) {
          for (const t of [{ x: n.x, y: n.y }, ...(n.patrol ?? [])]) {
            expect(t.x >= 0 && t.y >= 0 && t.x < room.width && t.y < room.height, `${n.id}`).toBe(true);
          }
        }
      });
    });
  }
});

describe("subway", () => {
  it("connects every station to every other", () => {
    const stations = STREETS.filter((s) => s.station);
    for (const a of stations) for (const b of stations) if (a !== b) expect(route(a.id, b.id), `${a.id}→${b.id}`).not.toBeNull();
  });
});

describe("gigs and items", () => {
  it("reference real actions and items", () => {
    for (const g of GIGS) for (const s of g.stops) expect(ACTIONS[s.action]).toBeDefined();
    for (const s of BASEMENT_STARTER) expect(ITEM_BY_ID[s.itemId]).toBeDefined();
    for (const item of ITEMS) for (const a of item.actions) expect(ACTIONS[a], `${item.id}: ${a}`).toBeDefined();
  });
});
