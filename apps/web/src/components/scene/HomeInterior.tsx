"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { BoxGeometry, Color, Object3D, PlaneGeometry, type InstancedMesh } from "three";
import { FLOOR_BY_ID, PAINT_BY_ID, type HomeLayout, type RoomDef, type WallSeg } from "@nyl/content";

const WALL_T = 0.12;
const BACK_H = 2.5;
const INNER_H = 1.75;
const CUT_H = 0.32;

export interface GroundPointer {
  onDown?: (x: number, z: number) => void;
  onMove?: (x: number, z: number) => void;
  onUp?: (x: number, z: number) => void;
}

/**
 * A home drawn from its saved layout: patterned floors, painted walls with doors and windows,
 * front walls cut low so you can see in. Unbuilt lots are grass inside a low fence.
 * `pending` draws walls you're about to build (green) or remove (red).
 */
export function HomeInterior({
  room,
  night,
  wallsDown,
  pending,
  previewPaint,
  previewFloor,
  onTileClick,
  onDoorClick,
  pointer,
}: {
  room: RoomDef;
  night: boolean;
  wallsDown?: boolean;
  pending?: { seg: WallSeg; remove?: boolean }[];
  previewPaint?: string | null;
  previewFloor?: string | null;
  onTileClick: (x: number, y: number) => void;
  onDoorClick: () => void;
  pointer?: GroundPointer;
}) {
  const layout = room.home!.layout;
  const lot = room.home!.kind === "lot";
  const paint = PAINT_BY_ID[previewPaint ?? layout.paint]?.color ?? "#e9dfcc";
  const W = layout.width;
  const H = layout.height;

  const tile = (e: ThreeEvent<PointerEvent | MouseEvent>) => ({ x: e.point.x, z: e.point.z });
  return (
    <group>
      {/* One invisible plane takes every tap and drag */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[W / 2, 0.03, H / 2]}
        visible={false}
        onClick={(e) => {
          e.stopPropagation();
          if (pointer) return;
          const x = Math.floor(e.point.x);
          const y = Math.floor(e.point.z);
          if (x >= 0 && y >= 0 && x < W && y < H) onTileClick(x, y);
        }}
        onPointerDown={(e) => {
          if (!pointer?.onDown) return;
          e.stopPropagation();
          const p = tile(e);
          pointer.onDown(p.x, p.z);
        }}
        onPointerMove={(e) => {
          if (!pointer?.onMove) return;
          const p = tile(e);
          pointer.onMove(p.x, p.z);
        }}
        onPointerUp={(e) => {
          if (!pointer?.onUp) return;
          const p = tile(e);
          pointer.onUp(p.x, p.z);
        }}
      >
        <planeGeometry args={[W + 2, H + 2]} />
        <meshBasicMaterial />
      </mesh>

      <Floors layout={layout} lot={lot} previewFloor={previewFloor ?? null} />
      {lot && <Fence width={W} height={H} />}

      {layout.walls.map((w) => (
        <Wall key={`${w.x},${w.y},${w.side}`} seg={w} layout={layout} color={paint} low={wallsDown} night={night} />
      ))}
      {(pending ?? []).map((p, i) => (
        <mesh key={`p${i}`} position={segCenter(p.seg, 0.5)} rotation-y={p.seg.side === "w" ? Math.PI / 2 : 0}>
          <boxGeometry args={[1.02, 1, WALL_T + 0.04]} />
          <meshStandardMaterial color={p.remove ? "#ef4444" : p.seg.kind === "wall" ? "#4ade80" : "#60a5fa"} transparent opacity={0.55} />
        </mesh>
      ))}

      {/* The way out: a front door on a house, a gate on a lot */}
      <group
        position={[0.06, 0, H - 2 + 0.5]}
        onClick={(e) => {
          e.stopPropagation();
          onDoorClick();
        }}
      >
        {lot ? (
          <mesh position={[0.05, 0.45, 0]}>
            <boxGeometry args={[0.06, 0.9, 0.9]} />
            <meshStandardMaterial color="#8a8f96" metalness={0.6} roughness={0.4} wireframe />
          </mesh>
        ) : (
          <>
            <mesh position={[0.04, 1.05, 0]} castShadow>
              <boxGeometry args={[0.08, 2.1, 0.86]} />
              <meshStandardMaterial color="#5b3a29" />
            </mesh>
            <mesh position={[0.1, 1.0, 0.3]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshStandardMaterial color="#d4af37" metalness={0.8} />
            </mesh>
          </>
        )}
      </group>
    </group>
  );
}

function Floors({ layout, lot, previewFloor }: { layout: HomeLayout; lot: boolean; previewFloor: string | null }) {
  const ref = useRef<InstancedMesh>(null);
  // Planks are three strips per tile; other floors are one tile with a hairline grout gap.
  const pieces = useMemo(() => {
    const out: { x: number; z: number; w: number; d: number; color: string }[] = [];
    for (let x = 0; x < layout.width; x++) {
      for (let y = 0; y < layout.height; y++) {
        const own = layout.floors[`${x},${y}`];
        const base = previewFloor && (!own || !FLOOR_BY_ID[own]?.fixed) ? previewFloor : own ?? layout.baseFloor;
        const f = base ? FLOOR_BY_ID[base] : null;
        if (!f) {
          const g = (x * 7 + y * 13) % 5;
          out.push({ x: x + 0.5, z: y + 0.5, w: 1, d: 1, color: ["#5f8f4e", "#5a8a49", "#64944f", "#5d8c4b", "#61904d"][g]! });
          continue;
        }
        if (f.pattern === "plank") {
          for (let k = 0; k < 3; k++) {
            const c = (x + k + Math.floor(y / 2)) % 2 ? f.color : f.alt;
            out.push({ x: x + 0.5, z: y + (k + 0.5) / 3, w: 0.995, d: 1 / 3 - 0.012, color: c });
          }
        } else {
          const c = f.pattern === "check" ? ((x + y) % 2 ? f.alt : f.color) : f.pattern === "stone" ? ((x * 3 + y * 5) % 3 ? f.color : f.alt) : (x + y) % 2 ? f.color : f.alt;
          out.push({ x: x + 0.5, z: y + 0.5, w: 0.975, d: 0.975, color: c });
        }
      }
    }
    return out;
  }, [layout, previewFloor]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new Object3D();
    const c = new Color();
    pieces.forEach((p, i) => {
      o.position.set(p.x, 0, p.z);
      o.rotation.set(-Math.PI / 2, 0, 0);
      o.scale.set(p.w, p.d, 1);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i, c.set(p.color));
    });
    mesh.count = pieces.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [pieces]);

  return (
    <group>
      {/* Grout / subfloor under everything */}
      <mesh rotation-x={-Math.PI / 2} position={[layout.width / 2, -0.005, layout.height / 2]} receiveShadow>
        <planeGeometry args={[layout.width, layout.height]} />
        <meshStandardMaterial color={lot ? "#4f7a40" : "#6d5a48"} />
      </mesh>
      <instancedMesh key={pieces.length} ref={ref} args={[UNIT_PLANE, undefined, pieces.length]} receiveShadow>
        <meshStandardMaterial roughness={0.75} />
      </instancedMesh>
    </group>
  );
}

