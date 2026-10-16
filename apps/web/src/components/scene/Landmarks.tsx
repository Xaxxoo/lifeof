"use client";

import { useFrame } from "@react-three/fiber";
import type { DistrictStyle, Landmark } from "@nyl/content";
import { useMemo, useRef } from "react";
import { CatmullRomCurve3, type Mesh, type MeshStandardMaterial, Vector3 } from "three";
import { buildingMaterial, cityUniforms } from "./palette";

/**
 * The things you'd know New York by, placed around a block that can see them: the Manhattan Bridge
 * over DUMBO, One World Trade over the river, the Empire State up Manhattan.
 * Positions are in the block's own world space (x along the street, z toward the camera).
 */
const PLACEMENT: Record<string, Partial<Record<Landmark, { x: number; z: number; rot?: number; scale?: number }>>> = {
  dumbo: {
    "manhattan-bridge": { x: 22.5, z: -1 },
    "one-wtc": { x: -14, z: -50 },
    "empire-state": { x: 34, z: -62, scale: 0.9 },
  },
  williamsburg: {
    "williamsburg-bridge": { x: -2.5, z: -1 },
    "empire-state": { x: 6, z: -58 },
  },
  "bushwick-block": {
    "empire-state": { x: -30, z: -70, scale: 0.7 },
  },
  chinatown: {
    "manhattan-bridge": { x: -2.5, z: -1 },
    "one-wtc": { x: 30, z: -34 },
  },
  "lower-east-side": {
    "williamsburg-bridge": { x: 26.5, z: -1 },
    "empire-state": { x: -6, z: -48 },
  },
  "financial-district": {
    "one-wtc": { x: -10, z: -24 },
  },
};

export function Landmarks({ style, roomId }: { style: DistrictStyle; roomId: string }) {
  const spots = PLACEMENT[roomId] ?? {};
  return (
    <group>
      {style.landmarks.map((l) => {
        const at = spots[l];
        if (!at) return null;
        return (
          <group key={l} position={[at.x, 0, at.z]} rotation-y={at.rot ?? 0} scale={at.scale ?? 1}>
            {l === "manhattan-bridge" && <SuspensionBridge color="#6f8090" towerH={22} deckH={8} arch />}
            {l === "williamsburg-bridge" && <SuspensionBridge color="#9a6a8a" towerH={19} deckH={7} />}
            {l === "one-wtc" && <OneWtc />}
            {l === "empire-state" && <EmpireState />}
          </group>
        );
      })}
    </group>
  );
}

/**
 * A suspension bridge running away from the block toward the river (−z): it starts behind the block so it
 * never hides the street, rises on a stone pier, and crosses the water from a steel tower with the main
 * cables sweeping down from it.
 */
/** How far back from the block the bridge's river tower stands. */
const towerZ = -16;

