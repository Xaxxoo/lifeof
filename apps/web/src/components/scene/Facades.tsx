"use client";

import { useFrame } from "@react-three/fiber";
import type { Architecture, DistrictStyle, Prop } from "@nyl/content";
import { useEffect, useMemo, useRef } from "react";
import { BoxGeometry, CanvasTexture, type Mesh, type MeshStandardMaterial, SRGBColorSpace } from "three";
import { buildingMaterial, tint } from "./palette";

const UNIT_BOX = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const IRON = "#1c1a20";

/** How tall each kind of building is, before its own variation. */
const HEIGHT: Record<Architecture, [number, number]> = {
  rowhouse: [2.3, 2.9],
  brownstone: [3.3, 3.9],
  tenement: [4.3, 5.5],
  warehouse: [2.5, 3.1],
  loft: [3.9, 5.2],
  glass: [6.5, 9.5],
  stone: [4.6, 6.2],
};

/** How much of the shop's own color survives on its walls. Painted rowhouses keep most of it. */
const KEEP: Record<Architecture, number> = {
  rowhouse: 0.3,
  brownstone: 0.7,
  tenement: 0.55,
  warehouse: 0.6,
  loft: 0.6,
  glass: 0.75,
  stone: 0.75,
};

export function archOf(p: Prop, style: DistrictStyle): Architecture {
  return p.arch ?? style.architecture;
}

/** Each building gets its own steady height inside its kind's range, so the row has a skyline. */
export function buildingHeight(p: Prop, style: DistrictStyle) {
  const [lo, hi] = HEIGHT[archOf(p, style)];
  return lo + ((hash(p.id) % 7) / 6) * (hi - lo);
}

