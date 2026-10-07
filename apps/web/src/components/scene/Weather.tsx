"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BufferAttribute, type Points } from "three";

/** Rain or snow over the block when the real Brooklyn forecast says so (Live City). */
export function Weather({ kind, width, depth }: { kind: "rain" | "snow" | null; width: number; depth: number }) {
  const ref = useRef<Points>(null);
  const count = kind === "snow" ? 500 : 900;
  const positions = useMemo(() => {
    const rand = seeded(count);
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = rand() * width;
      arr[i * 3 + 1] = rand() * 8;
      arr[i * 3 + 2] = rand() * depth;
    }
    return arr;
  }, [count, width, depth]);

  useFrame((_, dt) => {
    const pts = ref.current;
    if (!pts || !kind) return;
    const attr = pts.geometry.getAttribute("position") as BufferAttribute;
    const speed = kind === "rain" ? 14 : 1.2;
    for (let i = 0; i < count; i++) {
      let y = attr.getY(i) - speed * dt;
      if (y < 0) y += 8;
      attr.setY(i, y);
      if (kind === "snow") attr.setX(i, (attr.getX(i) + Math.sin(y + i) * dt * 0.3 + width) % width);
    }
    attr.needsUpdate = true;
  });

  if (!kind) return null;
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={kind === "rain" ? "#9ab8d6" : "#ffffff"} size={kind === "rain" ? 0.05 : 0.09} transparent opacity={0.8} />
    </points>
  );
}

/** Small deterministic PRNG (mulberry32) so particle layout is pure and stable across renders. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
