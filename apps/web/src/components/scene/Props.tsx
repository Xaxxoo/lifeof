"use client";

import type { Prop, RoomDef } from "@nyl/content";

/** Where a prop's sign sits in the world, for the label layer. */
export function propLabelPos(p: Prop): [number, number, number] {
  const cx = p.x + p.w / 2;
  if (p.kind === "building") return [cx, 1.5, p.y + p.h + 0.3];
  if (p.kind === "lawn" || p.kind === "dancefloor" || p.kind === "track" || p.kind === "drumcircle") return [cx, 0.6, p.y + p.h / 2];
  if (p.kind === "counter" || p.kind === "djbooth") return [cx, 1.6, p.y + p.h / 2];
  return [cx, 1.9, p.y + p.h / 2];
}

export function Props({ room, night, onPick }: { room: RoomDef; night: boolean; onPick?: (p: Prop) => void }) {
  return (
    <group>
      {room.props
        .filter((p) => p.kind !== "door")
        .map((p) => (
          <group
            key={p.id}
            onClick={(e) => {
              if (!p.actions?.length || !onPick) return;
              e.stopPropagation();
              onPick(p);
            }}
          >
            <PropMesh prop={p} night={night} />
          </group>
        ))}
    </group>
  );
}


function PropMesh({ prop: p, night }: { prop: Prop; night: boolean }) {
  const cx = p.x + p.w / 2;
  const cz = p.y + p.h / 2;

  switch (p.kind) {
    case "building": {
      const height = 3.4;
      const windowGlow = night ? "#ffd58a" : "#9fb8c9";
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[p.w - 0.05, height, p.h]} />
            <meshStandardMaterial color={p.color ?? "#8e4a35"} />
          </mesh>
          {/* Storefront awning */}
          <mesh position={[0, 1.15, p.h / 2 + 0.2]} castShadow>
            <boxGeometry args={[p.w - 0.4, 0.08, 0.5]} />
            <meshStandardMaterial color="#1d1f24" />
          </mesh>
          {/* Upper windows */}
          {Array.from({ length: Math.max(1, Math.floor(p.w)) }, (_, i) => (
            <mesh key={i} position={[-p.w / 2 + 0.5 + i, 2.5, p.h / 2 + 0.01]}>
              <planeGeometry args={[0.45, 0.6]} />
              <meshStandardMaterial color={windowGlow} emissive={night ? "#ffb347" : "#000000"} emissiveIntensity={night ? 0.6 : 0} />
            </mesh>
          ))}
          {/* Shop window */}
          <mesh position={[0, 0.6, p.h / 2 + 0.01]}>
            <planeGeometry args={[p.w - 0.8, 0.8]} />
            <meshStandardMaterial color={night ? "#ffe2a8" : "#cfe0ea"} emissive={night ? "#ffcc66" : "#000000"} emissiveIntensity={night ? 0.8 : 0} />
          </mesh>
          {/* Rooftop water tower on wide buildings */}
          {p.w >= 4 && (
            <group position={[p.w / 2 - 0.8, height, -0.3]}>
              <mesh position={[0, 0.55, 0]} castShadow>
                <cylinderGeometry args={[0.35, 0.35, 0.6, 10]} />
                <meshStandardMaterial color="#6b4f3a" />
              </mesh>
              <mesh position={[0, 0.98, 0]}>
                <coneGeometry args={[0.38, 0.3, 10]} />
                <meshStandardMaterial color="#4a3a2e" />
              </mesh>
            </group>
          )}
        </group>
      );
    }
    case "stoop":
      return (
        <group position={[cx, 0, p.y]}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, 0.1 + i * 0.18, 0.45 - i * 0.2]} castShadow receiveShadow>
              <boxGeometry args={[0.9, 0.2 + i * 0.18, 0.3]} />
              <meshStandardMaterial color="#7a5b4a" />
            </mesh>
          ))}
        </group>
      );
    case "tree":
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 1.2, 6]} />
            <meshStandardMaterial color="#5a3d2b" />
          </mesh>
          <mesh position={[0, 1.5, 0]} castShadow>
            <icosahedronGeometry args={[0.6, 0]} />
            <meshStandardMaterial color="#3f7d3a" flatShading />
          </mesh>
        </group>
      );
    case "bench":
      return (
        <mesh position={[cx, 0.25, cz]} castShadow receiveShadow>
          <boxGeometry args={[p.w - 0.2, 0.15, 0.5]} />
          <meshStandardMaterial color="#2f5d3a" />
        </mesh>
      );
    case "cart":
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[0.9, 0.7, 0.6]} />
            <meshStandardMaterial color="#d8dde3" metalness={0.4} roughness={0.4} />
          </mesh>
          <mesh position={[0, 1.4, 0]} castShadow>
            <coneGeometry args={[0.7, 0.35, 8]} />
            <meshStandardMaterial color="#e63946" />
          </mesh>
          <mesh position={[0, 1.05, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.7]} />
            <meshStandardMaterial color="#888" />
          </mesh>
        </group>
      );
    case "hydrant":
      return (
        <mesh position={[cx, 0.25, cz]} castShadow>
          <cylinderGeometry args={[0.12, 0.15, 0.5, 8]} />
          <meshStandardMaterial color="#c0392b" />
        </mesh>
      );
    case "subway":
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, 0.05, 0]} receiveShadow>
            <boxGeometry args={[p.w - 0.2, 0.1, p.h - 0.2]} />
            <meshStandardMaterial color="#1b1b1b" />
          </mesh>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * (p.w / 2 - 0.2), 0, -p.h / 2 + 0.2]}>
              <mesh position={[0, 0.7, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 1.4]} />
                <meshStandardMaterial color="#2d6a3e" />
              </mesh>
              <mesh position={[0, 1.45, 0]}>
                <sphereGeometry args={[0.13, 12, 12]} />
                <meshStandardMaterial color="#5cd65c" emissive="#3fbf3f" emissiveIntensity={night ? 1.2 : 0.3} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case "door":
      return null;
    case "lawn":
      return (
        <mesh rotation-x={-Math.PI / 2} position={[cx, 0.01, cz]} receiveShadow>
          <planeGeometry args={[p.w, p.h]} />
          <meshStandardMaterial color="#79b05f" />
        </mesh>
      );
    case "track":
      return (
        <mesh rotation-x={-Math.PI / 2} position={[cx, 0.012, cz]} receiveShadow>
          <planeGeometry args={[p.w, p.h * 0.8]} />
          <meshStandardMaterial color="#b9a58a" />
        </mesh>
      );
    case "drumcircle":
      return (
        <group position={[cx, 0, cz]}>
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]}>
            <circleGeometry args={[p.w / 2, 24]} />
            <meshStandardMaterial color="#a08a6c" />
          </mesh>
          {Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 1.1, 0.2, Math.sin(a) * 1.1]} castShadow>
                <cylinderGeometry args={[0.16, 0.13, 0.4, 12]} />
                <meshStandardMaterial color={i % 2 ? "#8b4513" : "#c0392b"} />
              </mesh>
            );
          })}
        </group>
      );
    case "grill":
      return (
        <group position={[cx, 0, cz]}>
          {[-0.5, 0.5].map((dx) => (
            <group key={dx} position={[dx, 0, 0]}>
              <mesh position={[0, 0.45, 0]} castShadow>
                <boxGeometry args={[0.7, 0.2, 0.5]} />
                <meshStandardMaterial color="#2b2b2b" />
              </mesh>
              <mesh position={[0, 0.2, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 0.4]} />
                <meshStandardMaterial color="#555" />
              </mesh>
              <mesh position={[0, 0.6, 0]}>
                <sphereGeometry args={[0.12, 8, 8]} />
                <meshStandardMaterial color="#ff7b00" emissive="#ff5500" emissiveIntensity={0.8} transparent opacity={0.6} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case "stall":
      return (
        <group position={[cx, 0, cz]}>
          {Array.from({ length: p.w }, (_, i) => (
            <group key={i} position={[-p.w / 2 + 0.5 + i, 0, 0]}>
              <mesh position={[0, 0.4, 0]} castShadow>
                <boxGeometry args={[0.9, 0.8, p.h - 0.4]} />
                <meshStandardMaterial color="#8a6a48" />
              </mesh>
              <mesh position={[0, 1.4, 0]} castShadow>
                <boxGeometry args={[0.95, 0.05, p.h - 0.2]} />
                <meshStandardMaterial color={i % 2 ? "#ffffff" : "#2a9d8f"} />
              </mesh>
              <mesh position={[0, 0.85, 0]}>
                <boxGeometry args={[0.6, 0.12, 0.4]} />
                <meshStandardMaterial color={["#e63946", "#f3a712", "#3f7d3a", "#9b5de5"][i % 4]} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case "photospot":
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 1.2]} />
            <meshStandardMaterial color="#333" />
          </mesh>
          <mesh position={[0, 1.25, 0]}>
            <boxGeometry args={[0.5, 0.3, 0.05]} />
            <meshStandardMaterial color="#1d3557" />
          </mesh>
        </group>
      );
    case "counter":
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, 0.55, 0.1]} castShadow receiveShadow>
            <boxGeometry args={[p.w, 1.1, 0.7]} />
            <meshStandardMaterial color={p.color ?? "#3b2a1e"} />
          </mesh>
          <mesh position={[0, 1.12, 0.1]}>
            <boxGeometry args={[p.w + 0.1, 0.06, 0.8]} />
            <meshStandardMaterial color="#d8c3a5" />
          </mesh>
          {Array.from({ length: p.w * 2 }, (_, i) => (
            <mesh key={i} position={[-p.w / 2 + 0.25 + i * 0.5, 1.75, -0.35]}>
              <cylinderGeometry args={[0.05, 0.05, 0.3, 8]} />
              <meshStandardMaterial color={["#2a9d8f", "#e9c46a", "#e76f51", "#a8dadc"][i % 4]} transparent opacity={0.85} />
            </mesh>
          ))}
        </group>
      );
    case "stool":
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.06, 14]} />
            <meshStandardMaterial color="#c0392b" />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <cylinderGeometry args={[0.03, 0.06, 0.44]} />
            <meshStandardMaterial color="#888" />
          </mesh>
        </group>
      );
    case "table":
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, 0.72, 0]} castShadow>
            <cylinderGeometry args={[0.38, 0.38, 0.05, 18]} />
            <meshStandardMaterial color="#f4f1ea" />
          </mesh>
          <mesh position={[0, 0.36, 0]}>
            <cylinderGeometry args={[0.04, 0.12, 0.72]} />
            <meshStandardMaterial color="#333" />
          </mesh>
        </group>
      );
    case "dancefloor":
      return (
        <group position={[cx, 0, cz]}>
          {Array.from({ length: p.w * p.h }, (_, i) => {
            const tx = i % p.w;
            const ty = Math.floor(i / p.w);
            return (
              <mesh key={i} rotation-x={-Math.PI / 2} position={[-p.w / 2 + 0.5 + tx, 0.012, -p.h / 2 + 0.5 + ty]}>
                <planeGeometry args={[0.96, 0.96]} />
                <meshStandardMaterial
                  color={["#ff3cac", "#784ba0", "#2b86c5", "#f9d423"][(tx + ty) % 4]}
                  emissive={["#ff3cac", "#784ba0", "#2b86c5", "#f9d423"][(tx + ty) % 4]}
                  emissiveIntensity={0.6}
                />
              </mesh>
            );
          })}
        </group>
      );
    case "djbooth":
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[p.w - 0.2, 1, 0.7]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          {[-0.45, 0.45].map((dx) => (
            <mesh key={dx} position={[dx, 1.03, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.04, 20]} />
              <meshStandardMaterial color="#222" emissive="#4dd0ff" emissiveIntensity={0.4} />
            </mesh>
          ))}
        </group>
      );
    case "lamp":
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.04, 0.05, 2.4]} />
            <meshStandardMaterial color="#2b2b2b" />
          </mesh>
          <mesh position={[0, 2.45, 0]}>
            <sphereGeometry args={[0.12, 10, 10]} />
            <meshStandardMaterial color="#ffb347" emissive="#ff9a2e" emissiveIntensity={night ? 2 : 0} />
          </mesh>
          {night && <pointLight position={[0, 2.3, 0]} color="#ff9f43" intensity={6} distance={6} decay={2} />}
        </group>
      );
  }
}
