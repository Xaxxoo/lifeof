"use client";

import { useFrame } from "@react-three/fiber";
import type { Prop } from "@nyl/content";
import { useEffect, useMemo, useRef } from "react";
import { CanvasTexture, CatmullRomCurve3, type Group, SRGBColorSpace, Vector3 } from "three";

const BRONZE = { color: "#7a4e26", metalness: 0.75, roughness: 0.35 } as const;
const STONE = "#c9c0ae";
const STEEL = "#6f8090";

/** Landmarks and street furniture for Downtown and the bridge. */
export function DowntownProp({ prop: p, night }: { prop: Prop; night: boolean }) {
  const cx = p.x + p.w / 2;
  const cz = p.y + p.h / 2;
  switch (p.kind) {
    case "statue":
      return <ChargingBull x={cx} z={cz} />;
    case "bridgestairs":
      return <BridgeStairs prop={p} night={night} />;
    case "bridgegate":
      return p.h >= 4 ? <BridgeEnd prop={p} night={night} /> : <BridgeArch prop={p} night={night} />;
    case "bridgetower":
      return <BridgeTower x={cx} />;
    case "rail":
      return <Fence prop={p} />;
    case "vacantlot":
      return <VacantLot prop={p} night={night} />;
    case "newsstand":
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, 0.7, 0]} castShadow>
            <boxGeometry args={[0.9, 1.4, 0.8]} />
            <meshStandardMaterial color="#2f5d3a" />
          </mesh>
          <mesh position={[0, 1.5, 0.1]} castShadow>
            <boxGeometry args={[1.1, 0.08, 1.05]} />
            <meshStandardMaterial color="#244a2e" />
          </mesh>
          {[-0.28, 0, 0.28].map((dx, i) => (
            <mesh key={dx} position={[dx, 0.85, 0.41]}>
              <planeGeometry args={[0.22, 0.3]} />
              <meshStandardMaterial color={["#e63946", "#f3a712", "#457b9d"][i]} />
            </mesh>
          ))}
        </group>
      );
    default:
      return null;
  }
}

/** Bronze, head down, mid-charge. Everybody rubs the nose. */
function ChargingBull({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={0.15}>
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[1.9, 0.12, 0.9]} />
        <meshStandardMaterial color="#8a8478" />
      </mesh>
      <mesh position={[-0.1, 0.78, 0]} scale={[0.72, 0.36, 0.3]} castShadow>
        <sphereGeometry args={[1, 18, 14]} />
        <meshStandardMaterial {...BRONZE} />
      </mesh>
      {/* Shoulders hunched up */}
      <mesh position={[0.32, 0.92, 0]} scale={[0.36, 0.34, 0.32]} castShadow>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial {...BRONZE} />
      </mesh>
      <mesh position={[0.78, 0.62, 0]} rotation-z={-0.6} scale={[0.26, 0.2, 0.2]} castShadow>
        <sphereGeometry args={[1, 14, 10]} />
        <meshStandardMaterial {...BRONZE} />
      </mesh>
      {/* The shiny nose */}
      <mesh position={[0.95, 0.5, 0]} scale={[0.1, 0.1, 0.12]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color="#d8a860" metalness={0.9} roughness={0.15} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.8, 0.82, s * 0.2]} rotation={[s * -0.9, 0, -0.9]} castShadow>
          <coneGeometry args={[0.04, 0.38, 8]} />
          <meshStandardMaterial color="#c8a070" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      {[
        [0.42, 0.14],
        [0.42, -0.14],
        [-0.55, 0.14],
        [-0.55, -0.14],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx!, 0.32, lz!]} rotation-z={i < 2 ? -0.35 : 0.3} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 0.5, 8]} />
          <meshStandardMaterial {...BRONZE} />
        </mesh>
      ))}
      {/* Tail whipped up */}
      <mesh position={[-0.82, 0.98, 0]} rotation-z={0.9}>
        <cylinderGeometry args={[0.02, 0.03, 0.5, 6]} />
        <meshStandardMaterial {...BRONZE} />
      </mesh>
    </group>
  );
}