/** A storefront on the block, built the way its neighborhood builds. */
export function Building({ prop: p, night, style }: { prop: Prop; night: boolean; style: DistrictStyle }) {
  const arch = archOf(p, style);
  const cx = p.x + p.w / 2;
  const cz = p.y + p.h / 2;
  const height = buildingHeight(p, style);
  const front = p.h / 2;
  const wall = arch === "stone" ? "#cfc7b8" : arch === "brownstone" ? "#6b4434" : tint(p.color, KEEP[arch], style.palette.wall);
  const material = useMemo(() => buildingMaterial({ color: wall, base: 1.45, glass: arch === "glass" ? 1 : 0 }), [wall, arch]);
  useEffect(() => () => material.dispose(), [material]);
  const decor = style.decor;
  const seed = hash(p.id);
  const residential = p.tags?.includes("residential");

  return (
    <group position={[cx, 0, cz]}>
      <mesh geometry={UNIT_BOX} material={material} scale={[p.w - 0.05, height, p.h]} castShadow receiveShadow />

      {/* Ground floor: an awning and a lit window, or a roll-down gate on a warehouse that isn't a shop. */}
      {arch === "warehouse" && !p.actions?.length ? (
        <Gate w={p.w} front={front} graffiti={decor.includes("graffiti")} seed={seed} />
      ) : (
        <>
          <mesh position={[0, 1.15, front + (arch === "rowhouse" ? 0.35 : 0.2)]} rotation-x={arch === "rowhouse" ? 0.25 : 0} castShadow>
            <boxGeometry args={[p.w - 0.4, 0.08, arch === "rowhouse" ? 0.8 : 0.5]} />
            <meshStandardMaterial color={p.color ?? "#1d1f24"} />
          </mesh>
          <mesh position={[0, 0.6, front + 0.01]}>
            <planeGeometry args={[p.w - 0.8, 0.8]} />
            <meshStandardMaterial
              color={night ? "#ffe2a8" : "#b9b2d6"}
              emissive="#ffc46b"
              emissiveIntensity={night ? 2.2 : 0.25}
              toneMapped={false}
            />
          </mesh>
        </>
      )}

      {/* A sign board over the awning on painted storefronts. */}
      {arch === "rowhouse" && (
        <mesh position={[0, 1.55, front + 0.04]}>
          <boxGeometry args={[p.w - 0.5, 0.42, 0.06]} />
          <meshStandardMaterial color={p.color ?? "#f4f1ea"} emissive={p.color ?? "#000"} emissiveIntensity={night ? 0.6 : 0.05} />
        </mesh>
      )}

      {arch === "brownstone" && <Brownstone w={p.w} height={height} front={front} stoop={!!residential} />}
      {arch === "tenement" && <FireEscape w={p.w} height={height} front={front} side={seed % 2 ? 1 : -1} />}
      {arch === "loft" && <Pilasters w={p.w} height={height} front={front} />}
      {arch === "stone" && <Columns w={p.w} height={height} front={front} />}
      {arch === "glass" && <GlassCrown w={p.w} height={height} front={front} night={night} />}
      {(arch === "tenement" || arch === "loft" || arch === "brownstone") && <Cornice w={p.w} height={height} depth={p.h} color={arch === "brownstone" ? "#4a2e22" : "#3a3036"} />}

      {decor.includes("murals") && arch !== "glass" && seed % 3 !== 1 && (
        <Mural w={p.w} height={height} front={front} seed={seed} />
      )}
      {decor.includes("neon") && <NeonBlade w={p.w} front={front} color={p.color ?? "#ff3fa4"} night={night} seed={seed} />}
      {decor.includes("flags") && seed % 2 === 0 && <FlagPole front={front} height={Math.min(height - 0.6, 3.4)} />}

      {/* Rooftop water tower on wide low-rise buildings: the most New York thing on any roof. */}
      {p.w >= 4 && arch !== "glass" && arch !== "stone" && arch !== "rowhouse" && (
        <group position={[p.w / 2 - 0.8, height, -0.3]}>
          {[-0.22, 0.22].map((dx) =>
            [-0.22, 0.22].map((dz) => (
              <mesh key={`${dx}${dz}`} position={[dx, 0.2, dz]}>
                <boxGeometry args={[0.04, 0.4, 0.04]} />
                <meshStandardMaterial color={IRON} />
              </mesh>
            )),
          )}
          <mesh position={[0, 0.7, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.6, 10]} />
            <meshStandardMaterial color="#6b4f4a" />
          </mesh>
          <mesh position={[0, 1.13, 0]}>
            <coneGeometry args={[0.38, 0.3, 10]} />
            <meshStandardMaterial color="#4a3a3e" />
          </mesh>
        </group>
      )}
    </group>
  );
}

