"use client";

import type { ThreeEvent } from "@react-three/fiber";
import type { RoomDef } from "@nyl/content";

/** Any indoor room (home or venue): floorboards, two back walls, and the door on the west wall. */
export function Interior({
  room,
  night,
  onTileClick,
  onDoorClick,
}: {
  room: RoomDef;
  night: boolean;
  onTileClick: (x: number, y: number) => void;
  onDoorClick: () => void;
}) {
  const W = room.width;
  const H = room.height;
  const wallH = 2.8;
  const theme = room.theme ?? { floor: "#a47d55", floorAlt: "#9c7650", wall: "#d9cfc0", light: "#ffd9a0" };
  const handle = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const x = Math.floor(e.point.x);
    const y = Math.floor(e.point.z);
    if (x >= 0 && y >= 0 && x < W && y < H) onTileClick(x, y);
  };
  const door = room.props.find((p) => p.kind === "door");

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[W / 2, 0.03, H / 2]} onClick={handle} visible={false}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial />
      </mesh>
      {Array.from({ length: W }, (_, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[i + 0.5, 0, H / 2]} receiveShadow>
          <planeGeometry args={[0.98, H]} />
          <meshStandardMaterial color={i % 2 ? theme.floor : theme.floorAlt} />
        </mesh>
      ))}
      <mesh position={[W / 2, wallH / 2, -0.05]} receiveShadow>
        <boxGeometry args={[W, wallH, 0.1]} />
        <meshStandardMaterial color={theme.wall} />
      </mesh>
      <mesh position={[-0.05, wallH / 2, H / 2]} receiveShadow>
        <boxGeometry args={[0.1, wallH, H]} />
        <meshStandardMaterial color={theme.wall} />
      </mesh>
      {room.kind === "home" ? (
        <>
          <mesh position={[W / 2 + 1, wallH - 0.6, 0.01]}>
            <planeGeometry args={[1.6, 0.5]} />
            <meshStandardMaterial color={night ? "#1b2438" : "#bfe0f5"} emissive={night ? "#000" : "#9fd0f0"} emissiveIntensity={0.4} />
          </mesh>
          <mesh position={[W / 2, wallH - 0.15, 0.15]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.05, 0.05, W, 8]} />
            <meshStandardMaterial color="#8a8a8a" metalness={0.5} />
          </mesh>
        </>
      ) : (
        // Venue: a neon strip along the back wall.
        <mesh position={[W / 2, wallH - 0.3, 0.02]}>
          <boxGeometry args={[W - 1, 0.06, 0.04]} />
          <meshStandardMaterial color={theme.light} emissive={theme.light} emissiveIntensity={1.5} />
        </mesh>
      )}
      {door && (
        <group
          position={[0.02, 0, door.y + 0.5]}
          onClick={(e) => {
            e.stopPropagation();
            onDoorClick();
          }}
        >
          <mesh position={[0.04, 1.05, 0]}>
            <boxGeometry args={[0.08, 2.1, 0.9]} />
            <meshStandardMaterial color="#5b3a29" />
          </mesh>
          <mesh position={[0.1, 1.0, 0.3]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#d4af37" metalness={0.8} />
          </mesh>
        </group>
      )}
    </group>
  );
}
