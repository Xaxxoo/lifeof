"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { BoxGeometry, Color, type Group, type InstancedMesh, MeshBasicMaterial, Object3D, SphereGeometry } from "three";
import { CITY, buildingMaterial, cityUniforms } from "./palette";

/**
 * The city around a playable block: a street grid that lines up with the block's own road, filled
 * with lit buildings, trees, path lights and a little traffic. Decoration only, nothing here is
 * clickable. Lots in front of the block (toward the camera) stay low so they never hide the street.
 */
const ROAD_W = 5;
const PERIOD = 24;
const REACH = 3;
const H_ROADS = range(-REACH, REACH).map((k) => 10.5 + k * PERIOD);
const V_ROADS = range(-REACH, REACH + 1).map((k) => -3 + k * PERIOD);
const MIN = -3 - REACH * PERIOD;
const MAX = 21 + REACH * PERIOD;

interface Lot { x: number; z: number; w: number; d: number; h: number; color: string }
interface Tree { x: number; z: number; s: number; color: string }
interface Car { axis: "x" | "z"; lane: number; dir: 1 | -1; offset: number; speed: number; color: string }

export function Backdrop({ seed, width, depth }: { seed: string; width: number; depth: number }) {
  const city = useMemo(() => layoutCity(seed, width, depth), [seed, width, depth]);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[(MIN + MAX) / 2, -0.02, (MIN + MAX) / 2]} receiveShadow>
        <planeGeometry args={[MAX - MIN + 40, MAX - MIN + 40]} />
        <meshStandardMaterial color={CITY.ground} />
      </mesh>
      {H_ROADS.map((z) => (
        <mesh key={`h${z}`} rotation-x={-Math.PI / 2} position={[(MIN + MAX) / 2, -0.012, z]} receiveShadow>
          <planeGeometry args={[MAX - MIN + 40, ROAD_W]} />
          <meshStandardMaterial color={CITY.road} />
        </mesh>
      ))}
      {V_ROADS.map((x) => (
        <mesh key={`v${x}`} rotation-x={-Math.PI / 2} position={[x, -0.011, (MIN + MAX) / 2]} receiveShadow>
          <planeGeometry args={[ROAD_W, MAX - MIN + 40]} />
          <meshStandardMaterial color={CITY.road} />
        </mesh>
      ))}
      <Dashes />
      <Buildings lots={city.lots} />
      <Trees trees={city.trees} />
      <PathLights />
      {city.cars.map((c, i) => (
        <MovingCar key={i} car={c} />
      ))}
    </group>
  );
}