/**
 * An empty lot on a player-built block: gravel and weeds behind a chain-link fence with a sign. Once
 * someone owns it, the sign says "coming soon" and the construction barriers go up.
 */
function VacantLot({ prop: p, night }: { prop: Prop; night: boolean }) {
  const cx = p.x + p.w / 2;
  const cz = p.y + p.h / 2;
  const owned = /coming soon/i.test(p.label ?? "");
  const tex = useMemo(() => lotSignTexture(owned ? "COMING SOON" : "FOR SALE", owned ? "#f3a712" : "#c0392b"), [owned]);
  useEffect(() => () => tex.dispose(), [tex]);
  const weeds = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({ x: ((i * 37) % 31) / 31 - 0.5, z: ((i * 53) % 29) / 29 - 0.5, s: 0.6 + ((i * 17) % 7) / 10 })),
    [],
  );
  return (
    <group position={[cx, 0, cz]}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[p.w - 0.1, p.h - 0.1]} />
        <meshStandardMaterial color="#7a7468" roughness={1} />
      </mesh>
      {weeds.map((w, i) => (
        <mesh key={i} position={[w.x * (p.w - 0.6), 0.12 * w.s, w.z * (p.h - 0.6)]}>
          <coneGeometry args={[0.12 * w.s, 0.26 * w.s, 5]} />
          <meshStandardMaterial color={i % 3 ? "#5a7a3a" : "#6e8a44"} />
        </mesh>
      ))}
      {/* Chain-link along the sidewalk side and the two ends */}
      {(
        [
          [0, p.h / 2 - 0.05, p.w, 0],
          [-p.w / 2 + 0.05, 0, p.h, Math.PI / 2],
          [p.w / 2 - 0.05, 0, p.h, Math.PI / 2],
        ] as const
      ).map(([x, z, len, rot], i) => (
        <group key={i} position={[x, 0, z]} rotation-y={rot}>
          <mesh position={[0, 0.7, 0]}>
            <planeGeometry args={[len, 1.4]} />
            <meshStandardMaterial color="#a8b0b8" transparent opacity={0.3} side={2} />
          </mesh>
          <mesh position={[0, 1.4, 0]}>
            <boxGeometry args={[len, 0.04, 0.04]} />
            <meshStandardMaterial color="#6a7078" />
          </mesh>
          {Array.from({ length: Math.round(len) + 1 }, (_, k) => (
            <mesh key={k} position={[-len / 2 + (k * len) / Math.round(len), 0.7, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 1.4, 6]} />
              <meshStandardMaterial color="#6a7078" />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 1.25, p.h / 2 + 0.02]}>
        <planeGeometry args={[1.6, 0.8]} />
        <meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={night ? 0.4 : 0.05} />
      </mesh>
      {owned &&
        [-1, 1].map((s) => (
          <group key={s} position={[s * 1.1, 0, p.h / 2 - 0.5]}>
            <mesh position={[0, 0.35, 0]}>
              <boxGeometry args={[0.8, 0.5, 0.12]} />
              <meshStandardMaterial color="#ff7b00" />
            </mesh>
            <mesh position={[0, 0.4, 0.07]}>
              <boxGeometry args={[0.8, 0.1, 0.01]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          </group>
        ))}
    </group>
  );
}

function lotSignTexture(text: string, color: string) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 256, 128);
  g.fillStyle = color;
  g.fillRect(0, 0, 256, 18);
  g.fillRect(0, 110, 256, 18);
  g.font = "bold 40px Helvetica, Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 128, 64, 240);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** Stone stairs up to the bridge walkway, with the green sign. */
function BridgeStairs({ prop: p, night }: { prop: Prop; night: boolean }) {
  const cx = p.x + p.w / 2;
  const cz = p.y + p.h / 2;
  return (
    <group position={[cx, 0, cz]}>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[p.w / 2 - 0.2 - i * 0.3, 0.1 + i * 0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.32, 0.2 + i * 0.4, p.h - 0.3]} />
          <meshStandardMaterial color={STONE} />
        </mesh>
      ))}
      {/* Stone pier the walkway lands on */}
      <mesh position={[-p.w / 2 + 0.25, 1.6, 0]} castShadow>
        <boxGeometry args={[0.5, 3.2, p.h]} />
        <meshStandardMaterial color="#a89e8a" />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 1.15, s * (p.h / 2 - 0.12)]} rotation-z={0.58}>
          <boxGeometry args={[2.2, 0.05, 0.05]} />
          <meshStandardMaterial color="#1c1a20" />
        </mesh>
      ))}
      <Sign text="Manhattan Bridge ↗" position={[0.2, 2.6, p.h / 2 + 0.05]} night={night} />
    </group>
  );
}

