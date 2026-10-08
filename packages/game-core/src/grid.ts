/** Tile grids and A* pathfinding. Rooms are small (≤ 64×64), so a simple open list is enough. */
export interface Tile {
  x: number;
  y: number;
}

export interface RoomGrid {
  width: number;
  height: number;
  /** Keys "x,y" of tiles you cannot stand on (walls, furniture). */
  blocked: ReadonlySet<string>;
  /**
   * Walls between tiles, keyed by edgeKey: "x,y,n" is the north edge of tile (x, y),
   * "x,y,w" its west edge. Doors are simply left out.
   */
  edges?: ReadonlySet<string>;
}

/** The edge you cross stepping from a to an adjacent tile b. */
export function edgeKey(a: Tile, b: Tile): string {
  if (b.x === a.x + 1) return `${b.x},${b.y},w`;
  if (a.x === b.x + 1) return `${a.x},${a.y},w`;
  if (b.y === a.y + 1) return `${b.x},${b.y},n`;
  return `${a.x},${a.y},n`;
}

/** Can you walk from a to the neighbouring tile b (on the grid, not into furniture, not through a wall)? */
export function canStep(grid: RoomGrid, a: Tile, b: Tile): boolean {
  return isWalkable(grid, b) && !grid.edges?.has(edgeKey(a, b));
}

export const tileKey = (t: Tile) => `${t.x},${t.y}`;

export function inBounds(grid: RoomGrid, t: Tile): boolean {
  return t.x >= 0 && t.y >= 0 && t.x < grid.width && t.y < grid.height;
}

export function isWalkable(grid: RoomGrid, t: Tile): boolean {
  return inBounds(grid, t) && !grid.blocked.has(tileKey(t));
}

const DIRS: Tile[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

/** 4-directional A*. Returns the path including start and goal, or null if unreachable. */
export function findPath(grid: RoomGrid, start: Tile, goal: Tile, maxNodes = 4096): Tile[] | null {
  if (!isWalkable(grid, start) || !isWalkable(grid, goal)) return null;
  const startKey = tileKey(start);
  const goalKey = tileKey(goal);
  if (startKey === goalKey) return [start];

  const h = (t: Tile) => Math.abs(t.x - goal.x) + Math.abs(t.y - goal.y);
  const open = new Map<string, { tile: Tile; f: number }>([[startKey, { tile: start, f: h(start) }]]);
  const g = new Map<string, number>([[startKey, 0]]);
  const cameFrom = new Map<string, Tile>();
  let visited = 0;

  while (open.size > 0 && visited < maxNodes) {
    let currentKey = "";
    let current: Tile | undefined;
    let best = Infinity;
    for (const [k, v] of open) {
      if (v.f < best) {
        best = v.f;
        currentKey = k;
        current = v.tile;
      }
    }
    if (!current) break;
    if (currentKey === goalKey) {
      const path: Tile[] = [current];
      let k = currentKey;
      while (cameFrom.has(k)) {
        const prev = cameFrom.get(k)!;
        path.unshift(prev);
        k = tileKey(prev);
      }
      return path;
    }
    open.delete(currentKey);
    visited++;
    const gCur = g.get(currentKey)!;
    for (const d of DIRS) {
      const next = { x: current.x + d.x, y: current.y + d.y };
      if (!canStep(grid, current, next)) continue;
      const nk = tileKey(next);
      const tentative = gCur + 1;
      if (tentative < (g.get(nk) ?? Infinity)) {
        cameFrom.set(nk, current);
        g.set(nk, tentative);
        open.set(nk, { tile: next, f: tentative + h(next) });
      }
    }
  }
  return null;
}

/** Tiles covered by a w×h footprint at (x, y), rotated in 90° steps. */
export function footprintTiles(x: number, y: number, w: number, h: number, rot = 0): Tile[] {
  const [fw, fh] = rot % 2 === 1 ? [h, w] : [w, h];
  const out: Tile[] = [];
  for (let dx = 0; dx < fw; dx++) for (let dy = 0; dy < fh; dy++) out.push({ x: x + dx, y: y + dy });
  return out;
}

/** Walkable tiles touching a footprint (4-neighbours), where an avatar stands to use it. */
export function adjacentTiles(grid: RoomGrid, footprint: Tile[]): Tile[] {
  const inside = new Set(footprint.map(tileKey));
  const seen = new Set<string>();
  const out: Tile[] = [];
  for (const t of footprint) {
    for (const d of DIRS) {
      const n = { x: t.x + d.x, y: t.y + d.y };
      const k = tileKey(n);
      if (inside.has(k) || seen.has(k)) continue;
      seen.add(k);
      if (canStep(grid, t, n)) out.push(n);
    }
  }
  return out;
}

/** Shortest walk (BFS) from start to whichever goal tile is closest. */
export function findPathToAny(grid: RoomGrid, start: Tile, goals: Tile[], maxNodes = 4096): Tile[] | null {
  if (!isWalkable(grid, start) || goals.length === 0) return null;
  const goalKeys = new Set(goals.map(tileKey));
  const startKey = tileKey(start);
  if (goalKeys.has(startKey)) return [start];
  const cameFrom = new Map<string, Tile | null>([[startKey, null]]);
  const queue: Tile[] = [start];
  while (queue.length > 0 && cameFrom.size < maxNodes) {
    const cur = queue.shift()!;
    for (const d of DIRS) {
      const n = { x: cur.x + d.x, y: cur.y + d.y };
      const k = tileKey(n);
      if (cameFrom.has(k) || !canStep(grid, cur, n)) continue;
      cameFrom.set(k, cur);
      if (goalKeys.has(k)) {
        const path: Tile[] = [n];
        let prev: Tile | null = cur;
        while (prev) {
          path.unshift(prev);
          prev = cameFrom.get(tileKey(prev)) ?? null;
        }
        return path;
      }
      queue.push(n);
    }
  }
  return null;
}
