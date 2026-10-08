"use client";

import type { Prop, RoomDef } from "@nyl/content";
import { useEffect, useMemo } from "react";
import { BoxGeometry } from "three";
import { CITY, buildingMaterial, tint } from "./palette";
import { SubwayEntrance } from "./SubwayEntrance";

const UNIT_BOX = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const GOODS = ["#e63946", "#f3a712", "#2a9d8f", "#457b9d", "#9b5de5", "#f4f1ea", "#3f7d3a", "#e76f51"];

/** Where a prop's sign sits in the world, for the label layer. */
export function propLabelPos(p: Prop): [number, number, number] {
  const cx = p.x + p.w / 2;
  // Above the roofline, clear of the people on the sidewalk.
  if (p.kind === "building") return [cx, buildingHeight(p) + 0.5, p.y + p.h - 0.4];
  if (p.kind === "lawn" || p.kind === "dancefloor" || p.kind === "track" || p.kind === "drumcircle") return [cx, 0.6, p.y + p.h / 2];
  if (p.kind === "counter" || p.kind === "djbooth") return [cx, 1.6, p.y + p.h / 2];
  if (p.kind === "bookshelf" || p.kind === "artwall") return [cx, 2.4, p.y + p.h / 2];
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
    case "building":
      return <Building prop={p} night={night} />;
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
            <meshStandardMaterial color={CITY.trunk} />
          </mesh>
          <mesh position={[0, 1.55, 0]} castShadow>
            <sphereGeometry args={[0.62, 14, 10]} />
            <meshStandardMaterial color={CITY.leaf[1]} roughness={0.85} />
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
      return <SubwayEntrance prop={p} night={night} />;
    case "door":
      return null;
    case "lawn":
      return (
        <mesh rotation-x={-Math.PI / 2} position={[cx, 0.01, cz]} receiveShadow>
          <planeGeometry args={[p.w, p.h]} />
          <meshStandardMaterial color={CITY.grass} />
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
    case "shelf":
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
            <boxGeometry args={[p.w - 0.1, 1.4, 0.6]} />
            <meshStandardMaterial color="#d9d4ca" />
          </mesh>
          {[0.45, 0.85, 1.25].flatMap((y, r) =>
            Array.from({ length: p.w * 3 }, (_, i) => (
              <mesh key={`${r}-${i}`} position={[-p.w / 2 + 0.25 + i * 0.33, y, 0]}>
                <boxGeometry args={[0.24, 0.26, 0.64]} />
                <meshStandardMaterial color={GOODS[(i + r * 2) % GOODS.length]} />
              </mesh>
            )),
          )}
        </group>
      );
    case "longtable":
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
            <boxGeometry args={[p.w - 0.1, 0.08, 0.8]} />
            <meshStandardMaterial color="#c8a27a" />
          </mesh>
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[sx * (p.w / 2 - 0.25), 0.36, 0]}>
              <boxGeometry args={[0.08, 0.72, 0.6]} />
              <meshStandardMaterial color="#5a4632" />
            </mesh>
          ))}
          {Array.from({ length: p.w }, (_, i) => (
            <mesh key={i} position={[-p.w / 2 + 0.5 + i, 0.78, 0]}>
              <cylinderGeometry args={[0.16, 0.14, 0.04, 14]} />
              <meshStandardMaterial color="#f4f1ea" />
            </mesh>
          ))}
        </group>
      );
    case "salonchair":
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.28, 0.32, 0.08, 16]} />
            <meshStandardMaterial color="#9aa0a6" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.3]} />
            <meshStandardMaterial color="#9aa0a6" metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[0.55, 0.12, 0.55]} />
            <meshStandardMaterial color="#b3122e" />
          </mesh>
          <mesh position={[0, 0.85, -0.24]} castShadow>
            <boxGeometry args={[0.55, 0.6, 0.1]} />
            <meshStandardMaterial color="#b3122e" />
          </mesh>
          {/* Mirror on the back wall (world z = 0) */}
          <mesh position={[0, 1.6, 0.07 - cz]}>
            <planeGeometry args={[0.8, 1]} />
            <meshStandardMaterial color="#cfe6f5" metalness={0.9} roughness={0.05} emissive="#9fd0f0" emissiveIntensity={0.25} />
          </mesh>
        </group>
      );
    case "washer":
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.9, 1, 0.8]} />
            <meshStandardMaterial color="#f4f6f8" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.48, 0.41]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.3, 0.3, 0.03, 24]} />
            <meshStandardMaterial color="#5b8db8" emissive="#3e7cb1" emissiveIntensity={0.5} roughness={0.1} />
          </mesh>
          <mesh position={[0.25, 0.92, 0.41]}>
            <boxGeometry args={[0.25, 0.08, 0.02]} />
            <meshStandardMaterial color="#7cf5a0" emissive="#3bd16f" emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
        </group>
      );
    case "bike":
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.35, 0.12, 0.9]} />
            <meshStandardMaterial color="#1b1b1f" />
          </mesh>
          <mesh position={[0, 0.4, 0.3]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.28, 0.28, 0.06, 20]} />
            <meshStandardMaterial color="#c7ced6" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.55, -0.05]} rotation-x={0.35}>
            <boxGeometry args={[0.08, 0.9, 0.08]} />
            <meshStandardMaterial color="#7cf5ff" emissive="#22d3ee" emissiveIntensity={0.8} />
          </mesh>
          <mesh position={[0, 0.98, -0.2]} castShadow>
            <boxGeometry args={[0.22, 0.06, 0.3]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <mesh position={[0, 1.05, 0.35]}>
            <boxGeometry args={[0.5, 0.05, 0.05]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        </group>
      );
    case "crate":
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
            <boxGeometry args={[p.w - 0.2, 0.7, 0.8]} />
            <meshStandardMaterial color="#8a5a3b" />
          </mesh>
          {Array.from({ length: p.w * 6 }, (_, i) => (
            <mesh key={i} position={[-p.w / 2 + 0.25 + i * 0.27, 0.78, 0]} rotation-z={0.12}>
              <boxGeometry args={[0.03, 0.34, 0.34]} />
              <meshStandardMaterial color={GOODS[i % GOODS.length]} />
            </mesh>
          ))}
        </group>
      );
    case "artwall":
      return (
        <group position={[cx, 0, p.y + 0.08]}>
          <mesh position={[0, 1.45, 0]}>
            <boxGeometry args={[p.w - 0.5, 1.2, 0.06]} />
            <meshStandardMaterial color="#1d1d1f" />
          </mesh>
          <mesh position={[0, 1.45, 0.04]}>
            <planeGeometry args={[p.w - 0.65, 1.05]} />
            <meshStandardMaterial color={p.x < 4 ? "#e76f51" : "#2a9d8f"} emissive={p.x < 4 ? "#e9c46a" : "#264653"} emissiveIntensity={0.25} />
          </mesh>
          <mesh position={[0.25, 1.6, 0.05]}>
            <circleGeometry args={[0.28, 24]} />
            <meshStandardMaterial color={p.x < 4 ? "#264653" : "#f4a261"} />
          </mesh>
        </group>
      );
    case "bookshelf":
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, 1.1, -0.1]} castShadow receiveShadow>
            <boxGeometry args={[p.w - 0.1, 2.2, 0.6]} />
            <meshStandardMaterial color="#6b4a32" />
          </mesh>
          {[0.35, 0.85, 1.35, 1.85].flatMap((y, r) =>
            Array.from({ length: p.w * 7 }, (_, i) => (
              <mesh key={`${r}-${i}`} position={[-p.w / 2 + 0.2 + i * 0.23, y, 0.16]}>
                <boxGeometry args={[0.16, 0.34 + ((i * 7 + r) % 3) * 0.04, 0.3]} />
                <meshStandardMaterial color={GOODS[(i * 3 + r) % GOODS.length]} />
              </mesh>
            )),
          )}
        </group>
      );
    case "pew":
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, 0.42, 0.05]} castShadow receiveShadow>
            <boxGeometry args={[p.w - 0.15, 0.08, 0.5]} />
            <meshStandardMaterial color={p.color ?? "#6b4a2e"} />
          </mesh>
          <mesh position={[0, 0.72, 0.3]} castShadow>
            <boxGeometry args={[p.w - 0.15, 0.6, 0.07]} />
            <meshStandardMaterial color={p.color ?? "#6b4a2e"} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * (p.w / 2 - 0.12), 0.3, 0.1]}>
              <boxGeometry args={[0.07, 0.6, 0.6]} />
              <meshStandardMaterial color="#3e2a1a" />
            </mesh>
          ))}
        </group>
      );
    case "altar":
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, 0.1, 0]} receiveShadow>
            <boxGeometry args={[p.w, 0.2, 1]} />
            <meshStandardMaterial color="#7d2e2e" />
          </mesh>
          <mesh position={[0, 0.65, -0.1]} castShadow>
            <boxGeometry args={[1.4, 0.9, 0.6]} />
            <meshStandardMaterial color="#f4f1ea" />
          </mesh>
          {/* Cross and a stained-glass window behind */}
          <mesh position={[0, 1.7, -0.45]}>
            <boxGeometry args={[0.08, 0.8, 0.05]} />
            <meshStandardMaterial color="#d4af37" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, 1.85, -0.45]}>
            <boxGeometry args={[0.45, 0.08, 0.05]} />
            <meshStandardMaterial color="#d4af37" metalness={0.6} roughness={0.3} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 1.05, 1.9, -0.47]}>
              <boxGeometry args={[0.5, 1.2, 0.03]} />
              <meshStandardMaterial color={s < 0 ? "#3a6ea5" : "#b5331f"} emissive={s < 0 ? "#3a6ea5" : "#e4572e"} emissiveIntensity={0.9} />
            </mesh>
          ))}
        </group>
      );
    case "stage":
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
            <boxGeometry args={[p.w, 0.5, p.h]} />
            <meshStandardMaterial color="#3a2a1e" />
          </mesh>
          <mesh position={[0, 1.6, -p.h / 2 + 0.05]}>
            <boxGeometry args={[p.w, 2.2, 0.08]} />
            <meshStandardMaterial color="#8c1c13" />
          </mesh>
          <mesh position={[0, 0.52, 0.2]}>
            <cylinderGeometry args={[0.5, 0.5, 0.02, 24]} />
            <meshStandardMaterial color="#fff1d0" emissive="#ffd9a0" emissiveIntensity={1.4} toneMapped={false} />
          </mesh>
        </group>
      );
    case "lane":
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, 0.03, 0]} receiveShadow>
            <boxGeometry args={[0.8, 0.06, p.h - 0.1]} />
            <meshStandardMaterial color="#d9b382" roughness={0.3} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.45, 0.04, 0]}>
              <boxGeometry args={[0.1, 0.05, p.h - 0.1]} />
              <meshStandardMaterial color="#2b2b30" />
            </mesh>
          ))}
          {[[0, 0], [-0.12, 0.15], [0.12, 0.15], [-0.24, 0.3], [0, 0.3], [0.24, 0.3]].map(([x, z], i) => (
            <mesh key={i} position={[x, 0.18, -p.h / 2 + 0.5 - z]} castShadow>
              <cylinderGeometry args={[0.04, 0.05, 0.26, 10]} />
              <meshStandardMaterial color="#f4f1ea" />
            </mesh>
          ))}
          <mesh position={[0.15, 0.13, p.h / 2 - 0.4]}>
            <sphereGeometry args={[0.1, 14, 12]} />
            <meshStandardMaterial color={["#e63946", "#457b9d", "#9b5de5", "#f3a712"][Math.floor(p.x) % 4]} metalness={0.3} roughness={0.2} />
          </mesh>
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
            <meshStandardMaterial color="#ffd9f0" emissive="#ffb3dc" emissiveIntensity={night ? 3 : 0.2} toneMapped={false} />
          </mesh>
          {night && <pointLight position={[0, 2.3, 0]} color="#ffb8e0" intensity={7} distance={6} decay={2} />}
        </group>
      );
  }
}

