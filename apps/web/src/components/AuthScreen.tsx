"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import {
  BoxGeometry,
  Color,
  Fog,
  type Group,
  type InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
} from "three";
import { api } from "@/lib/api";
import { playerMessage } from "@/lib/errors";

type Mode = "login" | "signup";

/* ═══════════════════════════════════════════════
   Auth Screen — 3D runway landing scene + form
   ═══════════════════════════════════════════════ */

export function AuthScreen({
  onAuth,
  onGuest,
}: {
  onAuth: () => void;
  onGuest: () => void;
}) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        await api.signup(email, password);
      } else {
        await api.login(email, password);
      }
      onAuth();
    } catch (e) {
      setError(playerMessage(e));
      setBusy(false);
    }
  }

  function handleGuest() {
    setBusy(true);
    setError(null);
    onGuest();
  }

  // Plane landing audio
  useEffect(() => {
    let audio: HTMLAudioElement | null = null;
    try {
      audio = new Audio("/sounds/plane-landing.mp3");
      audio.loop = true;
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Autoplay blocked — ignore
      });
    } catch {
      // Audio not available
    }
    return () => {
      if (audio) {
        audio.pause();
        audio.src = "";
      }
    };
  }, []);

  return (
    <main className="relative flex min-h-full flex-col overflow-hidden bg-[#0d1117]">
      {/* ─── 3D Background ─── */}
      <div className="absolute inset-0">
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [8, 12, 35], fov: 50, near: 0.1, far: 500 }}
        >
          <SceneSetup />
          <ambientLight color="#2a3050" intensity={0.3} />
          <directionalLight
            position={[20, 40, 10]}
            intensity={0.8}
            color="#b8c4e8"
          />
          <Plane />
          <Runway />
          <Skyline />
          <Clouds />
          <EffectComposer multisampling={4}>
            <Bloom
              mipmapBlur
              luminanceThreshold={1}
              luminanceSmoothing={0.3}
              intensity={0.9}
              radius={0.7}
            />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        </Canvas>
      </div>

      {/* ─── Form overlay ─── */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <p className="text-center text-xs uppercase tracking-widest text-white/40">
            JFK Terminal 4 &middot; Arrivals
          </p>
          <h1 className="mt-2 text-center text-3xl font-semibold tracking-tight">
            New York Life
          </h1>
          <p className="mt-1.5 text-center text-sm text-white/50">
            {mode === "login"
              ? "Welcome back to Brooklyn."
              : "Your flight just landed."}
          </p>

          {/* Toggle */}
          <div className="mt-8 flex rounded-lg border border-white/15 bg-white/5 p-0.5 backdrop-blur-sm">
            <button
              onClick={() => { setMode("login"); setError(null); }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                mode === "login" ? "bg-white/10 text-white" : "text-white/50"
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => { setMode("signup"); setError(null); }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                mode === "signup" ? "bg-white/10 text-white" : "text-white/50"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            className="mt-6 space-y-4"
          >
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-widest text-white/50">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-base outline-none backdrop-blur-sm focus:border-white/40"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-widest text-white/50">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 6 characters" : ""}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-base outline-none backdrop-blur-sm focus:border-white/40"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={busy || !email.trim() || !password}
              className="w-full rounded-lg bg-[#f3a712] py-3 font-semibold text-black disabled:opacity-40"
            >
              {busy
                ? "Hold on…"
                : mode === "signup"
                  ? "Create account"
                  : "Log in"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={handleGuest}
              disabled={busy}
              className="text-sm text-white/50 underline decoration-white/20 underline-offset-2 hover:text-white/70 disabled:opacity-40"
            >
              Play as guest
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ─── Scene setup ─── */

function SceneSetup() {
  const get = useThree((s) => s.get);
  useLayoutEffect(() => {
    const { scene, camera } = get();
    scene.background = new Color("#0d1117");
    scene.fog = new Fog("#0d1117", 80, 260);
    camera.lookAt(0, 2, -20);
  }, [get]);
  return null;
}

/* ─── 3D Plane ─── */

const CYCLE = 15; // seconds per loop

function Plane() {
  const group = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = (clock.elapsedTime % CYCLE) / CYCLE;

    // Glide path: closer to camera so the plane reads large
    const x = -30 + t * 45;      // -30 → 15
    const y = 30 - t * 24;       // 30 → 6
    const z = -50 + t * 55;      // -50 → 5

    group.current.position.set(x, y, z);
    group.current.rotation.set(
      -0.12,                      // slight pitch down
      0.35,                       // angled toward runway
      -0.04,                      // gentle bank
    );

    // Fade out near end, fade in at start for smooth loop
    const fade = t < 0.05 ? t / 0.05 : t > 0.9 ? (1 - t) / 0.1 : 1;
    group.current.scale.setScalar(fade * 2.5);
  });

  return (
    <group ref={group}>
      {/* Fuselage */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.8, 0.7, 12, 16]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.35} metalness={0.25} />
      </mesh>

      {/* Nose cone */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0, 0.7, 2, 16]} />
        <meshStandardMaterial color="#e4e4e4" roughness={0.3} metalness={0.3} />
      </mesh>

      {/* Cockpit windows */}
      <mesh position={[5.8, 0.35, 0]}>
        <boxGeometry args={[1.2, 0.3, 0.8]} />
        <meshStandardMaterial
          color="#4fc3f7"
          emissive="#4fc3f7"
          emissiveIntensity={1.5}
          toneMapped={false}
        />
      </mesh>

      {/* Cabin windows — two rows along the fuselage */}
      <CabinWindows />

      {/* Left wing */}
      <mesh position={[0.5, -0.1, 5]}>
        <boxGeometry args={[3, 0.15, 10]} />
        <meshStandardMaterial color="#e0e0e0" roughness={0.35} metalness={0.2} />
      </mesh>
      {/* Right wing */}
      <mesh position={[0.5, -0.1, -5]}>
        <boxGeometry args={[3, 0.15, 10]} />
        <meshStandardMaterial color="#e0e0e0" roughness={0.35} metalness={0.2} />
      </mesh>

      {/* Left engine nacelle */}
      <mesh position={[-0.3, -0.5, 4]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.4, 0.45, 1.8, 10]} />
        <meshStandardMaterial color="#c8c8c8" roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Right engine nacelle */}
      <mesh position={[-0.3, -0.5, -4]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.4, 0.45, 1.8, 10]} />
        <meshStandardMaterial color="#c8c8c8" roughness={0.3} metalness={0.4} />
      </mesh>

      {/* Vertical stabilizer (tail) */}
      <mesh position={[-5.5, 1.5, 0]}>
        <boxGeometry args={[2, 3, 0.15]} />
        <meshStandardMaterial color="#e0e0e0" roughness={0.35} metalness={0.2} />
      </mesh>
      {/* Horizontal stabilizer */}
      <mesh position={[-5.5, 0.6, 0]}>
        <boxGeometry args={[1.5, 0.12, 5]} />
        <meshStandardMaterial color="#e0e0e0" roughness={0.35} metalness={0.2} />
      </mesh>

      {/* Landing lights — under nose, bloom-visible */}
      <pointLight position={[5, -0.8, 0.3]} color="#fff8e0" intensity={20} distance={60} />
      <pointLight position={[5, -0.8, -0.3]} color="#fff8e0" intensity={20} distance={60} />
      <mesh position={[5, -0.8, 0.3]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshBasicMaterial color={new Color("#fff8e0").multiplyScalar(6)} toneMapped={false} />
      </mesh>
      <mesh position={[5, -0.8, -0.3]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshBasicMaterial color={new Color("#fff8e0").multiplyScalar(6)} toneMapped={false} />
      </mesh>

      {/* Nav light — port (left, red) */}
      <mesh position={[0.5, 0, 9.8]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial color={new Color("#ff0000").multiplyScalar(5)} toneMapped={false} />
      </mesh>
      {/* Nav light — starboard (right, green) */}
      <mesh position={[0.5, 0, -9.8]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial color={new Color("#00ff00").multiplyScalar(5)} toneMapped={false} />
      </mesh>

      {/* Belly light — white strobe */}
      <mesh position={[0, -0.85, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial color={new Color("#ffffff").multiplyScalar(4)} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ─── Cabin windows (instanced along both sides of the fuselage) ─── */

const WINDOW_BOX = new BoxGeometry(0.28, 0.22, 0.06);
const WINDOW_COUNT = 18; // per side

function CabinWindows() {
  const ref = useRef<InstancedMesh>(null);
  const material = useMemo(
    () => new MeshBasicMaterial({ color: new Color("#ffe9a0").multiplyScalar(2.5), toneMapped: false }),
    [],
  );
  const total = WINDOW_COUNT * 2;
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    let idx = 0;
    // Fuselage cylinder is rotated Z=PI/2, so it runs along X from -6 to +6.
    // radiusTop 0.8 (at +X front) tapering to radiusBottom 0.7 (at -X tail).
    // Keep windows away from cockpit (x~5.8) and tail (x~-5.5).
    const startX = -4.2;
    const endX = 4.8;
    const spacing = (endX - startX) / (WINDOW_COUNT - 1);
    // Angle from +Y axis in the Y-Z cross-section — ~80° puts windows
    // slightly above the midline, like real cabin windows.
    const theta = 1.35;
    for (let side = 0; side < 2; side++) {
      const sign = side === 0 ? 1 : -1;
      const angle = sign * theta;
      for (let i = 0; i < WINDOW_COUNT; i++) {
        const x = startX + i * spacing;
        // Interpolate radius along the taper (x=+6 nose → 0.7, x=-6 tail → 0.8)
        const frac = (x + 6) / 12;
        const r = 0.8 - frac * 0.1;
        // Push slightly proud of the surface so the box isn't buried
        const rOuter = r + 0.04;
        dummy.position.set(x, Math.cos(angle) * rOuter, Math.sin(angle) * rOuter);
        // Rotate so the box face (X-Y plane, normal along Z) aligns with
        // the cylinder's outward surface normal at this angle.
        dummy.rotation.set(angle - Math.PI / 2, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx++, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);
  return <instancedMesh ref={ref} args={[WINDOW_BOX, material, total]} />;
}

/* ─── Runway ─── */

const RUNWAY_LEN = 120;
const RUNWAY_W = 6;
const DASH_BOX = new BoxGeometry(0.2, 0.02, 2);
const EDGE_SPHERE = new SphereGeometry(0.1, 6, 4);
const dummy = new Object3D();

function Runway() {
  return (
    <group position={[0, 0, -40]}>
      {/* Surface */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[RUNWAY_W, RUNWAY_LEN]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>

      {/* Center dashes */}
      <CenterLine />

      {/* Edge lights */}
      <EdgeLights />

      {/* Threshold lights (green, approach end) */}
      <ThresholdLights />

      {/* PAPI lights */}
      <PapiLights />
    </group>
  );
}

function CenterLine() {
  const ref = useRef<InstancedMesh>(null);
  const count = Math.floor(RUNWAY_LEN / 4);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < count; i++) {
      dummy.position.set(0, 0.02, -RUNWAY_LEN / 2 + i * 4 + 2);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [count]);
  return (
    <instancedMesh ref={ref} args={[DASH_BOX, undefined, count]}>
      <meshStandardMaterial color="#cccccc" />
    </instancedMesh>
  );
}

function EdgeLights() {
  const ref = useRef<InstancedMesh>(null);
  const material = useMemo(
    () => new MeshBasicMaterial({ color: new Color("#ffffff").multiplyScalar(3), toneMapped: false }),
    [],
  );
  const count = Math.floor(RUNWAY_LEN / 5) * 2;
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    let idx = 0;
    const n = Math.floor(RUNWAY_LEN / 5);
    for (let i = 0; i < n; i++) {
      for (const side of [-1, 1]) {
        dummy.position.set(side * (RUNWAY_W / 2 + 0.3), 0.1, -RUNWAY_LEN / 2 + i * 5 + 2.5);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx++, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [count]);
  return <instancedMesh ref={ref} args={[EDGE_SPHERE, material, count]} />;
}

function ThresholdLights() {
  const ref = useRef<InstancedMesh>(null);
  const material = useMemo(
    () => new MeshBasicMaterial({ color: new Color("#00ff66").multiplyScalar(3), toneMapped: false }),
    [],
  );
  const count = 8;
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < count; i++) {
      const x = -RUNWAY_W / 2 + (i / (count - 1)) * RUNWAY_W;
      dummy.position.set(x, 0.1, RUNWAY_LEN / 2);
      dummy.scale.setScalar(1.2);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);
  return <instancedMesh ref={ref} args={[EDGE_SPHERE, material, count]} />;
}

function PapiLights() {
  // 2 red + 2 white on each side of the runway
  const lights = [
    { x: RUNWAY_W / 2 + 1.5, z: RUNWAY_LEN / 2 - 8, color: "#ff2200" },
    { x: RUNWAY_W / 2 + 2.3, z: RUNWAY_LEN / 2 - 8, color: "#ff2200" },
    { x: RUNWAY_W / 2 + 3.1, z: RUNWAY_LEN / 2 - 8, color: "#ffffff" },
    { x: RUNWAY_W / 2 + 3.9, z: RUNWAY_LEN / 2 - 8, color: "#ffffff" },
  ];
  return (
    <group>
      {lights.map((l, i) => (
        <mesh key={i} position={[l.x, 0.15, l.z]}>
          <boxGeometry args={[0.4, 0.25, 0.4]} />
          <meshBasicMaterial
            color={new Color(l.color).multiplyScalar(3)}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ─── City skyline ─── */

const BUILDING_BOX = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const WIN_GEO = new BoxGeometry(0.3, 0.45, 0.06);

interface WinData { x: number; y: number; z: number; lit: boolean }

function Skyline() {
  const buildRef = useRef<InstancedMesh>(null);
  const litRef = useRef<InstancedMesh>(null);
  const darkRef = useRef<InstancedMesh>(null);

  const { lots, litWins, darkWins } = useMemo(() => {
    const rand = seeded(42);
    const lots: { x: number; z: number; w: number; d: number; h: number; color: string }[] = [];
    const COLORS = ["#1a1f2e", "#222838", "#1e2430", "#252b3a", "#2a3040", "#181e28"];
    // Buildings behind the runway
    for (let i = 0; i < 120; i++) {
      const x = -60 + rand() * 120;
      const z = -140 + rand() * 80;
      const h = 3 + rand() * rand() * 25;
      const w = 1.5 + rand() * 3;
      const d = 1.5 + rand() * 3;
      lots.push({ x, z, w, d, h, color: COLORS[Math.floor(rand() * COLORS.length)]! });
    }

    // Generate windows on the +Z face of each building (visible to camera)
    const litWins: WinData[] = [];
    const darkWins: WinData[] = [];
    const winRand = seeded(77);
    const PAD = 0.35;       // inset from building edge
    const SPACING_X = 0.8;  // horizontal spacing between window centers
    const SPACING_Y = 1.1;  // vertical spacing between window centers
    for (const lot of lots) {
      const cols = Math.max(1, Math.floor((lot.w - PAD * 2) / SPACING_X));
      const rows = Math.max(1, Math.floor((lot.h - 0.6) / SPACING_Y));
      const gridW = (cols - 1) * SPACING_X;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const wx = lot.x - gridW / 2 + col * SPACING_X;
          const wy = 1.0 + row * SPACING_Y;
          const wz = lot.z + lot.d / 2 + 0.031; // just proud of +Z face
          if (wy > lot.h - 0.3) continue;
          const lit = winRand() < 0.45;
          (lit ? litWins : darkWins).push({ x: wx, y: wy, z: wz, lit });
        }
      }
    }
    return { lots, litWins, darkWins };
  }, []);

  const buildMat = useMemo(() => {
    return new MeshStandardMaterial({
      roughness: 0.8,
      emissive: new Color("#ffd080"),
      emissiveIntensity: 0.05,
    });
  }, []);

  const litMat = useMemo(
    () => new MeshBasicMaterial({ color: new Color("#ffe4a8").multiplyScalar(2), toneMapped: false }),
    [],
  );
  const darkMat = useMemo(
    () => new MeshStandardMaterial({ color: "#0a0e18", roughness: 0.9 }),
    [],
  );

  useLayoutEffect(() => {
    const mesh = buildRef.current;
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

  useLayoutEffect(() => {
    for (const [ref, wins] of [[litRef, litWins], [darkRef, darkWins]] as const) {
      const mesh = ref.current;
      if (!mesh) return;
      wins.forEach((w, i) => {
        dummy.position.set(w.x, w.y, w.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [litWins, darkWins]);

  return (
    <group>
      <instancedMesh ref={buildRef} args={[BUILDING_BOX, buildMat, lots.length]} />
      <instancedMesh ref={litRef} args={[WIN_GEO, litMat, litWins.length]} />
      <instancedMesh ref={darkRef} args={[WIN_GEO, darkMat, darkWins.length]} />
    </group>
  );
}

/* ─── Clouds ─── */

function Clouds() {
  const clusters = useMemo(() => {
    const rand = seeded(99);
    const out: { x: number; y: number; z: number; speed: number; parts: { dx: number; dy: number; dz: number; s: number }[] }[] = [];
    for (let i = 0; i < 8; i++) {
      const parts: { dx: number; dy: number; dz: number; s: number }[] = [];
      for (let j = 0; j < 4 + Math.floor(rand() * 3); j++) {
        parts.push({
          dx: (rand() - 0.5) * 4,
          dy: (rand() - 0.5) * 1.5,
          dz: (rand() - 0.5) * 3,
          s: 1.5 + rand() * 2,
        });
      }
      out.push({
        x: -80 + rand() * 160,
        y: 20 + rand() * 25,
        z: -100 + rand() * 60,
        speed: 1.5 + rand() * 2,
        parts,
      });
    }
    return out;
  }, []);

  return (
    <group>
      {clusters.map((cl, i) => (
        <CloudCluster key={i} cluster={cl} />
      ))}
    </group>
  );
}

function CloudCluster({
  cluster,
}: {
  cluster: {
    x: number; y: number; z: number; speed: number;
    parts: { dx: number; dy: number; dz: number; s: number }[];
  };
}) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const x = ((cluster.x + clock.elapsedTime * cluster.speed + 80) % 200) - 100;
    ref.current.position.set(x, cluster.y, cluster.z);
  });
  return (
    <group ref={ref}>
      {cluster.parts.map((p, j) => (
        <mesh key={j} position={[p.dx, p.dy, p.dz]} scale={[p.s, p.s * 0.5, p.s * 0.7]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial color="#4a5568" transparent opacity={0.15} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/* ─── Helpers ─── */

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
