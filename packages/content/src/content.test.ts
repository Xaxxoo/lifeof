import { describe, expect, it } from "vitest";
import { findPathToAny, footprintTiles, isWalkable } from "@nyl/game-core";
import {
  ACTIONS,
  BASEMENT_STARTER,
  GIGS,
  HOME_TIERS,
  ITEM_BY_ID,
  ITEMS,
  LAUNCH_HUNTS,
  LOTS,
  PLACES,
  ROOMS,
  SHOPS,
  STREETS,
  VENUES,
  baseRoomId,
  instanceNumber,
  instanceRoomId,
  isInstanceable,
  buildRoomLayout,
  emptyLotLayout,
  goalTiles,
  homeRoomDef,
  huntProblems,
  placeAt,
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

  it("new gigs have stop tags that exist on at least one street", () => {
    const allTags = new Set<string>();
    for (const s of STREETS) for (const p of s.props) for (const t of p.tags ?? []) allTags.add(t);
    for (const g of GIGS) {
      for (const stop of g.stops) {
        const found = stop.tags.some((t) => allTags.has(t));
        expect(found, `${g.id} stop "${stop.label}" needs tags [${stop.tags}] but none exist on streets`).toBe(true);
      }
    }
  });

  it("gig_vend and gig_flip actions exist", () => {
    expect(ACTIONS["gig_vend"]).toBeDefined();
    expect(ACTIONS["gig_flip"]).toBeDefined();
  });
});

describe("baseRoomId", () => {
  it("strips instance suffix from venue rooms", () => {
    expect(baseRoomId("venue:warehouse:1")).toBe("venue:warehouse");
    expect(baseRoomId("venue:warehouse:9")).toBe("venue:warehouse");
  });

  it("leaves base venue rooms unchanged", () => {
    expect(baseRoomId("venue:warehouse")).toBe("venue:warehouse");
    expect(baseRoomId("venue:cafe")).toBe("venue:cafe");
  });

  it("leaves streets unchanged", () => {
    expect(baseRoomId("crown-heights")).toBe("crown-heights");
    expect(baseRoomId("bushwick-block")).toBe("bushwick-block");
  });

  it("leaves home rooms unchanged", () => {
    expect(baseRoomId("home:abc123")).toBe("home:abc123");
  });

  it("leaves shop rooms unchanged", () => {
    expect(baseRoomId("shop:crown-heights:patty")).toBe("shop:crown-heights:patty");
  });
});

describe("places", () => {
  it("point at a tappable, reachable prop on a real block", () => {
    for (const place of PLACES) {
      const room = ROOMS[place.roomId];
      expect(room, place.id).toBeDefined();
      const { grid, interactables } = buildRoomLayout(room!, []);
      const thing = interactables.get(place.target);
      expect(thing, `${place.id}: ${place.target}`).toBeDefined();
      expect(findPathToAny(grid, room!.spawn, goalTiles(thing!)), `${place.id} unreachable`).not.toBeNull();
    }
  });

  it("have unique ids and one place per prop", () => {
    expect(new Set(PLACES.map((p) => p.id)).size).toBe(PLACES.length);
    expect(new Set(PLACES.map((p) => `${p.roomId}/${p.target}`)).size).toBe(PLACES.length);
  });

  it("resolve from a tapped prop", () => {
    expect(placeAt("dumbo", "prop:pizza")?.id).toBe("grimaldis");
    expect(placeAt("dumbo", "prop:bench")).toBeUndefined();
  });
});

describe("hunts", () => {
  it("launch campaigns are valid", () => {
    for (const h of LAUNCH_HUNTS) expect(huntProblems(h), h.id).toEqual([]);
  });

  it("rejects broken campaigns", () => {
    const good = LAUNCH_HUNTS[0]!;
    expect(huntProblems({ ...good, id: "Bad Id!" })).not.toEqual([]);
    expect(huntProblems({ ...good, steps: [{ placeId: "nowhere", clue: "?" }] })).not.toEqual([]);
    expect(huntProblems({ ...good, steps: [good.steps[0]!, good.steps[0]!] })).not.toEqual([]);
    expect(huntProblems({ ...good, supply: 0 })).not.toEqual([]);
    expect(huntProblems({ ...good, endsAt: good.startsAt })).not.toEqual([]);
    expect(huntProblems({ ...good, prize: { cash: 10, stellar: { asset: "XLM", amount: "-1" } } })).not.toEqual([]);
  });

  it("memo for the last finisher fits in 28 bytes", () => {
    for (const h of LAUNCH_HUNTS) expect(`hunt:${h.id}#${h.supply}`.length).toBeLessThanOrEqual(28);
  });
});

describe("room instances", () => {
  it("strips multi-digit instance numbers and works for shops", () => {
    expect(baseRoomId("crown-heights:12")).toBe("crown-heights");
    expect(baseRoomId("venue:warehouse:140")).toBe("venue:warehouse");
    expect(baseRoomId("shop:crown-heights:patty:3")).toBe("shop:crown-heights:patty");
  });

  it("numbers instances from 1, which is the plain room id", () => {
    expect(instanceRoomId("crown-heights", 1)).toBe("crown-heights");
    expect(instanceRoomId("crown-heights", 7)).toBe("crown-heights:7");
    expect(instanceNumber("crown-heights")).toBe(1);
    expect(instanceNumber("crown-heights:7")).toBe(7);
    expect(instanceNumber("shop:crown-heights:patty:3")).toBe(3);
    for (const n of [1, 2, 25]) expect(instanceNumber(instanceRoomId("venue:warehouse", n))).toBe(n);
  });

  it("instances streets, parks, venues and shops but never homes or unknown rooms", () => {
    expect(isInstanceable("crown-heights")).toBe(true);
    expect(isInstanceable("crown-heights:4")).toBe(true);
    expect(isInstanceable("prospect-park")).toBe(true);
    expect(isInstanceable("venue:warehouse")).toBe(true);
    expect(isInstanceable("shop:crown-heights:patty")).toBe(true);
    expect(isInstanceable("home:abc123")).toBe(false);
    expect(isInstanceable("work")).toBe(false);
    expect(isInstanceable("transit")).toBe(false);
    expect(isInstanceable("nowhere:2")).toBe(false);
  });

  it("gives an instance its base room's layout", () => {
    expect(roomDef("crown-heights:3")).toBe(roomDef("crown-heights"));
    expect(roomDef("venue:warehouse:2")?.id).toBe("venue:warehouse");
  });
});
