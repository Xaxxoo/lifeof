"use client";

import { EqualStencilFunc, ReplaceStencilOp } from "three";
import type { Prop } from "@nyl/content";

/** How deep the stairwell goes, and how long walking down (or up) it takes. */
export const STAIR_DEPTH = 1.9;
export const STAIR_MS = 1600;

/** Top and bottom of the stairs in world space: you go in from the west edge and end up underground. */
export function stairPath(p: Prop) {
  const cx = p.x + p.w / 2;
  const cz = p.y + p.h / 2;
  return { top: { x: p.x - 0.1, z: cz }, bottom: { x: cx + 0.55, z: cz } };
}

/**
 * A New York subway entrance: green railings and globe lamps round a stairwell that really goes down.
 * The pit draws after the pavement, ignoring its depth, so you can see into it, and avatars draw
 * after the pit, so you see people walking down.
 */
export function SubwayEntrance({ prop: p, night }: { prop: Prop; night: boolean }) {
  const w = p.w - 0.2;
  const d = p.h - 0.2;
  const steps = 8;
  // Only inside the opening (stencil 1), drawn over the pavement, writing real depth for the avatar.
  const pit = { depthTest: false, depthWrite: true, stencilWrite: true, stencilRef: 1, stencilFunc: EqualStencilFunc } as const;
  return (
    <group position={[p.x + p.w / 2, 0, p.y + p.h / 2]}>
      {/* The hole in the pavement: marks the stencil, draws nothing */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, 0]} renderOrder={0.5}>
        <planeGeometry args={[w, d]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} stencilWrite stencilRef={1} stencilZPass={ReplaceStencilOp} />
      </mesh>
      <group renderOrder={1}>
        {/* Far walls, floor, then the steps, in that order so the nearer pieces paint over */}
        <mesh position={[0, -STAIR_DEPTH / 2, -d / 2]} renderOrder={1}>
          <boxGeometry args={[w, STAIR_DEPTH, 0.02]} />
          <meshStandardMaterial color="#e9e4da" {...pit} />
        </mesh>
        <mesh position={[0, -0.55, -d / 2 + 0.02]} renderOrder={1}>
          <boxGeometry args={[w, 0.12, 0.02]} />
          <meshStandardMaterial color="#2d6a3e" {...pit} />
        </mesh>
        <mesh position={[-w / 2, -STAIR_DEPTH / 2, 0]} renderOrder={1}>
          <boxGeometry args={[0.02, STAIR_DEPTH, d]} />
          <meshStandardMaterial color="#ddd7cb" {...pit} />
        </mesh>
        <mesh position={[0, -STAIR_DEPTH, 0]} rotation-x={-Math.PI / 2} renderOrder={1}>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial color="#6b6b70" emissive="#ffd9a0" emissiveIntensity={0.25} {...pit} />
        </mesh>
        {Array.from({ length: steps }, (_, i) => {
          const run = (w * 0.8) / steps;
          const drop = STAIR_DEPTH / steps;
          return (
            <mesh key={i} position={[-w / 2 + run * (i + 0.5), -drop * (i + 0.5), 0]} renderOrder={2}>
              <boxGeometry args={[run, drop, d * 0.62]} />
              <meshStandardMaterial color={i % 2 ? "#8a8a90" : "#9a9aa0"} {...pit} />
            </mesh>
          );
        })}
        {/* Warm light coming up from the station */}
        <mesh position={[w / 2 - 0.15, -STAIR_DEPTH + 0.3, 0]} renderOrder={3}>
          <boxGeometry args={[0.04, 0.5, d * 0.7]} />
          <meshStandardMaterial color="#fff1d0" emissive="#ffd9a0" emissiveIntensity={2.2} toneMapped={false} {...pit} />
        </mesh>
      </group>

      {/* Railings on three sides; the west side is open for the stairs */}
      {[
        { pos: [0, 0.45, -d / 2] as const, size: [w, 0.05, 0.05] as const },
        { pos: [0, 0.45, d / 2] as const, size: [w, 0.05, 0.05] as const },
        { pos: [w / 2, 0.45, 0] as const, size: [0.05, 0.05, d] as const },
      ].map((r, i) => (
        <group key={i}>
          <mesh position={[...r.pos]} castShadow>
            <boxGeometry args={[...r.size]} />
            <meshStandardMaterial color="#2d6a3e" />
          </mesh>
          <mesh position={[r.pos[0], 0.22, r.pos[2]]}>
            <boxGeometry args={[Math.max(0.03, r.size[0] - 0.02), 0.44, Math.max(0.03, r.size[2] - 0.02)]} />
            <meshStandardMaterial color="#2d6a3e" transparent opacity={0.35} />
          </mesh>
        </group>
      ))}
      {/* Globe lamps */}
      {[-1, 1].map((s) => (
        <group key={s} position={[-w / 2 + 0.05, 0, s * (d / 2)]}>
          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.035, 0.045, 1.4]} />
            <meshStandardMaterial color="#2d6a3e" />
          </mesh>
          <mesh position={[0, 1.45, 0]}>
            <sphereGeometry args={[0.13, 14, 12]} />
            <meshStandardMaterial color="#7be07b" emissive="#3fbf3f" emissiveIntensity={night ? 2.4 : 0.5} toneMapped={!night} />
          </mesh>
        </group>
      ))}
      {/* Sign over the far railing */}
      <mesh position={[w / 2, 0.85, 0]} rotation-y={Math.PI / 2}>
        <boxGeometry args={[Math.min(d, 1.4), 0.26, 0.04]} />
        <meshStandardMaterial color="#111114" />
      </mesh>
      <mesh position={[w / 2 + 0.025, 0.85, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[Math.min(d, 1.4) - 0.1, 0.06]} />
        <meshStandardMaterial color="#f4f1ea" emissive="#f4f1ea" emissiveIntensity={night ? 0.6 : 0.1} />
      </mesh>
    </group>
  );
}
