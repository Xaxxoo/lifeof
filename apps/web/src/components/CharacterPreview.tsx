"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group } from "three";
import type { Look } from "@nyl/content";
import { AvatarBody } from "./scene/AvatarBody";

/** Live 3D preview of the character being created. Drag-free: it turns slowly on a stoop-red plinth. */
export function CharacterPreview({ look, name }: { look: Look; name: string }) {
  return (
    <div className="relative h-full w-full">
      <Canvas shadows camera={{ position: [0, 1.2, 4.6], fov: 30 }} dpr={[1, 2]}>
        <LookAt y={0.78} />
        <color attach="background" args={["#1a1d27"]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[2.5, 4, 3]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-3, 2, -2]} intensity={0.5} color="#9db8ff" />
        <Spinner>
          <AvatarBody look={look} />
        </Spinner>
        <mesh position={[0, -0.06, 0]} receiveShadow>
          <cylinderGeometry args={[0.7, 0.75, 0.12, 40]} />
          <meshStandardMaterial color="#8e4a35" />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.12, 0]} receiveShadow>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="#1a1d27" />
        </mesh>
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center">
        <span className="rounded-full bg-black/60 px-3 py-1 text-sm font-semibold">{name.trim() || "You"}</span>
      </div>
    </div>
  );
}

/** Aim the camera at the middle of the character instead of straight ahead. */
function LookAt({ y }: { y: number }) {
  const get = useThree((s) => s.get);
  useEffect(() => {
    get().camera.lookAt(0, y, 0);
  }, [get, y]);
  return null;
}

function Spinner({ children }: { children: React.ReactNode }) {
  const g = useRef<Group>(null);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.6;
  });
  return (
    <group ref={g} position={[0, 0, 0]}>
      {children}
    </group>
  );
}
