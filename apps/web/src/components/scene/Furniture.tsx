"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { createContext, useContext } from "react";
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
      <ItemModel item={item} ghost={ghost} valid={valid} dim={dim} />
    </group>
  );
}

type MatOpts = { metal?: number; rough?: number; glow?: string; glowI?: number; opacity?: number };

/** How a piece is being drawn: normal, as a green/red placement ghost, or dimmed while selected. */
const Look = createContext<{ tint: string | null; ghost?: boolean; dim?: boolean }>({ tint: null });

function M({ c, o = {} }: { c: string; o?: MatOpts }) {
  const { tint, ghost, dim } = useContext(Look);
  return (
    <meshStandardMaterial
      color={tint ?? c}
      metalness={o.metal ?? 0}
      roughness={o.rough ?? 0.75}
      emissive={!ghost && o.glow ? o.glow : "#000000"}
      emissiveIntensity={!ghost && o.glow ? o.glowI ?? 1 : 0}
      toneMapped={!o.glow}
      transparent={ghost || dim || o.opacity !== undefined}
      opacity={ghost ? 0.55 : dim ? 0.4 : o.opacity ?? 1}
    />
  );
}

function B({ p, s, c, o, cast = true }: { p: [number, number, number]; s: [number, number, number]; c: string; o?: MatOpts; cast?: boolean }) {
  return (
    <mesh position={p} castShadow={cast} receiveShadow>
      <boxGeometry args={s} />
      <M c={c} o={o} />
    </mesh>
  );
}

function C({ p, r, h, c, o, seg = 16, r2 }: { p: [number, number, number]; r: number; h: number; c: string; o?: MatOpts; seg?: number; r2?: number }) {
  return (
    <mesh position={p} castShadow>
      <cylinderGeometry args={[r, r2 ?? r, h, seg]} />
      <M c={c} o={o} />
    </mesh>
  );
}

function legs(x: number, z: number, h: number, c: string, t = 0.06) {
  return [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => <B key={`${sx}${sz}`} p={[sx! * x, h / 2, sz! * z]} s={[t, h, t]} c={c} />);
}

/**
 * Chunky low-poly furniture. Local space: centered on the footprint (item.w × item.h before rotation),
 * front faces +z. Higher-star versions of a model get the nicer details.
 */
export function ItemModel({ item, ghost, valid, dim }: { item: ItemDef; ghost?: boolean; valid?: boolean; dim?: boolean }) {
  const tint = ghost ? (valid ? "#4ade80" : "#ef4444") : null;
  return (
    <Look.Provider value={{ tint, ghost, dim }}>
      <Model item={item} />
    </Look.Provider>
  );
}