function layoutCity(seed: string, width: number, depth: number) {
  const rand = seeded(hashString(seed));
  const lots: Lot[] = [];
  const trees: Tree[] = [];
  const room = { x0: -0.6, x1: width + 0.6, z0: -0.6, z1: depth + 0.6 };
  const blocked = (x0: number, z0: number, x1: number, z1: number) => x1 > room.x0 && x0 < room.x1 && z1 > room.z0 && z0 < room.z1;

  for (let i = 0; i < V_ROADS.length - 1; i++) {
    for (let j = 0; j < H_ROADS.length - 1; j++) {
      const bx0 = V_ROADS[i]! + ROAD_W / 2 + 1.1;
      const bx1 = V_ROADS[i + 1]! - ROAD_W / 2 - 1.1;
      const bz0 = H_ROADS[j]! + ROAD_W / 2 + 1.1;
      const bz1 = H_ROADS[j + 1]! - ROAD_W / 2 - 1.1;
      const nx = Math.max(1, Math.round((bx1 - bx0) / 4.2));
      const nz = Math.max(1, Math.round((bz1 - bz0) / 4.2));
      const lw = (bx1 - bx0) / nx;
      const ld = (bz1 - bz0) / nz;
      for (let a = 0; a < nx; a++) {
        for (let b = 0; b < nz; b++) {
          const x0 = bx0 + a * lw;
          const z0 = bz0 + b * ld;
          if (blocked(x0, z0, x0 + lw, z0 + ld)) continue;
          const cx = x0 + lw / 2;
          const cz = z0 + ld / 2;
          if (rand() < 0.12) {
            // A pocket park.
            for (let t = 0; t < 5; t++) {
              trees.push({ x: x0 + 0.8 + rand() * (lw - 1.6), z: z0 + 0.8 + rand() * (ld - 1.6), s: 1.1 + rand() * 0.6, color: pick(CITY.leaf, rand) });
            }
            continue;
          }
          // Taller behind the block, low in front of it, so the street stays in view.
          const front = cx + cz;
          const fall = Math.min(1, Math.max(0.16, (28 - front) / 18));
          // Right behind the block, stay near the shops' height so they still read as the focus.
          const near = cz > -7 && cx > -6 && cx < width + 6 ? 0.55 : 1;
          const h = ((1.8 + rand() * rand() * 6) * fall + 0.6) * near;
          const w = lw - 0.35 - rand() * 0.6;
          const d = ld - 0.35 - rand() * 0.6;
          lots.push({ x: cx, z: cz, w, d, h, color: pick(CITY.walls, rand) });
        }
      }
    }
  }

  // Street trees along every sidewalk, outside the playable block.
  for (const z of H_ROADS) {
    for (let x = MIN; x < MAX; x += 2.4 + rand() * 1.6) {
      for (const side of [-1, 1]) {
        const tz = z + side * (ROAD_W / 2 + 0.6);
        if (!blocked(x - 0.5, tz - 0.5, x + 0.5, tz + 0.5) && rand() < 0.75) trees.push({ x, z: tz, s: 0.85 + rand() * 0.4, color: pick(CITY.leaf, rand) });
      }
    }
  }
  for (const x of V_ROADS) {
    for (let z = MIN; z < MAX; z += 2.4 + rand() * 1.6) {
      for (const side of [-1, 1]) {
        const tx = x + side * (ROAD_W / 2 + 0.6);
        if (!blocked(tx - 0.5, z - 0.5, tx + 0.5, z + 0.5) && rand() < 0.75) trees.push({ x: tx, z, s: 0.85 + rand() * 0.4, color: pick(CITY.leaf, rand) });
      }
    }
  }

  // Traffic on the avenues beside the block and on the cross streets, never through it.
  const carColors = ["#f4f1ea", "#f4f1ea", "#e9c46a", "#d8dde3", "#c0392b", "#3d6b8f"];
  const cars: Car[] = [];
  for (const x of V_ROADS.slice(REACH - 1, REACH + 2)) {
    for (const dir of [1, -1] as const) cars.push({ axis: "z", lane: x + dir * 1.1, dir, offset: rand(), speed: 2.2 + rand() * 1.5, color: pick(carColors, rand) });
  }
  for (const z of H_ROADS.filter((z) => z !== 10.5).slice(REACH - 2, REACH + 1)) {
    for (const dir of [1, -1] as const) cars.push({ axis: "x", lane: z - dir * 1.1, dir, offset: rand(), speed: 2.2 + rand() * 1.5, color: pick(carColors, rand) });
  }
  return { lots, trees, cars };
}

const UNIT_BOX = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const dummy = new Object3D();

function Buildings({ lots }: { lots: Lot[] }) {
  const ref = useRef<InstancedMesh>(null);
  const material = useMemo(() => buildingMaterial(), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const c = new Color();
    lots.forEach((l, i) => {
      dummy.position.set(l.x, 0, l.z);
      dummy.scale.set(l.w, l.h, l.d);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, c.set(l.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [lots]);
  return <instancedMesh ref={ref} args={[UNIT_BOX, material, lots.length]} castShadow receiveShadow />;
}

const CANOPY = new SphereGeometry(1, 10, 8);
const TRUNK = new BoxGeometry(0.12, 1, 0.12).translate(0, 0.5, 0);

/** Round canopies on short trunks, shared by the backdrop and the blocks. */
export function Trees({ trees }: { trees: Tree[] }) {
  const crowns = useRef<InstancedMesh>(null);
  const trunks = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!crowns.current || !trunks.current) return;
    const c = new Color();
    trees.forEach((t, i) => {
      dummy.position.set(t.x, 0.75 * t.s + 0.45 * t.s, t.z);
      dummy.scale.setScalar(0.5 * t.s);
      dummy.updateMatrix();
      crowns.current!.setMatrixAt(i, dummy.matrix);
      crowns.current!.setColorAt(i, c.set(t.color));
      dummy.position.set(t.x, 0, t.z);
      dummy.scale.set(1, 0.85 * t.s, 1);
      dummy.updateMatrix();
      trunks.current!.setMatrixAt(i, dummy.matrix);
    });
    for (const m of [crowns.current, trunks.current]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
    }
  }, [trees]);
  return (
    <group>
      <instancedMesh ref={crowns} args={[CANOPY, undefined, trees.length]} castShadow>
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={trunks} args={[TRUNK, undefined, trees.length]} castShadow>
        <meshStandardMaterial color={CITY.trunk} />
      </instancedMesh>
    </group>
  );
}