function SuspensionBridge({ color, towerH, deckH, arch }: { color: string; towerH: number; deckH: number; arch?: boolean }) {
  const steel = useMemo(() => ({ color, metalness: 0.45, roughness: 0.5 }), [color]);
  const cables = useMemo(
    () =>
      [-1.9, 1.9].map(
        (x) =>
          new CatmullRomCurve3([
            new Vector3(x, deckH + 0.5, -2),
            new Vector3(x, deckH + 3, -9),
            new Vector3(x, towerH - 0.2, towerZ),
            new Vector3(x, deckH + 2, -46),
            new Vector3(x, deckH + 0.2, -80),
          ]),
      ),
    [deckH, towerH],
  );
  const hangers = useMemo(() => {
    const out: { x: number; z: number; top: number }[] = [];
    for (const [i, c] of cables.entries()) {
      for (let k = 1; k < 40; k++) {
        const p = c.getPoint(k / 40);
        if (p.y > deckH + 0.6) out.push({ x: i ? 1.9 : -1.9, z: p.z, top: p.y });
      }
    }
    return out;
  }, [cables, deckH]);
  return (
    <group>
      {/* Deck with a truss under it */}
      <mesh position={[0, deckH, -50]} castShadow receiveShadow>
        <boxGeometry args={[4.2, 0.5, 96]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <mesh position={[0, deckH - 0.7, -50]}>
        <boxGeometry args={[3.6, 0.9, 96]} />
        <meshStandardMaterial color="#3a4048" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* Stone pier carrying the approach on land */}
      {[-3].map((z) => (
        <mesh key={z} position={[0, (deckH - 1) / 2, z]} castShadow>
          <boxGeometry args={[3.4, deckH - 1, 2]} />
          <meshStandardMaterial color="#a89e8a" />
        </mesh>
      ))}
      {/* The tower out in the river */}
      <group position={[0, 0, towerZ]}>
        {[-1.9, 1.9].map((x) => (
          <mesh key={x} position={[x, towerH / 2, 0]} castShadow>
            <boxGeometry args={[0.9, towerH, 1.6]} />
            <meshStandardMaterial {...steel} />
          </mesh>
        ))}
        {[deckH + 3, towerH - 1.4].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[4.6, 0.8, 1.2]} />
            <meshStandardMaterial {...steel} />
          </mesh>
        ))}
        {arch && (
          <mesh position={[0, towerH - 4.4, 0]} rotation-x={Math.PI / 2}>
            <torusGeometry args={[1.5, 0.28, 8, 20, Math.PI]} />
            <meshStandardMaterial {...steel} />
          </mesh>
        )}
        {/* Aircraft light on top */}
        <BlinkLight y={towerH + 0.3} />
      </group>
      {cables.map((c, i) => (
        <mesh key={i}>
          <tubeGeometry args={[c, 80, 0.09, 5, false]} />
          <meshStandardMaterial color="#4a5260" />
        </mesh>
      ))}
      {hangers.map((h, i) => (
        <mesh key={i} position={[h.x, (h.top + deckH) / 2, h.z]}>
          <boxGeometry args={[0.03, h.top - deckH, 0.03]} />
          <meshStandardMaterial color="#4a5260" />
        </mesh>
      ))}
      {/* Deck lights */}
      {Array.from({ length: 16 }, (_, i) => (
        <mesh key={i} position={[i % 2 ? 2.15 : -2.15, deckH + 0.4, -2 - i * 5]}>
          <sphereGeometry args={[0.1, 6, 4]} />
          <meshBasicMaterial color={[3, 2.6, 1.8]} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** One World Trade Center: square base, tapering glass faces, and the spire. */
function OneWtc() {
  const glass = useMemo(() => buildingMaterial({ color: "#a8bcd2", base: 2, glass: 1 }), []);
  return (
    <group>
      <mesh position={[0, 3, 0]} castShadow>
        <boxGeometry args={[5, 6, 5]} />
        <meshStandardMaterial color="#8a9aac" metalness={0.4} roughness={0.35} />
      </mesh>
      {/* Four-sided taper, turned 45° so the corners chamfer like the real one */}
      <mesh position={[0, 6 + 17, 0]} rotation-y={Math.PI / 4} material={glass} castShadow>
        <cylinderGeometry args={[2.1, 3.5, 34, 4]} />
      </mesh>
      <mesh position={[0, 40.4, 0]}>
        <boxGeometry args={[3, 0.8, 3]} />
        <meshStandardMaterial color="#c8d4e0" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 45, 0]}>
        <cylinderGeometry args={[0.08, 0.2, 8.5, 6]} />
        <meshStandardMaterial color="#e8eef4" />
      </mesh>
      <BlinkLight y={49.4} />
    </group>
  );
}

/** The Empire State: stepped setbacks, a mast, and a crown that lights up after dark. */
function EmpireState() {
  const stone = useMemo(() => buildingMaterial({ color: "#b8b0a2", base: 1 }), []);
  const crown = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const m = crown.current?.material as MeshStandardMaterial | undefined;
    if (!m) return;
    const n = cityUniforms.uNight.value;
    // Slowly cycles through its colors at night.
    m.emissive.setHSL((clock.elapsedTime * 0.02) % 1, 0.8, 0.55);
    m.emissiveIntensity = 0.3 + n * 3;
  });
  return (
    <group>
      {[
        [7, 6, 5],
        [5.4, 18, 4],
        [4, 6, 3],
        [2.8, 3.5, 2.2],
      ].reduce<{ y: number; els: React.ReactElement[] }>(
        (acc, [w, h, d], i) => {
          acc.els.push(
            <mesh key={i} position={[0, acc.y + h! / 2, 0]} scale={[w!, h!, d!]} material={stone} castShadow>
              <boxGeometry args={[1, 1, 1]} />
            </mesh>,
          );
          acc.y += h!;
          return acc;
        },
        { y: 0, els: [] },
      ).els}
      <mesh ref={crown} position={[0, 34.6, 0]}>
        <boxGeometry args={[1.8, 2.2, 1.4]} />
        <meshStandardMaterial color="#d8d0c0" emissive="#ffd27a" toneMapped={false} />
      </mesh>
      <mesh position={[0, 38.5, 0]}>
        <cylinderGeometry args={[0.15, 0.5, 5.5, 8]} />
        <meshStandardMaterial color="#c8c0b0" />
      </mesh>
      <BlinkLight y={41.4} />
    </group>
  );
}

function BlinkLight({ y }: { y: number }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.visible = Math.sin(clock.elapsedTime * 3) > 0.2;
  });
  return (
    <mesh ref={ref} position={[0, y, 0]}>
      <sphereGeometry args={[0.25, 8, 6]} />
      <meshBasicMaterial color={[5, 0.4, 0.3]} toneMapped={false} />
    </mesh>
  );
}
