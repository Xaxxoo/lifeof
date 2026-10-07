import { create } from "zustand";
import type { MoveIntent } from "@nyl/game-core";

interface GameState {
  /** serverNow − clientNow, measured on join, so every client animates paths on the same clock. */
  clockOffset: number;
  setClockOffset: (v: number) => void;
  /** Optimistic local path for our own avatar until the server's copy arrives. */
  localIntent: MoveIntent | null;
  setLocalIntent: (i: MoveIntent | null) => void;
}

export const useGame = create<GameState>((set) => ({
  clockOffset: 0,
  setClockOffset: (clockOffset) => set({ clockOffset }),
  localIntent: null,
  setLocalIntent: (localIntent) => set({ localIntent }),
}));

export const serverNow = () => Date.now() + useGame.getState().clockOffset;
