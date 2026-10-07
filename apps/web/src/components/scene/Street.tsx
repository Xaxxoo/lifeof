"use client";

import type { ThreeEvent } from "@react-three/fiber";
import type { RoomDef } from "@nyl/content";

/** Ground bands for the M0 street block: storefronts, sidewalk, road, far sidewalk. */
export function Street({ room, onTileClick }: { room: RoomDef; onTileClick: (x: number, y: number) => void }) {
  const handle = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const x = Math.floor(e.point.x);
    const y = Math.floor(e.point.z);
    if (x >= 0 && y >= 0 && x < room.width && y < room.height) onTileClick(x, y);
  };

  const bands: { y0: number; y1: number; color: string }[] = [
    { y0: 0, y1: 8, color: "#b9b3a8" },
    { y0: 8, y1: 13, color: "#3a3d45" },
    { y0: 13, y1: room.height, color: "#b9b3a8" },
  ];

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
          <meshStandardMaterial color="#8d877d" />
        </mesh>
      ))}
      {/* Lane dashes */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[i * 2 + 1, 0.01, 10.5]}>
          <planeGeometry args={[1, 0.12]} />
          <meshStandardMaterial color="#f3c623" />
        </mesh>
      ))}
      {/* Sidewalk slab lines */}
      {Array.from({ length: room.width + 1 }, (_, i) => (
        <mesh key={`s${i}`} rotation-x={-Math.PI / 2} position={[i, 0.005, 5.5]}>
          <planeGeometry args={[0.03, 5]} />
          <meshStandardMaterial color="#a39d92" />
        </mesh>
      ))}
    </group>
  );
}