/** Heavy cornice along the roofline. */
function Cornice({ w, height, depth, color }: { w: number; height: number; depth: number; color: string }) {
  const brackets = Math.max(2, Math.round(w));
  return (
    <group>
      <mesh position={[0, height - 0.05, 0.1]} castShadow>
        <boxGeometry args={[w + 0.12, 0.22, depth + 0.3]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Brackets under it */}
      {Array.from({ length: brackets }, (_, i) => (
        <mesh key={i} position={[-w / 2 + 0.3 + (i * (w - 0.6)) / (brackets - 1), height - 0.3, depth / 2 + 0.18]}>
          <boxGeometry args={[0.1, 0.28, 0.16]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
}

/** Brownstone: a bay window up the front and, on houses, a high stoop with iron railings. */
function Brownstone({ w, height, front, stoop }: { w: number; height: number; front: number; stoop: boolean }) {
  return (
    <group>
      <mesh position={[-w / 4, 1.5, front + 0.18]} castShadow>
        <boxGeometry args={[w * 0.38, height - 1.8, 0.36]} />
        <meshStandardMaterial color="#5e3a2c" />
      </mesh>
      {/* Lintels over the upper windows */}
      {Array.from({ length: Math.floor((height - 1.6) / 0.72) }, (_, i) => (
        <mesh key={i} position={[w / 4, 1.85 + i * 0.72, front + 0.03]}>
          <boxGeometry args={[w * 0.4, 0.06, 0.06]} />
          <meshStandardMaterial color="#c8b49a" />
        </mesh>
      ))}
      {stoop && (
        <group position={[w / 4, 0, front]}>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[0, 0.09 + i * 0.16, 0.42 - i * 0.12]} castShadow receiveShadow>
              <boxGeometry args={[0.8, 0.18 + i * 0.16, 0.24]} />
              <meshStandardMaterial color="#5a382a" />
            </mesh>
          ))}
          {[-0.42, 0.42].map((dx) => (
            <mesh key={dx} position={[dx, 0.55, 0.3]} rotation-x={-0.55}>
              <boxGeometry args={[0.03, 0.03, 0.9]} />
              <meshStandardMaterial color={IRON} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

/** Black fire escape: a landing at every floor and a ladder zigzagging between them. */
function FireEscape({ w, height, front, side }: { w: number; height: number; front: number; side: number }) {
  const floors = Math.floor((height - 1.7) / 0.72);
  const fw = Math.min(w * 0.55, 2.4);
  const x = side * (w / 2 - fw / 2 - 0.25);
  return (
    <group position={[x, 0, front]}>
      {Array.from({ length: floors }, (_, i) => {
        const y = 1.75 + i * 0.72;
        return (
          <group key={i} position={[0, y, 0.22]}>
            <mesh>
              <boxGeometry args={[fw, 0.03, 0.42]} />
              <meshStandardMaterial color={IRON} />
            </mesh>
            {/* Railing */}
            <mesh position={[0, 0.3, 0.2]}>
              <boxGeometry args={[fw, 0.03, 0.03]} />
              <meshStandardMaterial color={IRON} />
            </mesh>
            {Array.from({ length: 5 }, (_, k) => (
              <mesh key={k} position={[-fw / 2 + (k * fw) / 4, 0.15, 0.2]}>
                <boxGeometry args={[0.02, 0.3, 0.02]} />
                <meshStandardMaterial color={IRON} />
              </mesh>
            ))}
            {/* Ladder down to the floor below, alternating direction */}
            {i > 0 && (
              <mesh position={[0, -0.36, 0.05]} rotation-z={(i % 2 ? 1 : -1) * Math.atan2(0.72, fw * 0.8)}>
                <boxGeometry args={[Math.hypot(fw * 0.8, 0.72), 0.04, 0.14]} />
                <meshStandardMaterial color={IRON} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

/** Cast-iron columns up a converted factory. */
function Pilasters({ w, height, front }: { w: number; height: number; front: number }) {
  const n = Math.max(2, Math.round(w / 1.1) + 1);
  return (
    <group>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[-w / 2 + 0.06 + (i * (w - 0.12)) / (n - 1), height / 2 + 0.7, front + 0.04]}>
          <boxGeometry args={[0.1, height - 1.4, 0.08]} />
          <meshStandardMaterial color="#2a2428" />
        </mesh>
      ))}
      <mesh position={[0, 1.35, front + 0.05]}>
        <boxGeometry args={[w, 0.12, 0.1]} />
        <meshStandardMaterial color="#2a2428" />
      </mesh>
    </group>
  );
}

/** Pale stone with a row of columns and a pediment, like the Stock Exchange and Federal Hall. */
function Columns({ w, height, front }: { w: number; height: number; front: number }) {
  const n = Math.max(4, Math.round(w));
  const colH = Math.min(height - 1.2, 3.2);
  return (
    <group position={[0, 0, front]}>
      <mesh position={[0, 0.08, 0.35]} receiveShadow>
        <boxGeometry args={[w - 0.1, 0.16, 0.7]} />
        <meshStandardMaterial color="#d8d2c4" />
      </mesh>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[-w / 2 + 0.4 + (i * (w - 0.8)) / (n - 1), 0.16 + colH / 2, 0.45]} castShadow>
          <cylinderGeometry args={[0.13, 0.15, colH, 12]} />
          <meshStandardMaterial color="#ece6d8" />
        </mesh>
      ))}
      <mesh position={[0, colH + 0.3, 0.42]} castShadow>
        <boxGeometry args={[w - 0.1, 0.28, 0.6]} />
        <meshStandardMaterial color="#e2dccd" />
      </mesh>
      {/* Pediment */}
      {/* A three-sided prism standing point-up makes the triangle. */}
      <mesh position={[0, colH + 0.74, 0.42]} rotation-x={-Math.PI / 2} scale={[(w - 0.1) / 1.73, 0.55, 0.6]} castShadow>
        <cylinderGeometry args={[1, 1, 1, 3]} />
        <meshStandardMaterial color="#e2dccd" />
      </mesh>
    </group>
  );
}

/** A lit crown on top of a glass tower. */
function GlassCrown({ w, height, front, night }: { w: number; height: number; front: number; night: boolean }) {
  return (
    <group>
      <mesh position={[0, height + 0.15, 0]}>
        <boxGeometry args={[w - 0.6, 0.3, 2.2]} />
        <meshStandardMaterial color="#3a4a5e" emissive="#bfe3ff" emissiveIntensity={night ? 1.4 : 0.1} toneMapped={!night} />
      </mesh>
      <mesh position={[0, 1.4, front + 0.04]}>
        <boxGeometry args={[w - 0.1, 0.1, 0.08]} />
        <meshStandardMaterial color="#9aa8b8" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

/** A roll-down gate, tagged if the block has graffiti. */
function Gate({ w, front, graffiti, seed }: { w: number; front: number; graffiti: boolean; seed: number }) {
  const tex = useMemo(() => (graffiti ? graffitiTexture(seed) : null), [graffiti, seed]);
  useEffect(() => () => tex?.dispose(), [tex]);
  return (
    <group position={[0, 0, front + 0.02]}>
      <mesh position={[0, 0.65, 0]}>
        <planeGeometry args={[w - 0.5, 1.3]} />
        {tex ? <meshStandardMaterial map={tex} roughness={0.7} /> : <meshStandardMaterial color="#8a8a90" metalness={0.5} roughness={0.5} />}
      </mesh>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[0, 0.08 + i * 0.15, 0.01]}>
          <boxGeometry args={[w - 0.5, 0.015, 0.01]} />
          <meshStandardMaterial color="#5a5a60" transparent opacity={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 1.38, 0.05]}>
        <boxGeometry args={[w - 0.4, 0.16, 0.12]} />
        <meshStandardMaterial color="#4a4a50" />
      </mesh>
    </group>
  );
}

/** A mural across the upper wall. */
function Mural({ w, height, front, seed }: { w: number; height: number; front: number; seed: number }) {
  const tex = useMemo(() => muralTexture(seed), [seed]);
  useEffect(() => () => tex.dispose(), [tex]);
  const mh = Math.min(height - 1.7, 2.4);
  if (mh < 0.6) return null;
  return (
    <mesh position={[0, 1.55 + mh / 2, front + 0.015]}>
      <planeGeometry args={[w - 0.3, mh]} />
      <meshStandardMaterial map={tex} roughness={0.85} />
    </mesh>
  );
}

/** A vertical neon sign off the corner of the building that flickers on at night. */
function NeonBlade({ w, front, color, night, seed }: { w: number; front: number; color: string; night: boolean; seed: number }) {
  const ref = useRef<Mesh>(null);
  const hue = NEON[seed % NEON.length]!;
  useFrame(({ clock }) => {
    const m = ref.current?.material as MeshStandardMaterial | undefined;
    if (!m) return;
    const t = clock.elapsedTime + seed;
    // A dodgy tube now and then.
    const flicker = seed % 4 === 0 && Math.sin(t * 13) > 0.92 ? 0.2 : 1;
    m.emissiveIntensity = night ? 3.2 * flicker : 0.3;
  });
  return (
    <group position={[(seed % 2 ? 1 : -1) * (w / 2 - 0.35), 2.4, front + 0.35]}>
      <mesh>
        <boxGeometry args={[0.08, 1.2, 0.5]} />
        <meshStandardMaterial color="#141018" />
      </mesh>
      <mesh ref={ref} position={[0, 0, 0]}>
        <boxGeometry args={[0.1, 1.05, 0.38]} />
        <meshStandardMaterial color={color} emissive={hue} emissiveIntensity={night ? 3 : 0.3} toneMapped={false} />
      </mesh>
    </group>
  );
}

const NEON = ["#ff3fa4", "#3ff7ff", "#ffcc33", "#7cff6b", "#ff5a4a", "#c77dff"];

function FlagPole({ front, height }: { front: number; height: number }) {
  return (
    <group position={[0, height, front]}>
      <mesh position={[0, 0, 0.45]} rotation-x={Math.PI / 2 - 0.5}>
        <cylinderGeometry args={[0.02, 0.02, 1]} />
        <meshStandardMaterial color="#d8d8d8" metalness={0.6} />
      </mesh>
      <group position={[0.32, 0.12, 0.8]}>
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={i} position={[0, -i * 0.07, 0]}>
            <boxGeometry args={[0.6, 0.07, 0.01]} />
            <meshStandardMaterial color={i % 2 ? "#f4f1ea" : "#b22234"} />
          </mesh>
        ))}
        <mesh position={[-0.17, -0.07, 0.01]}>
          <boxGeometry args={[0.26, 0.2, 0.01]} />
          <meshStandardMaterial color="#3c3b6e" />
        </mesh>
      </group>
    </group>
  );
}

// ── Painted textures ─────────────────────────────────────────────────────────

const MURAL_COLORS = [
  ["#ff6b6b", "#feca57", "#48dbfb", "#1dd1a1", "#5f27cd"],
  ["#f368e0", "#ff9f43", "#00d2d3", "#54a0ff", "#222f3e"],
  ["#e84118", "#fbc531", "#4cd137", "#00a8ff", "#9c88ff"],
];

function muralTexture(seed: number) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const g = c.getContext("2d")!;
  const rand = seeded(seed);
  const pal = MURAL_COLORS[seed % MURAL_COLORS.length]!;
  g.fillStyle = pal[4]!;
  g.fillRect(0, 0, 256, 128);
  // Big soft shapes, then a face or sun, then bold strokes.
  for (let i = 0; i < 9; i++) {
    g.fillStyle = pal[Math.floor(rand() * 4)]!;
    g.beginPath();
    g.ellipse(rand() * 256, rand() * 128, 20 + rand() * 70, 14 + rand() * 40, rand() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = pal[1]!;
  g.beginPath();
  g.arc(60 + rand() * 140, 64, 26, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#ffffff";
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(0, 100);
  for (let x = 0; x <= 256; x += 32) g.quadraticCurveTo(x + 16, 60 + rand() * 60, x + 32, 100);
  g.stroke();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

const TAGS = ["BK", "YES", "NYC", "LOVE", "L TRAIN", "RENT", "ZEN", "KAWS"];

function graffitiTexture(seed: number) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const g = c.getContext("2d")!;
  const rand = seeded(seed + 7);
  g.fillStyle = "#8a8a90";
  g.fillRect(0, 0, 256, 128);
  for (let y = 0; y < 128; y += 8) {
    g.fillStyle = y % 16 ? "#7e7e84" : "#94949a";
    g.fillRect(0, y, 256, 4);
  }
  for (let i = 0; i < 3; i++) {
    const pal = MURAL_COLORS[(seed + i) % MURAL_COLORS.length]!;
    g.font = `bold ${36 + rand() * 30}px Impact, sans-serif`;
    g.lineWidth = 6;
    g.strokeStyle = "#111";
    const word = TAGS[Math.floor(rand() * TAGS.length)]!;
    const x = rand() * 120;
    const y = 50 + rand() * 70;
    g.save();
    g.translate(x, y);
    g.rotate((rand() - 0.5) * 0.4);
    g.strokeText(word, 0, 0);
    g.fillStyle = pal[Math.floor(rand() * 4)]!;
    g.fillText(word, 0, 0);
    g.restore();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

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
