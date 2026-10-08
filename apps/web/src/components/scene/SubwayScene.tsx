"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useLayoutEffect, useMemo, useRef } from "react";
import { CanvasTexture, Color, Fog, Object3D, SRGBColorSpace, type Group, type InstancedMesh } from "three";
import { lineColor } from "../LineBullet";

/**
 * The ride, in 3D: a cutaway tunnel with a four-car train that pulls out of your station, runs the
 * tunnel and slows into the next platform. `progress` (0–1) is the real ride's progress.
 */
const PLATFORM = 46;
const TUNNEL = 330;
const LENGTH = PLATFORM * 2 + TUNNEL;
const CAR = 6.6;
const CARS = 4;
const START_X = PLATFORM - 4;
const END_X = LENGTH - 6;

/** Trapezoid speed profile: speed up for the first fifth, cruise, slow down for the last fifth. */
function travelled(p: number) {
  const ta = 0.2;
  const v = 1 / (1 - ta);
  if (p < ta) return (0.5 * v * p * p) / ta;
  if (p > 1 - ta) return 1 - (0.5 * v * (1 - p) * (1 - p)) / ta;
  return 0.5 * v * ta + v * (p - ta);
}

export function SubwayScene({ progress, line, from, to }: { progress: () => number; line: string; from: string; to: string }) {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ fov: 42, position: [START_X - 12, 3.4, 10], near: 0.1, far: 140 }}>
      <SceneSetup />
      <ambientLight intensity={0.55} color="#c9d0ff" />
      <hemisphereLight args={["#fff1d6", "#2a2a33", 0.7]} />
      <directionalLight position={[-20, 12, 18]} intensity={0.9} color="#fff4e0" />
      <Station x={0} name={from} />
      <Station x={LENGTH - PLATFORM} name={to} />
      <Tunnel />
      <Train progress={progress} line={line} />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.25} intensity={0.9} radius={0.65} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  );
}

function SceneSetup() {
  const get = useThree((s) => s.get);
  useLayoutEffect(() => {
    const { scene } = get();
    scene.background = new Color("#07070b");
    scene.fog = new Fog("#07070b", 30, 85);
  }, [get]);
  return null;
}

function Train({ progress, line }: { progress: () => number; line: string }) {
  const ref = useRef<Group>(null);
  const color = lineColor(line);
  useFrame(({ clock, camera }) => {
    const p = Math.min(1, Math.max(0, progress()));
    const x = START_X + (END_X - START_X) * travelled(p);
    const speed = p > 0.2 && p < 0.8 ? 1 : p < 0.2 ? p / 0.2 : (1 - p) / 0.2;
    if (ref.current) {
      ref.current.position.x = x;
      ref.current.position.y = Math.sin(clock.elapsedTime * 23) * 0.012 * speed;
    }
    // Follow the train from the platform side, a little behind its nose.
    const shake = Math.sin(clock.elapsedTime * 17) * 0.02 * speed;
    camera.position.set(x - 17 + speed * 3, 5.2 + shake, 15);
    camera.lookAt(x - 6, 1.3, -0.5);
  });
  return (
    <group ref={ref}>
      {Array.from({ length: CARS }, (_, i) => (
        <Car key={i} x={-i * (CAR + 0.35)} color={color} front={i === 0} back={i === CARS - 1} line={line} />
      ))}
      <pointLight position={[-CAR, 2.6, 3]} intensity={40} distance={18} color="#fff1d6" />
      <pointLight position={[-CAR * 3, 2.6, 3]} intensity={30} distance={18} color="#fff1d6" />
      <pointLight position={[4, 1.2, 0]} intensity={18} distance={16} color="#ffffff" />
    </group>
  );
}

