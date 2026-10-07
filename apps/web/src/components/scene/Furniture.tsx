"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { ITEM_BY_ID, type ItemDef } from "@nyl/content";

export interface PlacedObject {
  _id: string;
  itemId: string;
  x: number;
  y: number;
  rot: number;
}

/** World-space center of an item's footprint, accounting for rotation. */
export function itemCenter(item: ItemDef, x: number, y: number, rot: number) {
  const [w, h] = rot % 2 === 1 ? [item.h, item.w] : [item.w, item.h];
  return { x: x + w / 2, z: y + h / 2, w, h };
}

export function Furniture({
  objects,
  onPick,
  highlight,
}: {
  objects: PlacedObject[];
  onPick: (o: PlacedObject) => void;
  highlight?: string | null;
}) {
  return (
    <group>
      {objects.map((o) => {
        const item = ITEM_BY_ID[o.itemId];
        if (!item) return null;
        return (
          <FurniturePiece
            key={o._id}
            item={item}
            x={o.x}
            y={o.y}
            rot={o.rot}
            dim={highlight === o._id}
            onClick={(e) => {
              e.stopPropagation();
              onPick(o);
            }}
          />
        );
      })}
    </group>
  );
}

export function FurniturePiece({
  item,
  x,
  y,
  rot,
  ghost,
  valid = true,
  dim,
  onClick,
}: {
  item: ItemDef;
  x: number;
  y: number;
  rot: number;
  ghost?: boolean;
  valid?: boolean;
  dim?: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const c = itemCenter(item, x, y, rot);
  return (
    <group position={[c.x, 0, c.z]} rotation-y={(-rot * Math.PI) / 2} onClick={onClick}>
      <Model item={item} ghost={ghost} valid={valid} dim={dim} />
    </group>
  );
}

/** Simple, readable furniture shapes. Local space: centered, footprint item.w × item.h before rotation. */
function Model({ item, ghost, valid, dim }: { item: ItemDef; ghost?: boolean; valid?: boolean; dim?: boolean }) {
  const w = item.w - 0.12;
  const d = item.h - 0.12;
  const tint = ghost ? (valid ? "#4ade80" : "#ef4444") : item.color;
  const m = (color: string) => (
    <meshStandardMaterial
      color={ghost ? tint : color}
      transparent={ghost || dim}
      opacity={ghost ? 0.55 : dim ? 0.4 : 1}
      roughness={0.8}
    />
  );

  switch (item.model) {
    case "mattress":
    case "bed": {
      const frame = item.model === "bed";
      return (
        <group>
          {frame && (
            <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
              <boxGeometry args={[w, 0.3, d]} />
              {m("#6b4f3a")}
            </mesh>
          )}
          <mesh position={[0, frame ? 0.38 : 0.12, 0]} castShadow receiveShadow>
            <boxGeometry args={[w - 0.04, frame ? 0.16 : 0.24, d - 0.04]} />
            {m(item.color)}
          </mesh>
          <mesh position={[0, frame ? 0.5 : 0.28, -d / 2 + 0.2]} castShadow>
            <boxGeometry args={[w - 0.2, 0.1, 0.25]} />
            {m("#f5f5f5")}
          </mesh>
          {frame && (
            <mesh position={[0, 0.55, -d / 2 + 0.03]} castShadow>
              <boxGeometry args={[w, 0.8, 0.06]} />
              {m("#6b4f3a")}
            </mesh>
          )}
        </group>
      );
    }
    case "fridge":
      return (
        <group>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[w * 0.8, 0.9, d * 0.8]} />
            {m(item.color)}
          </mesh>
          <mesh position={[w * 0.25, 0.6, d * 0.4 + 0.01]}>
            <boxGeometry args={[0.04, 0.25, 0.03]} />
            {m("#777")}
          </mesh>
        </group>
      );
    case "stove":
      return (
        <group>
          <mesh position={[0, 0.42, 0]} castShadow>
            <boxGeometry args={[w * 0.85, 0.84, d * 0.85]} />
            {m(item.price > 0 ? item.color : "#8a6a48")}
          </mesh>
          {[-0.15, 0.15].map((xx) => (
            <mesh key={xx} position={[xx, 0.86, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.03, 16]} />
              {m("#222")}
            </mesh>
          ))}
        </group>
      );
    case "toilet":
      return (
        <group>
          <mesh position={[0, 0.2, 0.05]} castShadow>
            <cylinderGeometry args={[0.2, 0.16, 0.4, 16]} />
            {m(item.color)}
          </mesh>
          <mesh position={[0, 0.45, -0.25]} castShadow>
            <boxGeometry args={[0.4, 0.5, 0.18]} />
            {m(item.color)}
          </mesh>
        </group>
      );
    case "shower":
      return (
        <group>
          <mesh position={[0, 0.03, 0]} receiveShadow>
            <boxGeometry args={[w, 0.06, d]} />
            {m("#e8eef2")}
          </mesh>
          <mesh position={[0, 1.0, 0]}>
            <boxGeometry args={[w, 2, d]} />
            <meshStandardMaterial color={ghost ? tint : item.color} transparent opacity={0.3} />
          </mesh>
          <mesh position={[0, 1.9, -d / 2 + 0.1]}>
            <cylinderGeometry args={[0.08, 0.08, 0.04, 12]} />
            {m("#aaa")}
          </mesh>
        </group>
      );
    case "tv":
      return (
        <group>
          <mesh position={[0, 0.25, 0]} castShadow>
            <boxGeometry args={[w * 0.9, 0.5, d * 0.5]} />
            {m("#5a4636")}
          </mesh>
          <mesh position={[0, 0.8, 0]} castShadow>
            <boxGeometry args={[w * 0.85, 0.55, item.price > 200 ? 0.06 : 0.4]} />
            {m(item.color)}
          </mesh>
          <mesh position={[0, 0.8, item.price > 200 ? 0.031 : 0.201]}>
            <planeGeometry args={[w * 0.75, 0.45]} />
            <meshStandardMaterial color="#1e3a5f" emissive="#3b6ea5" emissiveIntensity={0.4} />
          </mesh>
        </group>
      );
    case "sofa":
    case "armchair":
      return (
        <group>
          <mesh position={[0, 0.22, 0.05]} castShadow receiveShadow>
            <boxGeometry args={[w, 0.3, d * 0.85]} />
            {m(item.color)}
          </mesh>
          <mesh position={[0, 0.5, -d / 2 + 0.12]} castShadow>
            <boxGeometry args={[w, 0.6, 0.2]} />
            {m(item.color)}
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * (w / 2 - 0.07), 0.35, 0.05]} castShadow>
              <boxGeometry args={[0.14, 0.4, d * 0.85]} />
              {m(item.color)}
            </mesh>
          ))}
        </group>
      );
    case "table":
    case "desk":
      return (
        <group>
          <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 0.06, d]} />
            {m(item.color)}
          </mesh>
          {[
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
          ].map(([sx, sz]) => (
            <mesh key={`${sx}${sz}`} position={[sx! * (w / 2 - 0.06), 0.36, sz! * (d / 2 - 0.06)]}>
              <boxGeometry args={[0.05, 0.72, 0.05]} />
              {m(item.color)}
            </mesh>
          ))}
          {item.model === "desk" && (
            <group position={[0, 0.76, 0]}>
              <mesh position={[0, 0.01, 0.05]}>
                <boxGeometry args={[0.4, 0.02, 0.28]} />
                {m("#c0c0c0")}
              </mesh>
              <mesh position={[0, 0.14, -0.09]} rotation-x={-0.25}>
                <boxGeometry args={[0.4, 0.26, 0.02]} />
                {m("#c0c0c0")}
              </mesh>
            </group>
          )}
        </group>
      );
    case "chair":
      return (
        <group>
          <mesh position={[0, 0.42, 0]} castShadow>
            <boxGeometry args={[0.42, 0.05, 0.42]} />
            {m(item.color)}
          </mesh>
          <mesh position={[0, 0.7, -0.19]} castShadow>
            <boxGeometry args={[0.42, 0.5, 0.05]} />
            {m(item.color)}
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[0.36, 0.4, 0.36]} />
            <meshStandardMaterial color={item.color} transparent opacity={ghost ? 0.3 : 0} />
          </mesh>
        </group>
      );
    case "plant":
      return (
        <group>
          <mesh position={[0, 0.15, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.12, 0.3, 12]} />
            {m("#b5651d")}
          </mesh>
          {[-0.06, 0, 0.06].map((xx, i) => (
            <mesh key={xx} position={[xx, 0.55 + i * 0.05, 0]} rotation-z={xx * 3} castShadow>
              <boxGeometry args={[0.05, 0.6, 0.02]} />
              {m(item.color)}
            </mesh>
          ))}
        </group>
      );
    case "mirror":
      return (
        <group>
          <mesh position={[0, 0.85, 0]} castShadow>
            <boxGeometry args={[0.5, 1.5, 0.06]} />
            {m("#6b4f3a")}
          </mesh>
          <mesh position={[0, 0.85, 0.031]}>
            <planeGeometry args={[0.4, 1.4]} />
            <meshStandardMaterial color="#dbe9f2" metalness={0.6} roughness={0.1} />
          </mesh>
        </group>
      );
    case "guitar":
      return (
        <group rotation-x={-0.2}>
          <mesh position={[0, 0.3, 0]} scale={[1, 1.2, 0.4]} castShadow>
            <sphereGeometry args={[0.2, 14, 12]} />
            {m(item.color)}
          </mesh>
          <mesh position={[0, 0.75, 0]}>
            <boxGeometry args={[0.06, 0.6, 0.04]} />
            {m("#3b2416")}
          </mesh>
        </group>
      );
    case "dumbbells":
      return (
        <group>
          {[-0.12, 0.12].map((xx) => (
            <group key={xx} position={[xx, 0.08, 0]} rotation-x={Math.PI / 2}>
              <mesh>
                <cylinderGeometry args={[0.025, 0.025, 0.36, 8]} />
                {m("#888")}
              </mesh>
              {[-0.15, 0.15].map((yy) => (
                <mesh key={yy} position={[0, yy, 0]} castShadow>
                  <cylinderGeometry args={[0.07, 0.07, 0.08, 12]} />
                  {m(item.color)}
                </mesh>
              ))}
            </group>
          ))}
        </group>
      );
    case "rug":
      return (
        <group>
          <mesh position={[0, 0.012, 0]} rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={[w, d]} />
            {m(item.color)}
          </mesh>
          {[-0.3, 0, 0.3].map((zz) => (
            <mesh key={zz} position={[0, 0.014, zz * d]} rotation-x={-Math.PI / 2}>
              <planeGeometry args={[w, 0.1]} />
              {m("#1f6f43")}
            </mesh>
          ))}
        </group>
      );
    case "lamp":
      return (
        <group>
          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.025, 0.04, 1.4, 8]} />
            {m("#333")}
          </mesh>
          <mesh position={[0, 1.45, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.2, 0.25, 14, 1, true]} />
            <meshStandardMaterial color={item.color} emissive="#ffcf7a" emissiveIntensity={0.5} side={2} />
          </mesh>
        </group>
      );
    case "bookshelf":
      return (
        <group>
          <mesh position={[0, 0.9, -0.1]} castShadow>
            <boxGeometry args={[w * 0.9, 1.8, 0.35]} />
            {m(item.color)}
          </mesh>
          {[0.35, 0.8, 1.25].map((yy, i) => (
            <mesh key={yy} position={[0, yy + 0.12, 0.05]}>
              <boxGeometry args={[w * 0.75, 0.22, 0.05]} />
              {m(["#c0392b", "#2c3e50", "#e0a526"][i]!)}
            </mesh>
          ))}
        </group>
      );
    case "radiator":
      return (
        <mesh position={[0, 0.35, 0]}>
          <boxGeometry args={[w, 0.7, 0.2]} />
          {m("#ddd")}
        </mesh>
      );
  }
}
