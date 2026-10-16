"use client";

import { useFrame } from "@react-three/fiber";
import type { RoomDef } from "@nyl/content";
import { useLayoutEffect, useMemo, useRef } from "react";
import { AdditiveBlending, Color, type Group, type InstancedMesh, type Mesh, type MeshBasicMaterial, Object3D, type PointLight } from "three";

/** The club's tempo, in beats per minute. Lights, the floor and the dancers all move to it. */
export const BPM = 124;
export const BEAT_MS = 60_000 / BPM;

const dummy = new Object3D();

/** A lit dance floor that ripples to the beat, sweeping beams, lasers off the booth and a disco ball. */
export function ClubLights({ room }: { room: RoomDef }) {
  const floor = room.props.find((p) => p.kind === "dancefloor");
  const dj = room.props.find((p) => p.kind === "djbooth");
  const accent = room.theme?.light ?? "#ff3fa4";
  if (!floor) return null;
  const cx = floor.x + floor.w / 2;
  const cz = floor.y + floor.h / 2;
  return (
    <group>
      <LedFloor x={floor.x} y={floor.y} w={floor.w} h={floor.h} accent={accent} />
      <DiscoBall x={cx} z={cz} />
      {[0, 1, 2, 3].map((i) => (
        <Beam key={i} i={i} x={floor.x + 1 + (i * (floor.w - 2)) / 3} z={floor.y - 0.4} color={["#ff3fa4", "#3ff7ff", "#ffcc33", "#9b5de5"][i]!} />
      ))}
      {dj && <Lasers x={dj.x + dj.w / 2} z={dj.y + 0.8} />}
      <MovingLights cx={cx} cz={cz} accent={accent} />
    </group>
  );
}

function LedFloor({ x, y, w, h, accent }: { x: number; y: number; w: number; h: number; accent: string }) {
  const ref = useRef<InstancedMesh>(null);
  const n = w * h;
  const colors = useMemo(() => [new Color(accent), new Color("#3ff7ff"), new Color("#ffcc33"), new Color("#7b2ff7")], [accent]);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    for (let i = 0; i < n; i++) {
      dummy.position.set(x + (i % w) + 0.5, 0.016, y + Math.floor(i / w) + 0.5);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, colors[0]!);
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [n, w, x, y, colors]);
  const c = useMemo(() => new Color(), []);
  useFrame(() => {
    const m = ref.current;
    if (!m || !m.instanceColor) return;
    const t = Date.now() / BEAT_MS;
    const beat = t % 1;
    const bar = Math.floor(t / 4);
    const pulse = Math.pow(1 - beat, 3);
    for (let i = 0; i < n; i++) {
      const tx = i % w;
      const ty = Math.floor(i / w);
      // A different pattern every bar: rings out from the middle, diagonal sweeps, a checkerboard.
      const dx = tx - (w - 1) / 2;
      const dy = ty - (h - 1) / 2;
      const p = bar % 3;
      const phase = p === 0 ? Math.hypot(dx, dy) * 0.5 - t : p === 1 ? (tx + ty) * 0.35 - t : (tx + ty + Math.floor(t)) % 2;
      const k = 0.5 + 0.5 * Math.sin(phase * Math.PI);
      c.copy(colors[(Math.floor(t) + tx + ty) % colors.length]!).multiplyScalar(0.25 + k * (1.4 + pulse * 1.6));
      m.setColorAt(i, c);
    }
    m.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]}>
      <planeGeometry args={[0.92, 0.92]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

function DiscoBall({ x, z }: { x: number; z: number }) {
  const ref = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.8;
  });
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 3.1, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.6]} />
        <meshStandardMaterial color="#888" />
      </mesh>
      <mesh ref={ref} position={[0, 2.6, 0]}>
        <icosahedronGeometry args={[0.38, 2]} />
        <meshStandardMaterial color="#e8eef4" metalness={1} roughness={0.08} flatShading emissive="#6a6a80" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

/** A soft cone of light from the ceiling that sweeps across the floor. */
function Beam({ i, x, z, color }: { i: number; x: number; z: number; color: string }) {
  const ref = useRef<Group>(null);
  const mat = useRef<MeshBasicMaterial>(null);
  useFrame(() => {
    const t = Date.now() / 1000;
    if (ref.current) {
      ref.current.rotation.x = 0.45 + Math.sin(t * 0.9 + i) * 0.35;
      ref.current.rotation.z = Math.sin(t * 0.7 + i * 2) * 0.5;
    }
    if (mat.current) mat.current.opacity = 0.1 + Math.pow(1 - ((Date.now() / BEAT_MS) % 1), 4) * 0.12;
  });
  return (
    <group ref={ref} position={[x, 3, z]}>
      <mesh position={[0, -1.6, 0]}>
        <coneGeometry args={[0.7, 3.2, 20, 1, true]} />
        <meshBasicMaterial ref={mat} color={color} transparent opacity={0.14} depthWrite={false} blending={AdditiveBlending} side={2} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Thin green lasers fanning out from the DJ booth. */
function Lasers({ x, z }: { x: number; z: number }) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    const t = Date.now() / 1000;
    if (ref.current) {
      ref.current.rotation.y = Math.sin(t * 0.6) * 0.6;
      ref.current.visible = Math.floor(Date.now() / (BEAT_MS * 8)) % 2 === 0;
    }
  });
  return (
    <group ref={ref} position={[x, 1.6, z]}>
      {Array.from({ length: 7 }, (_, i) => (
        // Each beam starts at the booth and runs out over the floor.
        <group key={i} rotation={[-0.08, (i - 3) * 0.16, 0]}>
          <mesh position={[0, 0, 4.5]}>
            <boxGeometry args={[0.015, 0.015, 9]} />
            <meshBasicMaterial color={[0.3, 4, 0.6]} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Two colored lights circling the floor so dancers catch the color. */
function MovingLights({ cx, cz, accent }: { cx: number; cz: number; accent: string }) {
  const a = useRef<PointLight>(null);
  const b = useRef<PointLight>(null);
  useFrame(() => {
    const t = Date.now() / 1000;
    const pulse = 0.6 + Math.pow(1 - ((Date.now() / BEAT_MS) % 1), 3) * 0.8;
    a.current?.position.set(cx + Math.cos(t) * 3, 2.2, cz + Math.sin(t) * 2);
    b.current?.position.set(cx + Math.cos(t + Math.PI) * 3, 2.2, cz + Math.sin(t + Math.PI) * 2);
    if (a.current) a.current.intensity = 9 * pulse;
    if (b.current) b.current.intensity = 9 * pulse;
  });
  return (
    <>
      <pointLight ref={a} color={accent} distance={7} decay={2} />
      <pointLight ref={b} color="#3ff7ff" distance={7} decay={2} />
    </>
  );
}
