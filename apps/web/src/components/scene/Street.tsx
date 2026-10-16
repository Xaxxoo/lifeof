"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { footprintTiles, type Tile } from "@nyl/game-core";
import type { DistrictStyle, RoomDef } from "@nyl/content";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  type InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  SphereGeometry,
  Vector3,
} from "three";
import { GlowDots } from "./Backdrop";
import { CITY, cityUniforms } from "./palette";

/** Ground bands for a street block: storefronts, sidewalk, road, far sidewalk, dressed for its neighborhood. */
export function Street({ room, style, onTileClick }: { room: RoomDef; style: DistrictStyle; onTileClick: (x: number, y: number) => void }) {
  const handle = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const x = Math.floor(e.point.x);
    const y = Math.floor(e.point.z);
    if (x >= 0 && y >= 0 && x < room.width && y < room.height) onTileClick(x, y);
  };
  const pal = style.palette;
  const cobble = useMemo(() => (style.road === "cobble" ? cobbleTexture(pal.road, room.width) : null), [style.road, pal.road, room.width]);
  useEffect(() => () => cobble?.dispose(), [cobble]);

  const bands: { y0: number; y1: number; color: string }[] = [
    { y0: 0, y1: 8, color: pal.sidewalk },
    { y0: 8, y1: 13, color: pal.road },
    { y0: 13, y1: room.height, color: pal.sidewalk },
  ];
  // Path lights along both curbs, alternating pink and white.
  const dots = useMemo(
    () =>
      Array.from({ length: Math.ceil(room.width / 2.5) * 2 }, (_, i) => ({
        x: 0.6 + Math.floor(i / 2) * 2.5,
        z: i % 2 ? 13.25 : 7.75,
        color: CITY.pathLight[Math.floor(i / 2) % 2]!,
      })),
    [room.width],
  );

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
          {cobble && b.y0 === 8 ? <meshStandardMaterial map={cobble} roughness={0.95} /> : <meshStandardMaterial color={b.color} />}
        </mesh>
      ))}
      {/* Curbs */}
      {[8, 13].map((y) => (
        <mesh key={y} position={[room.width / 2, 0.06, y]} receiveShadow>
          <boxGeometry args={[room.width, 0.12, 0.12]} />
          <meshStandardMaterial color={pal.curb} />
        </mesh>
      ))}
      {/* Lane dashes (cobbles don't get them) */}
      {!cobble &&
        Array.from({ length: Math.ceil(room.width / 2) }, (_, i) => (
          <mesh key={i} rotation-x={-Math.PI / 2} position={[i * 2 + 1, 0.01, 10.5]}>
            <planeGeometry args={[0.9, 0.1]} />
            <meshStandardMaterial color={CITY.lane} />
          </mesh>
        ))}
      {/* Sidewalk slab lines */}
      {Array.from({ length: room.width + 1 }, (_, i) => (
        <mesh key={`s${i}`} rotation-x={-Math.PI / 2} position={[i, 0.005, 5.5]}>
          <planeGeometry args={[0.03, 5]} />
          <meshStandardMaterial color={pal.slab} />
        </mesh>
      ))}
      <GlowDots dots={dots} />
      <StreetDecor room={room} style={style} />
    </group>
  );
}

/** Strings over the street, planters on the curb, scaffolding over the sidewalk. */
function StreetDecor({ room, style }: { room: RoomDef; style: DistrictStyle }) {
  const taken = useMemo(() => {
    const s = new Set<string>();
    for (const p of room.props) for (const t of footprintTiles(p.x, p.y, p.w, p.h)) s.add(`${t.x},${t.y}`);
    for (const n of room.npcs ?? []) s.add(`${n.x},${n.y}`);
    return s;
  }, [room]);
  const free = (t: Tile) => !taken.has(`${t.x},${t.y}`);
  const W = room.width;
  const d = style.decor;
  // Two lines across the road and one along the shopfronts.
  const { across, along } = useMemo(
    () => ({
      across: [W * 0.28, W * 0.72].map((x) => [new Vector3(x, 4.6, 3.3), new Vector3(x, 3.9, 8), new Vector3(x, 4.6, 13.2)]),
      along: [new Vector3(0, 3.3, 3.6), ...Array.from({ length: Math.ceil(W / 4) }, (_, i) => new Vector3(i * 4 + 2, 2.85, 3.6)), new Vector3(W, 3.3, 3.6)],
    }),
    [W],
  );
  return (
    <group>
      {d.includes("bunting") && [...across, along].map((pts, i) => <Bunting key={i} points={pts} colors={CARIBBEAN} />)}
      {d.includes("lanterns") && [...across, along].map((pts, i) => <Bulbs key={i} points={pts} kind="lantern" />)}
      {d.includes("stringlights") && !d.includes("lanterns") && [...across.slice(0, 1), along].map((pts, i) => <Bulbs key={i} points={pts} kind="bulb" />)}
      {d.includes("planters") && <Planters W={W} free={free} />}
      {d.includes("scaffolding") && <Scaffolding room={room} />}
    </group>
  );
}

/** Jamaica, Trinidad, Haiti, Barbados: the West Indian Day colors on Nostrand Ave. */
const CARIBBEAN = ["#009b3a", "#fed100", "#111111", "#ce1126", "#ffffff", "#002b7f"];

/** A sagging line through the given anchor points, as a curve. */
function sag(points: Vector3[]) {
  const out: Vector3[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    for (let k = 0; k < 8; k++) {
      const t = k / 8;
      const p = a.clone().lerp(b, t);
      p.y -= Math.sin(t * Math.PI) * 0.35;
      out.push(p);
    }
  }
  out.push(points[points.length - 1]!.clone());
  return new CatmullRomCurve3(out);
}

