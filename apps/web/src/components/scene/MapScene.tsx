"use client";

import { MapControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  CatmullRomCurve3,
  Color,
  Fog,
  Object3D,
  Shape,
  Vector3,
  type InstancedMesh,
  type Mesh,
} from "three";
import type { MapControls as MapControlsImpl } from "three-stdlib";
import { NEIGHBORHOOD_MAP, ROOMS, STREETS } from "@nyl/content";
import { lineColor } from "../LineBullet";
import type { Place } from "../CityMap";
import { CITY, buildingMaterial, skyColor, cityUniforms } from "./palette";
import { LabelProjector, anchorRef, type LabelAnchors } from "./Labels";

/** Map units (NEIGHBORHOOD_MAP) to world units. */
const S = 16;
export const toWorld = (x: number, y: number) => ({ x: (x - 3) * S, z: (y - 4) * S });

export function hoodCenter(roomId: string) {
  const m = NEIGHBORHOOD_MAP[roomId];
  return m ? toWorld(m.x, m.y) : { x: 0, z: 0 };
}

/** Where each place's landmark stands: a ring round its neighborhood. */
export function placeSpot(p: Place, places: Place[]) {
  const list = places.filter((x) => x.roomId === p.roomId);
  const i = list.findIndex((x) => x.key === p.key);
  const c = hoodCenter(p.roomId);
  const a = (i / Math.max(1, list.length)) * Math.PI * 2 + 0.4;
  return { x: c.x + Math.cos(a) * 5.2, z: c.z + Math.sin(a) * 5.2 };
}

/**
 * Brooklyn from above in the city's dusk style: neighborhoods as clusters of lit buildings, the East
 * River, Prospect Park, live subway lines, and a landmark with a pin for every place you can go.
 */
export function MapScene({
  places,
  hereId,
  focus,
  picked,
  lineStatus,
  onFocus,
  onPick,
  anchors,
}: {
  anchors: LabelAnchors;
  places: Place[];
  hereId: string | null;
  focus: string | null;
  picked: Place | null;
  lineStatus: (line: string) => string;
  onFocus: (roomId: string | null) => void;
  onPick: (p: Place) => void;
}) {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ fov: 40, position: [0, 200, 150], near: 1, far: 900 }} onPointerMissed={() => onFocus(null)}>
      <Sky />
      <ambientLight color="#c4a2d8" intensity={0.55} />
      <hemisphereLight args={["#e2c6ff", "#4a3550", 0.9]} />
      <directionalLight position={[60, 90, 40]} intensity={1.1} color="#ffd8c0" />
      <Ground />
      <Water />
      <Park />
      <SubwayLines lineStatus={lineStatus} />
      <Districts places={places} onFocus={onFocus} />
      <Landmarks places={places} picked={picked} onPick={onPick} />
      {hereId && <YouAreHere roomId={hereId} />}
      {hereId && picked && picked.roomId !== hereId && <Route from={hoodCenter(hereId)} to={placeSpot(picked, places)} />}
      <Rig focus={picked ? picked.roomId : focus} />
      <LabelProjector anchors={anchors} />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.3} intensity={0.8} radius={0.7} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  );
}

function Sky() {
  const get = useThree((s) => s.get);
  useLayoutEffect(() => {
    const sky = skyColor(cityUniforms.uNight.value);
    get().scene.background = sky;
    get().scene.fog = new Fog(sky, 320, 760);
  }, [get]);
  return null;
}

/** Glides the camera to a neighborhood when you pick one, and back out when you clear it. */
function Rig({ focus }: { focus: string | null }) {
  const controls = useRef<MapControlsImpl>(null);
  const goal = useRef<{ target: Vector3; offset: Vector3 } | null>(null);
  const aspect = useThree((s) => s.size.width / s.size.height);
  useLayoutEffect(() => {
    // Portrait screens need to back off further to fit the whole borough across.
    const fit = Math.max(1, 0.9 / aspect);
    const c = focus ? hoodCenter(focus) : { x: 2, z: 10 };
    goal.current = {
      target: new Vector3(c.x, 0, c.z),
      offset: focus ? new Vector3(0, 30, 26).multiplyScalar(Math.min(fit, 1.6)) : new Vector3(0, 105, 80).multiplyScalar(fit),
    };
  }, [focus, aspect]);
  useFrame(({ camera }, dt) => {
    const g = goal.current;
    const ctl = controls.current;
    if (!g || !ctl) return;
    const k = 1 - Math.exp(-dt * 3.5);
    ctl.target.lerp(g.target, k);
    camera.position.lerp(g.target.clone().add(g.offset), k);
    ctl.update();
    if (camera.position.distanceTo(g.target.clone().add(g.offset)) < 0.3) goal.current = null;
  });
  return (
    <MapControls
      ref={controls}
      makeDefault
      enableRotate={false}
      minDistance={18}
      maxDistance={420}
      screenSpacePanning={false}
      onStart={() => {
        goal.current = null;
      }}
    />
  );
}

