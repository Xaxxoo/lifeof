import { edgeKey, footprintTiles, type Tile } from "@nyl/game-core";
import { BUILD_PRICES, BUILD_REFUND_RATE, wallEdges, type HomeLayout, type WallSeg } from "@nyl/content";
import type { BuildOp } from "./types";

export type BuildTool = "wall" | "door" | "window" | "floor" | "erase";

/** The tile edge nearest a point on the floor. */
export function nearestEdge(px: number, pz: number): { x: number; y: number; side: "n" | "w"; dist: number } {
  const x = Math.floor(px);
  const y = Math.floor(pz);
  const fx = px - x;
  const fz = pz - y;
  const options = [
    { x, y, side: "n" as const, dist: fz },
    { x, y: y + 1, side: "n" as const, dist: 1 - fz },
    { x, y, side: "w" as const, dist: fx },
    { x: x + 1, y, side: "w" as const, dist: 1 - fx },
  ];
  return options.reduce((a, b) => (b.dist < a.dist ? b : a));
}

/** Wall segments along a straight run between two grid corners (whichever axis you dragged further on). */
export function wallRun(a: { x: number; z: number }, b: { x: number; z: number }, kind: WallSeg["kind"]): WallSeg[] {
  const ax = Math.round(a.x);
  const az = Math.round(a.z);
  const bx = Math.round(b.x);
  const bz = Math.round(b.z);
  const out: WallSeg[] = [];
  if (Math.abs(bx - ax) >= Math.abs(bz - az)) {
    for (let x = Math.min(ax, bx); x < Math.max(ax, bx); x++) out.push({ x, y: az, side: "n", kind });
  } else {
    for (let y = Math.min(az, bz); y < Math.max(az, bz); y++) out.push({ x: ax, y, side: "w", kind });
  }
  return out;
}

export function inLot(l: HomeLayout, s: { x: number; y: number; side: "n" | "w" }) {
  if (s.side === "n") return s.x >= 0 && s.x < l.width && s.y >= 0 && s.y <= l.height;
  return s.x >= 0 && s.x <= l.width && s.y >= 0 && s.y < l.height;
}

const segKey = (s: { x: number; y: number; side: string }) => `${s.x},${s.y},${s.side}`;

/** The layout as it would look with these ops applied, plus what it costs (net of refunds). */
export function applyOps(layout: HomeLayout, ops: BuildOp[]): { layout: HomeLayout; cost: number } {
  const walls = new Map(layout.walls.map((w) => [segKey(w), w]));
  const floors = { ...layout.floors };
  const gate = `0,${layout.height - 2},w`;
  let cost = 0;
  for (const o of ops) {
    if (o.op === "add") {
      if (!inLot(layout, o.seg) || segKey(o.seg) === gate) continue;
      const old = walls.get(segKey(o.seg));
      if (old?.kind === o.seg.kind) continue;
      if (old) cost -= BUILD_PRICES[old.kind] * BUILD_REFUND_RATE;
      cost += BUILD_PRICES[o.seg.kind];
      walls.set(segKey(o.seg), o.seg);
    } else if (o.op === "remove") {
      const old = walls.get(segKey(o));
      if (!old) continue;
      cost -= BUILD_PRICES[old.kind] * BUILD_REFUND_RATE;
      walls.delete(segKey(o));
    } else {
      const k = `${o.x},${o.y}`;
      if (o.floorId === null) {
        if (floors[k]) cost -= BUILD_PRICES.floor * BUILD_REFUND_RATE;
        delete floors[k];
      } else if (floors[k] !== o.floorId) {
        if (!floors[k]) cost += BUILD_PRICES.floor;
        floors[k] = o.floorId;
      }
    }
  }
  return { layout: { ...layout, walls: [...walls.values()], floors }, cost: Math.round(cost) };
}

/** Does a footprint have a wall running between two of its own tiles? (Mirror of the server rule.) */
export function crossesWall(tiles: Tile[], walls: WallSeg[]): boolean {
  const edges = wallEdges(walls);
  const inside = new Set(tiles.map((t) => `${t.x},${t.y}`));
  return tiles.some((t) =>
    [{ x: t.x + 1, y: t.y }, { x: t.x, y: t.y + 1 }].some((n) => inside.has(`${n.x},${n.y}`) && edges.has(edgeKey(t, n))),
  );
}

export { footprintTiles };
