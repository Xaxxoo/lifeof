"use client";

import { useState } from "react";
import { ITEMS, ITEM_BY_ID, SELL_BACK_RATE, type ItemDef } from "@nyl/content";

const CATEGORIES = ["Sleep", "Kitchen", "Bathroom", "Living", "Hobby", "Decor"] as const;

export interface Ghost {
  itemId: string;
  x: number;
  y: number;
  rot: number;
  /** Set when moving an existing piece. */
  objectId?: string;
}

/** Build mode: buy from the catalog, or pick up, rotate and sell what you own. */
export function BuildPanel({
  cash,
  ghost,
  ghostValid,
  selected,
  onPickItem,
  onRotate,
  onConfirm,
  onCancelGhost,
  onMoveSelected,
  onSellSelected,
  onClose,
}: {
  cash: number;
  ghost: Ghost | null;
  ghostValid: boolean;
  selected: { _id: string; itemId: string; paid?: number } | null;
  onPickItem: (item: ItemDef) => void;
  onRotate: () => void;
  onConfirm: () => void;
  onCancelGhost: () => void;
  onMoveSelected: () => void;
  onSellSelected: () => void;
  onClose: () => void;
}) {
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("Living");

  if (ghost) {
    const item = ITEM_BY_ID[ghost.itemId]!;
    return (
      <Sheet>
        <p className="text-sm font-semibold">{ghost.objectId ? `Moving ${item.name}` : item.name}</p>
        <p className="text-xs text-white/50">Tap the floor to position it. {ghostValid ? "" : "It doesn't fit there."}</p>
        <div className="mt-3 flex gap-2">
          <button onClick={onRotate} className="flex-1 rounded-xl bg-white/10 py-2.5 text-sm">
            Rotate
          </button>
          <button
            onClick={onConfirm}
            disabled={!ghostValid || (!ghost.objectId && cash < item.price)}
            className="flex-1 rounded-xl bg-[#f3a712] py-2.5 text-sm font-semibold text-black disabled:opacity-40"
          >
            {ghost.objectId ? "Put here" : item.price ? `Buy $${item.price}` : "Place"}
          </button>
          <button onClick={onCancelGhost} className="rounded-xl bg-white/10 px-3 py-2.5 text-sm">
            ✕
          </button>
        </div>
      </Sheet>
    );
  }

  if (selected) {
    const item = ITEM_BY_ID[selected.itemId];
    const refund = Math.floor((selected.paid ?? 0) * SELL_BACK_RATE);
    return (
      <Sheet>
        <p className="text-sm font-semibold">{item?.name}</p>
        <div className="mt-3 flex gap-2">
          <button onClick={onMoveSelected} className="flex-1 rounded-xl bg-white/10 py-2.5 text-sm">
            Move / rotate
          </button>
          <button onClick={onSellSelected} className="flex-1 rounded-xl bg-red-500/80 py-2.5 text-sm font-semibold">
            Sell {refund ? `+$${refund}` : "(free)"}
          </button>
          <button onClick={onClose} className="rounded-xl bg-white/10 px-3 py-2.5 text-sm">
            ✕
          </button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Build mode</p>
        <button onClick={onClose} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">
          Done
        </button>
      </div>
      <p className="text-xs text-white/50">Tap furniture in your room to move or sell it, or buy something new.</p>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs ${cat === c ? "bg-white text-black" : "bg-white/10 text-white/70"}`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="mt-2 grid max-h-40 grid-cols-2 gap-1.5 overflow-y-auto">
        {ITEMS.filter((i) => i.category === cat && i.price > 0).map((i) => (
          <button
            key={i.id}
            onClick={() => onPickItem(i)}
            disabled={cash < i.price}
            className="flex items-center gap-2 rounded-xl bg-white/5 px-2.5 py-2 text-left disabled:opacity-40"
          >
            <span className="size-5 shrink-0 rounded" style={{ backgroundColor: i.color }} />
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium">{i.name}</span>
              <span className="block text-[11px] text-white/50">${i.price}</span>
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

function Sheet({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-x-3 bottom-20 z-30 mx-auto max-w-md rounded-2xl bg-[#171a22]/95 p-3 shadow-2xl backdrop-blur">
      {children}
    </div>
  );
}