function Dashes() {
  const ref = useRef<InstancedMesh>(null);
  const spots = useMemo(() => {
    const out: { x: number; z: number; along: "x" | "z" }[] = [];
    for (const z of H_ROADS) for (let x = MIN; x < MAX; x += 2) out.push({ x, z, along: "x" });
    for (const x of V_ROADS) for (let z = MIN; z < MAX; z += 2) out.push({ x, z, along: "z" });
    // Skip the crossings so dashes don't run through intersections.
    return out.filter((s) =>
      s.along === "x" ? !V_ROADS.some((x) => Math.abs(s.x - x) < ROAD_W / 2 + 0.5) : !H_ROADS.some((z) => Math.abs(s.z - z) < ROAD_W / 2 + 0.5),
    );
  }, []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    spots.forEach((s, i) => {
      dummy.position.set(s.x, -0.005, s.z);
      dummy.rotation.set(-Math.PI / 2, 0, s.along === "x" ? 0 : Math.PI / 2);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    dummy.rotation.set(0, 0, 0);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [spots]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, spots.length]}>
      <planeGeometry args={[0.9, 0.1]} />
      <meshStandardMaterial color={CITY.lane} />
    </instancedMesh>
  );
}

const DOT = new SphereGeometry(0.07, 6, 4);

/** Little glowing dots along the curbs; shared with the blocks. Brightness follows the clock. */
export function GlowDots({ dots }: { dots: { x: number; z: number; color: string }[] }) {
  const ref = useRef<InstancedMesh>(null);
  const material = useMemo(() => new MeshBasicMaterial({ toneMapped: false }), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const c = new Color();
    dots.forEach((d, i) => {
      dummy.position.set(d.x, 0.07, d.z);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, c.set(d.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [dots]);
  useFrame(() => material.color.setScalar(0.5 + cityUniforms.uNight.value * 3));
  return <instancedMesh ref={ref} args={[DOT, material, dots.length]} />;
}

function PathLights() {
  const dots = useMemo(() => {
    const out: { x: number; z: number; color: string }[] = [];
    let n = 0;
    for (const z of H_ROADS) {
      for (let x = MIN; x < MAX; x += 2.5) {
        for (const side of [-1, 1]) out.push({ x, z: z + side * (ROAD_W / 2 + 0.15), color: CITY.pathLight[n++ % 2]! });
      }
    }
    for (const x of V_ROADS) {
      for (let z = MIN; z < MAX; z += 2.5) {
        for (const side of [-1, 1]) out.push({ x: x + side * (ROAD_W / 2 + 0.15), z, color: CITY.pathLight[n++ % 2]! });
      }
    }
    return out.filter((d) => !(d.x > -0.4 && d.x < 16.4 && d.z > -0.4 && d.z < 16.4));
  }, []);
  return <GlowDots dots={dots} />;
}

const HEAD = new MeshBasicMaterial({ color: new Color("#fff4d6").multiplyScalar(3), toneMapped: false });
const TAIL = new MeshBasicMaterial({ color: new Color("#ff3b3b").multiplyScalar(2.5), toneMapped: false });

function MovingCar({ car }: { car: Car }) {
  const ref = useRef<Group>(null);
  const span = MAX - MIN + 20;
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = ((clock.elapsedTime * car.speed) / span + car.offset) % 1;
    const s = MIN - 10 + (car.dir === 1 ? t : 1 - t) * span;
    if (car.axis === "z") g.position.set(car.lane, 0, s);
    else g.position.set(s, 0, car.lane);
  });
  const rot = car.axis === "z" ? (car.dir === 1 ? 0 : Math.PI) : car.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
  return (
    <group ref={ref}>
      <group rotation-y={rot}>
        <mesh position={[0, 0.28, 0]} castShadow>
          <boxGeometry args={[0.85, 0.36, 1.7]} />
          <meshStandardMaterial color={car.color} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.58, -0.1]} castShadow>
          <boxGeometry args={[0.72, 0.3, 0.85]} />
          <meshStandardMaterial color="#2a2840" roughness={0.3} />
        </mesh>
        {[-0.28, 0.28].map((x) => (
          <group key={x}>
            <mesh position={[x, 0.3, 0.86]} material={HEAD}>
              <boxGeometry args={[0.16, 0.08, 0.02]} />
            </mesh>
            <mesh position={[x, 0.32, -0.86]} material={TAIL}>
              <boxGeometry args={[0.16, 0.08, 0.02]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function range(a: number, b: number) {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

function pick<T>(list: readonly T[], rand: () => number): T {
  return list[Math.floor(rand() * list.length)]!;
}

function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Small deterministic PRNG (mulberry32) so each neighborhood's skyline is stable. */
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
