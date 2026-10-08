"use client";

import type { ThreeEvent } from "@react-three/fiber";
import type { RoomDef } from "@nyl/content";
import { useMemo } from "react";
import { GlowDots } from "./Backdrop";
import { CITY } from "./palette";

/** Ground bands for the M0 street block: storefronts, sidewalk, road, far sidewalk. */
export function Street({ room, onTileClick }: { room: RoomDef; onTileClick: (x: number, y: number) => void }) {
  const handle = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const x = Math.floor(e.point.x);
    const y = Math.floor(e.point.z);
    if (x >= 0 && y >= 0 && x < room.width && y < room.height) onTileClick(x, y);
  };

  const bands: { y0: number; y1: number; color: string }[] = [
    { y0: 0, y1: 8, color: CITY.sidewalk },
    { y0: 8, y1: 13, color: CITY.road },
    { y0: 13, y1: room.height, color: CITY.sidewalk },
  ];
  // Path lights along both curbs, alternating pink and white.
  const dots = useMemo(
    () =>
      Array.from({ length: Math.ceil(room.width / 2.5) * 2 }, (_, i) => ({
        x: 0.6 + Math.floor(i / 2) * 2.5,
        z: i % 2 ? 13.25 : 7.75,
        color: CITY.pathLight[Math.floor(i / 2) % 2]!,
      })),
    [room.width],
  );

  return (
    <group>
      {/* One invisible plane takes every tap so bands and props never swallow clicks. */}
      <mesh rotation-x={-Math.PI / 2} position={[room.width / 2, 0.001, room.height / 2]} onClick={handle} visible={false}>
        <planeGeometry args={[room.width, room.height]} />
        <meshBasicMaterial />
      </mesh>
      {bands.map((b) => (
        <mesh key={b.y0} rotation-x={-Math.PI / 2} position={[room.width / 2, 0, (b.y0 + b.y1) / 2]} receiveShadow>
          <planeGeometry args={[room.width, b.y1 - b.y0]} />
          <meshStandardMaterial color={b.color} />
        </mesh>
      ))}
      {/* Curbs */}
      {[8, 13].map((y) => (
        <mesh key={y} position={[room.width / 2, 0.06, y]} receiveShadow>
          <boxGeometry args={[room.width, 0.12, 0.12]} />
          <meshStandardMaterial color={CITY.curb} />
        </mesh>
      ))}
      {/* Lane dashes */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[i * 2 + 1, 0.01, 10.5]}>
          <planeGeometry args={[0.9, 0.1]} />
          <meshStandardMaterial color={CITY.lane} />
        </mesh>
      ))}
      {/* Sidewalk slab lines */}
      {Array.from({ length: room.width + 1 }, (_, i) => (
        <mesh key={`s${i}`} rotation-x={-Math.PI / 2} position={[i, 0.005, 5.5]}>
          <planeGeometry args={[0.03, 5]} />
          <meshStandardMaterial color={CITY.slab} />
        </mesh>
      ))}
      <GlowDots dots={dots} />
    </group>
  );
}
