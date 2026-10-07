"use client";

import type { ThreeEvent } from "@react-three/fiber";
import type { RoomDef } from "@nyl/content";

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
        <meshStandardMaterial color="#5f8f4e" />
      </mesh>
      {/* Path from the loop down to the station */}
      <mesh rotation-x={-Math.PI / 2} position={[13.5, 0.005, 11.5]} receiveShadow>
        <planeGeometry args={[1.4, 8]} />
        <meshStandardMaterial color="#c9b79c" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[8, 0.006, 14.5]} receiveShadow>
        <planeGeometry args={[16, 1.2]} />
        <meshStandardMaterial color="#c9b79c" />
      </mesh>
    </group>
  );
}
