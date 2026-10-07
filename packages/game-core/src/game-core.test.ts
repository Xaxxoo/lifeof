import { describe, expect, it } from "vitest";
import {
  computeMood,
  decayNeeds,
  findPath,
  isOpenAt,
  moodBand,
  nycTime,
  OFFLINE_NEED_FLOOR,
  poseAt,
  startingNeeds,
  type RoomGrid,
} from "./index";

const HOUR = 3_600_000;

describe("needs", () => {
  it("decays by the per-hour rate", () => {
    const n = decayNeeds(startingNeeds(), 0, HOUR);
    expect(n.hunger).toBe(55);
    expect(n.bladder).toBe(45);
  });

  it("never drops below the offline floor while offline", () => {
    const n = decayNeeds(startingNeeds(), 0, 48 * HOUR, { offline: true });
    for (const v of Object.values(n)) expect(v).toBeGreaterThanOrEqual(OFFLINE_NEED_FLOOR);
  });

  it("clamps at zero online", () => {
    expect(decayNeeds(startingNeeds(), 0, 48 * HOUR).hunger).toBe(0);
  });

  it("maps mood to bands", () => {
    expect(moodBand(computeMood({ hunger: 90, energy: 90, hygiene: 90, bladder: 90, fun: 90, social: 90 }))).toBe(
      "Thriving",
    );
    expect(moodBand(10)).toBe("Burnt out");
  });
});

describe("pathfinding", () => {
  const grid: RoomGrid = { width: 5, height: 5, blocked: new Set(["1,0", "1,1", "1,2", "1,3"]) };

  it("routes around walls", () => {
    const path = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 });
    expect(path).not.toBeNull();
    expect(path!.at(0)).toEqual({ x: 0, y: 0 });
    expect(path!.at(-1)).toEqual({ x: 2, y: 0 });
    expect(path!.length).toBe(11);
  });

  it("returns null for blocked goals", () => {
    expect(findPath(grid, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeNull();
  });
});

describe("movement", () => {
  it("interpolates along the path deterministically", () => {
    const intent = { path: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }], startedAt: 0 };
    expect(poseAt(intent, 0).x).toBe(0);
    expect(poseAt(intent, 500).x).toBeCloseTo(1.5);
    const end = poseAt(intent, 10_000);
    expect(end.x).toBe(2);
    expect(end.moving).toBe(false);
  });
});

describe("clock", () => {
  it("reads New York time", () => {
    // 2026-10-07T16:00:00Z is 12:00 PM EDT, a Wednesday.
    const t = nycTime(Date.UTC(2026, 9, 7, 16, 0));
    expect(t.hour).toBe(12);
    expect(t.weekday).toBe(3);
  });

  it("handles opening hours past midnight", () => {
    const bar = { open: 17, close: 4 };
    expect(isOpenAt(bar, { hour: 2, minute: 0, weekday: 6, label: "" })).toBe(true);
    expect(isOpenAt(bar, { hour: 12, minute: 0, weekday: 6, label: "" })).toBe(false);
  });
});
