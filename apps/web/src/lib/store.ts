import { create } from "zustand";
import type { MoveIntent } from "@nyl/game-core";

export interface Toast {
  id: number;
  text: string;
  tone: "info" | "error" | "good";
}

export interface PendingGo {
  roomId: string;
  target: string;
  actionId?: string;
}

interface GameState {
  /** serverNow − clientNow, measured on join, so every client animates paths on the same clock. */
  clockOffset: number;
  setClockOffset: (v: number) => void;
  /** Optimistic local path for our own avatar until the server's copy arrives. */
  localIntent: MoveIntent | null;
  setLocalIntent: (i: MoveIntent | null) => void;
  /** Where the map sent us: once we're in that room, walk to the target and open it (or do the action). */
  pendingGo: PendingGo | null;
  /** When we last came up from the subway (end of a ride or a shift), to play the stairs. */
  emergeAt: number | null;
  /** Keep showing the street until this time (server ms) so we see ourselves walk down to the train. */
  descendUntil: number | null;
  /** The last room the World showed, to hold on screen while descending. */
  lastRoomId: string | null;
  setPendingGo: (g: PendingGo | null) => void;
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
  pendingGo: null,
  emergeAt: null,
  descendUntil: null,
  lastRoomId: null,
  setPendingGo: (pendingGo) => set({ pendingGo }),
  toasts: [],
  toast: (text, tone = "info") => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, tone }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const serverNow = () => Date.now() + useGame.getState().clockOffset;
