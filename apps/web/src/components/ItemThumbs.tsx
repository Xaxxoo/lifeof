"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { ITEMS, type ItemDef } from "@nyl/content";
import { ItemModel } from "./scene/Furniture";

/**
 * Catalogue thumbnails: every item's 3D model rendered once into a small hidden canvas and kept
 * as an image for the session, so the shop shows the real thing without a WebGL view per card.
 */
const cache = new Map<string, string>();
const listeners = new Set<() => void>();
let version = 0;

function publish(id: string, url: string) {
  cache.set(id, url);
  version++;
  for (const l of listeners) l();
}

export function useThumb(id: string): string | undefined {
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version,
    () => 0,
  );
  return cache.get(id);
}

/** Mount once while the catalogue is open; it renders any thumbnails not made yet, then idles. */
export function ThumbBaker() {
  const [todo] = useState(() => ITEMS.filter((i) => !cache.has(i.id)));
  if (todo.length === 0) return null;
  return (
    <div className="pointer-events-none fixed -left-[400px] top-0 size-[160px] opacity-0" aria-hidden>
      <Canvas gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }} dpr={1} orthographic camera={{ position: [4, 3.4, 4], zoom: 40 }}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 6, 4]} intensity={1.6} />
        <Bake items={todo} />
      </Canvas>
    </div>
  );
}

function Bake({ items }: { items: ItemDef[] }) {
  const [i, setI] = useState(0);
  const frames = useRef(0);
  const gl = useThree((s) => s.gl);
  const get = useThree((s) => s.get);
  const item = items[i];

  useFrame(() => {
    if (!item) return;
    // Let the model render for two frames, then grab it.
    if (++frames.current < 3) return;
    frames.current = 0;
    publish(item.id, gl.domElement.toDataURL("image/png"));
    setI((n) => n + 1);
  });

  // Fit the footprint and height into the frame.
  useLayoutEffect(() => {
    const { camera } = get();
    if (!item || !("zoom" in camera)) return;
    camera.zoom = 92 / Math.max(item.w, item.h, 1.2);
    camera.lookAt(0, 0.55, 0);
    camera.updateProjectionMatrix();
  }, [item, get]);

  if (!item) return null;
  return <ItemModel key={item.id} item={item} />;
}