function Ground() {
  const roads = useMemo(() => {
    const out: { x: number; z: number; w: number; d: number }[] = [];
    for (let v = -150; v <= 150; v += 9) {
      out.push({ x: v, z: 0, w: 0.45, d: 320 });
      out.push({ x: 0, z: v, w: 320, d: 0.45 });
    }
    return out;
  }, []);
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const o = new Object3D();
    roads.forEach((r, i) => {
      o.position.set(r.x, 0.02, r.z);
      o.scale.set(r.w, 1, r.d);
      o.updateMatrix();
      ref.current?.setMatrixAt(i, o.matrix);
    });
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, [roads]);
  return (
    <group rotation-y={0.18}>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color={CITY.ground} />
      </mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, roads.length]}>
        <boxGeometry args={[1, 0.02, 1]} />
        <meshStandardMaterial color="#5b4b72" />
      </instancedMesh>
    </group>
  );
}

/** The East River and the harbor, hugging DUMBO and Williamsburg. */
function Water() {
  const shape = useMemo(() => {
    const pts: [number, number][] = [
      [-6, -2], [3.6, -2], [3.4, -0.6], [2.2, 0.15], [1.2, 0.85], [-0.2, 1.6], [-0.7, 3.4], [-0.4, 6], [0.3, 8.8], [-6, 9.5],
    ];
    const s = new Shape();
    pts.forEach(([x, y], i) => {
      const w = toWorld(x, y);
      if (i === 0) s.moveTo(w.x, -w.z);
      else s.lineTo(w.x, -w.z);
    });
    return s;
  }, []);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.06, 0]}>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color="#1f6f78" roughness={0.2} metalness={0.1} />
    </mesh>
  );
}

function Park() {
  const c = hoodCenter("prospect-park");
  const trees = useMemo(() => {
    const out: { x: number; z: number; s: number }[] = [];
    const r = rng(7);
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 13;
      out.push({ x: c.x + Math.cos(a) * d * 0.85, z: c.z + Math.sin(a) * d, s: 0.8 + r() * 0.8 });
    }
    return out;
  }, [c.x, c.z]);
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const o = new Object3D();
    trees.forEach((t, i) => {
      o.position.set(t.x, 1.1 * t.s, t.z);
      o.scale.setScalar(t.s);
      o.updateMatrix();
      ref.current?.setMatrixAt(i, o.matrix);
      ref.current?.setColorAt(i, new Color(CITY.leaf[i % 3]!));
    });
    if (ref.current) {
      ref.current.instanceMatrix.needsUpdate = true;
      if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    }
  }, [trees]);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[c.x, 0.05, c.z]} scale={[0.9, 1.05, 1]}>
        <circleGeometry args={[15, 40]} />
        <meshStandardMaterial color={CITY.park} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[c.x - 3, 0.08, c.z + 5]} scale={[1.6, 1, 1]}>
        <circleGeometry args={[3, 28]} />
        <meshStandardMaterial color="#2a8a8f" roughness={0.2} />
      </mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, trees.length]} castShadow>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
    </group>
  );
}

const UNIT_BOX = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const TALL: Record<string, number> = { williamsburg: 2.2, dumbo: 1.9, "bushwick-block": 1, "bed-stuy": 0.9, "crown-heights": 1, flatbush: 1.1 };

