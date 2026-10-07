"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { poseAt, type MoveIntent } from "@nyl/game-core";
import { serverNow } from "@/lib/store";

export interface AvatarProps {
  skin: string;
  shirt: string;
  intent: MoveIntent;
  isMe: boolean;
}

export function Avatar({ skin, shirt, intent, isMe }: AvatarProps) {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);

  useFrame(() => {
    const now = serverNow();
    const pose = poseAt(intent, now);
    if (root.current) {
      root.current.position.set(pose.x + 0.5, 0, pose.y + 0.5);
      root.current.rotation.y = pose.facing;
    }
    if (body.current) body.current.position.y = pose.moving ? Math.abs(Math.sin(now / 90)) * 0.06 : 0;
  });

  return (
    <group ref={root}>
      <group ref={body}>
        {/* Legs */}
        <mesh position={[0, 0.3, 0]} castShadow>
          <boxGeometry args={[0.3, 0.6, 0.2]} />
          <meshStandardMaterial color="#26324a" />
        </mesh>
        {/* Torso */}
        <mesh position={[0, 0.82, 0]} castShadow>
          <capsuleGeometry args={[0.2, 0.3, 4, 10]} />
          <meshStandardMaterial color={shirt} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 1.32, 0]} castShadow>
          <sphereGeometry args={[0.19, 16, 16]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        {/* Hair cap */}
        <mesh position={[0, 1.4, -0.02]}>
          <sphereGeometry args={[0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#1a1410" />
        </mesh>
      </group>
      {isMe && (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.32, 0.4, 24]} />
          <meshBasicMaterial color="#f3a712" />
        </mesh>
      )}
    </group>
  );
}
