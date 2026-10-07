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
      if (!isWalkable(grid, next)) continue;
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