/** The Manhattan Bridge Arch and Colonnade at Canal and Bowery, where the walkway starts. */
function BridgeArch({ prop: p, night }: { prop: Prop; night: boolean }) {
  const cx = p.x + p.w / 2;
  const cz = p.y + p.h / 2;
  return (
    <group position={[cx, 0, cz]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (p.w / 2 - 0.25), 1.4, 0]} castShadow>
          <boxGeometry args={[0.5, 2.8, p.h - 0.2]} />
          <meshStandardMaterial color={STONE} />
        </mesh>
      ))}
      <mesh position={[0, 2.8, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[p.w / 2 - 0.5, 0.22, 8, 20, Math.PI]} />
        <meshStandardMaterial color={STONE} />
      </mesh>
      <mesh position={[0, 3.25, 0]} castShadow>
        <boxGeometry args={[p.w + 0.2, 0.4, p.h]} />
        <meshStandardMaterial color="#d6cdb8" />
      </mesh>
      {/* A run of colonnade off to the side */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[-p.w / 2 - 0.4 - i * 0.45, 1.2, -p.h / 2 + 0.2]} castShadow>
          <cylinderGeometry args={[0.1, 0.12, 2.4, 10]} />
          <meshStandardMaterial color={STONE} />
        </mesh>
      ))}
      <Sign text="Manhattan Bridge →" position={[0, 2.2, p.h / 2 + 0.05]} night={night} />
    </group>
  );
}

/** Each end of the walkway: stone posts and a sign for where it lets out. */
function BridgeEnd({ prop: p, night }: { prop: Prop; night: boolean }) {
  const cx = p.x + p.w / 2;
  const cz = p.y + p.h / 2;
  return (
    <group position={[cx, 0, cz]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 1.1, s * (p.h / 2 - 0.3)]} castShadow>
          <boxGeometry args={[0.7, 2.2, 0.6]} />
          <meshStandardMaterial color={STONE} />
        </mesh>
      ))}
      <Sign text={`${p.label} →`} position={[0, 2.5, 0]} rotY={p.x === 0 ? Math.PI / 2 : -Math.PI / 2} night={night} wide />
    </group>
  );
}