/** A storefront on the block: a tinted, lit-window tower with an awning and a glowing shop window. */
function Building({ prop: p, night }: { prop: Prop; night: boolean }) {
  const cx = p.x + p.w / 2;
  const cz = p.y + p.h / 2;
  const height = buildingHeight(p);
  const material = useMemo(() => buildingMaterial({ color: tint(p.color), base: 1.45 }), [p.color]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <group position={[cx, 0, cz]}>
      <mesh geometry={UNIT_BOX} material={material} scale={[p.w - 0.05, height, p.h]} castShadow receiveShadow />
      {/* Storefront awning keeps a strip of the shop's own color */}
      <mesh position={[0, 1.15, p.h / 2 + 0.2]} castShadow>
        <boxGeometry args={[p.w - 0.4, 0.08, 0.5]} />
        <meshStandardMaterial color={p.color ?? "#1d1f24"} />
      </mesh>
      {/* Shop window */}
      <mesh position={[0, 0.6, p.h / 2 + 0.01]}>
        <planeGeometry args={[p.w - 0.8, 0.8]} />
        <meshStandardMaterial
          color={night ? "#ffe2a8" : "#b9b2d6"}
          emissive="#ffc46b"
          emissiveIntensity={night ? 2.2 : 0.25}
          toneMapped={false}
        />
      </mesh>
      {/* Rooftop water tower on wide buildings */}
      {p.w >= 4 && (
        <group position={[p.w / 2 - 0.8, height, -0.3]}>
          <mesh position={[0, 0.55, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.6, 10]} />
            <meshStandardMaterial color="#6b4f4a" />
          </mesh>
          <mesh position={[0, 0.98, 0]}>
            <coneGeometry args={[0.38, 0.3, 10]} />
            <meshStandardMaterial color="#4a3a3e" />
          </mesh>
        </group>
      )}
    </group>
  );
}

/** Each building gets its own steady height so the row has a skyline. */
function buildingHeight(p: Prop) {
  return 3.3 + (hash(p.id) % 5) * 0.3;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
