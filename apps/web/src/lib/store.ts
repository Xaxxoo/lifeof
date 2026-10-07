import { create } from "zustand";
import type { MoveIntent } from "@nyl/game-core";

export interface Toast {
  id: number;
  text: string;
  tone: "info" | "error" | "good";
}

interface GameState {
  /** serverNow − clientNow, measured on join, so every client animates paths on the same clock. */
  clockOffset: number;
  setClockOffset: (v: number) => void;
  /** Optimistic local path for our own avatar until the server's copy arrives. */
  localIntent: MoveIntent | null;
  setLocalIntent: (i: MoveIntent | null) => void;
  toasts: Toast[];
  toast: (text: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;
}

let toastId = 0;

export const useGame = create<GameState>((set) => ({
  clockOffset: 0,
  setClockOffset: (clockOffset) => set({ clockOffset }),
  localIntent: null,
  setLocalIntent: (localIntent) => set({ localIntent }),
  toasts: [],
  toast: (text, tone = "info") => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, tone }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const serverNow = () => Date.now() + useGame.getState().clockOffset;
