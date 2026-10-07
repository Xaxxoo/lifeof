"use client";

import type { Look } from "@nyl/content";

export type Pose = "stand" | "sit" | "sleep";

/**
 * A stylized character built from primitives. Forward is +z.
 * Hair is the part people notice first, so each style gets its own shape (PRD §9.4).
 */
export function AvatarBody({ look, pose = "stand" }: { look: Look; pose?: Pose }) {
  const sitting = pose === "sit";
  return (
    <group position={[0, sitting ? -0.28 : 0, 0]}>
      {/* Legs */}
      {[-0.08, 0.08].map((x) => (
        <group key={x} position={[x, 0.6, 0]} rotation-x={sitting ? -Math.PI / 2 : 0}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <boxGeometry args={[0.13, 0.6, 0.16]} />
            <meshStandardMaterial color={look.pants} />
          </mesh>
          <mesh position={[0, -0.6, 0.04]} castShadow>
            <boxGeometry args={[0.13, 0.06, 0.22]} />
            <meshStandardMaterial color="#f2f2f2" />
          </mesh>
        </group>
      ))}
      {/* Torso */}
      <mesh position={[0, 0.84, 0]} castShadow>
        <capsuleGeometry args={[0.19, 0.3, 4, 12]} />
        <meshStandardMaterial color={look.shirt} />
      </mesh>
      {/* Arms */}
      {[-0.25, 0.25].map((x) => (
        <group key={x} position={[x, 1.0, 0]} rotation-x={sitting ? -0.6 : 0}>
          <mesh position={[0, -0.18, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.28, 4, 8]} />
            <meshStandardMaterial color={look.shirt} />
          </mesh>
          <mesh position={[0, -0.4, 0]}>
            <sphereGeometry args={[0.06, 10, 10]} />
            <meshStandardMaterial color={look.skin} />
          </mesh>
        </group>
      ))}
      {/* Neck + head */}
      <mesh position={[0, 1.12, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 0.1, 10]} />
        <meshStandardMaterial color={look.skin} />
      </mesh>
      <group position={[0, 1.34, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.19, 20, 20]} />
          <meshStandardMaterial color={look.skin} />
        </mesh>
        {/* Eyes so you can tell which way someone faces */}
        {[-0.065, 0.065].map((x) => (
          <mesh key={x} position={[x, 0.02, 0.172]}>
            <sphereGeometry args={[0.022, 8, 8]} />
            <meshStandardMaterial color="#141414" />
          </mesh>
        ))}
        <Hair style={look.hair} color={look.hairColor} />
      </group>
    </group>
  );
}

function Mat({ color }: { color: string }) {
  return <meshStandardMaterial color={color} roughness={0.85} />;
}

/** Close-cropped cap that sits on the top and back of the head. */
function Cap({ color, r = 0.198, depth = 0.55 }: { color: string; r?: number; depth?: number }) {
  return (
    <mesh position={[0, 0.01, -0.012]}>
      <sphereGeometry args={[r, 20, 12, 0, Math.PI * 2, 0, Math.PI * depth]} />
      <Mat color={color} />
    </mesh>
  );
}

function Hair({ style, color }: { style: string; color: string }) {
  switch (style) {
    case "bald":
      return null;
    case "fade":
      return <Cap color={color} r={0.196} depth={0.42} />;
    case "waves":
      return (
        <group>
          <Cap color={color} r={0.2} depth={0.45} />
          {[0.06, 0.11, 0.16].map((y) => (
            <mesh key={y} position={[0, y, -0.01]} rotation-x={Math.PI / 2}>
              <torusGeometry args={[Math.sqrt(0.2 * 0.2 - y * y) + 0.002, 0.006, 6, 24]} />
              <Mat color={color} />
            </mesh>
          ))}
        </group>
      );
    case "afro":
      return (
        <mesh position={[0, 0.09, -0.03]} castShadow>
          <sphereGeometry args={[0.29, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.72]} />
          <Mat color={color} />
        </mesh>
      );
    case "puff":
      return (
        <group>
          <Cap color={color} />
          <mesh position={[0, 0.25, -0.05]} castShadow>
            <sphereGeometry args={[0.13, 16, 12]} />
            <Mat color={color} />
          </mesh>
        </group>
      );
    case "bun":
      return (
        <group>
          <Cap color={color} depth={0.5} />
          <mesh position={[0, 0.14, -0.17]} castShadow>
            <sphereGeometry args={[0.08, 12, 10]} />
            <Mat color={color} />
          </mesh>
        </group>
      );
    case "long":
      return (
        <group>
          <Cap color={color} depth={0.52} />
          <mesh position={[0, -0.12, -0.11]} castShadow>
            <boxGeometry args={[0.36, 0.42, 0.12]} />
            <Mat color={color} />
          </mesh>
        </group>
      );
    case "braids":
    case "locs": {
      const thick = style === "locs" ? 0.032 : 0.02;
      const len = style === "locs" ? 0.42 : 0.5;
      const angles = [-1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2];
      return (
        <group>
          <Cap color={color} depth={0.5} />
          {angles.map((a) => (
            <mesh key={a} position={[Math.sin(a) * 0.18, -0.08 - len / 4, -Math.cos(a) * 0.16]} castShadow>
              <cylinderGeometry args={[thick, thick * 0.8, len, 6]} />
              <Mat color={color} />
            </mesh>
          ))}
        </group>
      );
    }
    case "headwrap":
      return (
        <group>
          <mesh position={[0, 0.1, -0.02]} castShadow>
            <sphereGeometry args={[0.215, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <Mat color={color} />
          </mesh>
          <mesh position={[0, 0.2, -0.03]} rotation-x={-0.3} castShadow>
            <torusGeometry args={[0.13, 0.06, 10, 20]} />
            <Mat color={color} />
          </mesh>
        </group>
      );
    case "hijab":
      return (
        <group>
          {/* Open at the front so the face shows. */}
          <mesh position={[0, 0, -0.005]} castShadow>
            <sphereGeometry args={[0.215, 24, 18, Math.PI * 0.75, Math.PI * 1.5, 0, Math.PI * 0.82]} />
            <meshStandardMaterial color={color} roughness={0.9} side={2} />
          </mesh>
          <mesh position={[0, -0.24, -0.02]} castShadow>
            <coneGeometry args={[0.26, 0.24, 20, 1, true]} />
            <meshStandardMaterial color={color} roughness={0.9} side={2} />
          </mesh>
        </group>
      );
    default:
      return <Cap color={color} />;
  }
}