function Model({ item }: { item: ItemDef }) {
  const w = item.w - 0.12;
  const d = item.h - 0.12;
  const wood = "#8a6a48";
  const s = item.stars;

  switch (item.model) {
    case "mattress":
      return (
        <group>
          <B p={[0, 0.12, 0]} s={[w, 0.24, d]} c={item.color} />
          <B p={[0, 0.28, -d / 2 + 0.22]} s={[w - 0.2, 0.1, 0.3]} c="#f5f5f5" />
          <B p={[0, 0.25, 0.25]} s={[w + 0.02, 0.04, d * 0.55]} c="#e9e4da" />
        </group>
      );
    case "bed": {
      const frame = s >= 4 ? "#3b2318" : s >= 3 ? "#d8cfc2" : "#6b4f3a";
      return (
        <group>
          <B p={[0, 0.17, 0]} s={[w, 0.24, d]} c={frame} />
          {legs(w / 2 - 0.06, d / 2 - 0.06, 0.1, frame)}
          <B p={[0, 0.38, 0.03]} s={[w - 0.06, 0.2, d - 0.1]} c="#f4f1ea" />
          <B p={[0, 0.5, 0.2]} s={[w - 0.02, 0.06, d * 0.6]} c={item.color} />
          {(w > 1.2 ? [-w / 4, w / 4] : [0]).map((x) => (
            <B key={x} p={[x, 0.55, -d / 2 + 0.25]} s={[w > 1.2 ? w / 2 - 0.15 : w - 0.25, 0.12, 0.28]} c="#ffffff" />
          ))}
          <B p={[0, 0.6, -d / 2 + 0.03]} s={[w, s >= 3 ? 1.05 : 0.8, 0.07]} c={frame} />
          {s >= 4 &&
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => (
              <C key={`${sx}${sz}`} p={[sx! * (w / 2 - 0.03), 1.0, sz! * (d / 2 - 0.03)]} r={0.035} h={2} c={frame} seg={8} />
            ))}
          {s >= 4 && <B p={[0, 2.0, 0]} s={[w, 0.05, d]} c={item.color} o={{ opacity: 0.85 }} cast={false} />}
        </group>
      );
    }
    case "nightstand":
      return (
        <group>
          <B p={[0, 0.28, 0]} s={[0.5, 0.5, 0.45]} c={item.color} />
          <B p={[0, 0.3, 0.23]} s={[0.4, 0.14, 0.02]} c="#6b4f3a" />
          <C p={[0.08, 0.6, 0]} r={0.06} h={0.12} c="#f0c27b" o={{ glow: "#ffcf7a", glowI: 1.4 }} />
        </group>
      );
    case "dresser":
      return (
        <group>
          <B p={[0, 0.45, -0.05]} s={[w, 0.8, 0.5]} c={item.color} />
          {[0.2, 0.45, 0.7].map((y) => (
            <B key={y} p={[0, y, 0.21]} s={[w - 0.12, 0.2, 0.02]} c="#c49a6c" />
          ))}
          {legs(w / 2 - 0.06, 0.18, 0.06, "#5a4632")}
        </group>
      );
    case "wardrobe":
      return (
        <group>
          <B p={[0, 1.0, -0.1]} s={[w, 2.0, 0.55]} c={item.color} />
          <B p={[-w / 4, 1.0, 0.18]} s={[w / 2 - 0.04, 1.85, 0.02]} c="#7d5d44" />
          <B p={[w / 4, 1.0, 0.18]} s={[w / 2 - 0.04, 1.85, 0.02]} c="#7d5d44" />
          {[-0.05, 0.05].map((x) => (
            <B key={x} p={[x, 1.0, 0.2]} s={[0.025, 0.25, 0.02]} c="#d4af37" o={{ metal: 0.8 }} />
          ))}
        </group>
      );
    case "fridge":
      return (
        <group>
          <B p={[0, 0.42, 0]} s={[0.62, 0.84, 0.6]} c={item.color} o={{ rough: 0.35 }} />
          <B p={[0.22, 0.55, 0.31]} s={[0.04, 0.25, 0.03]} c="#9aa0a6" o={{ metal: 0.7 }} />
        </group>
      );
    case "bigfridge":
      return (
        <group>
          <B p={[0, 0.95, -0.03]} s={[0.78, 1.9, 0.72]} c={item.color} o={{ rough: 0.3, metal: 0.2 }} />
          <B p={[0, 1.25, 0.335]} s={[0.76, 0.015, 0.01]} c="#9aa0a6" />
          {[0.75, 1.5].map((y) => (
            <B key={y} p={[0.3, y, 0.35]} s={[0.04, 0.4, 0.04]} c="#9aa0a6" o={{ metal: 0.8 }} />
          ))}
        </group>
      );
    case "stove": {
      const pro = s >= 4;
      const body = item.price > 0 ? item.color : "#5a4632";
      return (
        <group>
          {item.price === 0 ? (
            <>
              <B p={[0, 0.36, 0]} s={[0.7, 0.72, 0.6]} c="#8a6a48" />
              <B p={[0, 0.76, 0]} s={[0.5, 0.08, 0.4]} c={item.color} />
              <C p={[0, 0.81, 0]} r={0.12} h={0.02} c="#c0392b" o={{ glow: "#ff5a1f", glowI: 0.8 }} />
            </>
          ) : (
            <>
              <B p={[0, 0.45, 0]} s={[0.82, 0.9, 0.7]} c={body} o={{ metal: pro ? 0.6 : 0.2, rough: 0.35 }} />
              <B p={[0, 0.4, 0.36]} s={[0.66, 0.45, 0.02]} c="#1b1b20" o={{ rough: 0.1 }} />
              {[[-0.2, -0.15], [0.2, -0.15], [-0.2, 0.15], [0.2, 0.15]].map(([x, z]) => (
                <C key={`${x}${z}`} p={[x!, 0.91, z!]} r={0.11} h={0.02} c="#1b1b20" />
              ))}
              {pro && <B p={[0, 1.15, -0.3]} s={[0.82, 0.5, 0.08]} c="#c7ced6" o={{ metal: 0.8 }} />}
            </>
          )}
        </group>
      );
    }
    case "counter":
    case "sink":
      return (
        <group>
          <B p={[0, 0.43, 0]} s={[0.98, 0.86, 0.75]} c="#f2efe8" />
          <B p={[0, 0.88, 0]} s={[1.0, 0.05, 0.8]} c={item.model === "sink" ? "#cfc8bb" : "#3a3a40"} o={{ rough: 0.3 }} />
          <B p={[0, 0.45, 0.38]} s={[0.8, 0.6, 0.02]} c="#e0dcd2" />
          {item.model === "sink" && (
            <>
              <B p={[0, 0.88, 0.05]} s={[0.5, 0.06, 0.4]} c="#9aa0a6" o={{ metal: 0.7, rough: 0.2 }} />
              <C p={[0, 1.02, -0.22]} r={0.02} h={0.25} c="#c7ced6" o={{ metal: 0.9 }} />
            </>
          )}
          {item.model === "counter" && <C p={[0.25, 0.97, 0]} r={0.09} h={0.14} c="#e76f51" />}
        </group>
      );
    case "diningtable":
      return (
        <group>
          <B p={[0, 0.74, 0]} s={[w, 0.06, 0.8]} c={item.color} />
          {legs(w / 2 - 0.1, 0.3, 0.72, "#5a4632")}
          {[-w / 4, w / 4].flatMap((x) =>
            [-1, 1].map((sz) => (
              <group key={`${x}${sz}`} position={[x, 0, sz * 0.62]} rotation-y={sz > 0 ? Math.PI : 0}>
                <B p={[0, 0.44, 0]} s={[0.38, 0.05, 0.36]} c={wood} />
                <B p={[0, 0.7, -0.17]} s={[0.38, 0.5, 0.04]} c={wood} />
                {legs(0.15, 0.14, 0.44, wood, 0.04)}
              </group>
            )),
          )}
          <C p={[0, 0.84, 0]} r={0.08} h={0.14} c="#2a9d8f" />
        </group>
      );
    case "toilet":
      return (
        <group>
          <C p={[0, 0.2, 0.06]} r={0.2} r2={0.15} h={0.4} c={item.color} o={{ rough: 0.2 }} />
          <C p={[0, 0.42, 0.06]} r={0.22} h={0.04} c={s >= 3 ? "#d4af37" : "#e8e8e8"} />
          <B p={[0, 0.55, -0.24]} s={[0.42, 0.55, 0.18]} c={item.color} o={{ rough: 0.2 }} />
        </group>
      );
    case "shower": {
      const rain = s >= 3;
      return (
        <group>
          <B p={[0, 0.04, 0]} s={[0.92, 0.08, 0.92]} c="#e8eef2" />
          <mesh position={[0, 1.05, 0.44]}>
            <boxGeometry args={[0.92, 2, 0.03]} />
            <M c={item.color} o={{ opacity: 0.28, rough: 0.05 }} />
          </mesh>
          <mesh position={[0.44, 1.05, 0]}>
            <boxGeometry args={[0.03, 2, 0.92]} />
            <M c={item.color} o={{ opacity: 0.28, rough: 0.05 }} />
          </mesh>
          <C p={[-0.38, 1.1, -0.38]} r={0.02} h={2} c="#c7ced6" o={{ metal: 0.9 }} seg={8} />
          <C p={rain ? [0, 2.05, 0] : [-0.3, 1.9, -0.3]} r={rain ? 0.22 : 0.07} h={0.03} c="#c7ced6" o={{ metal: 0.9 }} />
        </group>
      );
    }
    case "bathtub": {
      const claw = s >= 4;
      return (
        <group>
          <B p={[0, claw ? 0.38 : 0.3, 0]} s={[w, claw ? 0.5 : 0.6, d]} c={item.color} o={{ rough: 0.15 }} />
          <B p={[0, claw ? 0.6 : 0.58, 0]} s={[w - 0.16, 0.04, d - 0.16]} c="#a8d8ea" o={{ rough: 0.05, opacity: 0.85 }} />
          {claw && legs(w / 2 - 0.1, d / 2 - 0.12, 0.14, "#d4af37")}
          <C p={[0, 0.75, -d / 2 + 0.08]} r={0.025} h={0.3} c="#c7ced6" o={{ metal: 0.9 }} seg={8} />
        </group>
      );
    }
    case "vanity":
      return (
        <group>
          <B p={[0, 0.4, -0.08]} s={[0.8, 0.8, 0.55]} c="#f2efe8" />
          <B p={[0, 0.82, -0.08]} s={[0.84, 0.05, 0.58]} c={item.color} />
          <C p={[0, 0.83, -0.05]} r={0.17} h={0.05} c="#ffffff" />
          <B p={[0, 1.45, -0.34]} s={[0.6, 0.75, 0.03]} c="#dbe9f2" o={{ metal: 0.6, rough: 0.05 }} />
        </group>
      );
    case "sofa":
    case "armchair": {
      const plush = s >= 3;
      return (
        <group>
          <B p={[0, 0.2, 0.02]} s={[w, 0.24, d * 0.9]} c={item.color} />
          {(w > 1.2 ? [-w / 4 + 0.03, w / 4 - 0.03] : [0]).map((x) => (
            <B key={x} p={[x, 0.38, 0.06]} s={[w > 1.2 ? w / 2 - 0.2 : w - 0.3, 0.12, d * 0.7]} c={item.color} o={{ rough: plush ? 0.55 : 0.85 }} />
          ))}
          <B p={[0, 0.55, -d / 2 + 0.12]} s={[w, plush ? 0.62 : 0.55, 0.22]} c={item.color} />
          {[-1, 1].map((sx) => (
            <B key={sx} p={[sx * (w / 2 - 0.08), 0.42, 0.02]} s={[0.16, plush ? 0.42 : 0.36, d * 0.9]} c={item.color} />
          ))}
          {legs(w / 2 - 0.1, d / 2 - 0.12, 0.08, plush ? "#d4af37" : "#3b2a1e", 0.05)}
          {item.model === "sofa" && <B p={[w / 4, 0.55, -0.05]} s={[0.3, 0.26, 0.1]} c="#e9c46a" />}
        </group>
      );
    }
    case "sectional":
      return (
        <group>
          <B p={[0, 0.2, -d / 4]} s={[w, 0.24, d / 2]} c={item.color} />
          <B p={[w / 2 - 0.45, 0.2, d / 4]} s={[0.9, 0.24, d / 2]} c={item.color} />
          <B p={[0, 0.55, -d / 2 + 0.11]} s={[w, 0.6, 0.22]} c={item.color} />
          <B p={[w / 2 - 0.11, 0.55, 0]} s={[0.22, 0.6, d]} c={item.color} />
          <B p={[-w / 2 + 0.08, 0.42, -d / 4]} s={[0.16, 0.4, d / 2]} c={item.color} />
          {[-w / 3, 0, w / 4].map((x) => (
            <B key={x} p={[x, 0.37, -d / 4 + 0.05]} s={[0.8, 0.1, d / 2 - 0.25]} c="#9c9893" />
          ))}
          <B p={[-w / 4, 0.58, -d / 2 + 0.3]} s={[0.32, 0.28, 0.1]} c="#2a9d8f" />
        </group>
      );
    case "beanbag":
      return (
        <mesh position={[0, 0.24, 0]} scale={[1, 0.62, 1]} castShadow>
          <sphereGeometry args={[0.4, 18, 14]} />
          <M c={item.color} o={{ rough: 0.9 }} />
        </mesh>
      );
    case "coffeetable":
      return (
        <group>
          <B p={[0, 0.38, 0]} s={[w * 0.8, 0.06, 0.55]} c={item.color} />
          <B p={[0, 0.12, 0]} s={[w * 0.72, 0.04, 0.47]} c="#5a4632" />
          {legs(w * 0.36, 0.22, 0.38, "#3b2a1e", 0.05)}
          <B p={[-0.2, 0.44, 0.05]} s={[0.25, 0.05, 0.2]} c="#e63946" />
        </group>
      );
    case "table":
      return (
        <group>
          <B p={[0, 0.72, 0]} s={[w, 0.05, d]} c={item.color} />
          {legs(w / 2 - 0.06, d / 2 - 0.06, 0.72, "#7d7d82", 0.035)}
        </group>
      );
    case "chair":
      return (
        <group>
          <B p={[0, 0.44, 0]} s={[0.42, 0.05, 0.42]} c={item.color} />
          <B p={[0, 0.72, -0.19]} s={[0.42, 0.5, 0.05]} c={item.color} />
          {legs(0.17, 0.17, 0.44, item.color, 0.04)}
        </group>
      );
    case "tv": {
      const crt = item.price < 200;
      return (
        <group>
          <B p={[0, 0.22, -0.05]} s={[w * 0.95, 0.42, 0.45]} c="#5a4636" />
          <B p={[0, 0.22, 0.18]} s={[w * 0.9, 0.3, 0.02]} c="#3b2a1e" />
          {crt ? (
            <>
              <B p={[0, 0.7, -0.08]} s={[0.62, 0.5, 0.45]} c={item.color} />
              <B p={[0, 0.7, 0.15]} s={[0.48, 0.38, 0.02]} c="#2b4a6b" o={{ glow: "#5a8fc2", glowI: 0.6 }} />
            </>
          ) : (
            <>
              <B p={[0, 0.48, -0.1]} s={[0.12, 0.1, 0.12]} c="#222" />
              <B p={[0, 0.48 + w * 0.22, -0.1]} s={[w * 0.92, w * 0.5, 0.05]} c={item.color} o={{ rough: 0.2 }} />
              <B p={[0, 0.48 + w * 0.22, -0.07]} s={[w * 0.86, w * 0.44, 0.01]} c="#1e3a5f" o={{ glow: "#4b8bd6", glowI: 0.7 }} />
            </>
          )}
        </group>
      );
    }
    case "console":
      return (
        <group>
          <B p={[0, 0.2, 0]} s={[0.8, 0.4, 0.45]} c="#3b2a1e" />
          <B p={[-0.15, 0.45, 0]} s={[0.35, 0.08, 0.28]} c={item.color} />
          <B p={[-0.15, 0.45, 0.145]} s={[0.25, 0.01, 0.01]} c="#3bd1ff" o={{ glow: "#3bd1ff", glowI: 2 }} />
          <B p={[0.2, 0.43, 0.05]} s={[0.18, 0.04, 0.1]} c="#111" />
        </group>
      );
    case "arcade":
      return (
        <group>
          <B p={[0, 0.85, -0.05]} s={[0.66, 1.7, 0.6]} c={item.color} />
          <B p={[0, 1.2, 0.26]} s={[0.5, 0.42, 0.02]} c="#111" o={{ glow: "#ff4fa3", glowI: 0.9 }} />
          <B p={[0, 0.85, 0.3]} s={[0.6, 0.06, 0.25]} c="#222" />
          <C p={[-0.12, 0.92, 0.32]} r={0.03} h={0.1} c="#e63946" seg={8} />
          <C p={[0.12, 0.9, 0.34]} r={0.035} h={0.03} c="#f3a712" seg={10} />
          <B p={[0, 1.62, 0.26]} s={[0.6, 0.14, 0.04]} c="#f3a712" o={{ glow: "#ffd27a", glowI: 1.5 }} />
        </group>
      );
    case "speaker":
      return (
        <group>
          <B p={[0, 0.45, 0]} s={[0.42, 0.9, 0.38]} c={item.color} />
          <C p={[0, 0.3, 0.2]} r={0.14} h={0.02} c="#3a3a40" />
          <C p={[0, 0.66, 0.2]} r={0.08} h={0.02} c="#3a3a40" />
          <B p={[0, 0.06, 0.2]} s={[0.4, 0.02, 0.02]} c="#3bd1ff" o={{ glow: "#3bd1ff", glowI: 2 }} />
        </group>
      );
    case "turntable":
      return (
        <group>
          <B p={[0, 0.3, 0]} s={[0.7, 0.6, 0.5]} c="#5a4632" />
          <B p={[0, 0.63, 0]} s={[0.62, 0.06, 0.46]} c={item.color} />
          <C p={[-0.06, 0.67, 0]} r={0.17} h={0.015} c="#111" seg={24} />
          <C p={[-0.06, 0.68, 0]} r={0.05} h={0.01} c="#e63946" />
          <B p={[0.2, 0.69, -0.08]} s={[0.02, 0.02, 0.24]} c="#c7ced6" o={{ metal: 0.9 }} />
        </group>
      );
    case "aquarium":
      return (
        <group>
          <B p={[0, 0.35, 0]} s={[w, 0.7, 0.5]} c="#2b2b30" />
          <mesh position={[0, 0.95, 0]}>
            <boxGeometry args={[w - 0.04, 0.5, 0.46]} />
            <M c={"#7fc4e6"} o={{ opacity: 0.45, rough: 0.05, glow: "#3a86b5", glowI: 0.5 }} />
          </mesh>
          {[[-0.3, 0.95, "#f3a712"], [0.2, 1.05, "#e63946"], [0.45, 0.9, "#f4f1ea"]].map(([x, y, c]) => (
            <mesh key={String(x)} position={[x as number, y as number, 0]} scale={[1.6, 1, 0.6]}>
              <sphereGeometry args={[0.04, 8, 6]} />
              <M c={c as string} />
            </mesh>
          ))}
          <C p={[-0.5, 0.82, 0]} r={0.03} h={0.25} c="#3f7d3a" seg={6} />
        </group>
      );
    case "desk": {
      const station = s >= 4;
      return (
        <group>
          <B p={[0, 0.74, 0]} s={[w, 0.05, d]} c={item.color} />
          {station ? (
            [-1, 1].map((sx) => <B key={sx} p={[sx * (w / 2 - 0.05), 0.37, 0]} s={[0.06, 0.74, d - 0.1]} c="#e63946" o={{ glow: "#e63946", glowI: 0.6 }} />)
          ) : (
            legs(w / 2 - 0.06, d / 2 - 0.06, 0.74, "#5a4632", 0.05)
          )}
          {station ? (
            <>
              {[-0.35, 0.35].map((x) => (
                <group key={x}>
                  <B p={[x, 1.1, -0.2]} s={[0.6, 0.36, 0.03]} c="#111" />
                  <B p={[x, 1.1, -0.18]} s={[0.56, 0.32, 0.01]} c="#2b4a6b" o={{ glow: "#7c5cff", glowI: 0.7 }} />
                </group>
              ))}
              <B p={[0, 0.78, 0.1]} s={[0.5, 0.02, 0.16]} c="#222" o={{ glow: "#3bd1ff", glowI: 0.4 }} />
            </>
          ) : (
            <>
              <B p={[0, 0.78, 0.06]} s={[0.4, 0.02, 0.28]} c="#c0c0c0" o={{ metal: 0.6 }} />
              <mesh position={[0, 0.92, -0.09]} rotation-x={-0.25}>
                <boxGeometry args={[0.4, 0.26, 0.02]} />
                <M c={"#c0c0c0"} o={{ metal: 0.6 }} />
              </mesh>
              <C p={[0.45, 0.82, 0]} r={0.05} h={0.12} c="#f4f1ea" />
            </>
          )}
          <group position={[0, 0, 0.55]}>
            <C p={[0, 0.25, 0]} r={0.04} h={0.4} c="#333" seg={8} />
            <B p={[0, 0.48, 0]} s={[0.45, 0.07, 0.42]} c={station ? "#1b1b20" : "#4f6d5a"} />
            <B p={[0, 0.78, 0.2]} s={[0.45, 0.55, 0.07]} c={station ? "#e63946" : "#4f6d5a"} />
          </group>
        </group>
      );
    }
    case "mirror":
      return (
        <group>
          <B p={[0, 0.85, 0]} s={[0.55, 1.6, 0.06]} c="#6b4f3a" />
          <B p={[0, 0.85, 0.035]} s={[0.45, 1.5, 0.01]} c="#dbe9f2" o={{ metal: 0.7, rough: 0.05 }} />
          <B p={[0, 0.03, 0.12]} s={[0.5, 0.06, 0.3]} c="#6b4f3a" />
        </group>
      );
    case "guitar":
      return (
        <group>
          <B p={[0, 0.03, 0]} s={[0.4, 0.06, 0.3]} c="#333" />
          <group rotation-x={-0.2} position={[0, 0.05, 0]}>
            <mesh position={[0, 0.3, 0]} scale={[1, 1.25, 0.4]} castShadow>
              <sphereGeometry args={[0.2, 16, 12]} />
              <M c={item.color} o={{ rough: 0.35 }} />
            </mesh>
            <C p={[0, 0.32, 0.08]} r={0.06} h={0.01} c="#1a1a1a" />
            <B p={[0, 0.78, 0]} s={[0.06, 0.62, 0.04]} c="#3b2416" />
            <B p={[0, 1.12, 0]} s={[0.09, 0.12, 0.04]} c="#3b2416" />
          </group>
        </group>
      );
    case "dumbbells":
      return (
        <group>
          <B p={[0, 0.25, 0]} s={[0.7, 0.04, 0.3]} c="#555" />
          {legs(0.32, 0.12, 0.25, "#333", 0.04)}
          {[-0.15, 0.15].map((x) => (
            <group key={x} position={[x, 0.33, 0]} rotation-x={Math.PI / 2}>
              <C p={[0, 0, 0]} r={0.025} h={0.3} c="#888" o={{ metal: 0.8 }} seg={8} />
              {[-0.12, 0.12].map((yy) => (
                <C key={yy} p={[0, yy, 0]} r={0.07} h={0.07} c={item.color} seg={12} />
              ))}
            </group>
          ))}
        </group>
      );
    case "treadmill":
      return (
        <group>
          <B p={[0, 0.12, 0.1]} s={[0.7, 0.2, d - 0.2]} c={item.color} />
          <B p={[0, 0.23, 0.1]} s={[0.55, 0.02, d - 0.35]} c="#111" />
          {[-0.33, 0.33].map((x) => (
            <B key={x} p={[x, 0.7, -d / 2 + 0.25]} s={[0.05, 1.0, 0.05]} c="#9aa0a6" o={{ metal: 0.7 }} />
          ))}
          <B p={[0, 1.2, -d / 2 + 0.28]} s={[0.66, 0.25, 0.12]} c="#222" />
          <B p={[0, 1.24, -d / 2 + 0.35]} s={[0.4, 0.14, 0.01]} c="#3bd1ff" o={{ glow: "#3bd1ff", glowI: 1.2 }} />
        </group>
      );
    case "yogamat":
      return (
        <group>
          <B p={[0, 0.015, 0]} s={[0.6, 0.03, d - 0.1]} c={item.color} cast={false} />
          <C p={[0.2, 0.06, -d / 2 + 0.15]} r={0.06} h={0.55} c="#2a9d8f" seg={10} />
        </group>
      );
    case "easel":
      return (
        <group>
          {[-0.2, 0.2].map((x) => (
            <mesh key={x} position={[x, 0.75, 0.05]} rotation-z={x * -0.4} castShadow>
              <boxGeometry args={[0.04, 1.5, 0.04]} />
              <M c={item.color} />
            </mesh>
          ))}
          <mesh position={[0, 0.7, -0.2]} rotation-x={0.35}>
            <boxGeometry args={[0.04, 1.4, 0.04]} />
            <M c={item.color} />
          </mesh>
          <B p={[0, 1.05, 0.08]} s={[0.6, 0.5, 0.03]} c="#f4f1ea" />
          <B p={[-0.1, 1.1, 0.1]} s={[0.25, 0.18, 0.005]} c="#2a9d8f" />
          <B p={[0.12, 0.98, 0.1]} s={[0.2, 0.15, 0.005]} c="#e76f51" />
          <B p={[0, 0.78, 0.1]} s={[0.6, 0.03, 0.08]} c={item.color} />
        </group>
      );
    case "piano":
      return (
        <group>
          <B p={[0, 0.7, -0.15]} s={[w, 1.3, 0.5]} c={item.color} o={{ rough: 0.15 }} />
          <B p={[0, 0.72, 0.15]} s={[w - 0.1, 0.06, 0.25]} c="#f4f1ea" />
          {Array.from({ length: 10 }, (_, k) => (
            <B key={k} p={[-w / 2 + 0.2 + k * ((w - 0.4) / 9), 0.76, 0.1]} s={[0.04, 0.03, 0.14]} c="#111" />
          ))}
          <B p={[0, 0.35, 0.55]} s={[0.8, 0.08, 0.32]} c={item.color} />
          {legs(0.35, 0.12, 0.35, item.color, 0.05).map((l, k) => (
            <group key={k} position={[0, 0, 0.55]}>
              {l}
            </group>
          ))}
          <C p={[w / 2 - 0.2, 1.42, -0.15]} r={0.04} h={0.12} c="#d4af37" o={{ metal: 0.8 }} />
        </group>
      );
    case "bookshelf":
      return (
        <group>
          <B p={[0, 0.95, -0.12]} s={[w * 0.92, 1.9, 0.36]} c={item.color} />
          {[0.3, 0.75, 1.2, 1.62].map((y, r) =>
            Array.from({ length: 6 }, (_, k) => (
              <B
                key={`${r}-${k}`}
                p={[-0.32 + k * 0.13, y + 0.13, 0.02]}
                s={[0.09, 0.26 + ((k + r) % 3) * 0.03, 0.22]}
                c={["#c0392b", "#2c3e50", "#e0a526", "#2a9d8f", "#f4f1ea", "#7c5cbf"][(k + r * 2) % 6]!}
              />
            )),
          )}
        </group>
      );
    case "lamp": {
      const arc = s >= 3;
      return arc ? (
        <group>
          <C p={[-0.3, 0.05, -0.3]} r={0.16} h={0.1} c="#3a3a40" />
          <mesh position={[-0.05, 1.05, -0.05]} rotation-z={-0.5} rotation-x={0.5}>
            <cylinderGeometry args={[0.02, 0.02, 2.1, 8]} />
            <M c={"#c7ced6"} o={{ metal: 0.9 }} />
          </mesh>
          <mesh position={[0.25, 1.85, 0.25]} rotation-x={Math.PI}>
            <coneGeometry args={[0.22, 0.25, 18, 1, true]} />
            <M c={item.color} o={{ glow: "#ffd9a0", glowI: 1.6 }} />
          </mesh>
        </group>
      ) : (
        <group>
          <C p={[0, 0.03, 0]} r={0.15} h={0.06} c="#333" />
          <C p={[0, 0.72, 0]} r={0.022} h={1.4} c="#333" seg={8} />
          <C p={[0, 1.45, 0]} r={0.13} r2={0.2} h={0.28} c={item.color} o={{ glow: "#ffcf7a", glowI: 1.4 }} />
        </group>
      );
    }
    case "tablelamp":
      return (
        <group>
          <B p={[0, 0.3, 0]} s={[0.45, 0.6, 0.45]} c="#8a6a48" />
          <C p={[0, 0.72, 0]} r={0.07} h={0.24} c="#f4f1ea" />
          <C p={[0, 0.94, 0]} r={0.1} r2={0.17} h={0.2} c={item.color} o={{ glow: "#ffcf7a", glowI: 1.6 }} />
        </group>
      );
    case "neon":
      return (
        <group>
          <B p={[0, 0.5, -0.3]} s={[0.7, 1.0, 0.06]} c="#1b1b20" />
          <B p={[-0.14, 0.62, -0.26]} s={[0.05, 0.42, 0.04]} c={item.color} o={{ glow: item.color, glowI: 3 }} />
          <B p={[-0.06, 0.74, -0.26]} s={[0.16, 0.05, 0.04]} c={item.color} o={{ glow: item.color, glowI: 3 }} />
          <B p={[-0.06, 0.5, -0.26]} s={[0.16, 0.05, 0.04]} c={item.color} o={{ glow: item.color, glowI: 3 }} />
          <B p={[0.12, 0.62, -0.26]} s={[0.05, 0.42, 0.04]} c="#7cf5ff" o={{ glow: "#3bd1ff", glowI: 3 }} />
          <mesh position={[0.21, 0.62, -0.26]} rotation-z={0.6}>
            <boxGeometry args={[0.05, 0.3, 0.04]} />
            <M c={"#7cf5ff"} o={{ glow: "#3bd1ff", glowI: 3 }} />
          </mesh>
        </group>
      );
    case "stringlights":
      return (
        <group>
          {[-w / 2 + 0.05, w / 2 - 0.05].map((x) => (
            <C key={x} p={[x, 0.9, 0]} r={0.025} h={1.8} c="#5a4632" seg={6} />
          ))}
          {Array.from({ length: 9 }, (_, k) => {
            const t = k / 8;
            const x = -w / 2 + 0.05 + t * (w - 0.1);
            const y = 1.75 - Math.sin(t * Math.PI) * 0.35;
            return (
              <mesh key={k} position={[x, y, 0]}>
                <sphereGeometry args={[0.04, 8, 6]} />
                <M c={item.color} o={{ glow: "#ffcf7a", glowI: 3 }} />
              </mesh>
            );
          })}
        </group>
      );
    case "plant":
      return (
        <group>
          <C p={[0, 0.16, 0]} r={0.16} r2={0.12} h={0.32} c="#c47a52" />
          {[-0.08, -0.03, 0.03, 0.08].map((x, k) => (
            <mesh key={x} position={[x, 0.6 + (k % 2) * 0.08, (k - 1.5) * 0.03]} rotation-z={x * 2.5} castShadow>
              <boxGeometry args={[0.06, 0.62, 0.02]} />
              <M c={k % 2 ? item.color : "#5a9a4a"} />
            </mesh>
          ))}
        </group>
      );
    case "cactus":
      return (
        <group>
          <C p={[0, 0.1, 0]} r={0.13} r2={0.1} h={0.2} c="#c47a52" />
          <C p={[0, 0.45, 0]} r={0.08} h={0.55} c={item.color} seg={10} />
          <C p={[0.1, 0.5, 0]} r={0.04} h={0.2} c={item.color} seg={8} />
          <mesh position={[0, 0.74, 0]}>
            <sphereGeometry args={[0.08, 10, 8]} />
            <M c={item.color} />
          </mesh>
        </group>
      );
    case "monstera":
      return (
        <group>
          <C p={[0, 0.2, 0]} r={0.2} r2={0.15} h={0.4} c="#f4f1ea" />
          {Array.from({ length: 7 }, (_, k) => {
            const a = (k / 7) * Math.PI * 2;
            return (
              <mesh key={k} position={[Math.cos(a) * 0.22, 0.75 + (k % 3) * 0.15, Math.sin(a) * 0.22]} rotation={[Math.sin(a) * 0.7, a, Math.cos(a) * 0.7]} castShadow>
                <sphereGeometry args={[0.2, 10, 6]} />
                <M c={k % 2 ? item.color : "#3a7d44"} />
              </mesh>
            );
          })}
        </group>
      );
    case "rug": {
      const fancy = s >= 4;
      return (
        <group>
          <mesh position={[0, 0.012, 0]} rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={[w, d]} />
            <M c={item.color} />
          </mesh>
          <mesh position={[0, 0.014, 0]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[w - 0.25, d - 0.25]} />
            <M c={fancy ? "#1d3557" : "#1f6f43"} />
          </mesh>
          <mesh position={[0, 0.016, 0]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[w - 0.6, d - 0.6]} />
            <M c={fancy ? "#c9a227" : item.color} />
          </mesh>
          {fancy && (
            <mesh position={[0, 0.018, 0]} rotation-x={-Math.PI / 2}>
              <circleGeometry args={[Math.min(w, d) * 0.22, 6]} />
              <M c={"#8c2f39"} />
            </mesh>
          )}
        </group>
      );
    }
    case "art":
      return (
        <group>
          <mesh position={[0, 0.65, -0.32]} rotation-x={-0.12} castShadow>
            <boxGeometry args={[0.75, 1.0, 0.05]} />
            <M c={"#1d1d1f"} />
          </mesh>
          <mesh position={[0, 0.66, -0.29]} rotation-x={-0.12}>
            <planeGeometry args={[0.62, 0.86]} />
            <M c={item.color} />
          </mesh>
          <mesh position={[0.08, 0.75, -0.28]} rotation-x={-0.12}>
            <circleGeometry args={[0.17, 20]} />
            <M c={"#264653"} />
          </mesh>
          <mesh position={[-0.12, 0.45, -0.28]} rotation-x={-0.12}>
            <planeGeometry args={[0.25, 0.22]} />
            <M c={"#e9c46a"} />
          </mesh>
        </group>
      );
    case "vase":
      return (
        <group>
          <B p={[0, 0.35, 0]} s={[0.4, 0.7, 0.4]} c="#f4f1ea" />
          <C p={[0, 0.85, 0]} r={0.08} r2={0.11} h={0.3} c={item.color} o={{ rough: 0.3 }} />
          {[[-0.05, "#e63946"], [0.04, "#f3a712"], [0.0, "#f15bb5"]].map(([x, c], k) => (
            <mesh key={k} position={[x as number, 1.12 + k * 0.03, (k - 1) * 0.04]}>
              <sphereGeometry args={[0.05, 8, 6]} />
              <M c={c as string} />
            </mesh>
          ))}
        </group>
      );
  }
}