const UNIT_PLANE = new PlaneGeometry(1, 1);
const UNIT_BOX = new BoxGeometry(1, 1, 1);

/** World position of a wall segment's center at height h. */
function segCenter(s: { x: number; y: number; side: "n" | "w" }, h: number): [number, number, number] {
  return s.side === "n" ? [s.x + 0.5, h, s.y] : [s.x, h, s.y + 0.5];
}

function Wall({
  seg,
  layout,
  color,
  low,
  night,
}: {
  seg: WallSeg;
  layout: HomeLayout;
  color: string;
  low?: boolean;
  night: boolean;
}) {
  const back = (seg.side === "n" && seg.y === 0) || (seg.side === "w" && seg.x === 0);
  const front = (seg.side === "n" && seg.y === layout.height) || (seg.side === "w" && seg.x === layout.width);
  const full = front || low ? CUT_H : back ? BACK_H : INNER_H;
  const rot = seg.side === "w" ? Math.PI / 2 : 0;
  const [cx, , cz] = segCenter(seg, 0);
  const trim = new Color(color).multiplyScalar(0.78).getStyle();
  const piece = (y0: number, y1: number, key: string) => (
    <group key={key}>
      <mesh geometry={UNIT_BOX} position={[0, (y0 + y1) / 2, 0]} scale={[1 + WALL_T, y1 - y0, WALL_T]} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      {y1 >= full - 0.001 && (
        <mesh geometry={UNIT_BOX} position={[0, y1 + 0.015, 0]} scale={[1 + WALL_T, 0.03, WALL_T + 0.02]}>
          <meshStandardMaterial color={trim} />
        </mesh>
      )}
    </group>
  );

  // The front door of the house is drawn separately; skip its wall piece.
  if (seg.kind === "door" && seg.side === "w" && seg.x === 0 && seg.y === layout.height - 2) {
    return full > CUT_H ? <group position={[cx, 0, cz]} rotation-y={rot}>{piece(2.15, full, "lintel")}</group> : null;
  }

  return (
    <group position={[cx, 0, cz]} rotation-y={rot}>
      {seg.kind === "wall" && piece(0, full, "w")}
      {seg.kind === "door" && full > 2.1 && piece(2.1, full, "lintel")}
      {seg.kind === "door" && (
        <>
          {[-0.47, 0.47].map((x) => (
            <mesh key={x} geometry={UNIT_BOX} position={[x, Math.min(full, 2.1) / 2, 0]} scale={[0.06, Math.min(full, 2.1), WALL_T + 0.02]}>
              <meshStandardMaterial color={trim} />
            </mesh>
          ))}
        </>
      )}
      {seg.kind === "window" && (
        <>
          {piece(0, Math.min(full, 0.85), "sill")}
          {full > 0.85 && (
            <>
              <mesh position={[0, Math.min(full, 1.95) / 2 + 0.425, 0]}>
                <boxGeometry args={[0.92, Math.min(full, 1.95) - 0.85, 0.03]} />
                <meshStandardMaterial
                  color={night ? "#2a3550" : "#bfe3f5"}
                  emissive={night ? "#000000" : "#9fd0f0"}
                  emissiveIntensity={0.35}
                  transparent
                  opacity={0.55}
                  roughness={0.05}
                />
              </mesh>
              {full > 1.95 && piece(1.95, full, "head")}
            </>
          )}
        </>
      )}
    </group>
  );
}

/** Low picket fence round an unbuilt lot, open at the gate. */
function Fence({ width, height }: { width: number; height: number }) {
  const posts = useMemo(() => {
    const out: [number, number][] = [];
    for (let x = 0; x <= width; x += 0.5) out.push([x, 0], [x, height]);
    for (let y = 0.5; y < height; y += 0.5) {
      if (Math.abs(y - (height - 1.5)) < 0.6) continue;
      out.push([0, y], [width, y]);
    }
    return out;
  }, [width, height]);
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new Object3D();
    posts.forEach(([x, z], i) => {
      o.position.set(x, 0.22, z);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [posts]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, posts.length]} castShadow>
      <boxGeometry args={[0.06, 0.44, 0.06]} />
      <meshStandardMaterial color="#f2efe8" />
    </instancedMesh>
  );
}