function Car({ x, color, front, back, line }: { x: number; color: string; front: boolean; back: boolean; line: string }) {
  const silver = { color: "#c9ced6", metalness: 0.75, roughness: 0.32 };
  const bullet = useSignTexture(line, color);
  const windows = [-2.4, -1.2, 1.2, 2.4];
  const doors = [-1.8, 0, 1.8];
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 1.18, 0]} castShadow>
        <boxGeometry args={[CAR, 1.65, 1.5]} />
        <meshStandardMaterial {...silver} />
      </mesh>
      <mesh position={[0, 2.06, 0]}>
        <boxGeometry args={[CAR - 0.1, 0.12, 1.36]} />
        <meshStandardMaterial color="#9aa0a8" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Line-color stripe and lit windows on the side facing you */}
      <mesh position={[0, 0.72, 0.756]}>
        <planeGeometry args={[CAR - 0.2, 0.08]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
      </mesh>
      {windows.map((wx) => (
        <mesh key={wx} position={[wx, 1.42, 0.757]}>
          <planeGeometry args={[0.9, 0.5]} />
          <meshStandardMaterial color="#f4e2b8" emissive="#ffdca0" emissiveIntensity={0.55} />
        </mesh>
      ))}
      {doors.map((dx) => (
        <group key={dx} position={[dx, 0, 0.757]}>
          <mesh position={[0, 1.08, 0]}>
            <planeGeometry args={[0.62, 1.45]} />
            <meshStandardMaterial color="#b4bac2" metalness={0.7} roughness={0.35} />
          </mesh>
          {[-0.15, 0.15].map((w) => (
            <mesh key={w} position={[w, 1.42, 0.002]}>
              <planeGeometry args={[0.22, 0.45]} />
              <meshStandardMaterial color="#f4e2b8" emissive="#ffdca0" emissiveIntensity={0.5} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Riders in the windows */}
      {windows.map((wx, k) => (
        <mesh key={`r${wx}`} position={[wx + (k % 2 ? 0.15 : -0.2), 1.35, 0.5]}>
          <capsuleGeometry args={[0.13, 0.28, 3, 8]} />
          <meshStandardMaterial color={["#3a2a22", "#1d3557", "#5a2a3a", "#2a3a2a"][k % 4]} />
        </mesh>
      ))}
      {/* Bogies */}
      {[-CAR / 2 + 1, CAR / 2 - 1].map((bx) => (
        <group key={bx} position={[bx, 0.2, 0]}>
          <mesh>
            <boxGeometry args={[1.4, 0.3, 1.3]} />
            <meshStandardMaterial color="#1b1b20" />
          </mesh>
          {[-0.45, 0.45].map((wx) => (
            <mesh key={wx} position={[wx, -0.05, 0.66]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.2, 0.2, 0.06, 14]} />
              <meshStandardMaterial color="#3a3a40" metalness={0.8} />
            </mesh>
          ))}
        </group>
      ))}
      {front && (
        <group position={[CAR / 2 + 0.01, 0, 0]}>
          <mesh position={[0, 1.55, 0]} rotation-y={Math.PI / 2}>
            <planeGeometry args={[0.9, 0.5]} />
            <meshStandardMaterial color="#111" emissive="#222" />
          </mesh>
          <mesh position={[0.01, 1.92, 0]} rotation-y={Math.PI / 2}>
            <circleGeometry args={[0.13, 24]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.8} toneMapped={false} />
          </mesh>
          {[-0.45, 0.45].map((z) => (
            <mesh key={z} position={[0.01, 0.75, z]} rotation-y={Math.PI / 2}>
              <circleGeometry args={[0.08, 16]} />
              <meshStandardMaterial color="#fff" emissive="#fff6e0" emissiveIntensity={4} toneMapped={false} />
            </mesh>
          ))}
          <mesh position={[0.01, 1.55, 0.38]} rotation-y={Math.PI / 2}>
            <planeGeometry args={[0.2, 0.2]} />
            <meshStandardMaterial map={bullet} toneMapped={false} />
          </mesh>
        </group>
      )}
      {back &&
        [-0.45, 0.45].map((z) => (
          <mesh key={z} position={[-CAR / 2 - 0.01, 0.75, z]} rotation-y={-Math.PI / 2}>
            <circleGeometry args={[0.07, 16]} />
            <meshStandardMaterial color="#ff3b3b" emissive="#ff2a2a" emissiveIntensity={3} toneMapped={false} />
          </mesh>
        ))}
    </group>
  );
}

/** The tunnel: track, ties, a back wall with lamps streaming past, and red/green signals. */
function Tunnel() {
  const ties = useRef<InstancedMesh>(null);
  const lamps = useRef<InstancedMesh>(null);
  const tieXs = useMemo(() => Array.from({ length: Math.floor(LENGTH / 0.9) }, (_, i) => i * 0.9), []);
  const lampXs = useMemo(() => Array.from({ length: Math.floor(TUNNEL / 7) }, (_, i) => PLATFORM + 3 + i * 7), []);
  useLayoutEffect(() => {
    const o = new Object3D();
    tieXs.forEach((x, i) => {
      o.position.set(x, 0.04, 0);
      o.updateMatrix();
      ties.current?.setMatrixAt(i, o.matrix);
    });
    lampXs.forEach((x, i) => {
      o.position.set(x, 3.1, -2.9);
      o.updateMatrix();
      lamps.current?.setMatrixAt(i, o.matrix);
    });
    if (ties.current) ties.current.instanceMatrix.needsUpdate = true;
    if (lamps.current) lamps.current.instanceMatrix.needsUpdate = true;
  }, [tieXs, lampXs]);

  return (
    <group>
      {/* Track bed and rails */}
      <mesh position={[LENGTH / 2, -0.05, 0]} receiveShadow>
        <boxGeometry args={[LENGTH, 0.1, 3.4]} />
        <meshStandardMaterial color="#2a2622" roughness={1} />
      </mesh>
      <instancedMesh ref={ties} args={[undefined, undefined, tieXs.length]}>
        <boxGeometry args={[0.22, 0.08, 2.0]} />
        <meshStandardMaterial color="#4a3a2e" />
      </instancedMesh>
      {[-0.72, 0.72].map((z) => (
        <mesh key={z} position={[LENGTH / 2, 0.13, z]}>
          <boxGeometry args={[LENGTH, 0.08, 0.07]} />
          <meshStandardMaterial color="#9aa0a6" metalness={0.9} roughness={0.25} />
        </mesh>
      ))}
      {/* Third rail */}
      <mesh position={[LENGTH / 2, 0.22, -1.25]}>
        <boxGeometry args={[LENGTH, 0.1, 0.12]} />
        <meshStandardMaterial color="#5a5a40" />
      </mesh>
      {/* Tunnel back wall, ceiling, and the cut edge on your side */}
      <mesh position={[PLATFORM + TUNNEL / 2, 2.3, -3]}>
        <boxGeometry args={[TUNNEL, 4.6, 0.2]} />
        <meshStandardMaterial color="#5c5850" roughness={1} />
      </mesh>
      <mesh position={[PLATFORM + TUNNEL / 2, 4.65, -0.6]}>
        <boxGeometry args={[TUNNEL, 0.25, 5]} />
        <meshStandardMaterial color="#2a2925" />
      </mesh>
      <mesh position={[PLATFORM + TUNNEL / 2, 0.3, 2.3]}>
        <boxGeometry args={[TUNNEL, 0.7, 0.5]} />
        <meshStandardMaterial color="#1a1916" />
      </mesh>
      {Array.from({ length: Math.floor(TUNNEL / 3.5) }, (_, i) => (
        <mesh key={i} position={[PLATFORM + 1.75 + i * 3.5, 2.3, -2.6]}>
          <boxGeometry args={[0.25, 4.6, 0.25]} />
          <meshStandardMaterial color="#45423b" />
        </mesh>
      ))}
      <instancedMesh ref={lamps} args={[undefined, undefined, lampXs.length]}>
        <boxGeometry args={[0.5, 0.12, 0.12]} />
        <meshStandardMaterial color="#fff6e0" emissive="#ffe8b8" emissiveIntensity={3} toneMapped={false} />
      </instancedMesh>
      {Array.from({ length: 5 }, (_, i) => (
        <group key={i} position={[PLATFORM + 30 + i * 60, 0, -2.2]}>
          <mesh position={[0, 1, 0]}>
            <boxGeometry args={[0.08, 2, 0.08]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <mesh position={[0, 2.1, 0.06]}>
            <sphereGeometry args={[0.09, 10, 8]} />
            <meshStandardMaterial color="#3bff6b" emissive={i % 2 ? "#ff3b3b" : "#3bff6b"} emissiveIntensity={3} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** A station: tiled wall with the name in mosaic, platform edge, columns, lights and a few people. */
function Station({ x, name }: { x: number; name: string }) {
  const sign = useSignTexture(name, "#111114", true);
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[PLATFORM / 2, 0.45, -2.2]} receiveShadow>
        <boxGeometry args={[PLATFORM, 0.9, 1.9]} />
        <meshStandardMaterial color="#8d877d" />
      </mesh>
      <mesh position={[PLATFORM / 2, 0.92, -1.3]}>
        <boxGeometry args={[PLATFORM, 0.03, 0.12]} />
        <meshStandardMaterial color="#f3c623" />
      </mesh>
      <mesh position={[PLATFORM / 2, 2.6, -3.1]}>
        <boxGeometry args={[PLATFORM, 5.2, 0.2]} />
        <meshStandardMaterial color="#e8e4da" />
      </mesh>
      <mesh position={[PLATFORM / 2, 2.0, -2.99]}>
        <boxGeometry args={[PLATFORM, 0.18, 0.02]} />
        <meshStandardMaterial color="#2d6a3e" />
      </mesh>
      {[8, 20, 32].map((sx) => (
        <mesh key={sx} position={[sx, 2.5, -2.98]}>
          <planeGeometry args={[4.2, 0.9]} />
          <meshStandardMaterial map={sign} />
        </mesh>
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <group key={i} position={[3 + i * 5.7, 0, -1.6]}>
          <mesh position={[0, 2.5, 0]}>
            <boxGeometry args={[0.22, 3.4, 0.22]} />
            <meshStandardMaterial color="#2e5a8a" />
          </mesh>
          <mesh position={[0, 4.4, -0.4]}>
            <boxGeometry args={[1.6, 0.06, 0.18]} />
            <meshStandardMaterial color="#fff" emissive="#f4f7ff" emissiveIntensity={2.4} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {[5, 12, 17, 26, 33, 39].map((px, k) => (
        <mesh key={px} position={[px, 1.45, -2.35 - (k % 2) * 0.3]}>
          <capsuleGeometry args={[0.16, 0.6, 3, 8]} />
          <meshStandardMaterial color={["#e63946", "#264653", "#f3a712", "#6d597a", "#2a9d8f", "#3a3a40"][k]} />
        </mesh>
      ))}
      <pointLight position={[PLATFORM / 2, 4, -1]} intensity={30} distance={30} color="#f4f7ff" />
      <mesh position={[PLATFORM / 2, 4.65, -0.6]}>
        <boxGeometry args={[PLATFORM, 0.25, 5]} />
        <meshStandardMaterial color="#cfcac0" />
      </mesh>
    </group>
  );
}

/** White-on-black station name (or a line bullet), drawn into a canvas texture. */
function useSignTexture(text: string, bg: string, wide = false) {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = wide ? 1024 : 128;
    c.height = wide ? 220 : 128;
    const g = c.getContext("2d")!;
    if (wide) {
      g.fillStyle = bg;
      g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = "#ffffff";
      g.font = "bold 120px Helvetica, Arial, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(text, c.width / 2, c.height / 2 + 6, c.width - 60);
    } else {
      g.fillStyle = bg;
      g.beginPath();
      g.arc(64, 64, 60, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = ["N", "Q", "R", "W"].includes(text) ? "#000" : "#fff";
      g.font = "bold 80px Helvetica, Arial, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(text, 64, 70);
    }
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [text, bg, wide]);
}