/** One leg of a steel tower and its twin on the far side of the walkway, with the portal beam. */
function BridgeTower({ x }: { x: number }) {
  const h = 15;
  return (
    <group position={[x, 0, 0]}>
      {[0.9, 9.6].map((z) => (
        <group key={z} position={[0, 0, z]}>
          {/* The near leg would hide the walkway, so it's see-through. */}
          <mesh position={[0, h / 2 - 1, 0]} castShadow={z < 5}>
            <boxGeometry args={[1.5, h + 2, 1.2]} />
            <meshStandardMaterial color={STEEL} metalness={0.4} roughness={0.55} transparent={z > 5} opacity={z > 5 ? 0.22 : 1} depthWrite={z < 5} />
          </mesh>
          {/* Lattice panels */}
          {z < 5 && Array.from({ length: 6 }, (_, i) => (
            <mesh key={i} position={[0, 2 + i * 2.2, 0.61]} rotation-z={i % 2 ? 0.6 : -0.6}>
              <boxGeometry args={[1.6, 0.08, 0.04]} />
              <meshStandardMaterial color="#56636f" />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, h - 1.2, 5.25]} castShadow>
        <boxGeometry args={[1.4, 1.4, 9.8]} />
        <meshStandardMaterial color={STEEL} metalness={0.4} roughness={0.55} />
      </mesh>
      <mesh position={[0, h + 0.2, 5.25]}>
        <boxGeometry args={[1.8, 0.4, 10.4]} />
        <meshStandardMaterial color="#56636f" />
      </mesh>
    </group>
  );
}

/** Chain-link and steel along the walkway. */
function Fence({ prop: p }: { prop: Prop }) {
  const z = p.y + 0.5;
  return (
    <group>
      <mesh position={[p.x + p.w / 2, 1.3, z]}>
        <boxGeometry args={[p.w, 0.06, 0.06]} />
        <meshStandardMaterial color="#3a3f48" />
      </mesh>
      <mesh position={[p.x + p.w / 2, 0.65, z]}>
        <planeGeometry args={[p.w, 1.3]} />
        <meshStandardMaterial color="#9aa4b0" transparent opacity={0.28} side={2} />
      </mesh>
      {Array.from({ length: Math.floor(p.w / 1.5) + 1 }, (_, i) => (
        <mesh key={i} position={[p.x + i * 1.5, 0.65, z]}>
          <boxGeometry args={[0.06, 1.3, 0.06]} />
          <meshStandardMaterial color="#3a3f48" />
        </mesh>
      ))}
    </group>
  );
}

/** A green city street sign with white letters. */
function Sign({ text, position, night, rotY = 0, wide }: { text: string; position: [number, number, number]; night: boolean; rotY?: number; wide?: boolean }) {
  const tex = useMemo(() => signTexture(text), [text]);
  useEffect(() => () => tex.dispose(), [tex]);
  const w = wide ? 3.6 : 1.8;
  return (
    <mesh position={position} rotation-y={rotY}>
      <planeGeometry args={[w, w / 5]} />
      <meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={night ? 0.5 : 0.1} side={2} />
    </mesh>
  );
}

function signTexture(text: string) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 102;
  const g = c.getContext("2d")!;
  g.fillStyle = "#14633a";
  g.fillRect(0, 0, 512, 102);
  g.strokeStyle = "#ffffff";
  g.lineWidth = 5;
  g.strokeRect(6, 6, 500, 90);
  g.fillStyle = "#ffffff";
  g.font = "bold 46px Helvetica, Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 256, 54, 480);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

// ── Clubs ────────────────────────────────────────────────────────────────────

export function ClubProp({ prop: p }: { prop: Prop }) {
  const cx = p.x + p.w / 2;
  const cz = p.y + p.h / 2;
  switch (p.kind) {
    case "vipbooth":
      return <VipBooth prop={p} />;
    case "speaker":
      return <Speaker x={cx} z={cz} />;
    case "photobooth":
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, 1.1, -0.05]} castShadow>
            <boxGeometry args={[0.9, 2.2, 0.8]} />
            <meshStandardMaterial color="#1a1a22" />
          </mesh>
          <mesh position={[0, 0.95, 0.36]}>
            <planeGeometry args={[0.6, 1.6]} />
            <meshStandardMaterial color="#a3212f" roughness={0.9} />
          </mesh>
          <mesh position={[0, 2.05, 0.36]}>
            <planeGeometry args={[0.8, 0.22]} />
            <meshStandardMaterial color="#ffcc33" emissive="#ffcc33" emissiveIntensity={2.4} toneMapped={false} />
          </mesh>
        </group>
      );
    case "restroom":
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0.35, 1.05, 0]}>
            <boxGeometry args={[0.08, 2.1, 0.9]} />
            <meshStandardMaterial color="#2a2a33" />
          </mesh>
          <mesh position={[0.3, 2.35, 0]} rotation-y={-Math.PI / 2}>
            <planeGeometry args={[0.7, 0.24]} />
            <meshStandardMaterial color="#3ff7ff" emissive="#3ff7ff" emissiveIntensity={2} toneMapped={false} />
          </mesh>
        </group>
      );
    case "rope":
      return <VelvetRope prop={p} />;
    default:
      return null;
  }
}

