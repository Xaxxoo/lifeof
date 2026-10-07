"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { poseAt, WALK_TILES_PER_SEC } from "@nyl/game-core";
import type { Npc } from "@nyl/content";
import { serverNow } from "@/lib/store";
import { AvatarBody } from "./AvatarBody";

/** Patrolling NPCs loop their route on the shared clock, so every player sees them in the same place. */
export function npcPosition(npc: Npc, now: number): { x: number; y: number; facing: number } {
  if (!npc.patrol?.length) return { x: npc.x, y: npc.y, facing: npc.facing };
  // Patrol corners are joined by straight runs along one axis; expand them into tile steps.
  const loop = [...npc.patrol, npc.patrol[0]!];
  const path = [loop[0]!];
  for (let i = 1; i < loop.length; i++) {
    const a = loop[i - 1]!;
    const b = loop[i]!;
    const dx = Math.sign(b.x - a.x);
    const dy = Math.sign(b.y - a.y);
    const steps = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    for (let s = 1; s <= steps; s++) path.push({ x: a.x + dx * s, y: a.y + dy * s });
  }
  const period = ((path.length - 1) / WALK_TILES_PER_SEC) * 1000 * 1.6;
  const startedAt = Math.floor(now / period) * period;
  const p = poseAt({ path, startedAt }, startedAt + (now - startedAt) / 1.6);
  return { x: p.x, y: p.y, facing: p.facing };
}

export function NpcAvatar({ npc, onPick }: { npc: Npc; onPick?: () => void }) {
  const root = useRef<Group>(null);
  const patrols = !!npc.patrol?.length;
  const start = useMemo(() => ({ x: npc.x + 0.5, z: npc.y + 0.5 }), [npc]);
  useFrame(() => {
    if (!patrols || !root.current) return;
    const p = npcPosition(npc, serverNow());
    root.current.position.set(p.x + 0.5, 0, p.y + 0.5);
    root.current.rotation.y = p.facing;
  });
  return (
    <group
      ref={root}
      position={[start.x, 0, start.z]}
      rotation-y={npc.facing}
      onClick={(e) => {
        if (!onPick || patrols) return;
        e.stopPropagation();
        onPick();
      }}
    >
      <AvatarBody look={npc.look} />
    </group>
  );
}