/** Each neighborhood: a cluster of lit buildings (taller in Williamsburg and DUMBO) on its own pad. */
function Districts({ places, onFocus }: { places: Place[]; onFocus: (id: string) => void }) {
  const lots = useMemo(() => {
    const out: { x: number; z: number; w: number; d: number; h: number; color: string }[] = [];
    for (const s of STREETS) {
      if (s.kind === "park") continue;
      const c = hoodCenter(s.id);
      const spots = places.filter((p) => p.roomId === s.id).map((p) => placeSpot(p, places));
      const r = rng([...s.id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7));
      for (let gx = -4; gx <= 4; gx++) {
        for (let gz = -4; gz <= 4; gz++) {
          const x = c.x + gx * 2.6 + (r() - 0.5) * 0.6;
          const z = c.z + gz * 2.6 + (r() - 0.5) * 0.6;
          const dist = Math.hypot(x - c.x, z - c.z);
          if (dist > 11 || r() < 0.18) continue;
          if (spots.some((sp) => Math.hypot(sp.x - x, sp.z - z) < 2.2)) continue;
          const tall = TALL[s.id] ?? 1;
          out.push({ x, z, w: 1.6 + r() * 0.6, d: 1.6 + r() * 0.6, h: (1.2 + r() * r() * 5) * tall * (1.25 - dist / 14), color: CITY.walls[Math.floor(r() * CITY.walls.length)]! });
        }
      }
    }
    return out;
  }, [places]);
  const ref = useRef<InstancedMesh>(null);
  const material = useMemo(() => buildingMaterial({ base: 0.3 }), []);
  useLayoutEffect(() => {
    const o = new Object3D();
    const col = new Color();
    lots.forEach((l, i) => {
      o.position.set(l.x, 0, l.z);
      o.scale.set(l.w, l.h, l.d);
      o.updateMatrix();
      ref.current?.setMatrixAt(i, o.matrix);
      ref.current?.setColorAt(i, col.set(l.color));
    });
    if (ref.current) {
      ref.current.instanceMatrix.needsUpdate = true;
      if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
      ref.current.computeBoundingSphere();
    }
  }, [lots]);
  return (
    <group>
      <instancedMesh ref={ref} args={[UNIT_BOX, material, lots.length]} castShadow />
      {STREETS.map((s) => {
        const c = hoodCenter(s.id);
        return (
          <group key={s.id}>
            <mesh
              rotation-x={-Math.PI / 2}
              position={[c.x, 0.04, c.z]}
              onClick={(e) => {
                e.stopPropagation();
                onFocus(s.id);
              }}
            >
              <circleGeometry args={[12.5, 36]} />
              <meshStandardMaterial color={s.kind === "park" ? CITY.park : CITY.sidewalk} transparent opacity={s.kind === "park" ? 0 : 0.9} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** A small building in the place's own color, with an icon pin on top (labelled once you zoom in). */
function Landmarks({ places, picked, onPick }: { places: Place[]; picked: Place | null; onPick: (p: Place) => void }) {
  return (
    <group>
      {places.map((p) => {
        const spot = placeSpot(p, places);
        const prop = ROOMS[p.roomId]?.props.find((x) => `prop:${x.id}` === p.target);
        const color = prop?.color ?? (p.icon === "🌳" ? CITY.park : "#e9e4da");
        const on = picked?.key === p.key;
        const h = prop?.kind === "building" ? 2.4 : 0.6;
        return (
          <group key={p.key} position={[spot.x, 0, spot.z]}>
            <mesh
              position={[0, h / 2, 0]}
              castShadow
              onClick={(e) => {
                e.stopPropagation();
                onPick(p);
              }}
            >
              <boxGeometry args={[2, h, 2]} />
              <meshStandardMaterial color={color} emissive={on ? "#f3a712" : "#000000"} emissiveIntensity={on ? 0.6 : 0} />
            </mesh>
            <mesh position={[0, h + 0.06, 0]}>
              <boxGeometry args={[2.1, 0.12, 2.1]} />
              <meshStandardMaterial color="#f4f1ea" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function SubwayLines({ lineStatus }: { lineStatus: (l: string) => string }) {
  const links = useMemo(() => {
    const out: { key: string; line: string; a: { x: number; z: number }; b: { x: number; z: number } }[] = [];
    for (let i = 0; i < STREETS.length; i++) {
      for (let j = i + 1; j < STREETS.length; j++) {
        const a = STREETS[i]!;
        const b = STREETS[j]!;
        const line = a.station?.lines.find((l) => b.station?.lines.includes(l));
        if (line) out.push({ key: `${a.id}-${b.id}`, line, a: hoodCenter(a.id), b: hoodCenter(b.id) });
      }
    }
    return out;
  }, []);
  return (
    <group>
      {links.map((l) => {
        const len = Math.hypot(l.b.x - l.a.x, l.b.z - l.a.z);
        const ok = lineStatus(l.line) === "good";
        const c = lineColor(l.line);
        return (
          <mesh key={l.key} position={[(l.a.x + l.b.x) / 2, 0.35, (l.a.z + l.b.z) / 2]} rotation-y={-Math.atan2(l.b.z - l.a.z, l.b.x - l.a.x)}>
            <boxGeometry args={[len, 0.25, 0.55]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={ok ? 1.4 : 0.3} toneMapped={!ok} transparent opacity={ok ? 1 : 0.5} />
          </mesh>
        );
      })}
    </group>
  );
}

function YouAreHere({ roomId }: { roomId: string }) {
  const c = hoodCenter(roomId);
  const ring = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const k = (clock.elapsedTime % 1.6) / 1.6;
    if (ring.current) {
      ring.current.scale.setScalar(1 + k * 2.5);
      (ring.current.material as { opacity: number }).opacity = 0.6 * (1 - k);
    }
  });
  return (
    <group position={[c.x, 0, c.z]}>
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.9, 20, 16]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.15, 0]}>
        <ringGeometry args={[1.1, 1.5, 32]} />
        <meshBasicMaterial color="#60a5fa" transparent />
      </mesh>
    </group>
  );
}

/** A glowing arc from where you are to where you're going. */
function Route({ from, to }: { from: { x: number; z: number }; to: { x: number; z: number } }) {
  const curve = useMemo(() => {
    const mid = new Vector3((from.x + to.x) / 2, Math.hypot(to.x - from.x, to.z - from.z) * 0.22 + 4, (from.z + to.z) / 2);
    return new CatmullRomCurve3([new Vector3(from.x, 1.2, from.z), mid, new Vector3(to.x, 3, to.z)]);
  }, [from.x, from.z, to.x, to.z]);
  return (
    <mesh>
      <tubeGeometry args={[curve, 48, 0.28, 8, false]} />
      <meshStandardMaterial color="#ffffff" emissive="#fff6e0" emissiveIntensity={2.2} toneMapped={false} />
    </mesh>
  );
}

/** Small deterministic PRNG so the map looks the same every time. */
function rng(seed: number) {
  let h = seed >>> 0;
  return () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 4294967296;
  };
}

/** Height of a place's landmark, so its pin sits on the roof. */
export function landmarkHeight(p: Place) {
  const prop = ROOMS[p.roomId]?.props.find((x) => `prop:${x.id}` === p.target);
  return prop?.kind === "building" ? 2.4 : 0.6;
}

/**
 * The map's DOM labels (neighborhood names, place pins, "You"), positioned over the 3D scene each
 * frame by the LabelProjector inside MapScene.
 */
export function MapLabels({
  anchors,
  places,
  hereId,
  focus,
  picked,
  onFocus,
  onPick,
}: {
  anchors: LabelAnchors;
  places: Place[];
  hereId: string | null;
  focus: string | null;
  picked: Place | null;
  onFocus: (id: string) => void;
  onPick: (p: Place) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {places.map((p) => {
        const spot = placeSpot(p, places);
        const on = picked?.key === p.key;
        const show = focus === p.roomId || on;
        return (
          <div key={p.key} ref={anchorRef(anchors, `place:${p.key}`, () => [spot.x, landmarkHeight(p) + 1.4, spot.z])} className="absolute left-0 top-0">
            <button
              onClick={() => onPick(p)}
              className={`pointer-events-auto flex items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-1 text-[11px] font-semibold shadow-lg ${
                on ? "bg-[#f3a712] text-black" : "bg-white text-[#1d1830]"
              }`}
            >
              <span className="text-sm leading-none">{p.icon}</span>
              {show && <span className="pr-1">{p.label}</span>}
            </button>
          </div>
        );
      })}
      {STREETS.map((s) => {
        const c = hoodCenter(s.id);
        return (
          <div key={s.id} ref={anchorRef(anchors, `hood:${s.id}`, () => [c.x, 0, c.z + 14])} className="absolute left-0 top-0">
            <button
              onClick={() => onFocus(s.id)}
              className="pointer-events-auto whitespace-nowrap rounded-full bg-[#1d1830]/85 px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg backdrop-blur"
            >
              {s.neighborhood}
            </button>
          </div>
        );
      })}
      {hereId && (
        <div ref={anchorRef(anchors, "you", () => { const c = hoodCenter(hereId); return [c.x, 3.4, c.z]; })} className="absolute left-0 top-0">
          <span className="rounded-full bg-[#3b82f6] px-2 py-0.5 text-[10px] font-bold text-white shadow">You</span>
        </div>
      )}
    </div>
  );
}