/** A plush booth behind the rope, with a bottle on ice. */
function VipBooth({ prop: p }: { prop: Prop }) {
  const cx = p.x + p.w / 2;
  const cz = p.y + p.h / 2;
  const sparkle = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (sparkle.current) sparkle.current.scale.setScalar(0.8 + Math.abs(Math.sin(clock.elapsedTime * 9)) * 0.5);
  });
  return (
    <group position={[cx, 0, cz]}>
      {/* U-shaped velvet sofa against the wall */}
      <mesh position={[-p.w / 2 + 0.3, 0.45, 0]} castShadow>
        <boxGeometry args={[0.5, 0.9, p.h - 0.1]} />
        <meshStandardMaterial color="#4b1d6b" roughness={0.95} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0.3, s * (p.h / 2 - 0.25)]} castShadow>
          <boxGeometry args={[p.w - 0.1, 0.6, 0.45]} />
          <meshStandardMaterial color="#5a2580" roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0.2, 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.06, 20]} />
        <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0.2, 0.62, 0]}>
        <cylinderGeometry args={[0.13, 0.1, 0.32, 14]} />
        <meshStandardMaterial color="#c0c8d0" metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[0.2, 0.92, 0]}>
        <cylinderGeometry args={[0.035, 0.06, 0.42, 10]} />
        <meshStandardMaterial color="#123d22" metalness={0.3} roughness={0.2} />
      </mesh>
      {/* A sparkler in the bottle */}
      <group ref={sparkle} position={[0.2, 1.2, 0]}>
        <mesh>
          <sphereGeometry args={[0.07, 8, 6]} />
          <meshBasicMaterial color={[6, 5, 2.5]} toneMapped={false} />
        </mesh>
      </group>
      <pointLight position={[0.2, 1.3, 0]} color="#ffd27a" intensity={3} distance={3.5} />
    </group>
  );
}

/** A speaker stack whose woofers thump on the beat. */
function Speaker({ x, z }: { x: number; z: number }) {
  const cones = useRef<Group>(null);
  useFrame(({ clock }) => {
    const beat = Math.pow(Math.max(0, Math.sin(clock.elapsedTime * Math.PI * 2 * 2.07)), 8);
    if (cones.current) cones.current.scale.set(1, 1, 1 + beat * 0.8);
  });
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1, 0]} castShadow>
        <boxGeometry args={[0.85, 2, 0.75]} />
        <meshStandardMaterial color="#121214" roughness={0.6} />
      </mesh>
      <group ref={cones} position={[0, 0, 0.38]}>
        {[0.55, 1.25].map((y, i) => (
          <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[i ? 0.22 : 0.3, i ? 0.22 : 0.3, 0.04, 20]} />
            <meshStandardMaterial color="#2a2a30" />
          </mesh>
        ))}
        <mesh position={[0, 1.75, 0]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.08, 0.08, 0.04, 12]} />
          <meshStandardMaterial color="#3ff7ff" emissive="#3ff7ff" emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** Brass posts and red velvet. */
function VelvetRope({ prop: p }: { prop: Prop }) {
  const x = p.x + 0.5;
  const z0 = p.y + 0.15;
  const z1 = p.y + p.h - 0.15;
  const curve = useMemo(
    () => new CatmullRomCurve3([new Vector3(x, 0.85, z0), new Vector3(x, 0.6, (z0 + z1) / 2), new Vector3(x, 0.85, z1)]),
    [x, z0, z1],
  );
  return (
    <group>
      {[z0, z1].map((z) => (
        <group key={z} position={[x, 0, z]}>
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.9, 10]} />
            <meshStandardMaterial color="#d4af37" metalness={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.14, 0.16, 0.06, 16]} />
            <meshStandardMaterial color="#d4af37" metalness={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.92, 0]}>
            <sphereGeometry args={[0.06, 10, 8]} />
            <meshStandardMaterial color="#d4af37" metalness={0.85} roughness={0.2} />
          </mesh>
        </group>
      ))}
      <mesh>
        <tubeGeometry args={[curve, 16, 0.035, 6, false]} />
        <meshStandardMaterial color="#9e1b32" roughness={0.9} />
      </mesh>
    </group>
  );
}
