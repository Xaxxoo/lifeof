"use client";

import type { ThreeEvent } from "@react-three/fiber";
import type { RoomDef } from "@nyl/content";
import { GlowDots } from "./Backdrop";
import { CITY } from "./palette";

// Path lights along the two paved paths.
const PARK_DOTS = [
  ...Array.from({ length: 4 }, (_, i) => ({ x: 12.65, z: 8 + i * 2, color: CITY.pathLight[i % 2]! })),
  ...Array.from({ length: 7 }, (_, i) => ({ x: 1 + i * 2.2, z: 13.75, color: CITY.pathLight[(i + 1) % 2]! })),
];

/** Prospect Park ground: grass with a paved path to the subway corner. */
export function ParkGround({ room, onTileClick }: { room: RoomDef; onTileClick: (x: number, y: number) => void }) {
  const handle = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const x = Math.floor(e.point.x);
    const y = Math.floor(e.point.z);
    if (x >= 0 && y >= 0 && x < room.width && y < room.height) onTileClick(x, y);
  };
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[room.width / 2, 0.03, room.height / 2]} onClick={handle} visible={false}>
        <planeGeometry args={[room.width, room.height]} />
        <meshBasicMaterial />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[room.width / 2, 0, room.height / 2]} receiveShadow>
        <planeGeometry args={[room.width, room.height]} />
        <meshStandardMaterial color={CITY.park} />
      </mesh>
      {/* Path from the loop down to the station */}
      <mesh rotation-x={-Math.PI / 2} position={[13.5, 0.005, 11.5]} receiveShadow>
        <planeGeometry args={[1.4, 8]} />
        <meshStandardMaterial color={CITY.path} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[8, 0.006, 14.5]} receiveShadow>
        <planeGeometry args={[16, 1.2]} />
        <meshStandardMaterial color={CITY.path} />
      </mesh>
      <GlowDots dots={PARK_DOTS} />
    </group>
  );
}