function Bunting({ points, colors }: { points: Vector3[]; colors: string[] }) {
  const curve = useMemo(() => sag(points), [points]);
  const flags = useMemo(() => {
    const n = Math.round(curve.getLength() / 0.45);
    return Array.from({ length: n }, (_, i) => {
      const t = (i + 0.5) / n;
      const p = curve.getPointAt(t);
      const tan = curve.getTangentAt(t);
      return { p, rot: Math.atan2(tan.x, tan.z) + Math.PI / 2, color: colors[i % colors.length]! };
    });
  }, [curve, colors]);
  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 64, 0.012, 4, false]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {flags.map((f, i) => (
        <mesh key={i} position={[f.p.x, f.p.y - 0.14, f.p.z]} rotation={[0, f.rot, Math.PI]}>
          <coneGeometry args={[0.15, 0.28, 3]} />
          <meshStandardMaterial color={f.color} side={2} />
        </mesh>
      ))}
    </group>
  );
}

const BULB = new SphereGeometry(0.06, 8, 6);
const LANTERN = new SphereGeometry(0.2, 12, 10);

/** Warm bulbs or red paper lanterns along a line; they glow at night. */
function Bulbs({ points, kind }: { points: Vector3[]; kind: "bulb" | "lantern" }) {
  const curve = useMemo(() => sag(points), [points]);
  const ref = useRef<InstancedMesh>(null);
  const spacing = kind === "lantern" ? 0.9 : 0.35;
  const spots = useMemo(() => {
    const n = Math.max(2, Math.round(curve.getLength() / spacing));
    return Array.from({ length: n }, (_, i) => curve.getPointAt((i + 0.5) / n));
  }, [curve, spacing]);
  const material = useMemo(() => new MeshBasicMaterial({ toneMapped: false }), []);
  const base = useMemo(() => new Color(kind === "lantern" ? "#ff3b2a" : "#ffd28a"), [kind]);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new Object3D();
    spots.forEach((p, i) => {
      o.position.set(p.x, p.y - (kind === "lantern" ? 0.25 : 0.05), p.z);
      o.scale.set(1, kind === "lantern" ? 1.25 : 1, 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [spots, kind]);
  useFrame(() => material.color.copy(base).multiplyScalar(0.7 + cityUniforms.uNight.value * (kind === "lantern" ? 2.2 : 3)));
  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 64, 0.01, 4, false]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      <instancedMesh ref={ref} args={[kind === "lantern" ? LANTERN : BULB, material, spots.length]} />
    </group>
  );
}

/** Flower boxes along the curb, wherever nothing else stands. */
function Planters({ W, free }: { W: number; free: (t: Tile) => boolean }) {
  const spots = Array.from({ length: Math.floor(W / 3) }, (_, i) => ({ x: i * 3 + 1, y: 7 })).filter(free);
  return (
    <group>
      {spots.map((s) => (
        <group key={s.x} position={[s.x + 0.5, 0, s.y + 0.5]}>
          <mesh position={[0, 0.2, 0]} castShadow>
            <boxGeometry args={[0.8, 0.4, 0.4]} />
            <meshStandardMaterial color="#5a3a2a" />
          </mesh>
          {[-0.25, 0, 0.25].map((dx, i) => (
            <mesh key={dx} position={[dx, 0.48, 0]}>
              <sphereGeometry args={[0.13, 8, 6]} />
              <meshStandardMaterial color={["#ff6b9a", "#ffd23f", "#ff8c42"][i]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** A sidewalk shed in front of one building: there's always scaffolding somewhere. */
function Scaffolding({ room }: { room: RoomDef }) {
  const b = room.props.filter((p) => p.kind === "building")[1];
  if (!b) return null;
  return (
    <group position={[b.x + b.w / 2, 0, 3.5]}>
      <mesh position={[0, 2.6, 0]} castShadow>
        <boxGeometry args={[b.w, 0.12, 1]} />
        <meshStandardMaterial color="#2f6b3a" />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (b.w / 2 - 0.05), 2.95, 0]}>
          <boxGeometry args={[0.05, 0.6, 1]} />
          <meshStandardMaterial color="#2f6b3a" />
        </mesh>
      ))}
      {Array.from({ length: Math.floor(b.w / 1.5) + 1 }, (_, i) =>
        [-0.45, 0.45].map((dz) => (
          <mesh key={`${i}${dz}`} position={[-b.w / 2 + 0.05 + i * 1.5, 1.3, dz]}>
            <boxGeometry args={[0.06, 2.6, 0.06]} />
            <meshStandardMaterial color="#8a8a90" metalness={0.5} />
          </mesh>
        )),
      )}
    </group>
  );
}

/** Belgian-block cobbles, like the streets of DUMBO and Stone Street. */
function cobbleTexture(base: string, width: number) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  const col = new Color(base);
  g.fillStyle = `#${col.clone().multiplyScalar(0.55).getHexString()}`;
  g.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 16; row++) {
    const off = row % 2 ? 12 : 0;
    for (let x = -12; x < 256; x += 24) {
      const k = 0.8 + ((row * 7 + x * 3) % 11) / 30;
      g.fillStyle = `#${col.clone().multiplyScalar(k).getHexString()}`;
      g.beginPath();
      g.roundRect(x + off + 1.5, row * 16 + 1.5, 21, 13, 4);
      g.fill();
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(width / 4, 5 / 4);
  return t;
}
