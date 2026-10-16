"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import type { RoomDef } from "@nyl/content";
import { useLayoutEffect, useMemo, useRef } from "react";
import { BoxGeometry, CatmullRomCurve3, Color, type Group, type InstancedMesh, Object3D, Vector3 } from "three";
import { buildingMaterial } from "./palette";

const WATER_Y = -14;
const UNIT_BOX = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);

/**
 * The Manhattan Bridge walkway: a concrete path between fences, subway tracks on the far side, steel
 * towers and cables overhead, the East River a long way down, Manhattan at the west end and Brooklyn
 * at the east.
 */
export function BridgeScene({ room, onTileClick }: { room: RoomDef; onTileClick: (x: number, y: number) => void }) {
  const W = room.width;
  const handle = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const x = Math.floor(e.point.x);
    const y = Math.floor(e.point.z);
    if (x >= 0 && y >= 0 && x < W && y < room.height) onTileClick(x, y);
  };
  const cables = useMemo(
    () =>
      [0.9, 9.6].map(
        (z) =>
          new CatmullRomCurve3([
            new Vector3(-30, 4, z),
            new Vector3(9, 15, z),
            new Vector3(17, 7.5, z),
            new Vector3(25, 15, z),
            new Vector3(W + 30, 4, z),
          ]),
      ),
    [W],
  );
  const hangers = useMemo(() => {
    const out: { x: number; z: number; top: number }[] = [];
    for (const c of cables) {
      for (let k = 0; k <= 120; k++) {
        const p = c.getPoint(k / 120);
        if (p.x > -6 && p.x < W + 6 && p.y > 2.2) out.push({ x: p.x, z: p.z, top: p.y });
      }
    }
    return out;
  }, [cables, W]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[W / 2, 0.02, room.height / 2]} onClick={handle} visible={false}>
        <planeGeometry args={[W, room.height]} />
        <meshBasicMaterial />
      </mesh>
      {/* Walkway, a long way out past both ends */}
      <mesh rotation-x={-Math.PI / 2} position={[W / 2, 0, 5.5]} receiveShadow>
        <planeGeometry args={[W + 60, 6]} />
        <meshStandardMaterial color="#8a8e98" />
      </mesh>
      {Array.from({ length: W + 1 }, (_, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[i, 0.004, 5.5]}>
          <planeGeometry args={[0.03, 5.6]} />
          <meshStandardMaterial color="#767a84" />
        </mesh>
      ))}
      {/* Painted bike lane line */}
      <mesh rotation-x={-Math.PI / 2} position={[W / 2, 0.006, 5]}>
        <planeGeometry args={[W + 60, 0.08]} />
        <meshStandardMaterial color="#f3c623" />
      </mesh>
      {/* Deck structure under everything */}
      <mesh position={[W / 2, -1.2, 4.5]} castShadow>
        <boxGeometry args={[W + 60, 1.4, 11]} />
        <meshStandardMaterial color="#5a6470" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* Subway tracks on the far side of the fence */}
      <mesh rotation-x={-Math.PI / 2} position={[W / 2, -0.25, 1]}>
        <planeGeometry args={[W + 60, 2.4]} />
        <meshStandardMaterial color="#3a3436" />
      </mesh>
      {Array.from({ length: Math.ceil((W + 60) / 0.6) }, (_, i) => (
        <mesh key={i} position={[-30 + i * 0.6, -0.22, 1]}>
          <boxGeometry args={[0.14, 0.05, 1.6]} />
          <meshStandardMaterial color="#5a4436" />
        </mesh>
      ))}
      {[0.45, 1.55].map((z) => (
        <mesh key={z} position={[W / 2, -0.16, z]}>
          <boxGeometry args={[W + 60, 0.07, 0.07]} />
          <meshStandardMaterial color="#b8bcc4" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      <Train dir={1} lane={1} color="#ff6319" />
      <Train dir={-1} lane={1} color="#fccc0a" offset={0.5} />
      {/* Main cables and suspenders */}
      {cables.map((c, i) => (
        <mesh key={i}>
          <tubeGeometry args={[c, 120, 0.12, 6, false]} />
          <meshStandardMaterial color="#56636f" metalness={0.4} />
        </mesh>
      ))}
      {hangers.map((h, i) => (
        <mesh key={i} position={[h.x, (h.top + 1.4) / 2, h.z]}>
          <boxGeometry args={[0.025, h.top - 1.4, 0.025]} />
          <meshStandardMaterial color="#56636f" />
        </mesh>
      ))}
      {/* The river */}
      <mesh rotation-x={-Math.PI / 2} position={[W / 2, WATER_Y, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#1f5868" roughness={0.15} metalness={0.4} />
      </mesh>
      <Shore side="manhattan" W={W} />
      <Shore side="brooklyn" W={W} />
    </group>
  );
}

/** A subway train crossing the bridge every so often. */
function Train({ dir, lane, color, offset = 0 }: { dir: 1 | -1; lane: number; color: string; offset?: number }) {
  const ref = useRef<Group>(null);
  const span = 160;
  const period = 22;
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = ((clock.elapsedTime / period + offset) % 1) * span - 60;
    g.position.set(dir === 1 ? t : 34 - t, -0.2, lane);
  });
  return (
    <group ref={ref}>
      {Array.from({ length: 6 }, (_, i) => (
        <group key={i} position={[-dir * i * 3.3, 0, 0]}>
          <mesh position={[0, 0.85, 0]} castShadow>
            <boxGeometry args={[3.1, 1.5, 1.3]} />
            <meshStandardMaterial color="#c8ccd2" metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[0, 1.15, 0.66]}>
            <planeGeometry args={[2.6, 0.45]} />
            <meshStandardMaterial color="#1a1e28" emissive="#fff1c8" emissiveIntensity={0.9} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.5, 0.66]}>
            <planeGeometry args={[3.1, 0.12]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** A borough at one end of the bridge: Manhattan's towers to the west, Brooklyn lower to the east. */
function Shore({ side, W }: { side: "manhattan" | "brooklyn"; W: number }) {
  const lots = useMemo(() => {
    const out: { x: number; z: number; w: number; d: number; h: number; color: string }[] = [];
    let seed = side === "manhattan" ? 11 : 29;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const tall = side === "manhattan";
    for (let i = 0; i < 70; i++) {
      const along = 8 + rand() * 46;
      const x = tall ? -along : W + along;
      const z = -40 + rand() * 70;
      const h = (tall ? 6 + rand() * rand() * 34 : 3 + rand() * rand() * 12) + (tall && Math.abs(z + 5) < 18 ? 6 : 0);
      out.push({ x, z, w: 2 + rand() * 3, d: 2 + rand() * 3, h, color: ["#7a8aa0", "#9aa6b8", "#6a6a7e", "#8a7060", "#a0907a"][Math.floor(rand() * 5)]! });
    }
    return out;
  }, [side, W]);
  const ref = useRef<InstancedMesh>(null);
  const material = useMemo(() => buildingMaterial({ base: 0.5, glass: side === "manhattan" ? 0.6 : 0 }), [side]);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new Object3D();
    const c = new Color();
    lots.forEach((l, i) => {
      o.position.set(l.x, WATER_Y, l.z);
      o.scale.set(l.w, l.h - WATER_Y, l.d);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(l.color));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [lots]);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[side === "manhattan" ? -36 : W + 36, WATER_Y + 0.05, -5]}>
        <planeGeometry args={[60, 90]} />
        <meshStandardMaterial color="#5e5868" />
      </mesh>
      <instancedMesh ref={ref} args={[UNIT_BOX, material, lots.length]} />
    </group>
  );
}
