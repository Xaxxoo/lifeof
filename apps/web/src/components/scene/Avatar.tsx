"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { poseAt, type MoveIntent } from "@nyl/game-core";
import type { Look } from "@nyl/content";
import { serverNow } from "@/lib/store";
import { AvatarBody, type Pose } from "./AvatarBody";

/** Where to put the avatar once an action starts (on the bed, on the sofa, facing the stove). */
export interface ActivityAnchor {
  startsAt: number;
  /** Whether the action has begun, as of the last UI tick (drives the sit pose). */
  active: boolean;
  pose: Pose;
  /** World position to snap to for sit/sleep; null = stay where you stopped. */
  at: { x: number; z: number; y: number } | null;
  /** Face this point while standing at it. */
  faceTo: { x: number; z: number } | null;
}

export interface AvatarProps {
  look: Look;
  intent: MoveIntent;
  isMe: boolean;
  anchor?: ActivityAnchor | null;
}

export function Avatar({ look, intent, isMe, anchor }: AvatarProps) {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const posed = useRef<Group>(null);

  useFrame(() => {
    const now = serverNow();
    const pose = poseAt(intent, now);
    const acting = !!anchor && now >= anchor.startsAt;
    const r = root.current;
    if (!r) return;
    if (acting && anchor.at && anchor.pose !== "stand") {
      r.position.set(anchor.at.x, anchor.at.y, anchor.at.z);
    } else {
      r.position.set(pose.x + 0.5, 0, pose.y + 0.5);
    }
    if (acting && anchor.faceTo) {
      r.rotation.y = Math.atan2(anchor.faceTo.x - r.position.x, anchor.faceTo.z - r.position.z);
    } else {
      r.rotation.y = pose.facing;
    }
    if (posed.current) {
      const sleeping = acting && anchor.pose === "sleep";
      posed.current.rotation.x = sleeping ? -Math.PI / 2 : 0;
      posed.current.position.y = sleeping ? 0.2 : 0;
      posed.current.position.z = sleeping ? -0.6 : 0;
    }
    if (body.current) body.current.position.y = pose.moving && !acting ? Math.abs(Math.sin(now / 90)) * 0.05 : 0;
  });

  const currentPose: Pose = anchor?.active ? anchor.pose : "stand";
  return (
    <group ref={root}>
      <group ref={posed}>
        <group ref={body}>
          <AvatarBody look={look} pose={currentPose === "sit" ? "sit" : "stand"} />
        </group>
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
