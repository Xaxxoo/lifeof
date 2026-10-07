import type { Tile } from "./grid";

/** Walking speed in tiles per second. Every client uses the same value so paths animate in sync. */
export const WALK_TILES_PER_SEC = 3;

export interface MoveIntent {
  path: Tile[];
  startedAt: number;
}

export interface Pose {
  x: number;
  y: number;
  /** Radians around the vertical axis, for facing the walk direction. */
  facing: number;
  moving: boolean;
}

export function pathDurationMs(path: Tile[]): number {
  return (Math.max(0, path.length - 1) / WALK_TILES_PER_SEC) * 1000;
}

/** Where an avatar is at `now` along a shared move intent. Deterministic across clients. */
export function poseAt(intent: MoveIntent, now: number): Pose {
  const { path, startedAt } = intent;
  const first = path[0];
  if (!first) return { x: 0, y: 0, facing: 0, moving: false };
  const last = path[path.length - 1]!;
  const progress = ((now - startedAt) / 1000) * WALK_TILES_PER_SEC;
  if (path.length === 1 || progress <= 0) {
    return { x: first.x, y: first.y, facing: facingBetween(first, path[1] ?? first), moving: false };
  }
  if (progress >= path.length - 1) {
    const prev = path[path.length - 2] ?? last;
    return { x: last.x, y: last.y, facing: facingBetween(prev, last), moving: false };
  }
  const i = Math.floor(progress);
  const a = path[i]!;
  const b = path[i + 1]!;
  const t = progress - i;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, facing: facingBetween(a, b), moving: true };
}

export function facingBetween(a: Tile, b: Tile): number {
  return Math.atan2(b.x - a.x, b.y - a.y);
}

/** The tile an avatar occupies at `now` (used as the start of the next path). */
export function tileAt(intent: MoveIntent, now: number): Tile {
  const p = poseAt(intent, now);
  return { x: Math.round(p.x), y: Math.round(p.y) };
}
