"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { Vector3 } from "three";
import { serverNow } from "@/lib/store";

/**
 * World-anchored DOM labels (name tags, speech bubbles, signs).
 * Labels are ordinary React DOM outside the Canvas; one projector inside the Canvas moves them every frame.
 * Cheaper and steadier than a React root per label.
 */
export type LabelAnchors = Map<string, { el: HTMLElement; pos: (now: number) => [number, number, number] }>;

export function useLabelAnchors() {
  return useState<LabelAnchors>(() => new Map())[0];
}

export function LabelProjector({ anchors }: { anchors: LabelAnchors }) {
  const v = useRef(new Vector3()).current;
  useFrame(({ camera, size }) => {
    const now = serverNow();
    for (const { el, pos } of anchors.values()) {
      v.set(...pos(now)).project(camera);
      const x = ((v.x + 1) / 2) * size.width;
      const y = ((1 - v.y) / 2) * size.height;
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      el.style.visibility = v.z > 1 ? "hidden" : "visible";
    }
  });
  return null;
}

/** Registers a DOM element as a label anchored at a world position. */
export function anchorRef(anchors: LabelAnchors, id: string, pos: (now: number) => [number, number, number]) {
  return (el: HTMLElement | null) => {
    if (el) anchors.set(id, { el, pos });
    else anchors.delete(id);
  };
}
