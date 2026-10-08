"use client";

import { useState } from "react";
import {
  BUILD_PRICES,
  FLOORS,
  ITEMS,
  ITEM_BY_ID,
  ITEM_CATEGORIES,
  PAINTS,
  SELL_BACK_RATE,
  type ItemCategory,
  type ItemDef,
} from "@nyl/content";
import type { BuildTool } from "@/lib/buildTools";
import { ThumbBaker, useThumb } from "./ItemThumbs";

export interface Ghost {
  itemId: string;
  x: number;
  y: number;
  rot: number;
  /** Set when moving an existing piece. */
  objectId?: string;
}

export type BuildTab = "buy" | "design" | "build";

const TOOLS: { id: BuildTool; label: string; icon: string; hint: string }[] = [
  { id: "wall", label: "Walls", icon: "🧱", hint: `Drag along the grid to draw walls · $${BUILD_PRICES.wall} each` },
  { id: "door", label: "Door", icon: "🚪", hint: `Tap an edge to put in a door · $${BUILD_PRICES.door}` },
  { id: "window", label: "Window", icon: "🪟", hint: `Tap an edge for a window · $${BUILD_PRICES.window}` },
  { id: "floor", label: "Floor", icon: "🟫", hint: `Drag to lay floor tiles · $${BUILD_PRICES.floor} a tile` },
  { id: "erase", label: "Erase", icon: "🧽", hint: "Tap a wall or tile to take it out (half back)" },
];

/**
 * Build mode, in three tabs: Buy (the furniture catalogue), Design (paint and floors, try before
 * you buy) and Build (walls, doors, windows and floors from the ground up, on land you own).
 */
export function BuildPanel(p: {
  cash: number;
  isLot: boolean;
  unlocks: { paints: string[]; floors: string[] };
  currentPaint: string;
  currentFloor: string | null;
  tab: BuildTab;
  onTab: (t: BuildTab) => void;
  ghost: Ghost | null;
  ghostValid: boolean;
  selected: { _id: string; itemId: string; paid?: number } | null;
  onPickItem: (item: ItemDef) => void;
  onRotate: () => void;
  onConfirm: () => void;
  onCancelGhost: () => void;
  onMoveSelected: () => void;
  onSellSelected: () => void;
  previewPaint: string | null;
  previewFloor: string | null;
  onPreviewPaint: (id: string | null) => void;
  onPreviewFloor: (id: string | null) => void;
  onApplyPaint: (id: string) => void;
  onApplyFloor: (id: string) => void;
  tool: BuildTool | null;
  onTool: (t: BuildTool | null) => void;
  brush: string;
  onBrush: (id: string) => void;
  pendingCount: number;
  pendingCost: number;
  onConfirmBuild: () => void;
  onClearBuild: () => void;
  onClose: () => void;
}) {
  const [cat, setCat] = useState<ItemCategory>("Comfort");
  const [hidden, setHidden] = useState(false);

  if (p.ghost) {
    const item = ITEM_BY_ID[p.ghost.itemId]!;
    return (
      <Sheet>
        <div className="flex items-center gap-3">
          <Thumb item={item} size={56} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{p.ghost.objectId ? `Moving ${item.name}` : item.name}</p>
            <p className="text-xs text-black/50">{p.ghostValid ? "Tap the floor to move it around." : "It doesn't fit there."}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={p.onRotate} className="flex-1 rounded-2xl bg-black/5 py-2.5 text-sm font-semibold">
            ↻ Rotate
          </button>
          <button
            onClick={p.onConfirm}
            disabled={!p.ghostValid || (!p.ghost.objectId && p.cash < item.price)}
            className="flex-1 rounded-2xl bg-[#1d1830] py-2.5 text-sm font-semibold text-white disabled:opacity-30"
          >
            {p.ghost.objectId ? "Put here" : item.price ? `Buy $${item.price}` : "Place"}
          </button>
          <button onClick={p.onCancelGhost} className="rounded-2xl bg-black/5 px-3.5 py-2.5 text-sm">
            ✕
          </button>
        </div>
      </Sheet>
    );
  }

  if (p.selected) {
    const item = ITEM_BY_ID[p.selected.itemId];
    const refund = Math.floor((p.selected.paid ?? 0) * SELL_BACK_RATE);
    return (
      <Sheet>
        <div className="flex items-center gap-3">
          {item && <Thumb item={item} size={56} />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{item?.name}</p>
            {item && <Stars n={item.stars} />}
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={p.onMoveSelected} className="flex-1 rounded-2xl bg-black/5 py-2.5 text-sm font-semibold">
            Move / rotate
          </button>
          <button onClick={p.onSellSelected} className="flex-1 rounded-2xl bg-red-500 py-2.5 text-sm font-semibold text-white">
            Sell {refund ? `+$${refund}` : "(free)"}
          </button>
          <button onClick={p.onClose} className="rounded-2xl bg-black/5 px-3.5 py-2.5 text-sm">
            ✕
          </button>
        </div>
      </Sheet>
    );
  }

  const tabs: { id: BuildTab; label: string }[] = [
    { id: "buy", label: "🛋️ Buy" },
    { id: "design", label: "🎨 Design" },
    { id: "build", label: "🏗️ Build" },
  ];

  return (
    <>
      {p.tab === "buy" && <ThumbBaker />}
      <Sheet tall={!hidden}>
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-1 rounded-full bg-black/5 p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  p.onTab(t.id);
                  setHidden(false);
                }}
                className={`flex-1 rounded-full py-1.5 text-xs font-semibold ${p.tab === t.id ? "bg-white shadow" : "text-black/55"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button onClick={() => setHidden((h) => !h)} className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold">
            {hidden ? "Show" : "Hide"}
          </button>
          <button onClick={p.onClose} className="rounded-full bg-[#1d1830] px-3 py-1.5 text-xs font-semibold text-white">
            Done
          </button>
        </div>

        {!hidden && p.tab === "buy" && (
          <>
            <div className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {ITEM_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCat(c.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${cat === c.id ? "bg-[#1d1830] text-white" : "bg-black/5 text-black/70"}`}
                >
                  {c.icon} {c.id}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-black/45">Tap something in your home to move or sell it. Better stars restore more.</p>
            <div className="mt-2 grid max-h-[38dvh] grid-cols-3 gap-2 overflow-y-auto pb-1">
              {ITEMS.filter((i) => i.category === cat && i.price > 0).map((i) => (
                <button
                  key={i.id}
                  onClick={() => p.onPickItem(i)}
                  disabled={p.cash < i.price}
                  className="flex flex-col rounded-2xl bg-black/[0.035] p-2 text-left ring-1 ring-black/5 disabled:opacity-35"
                >
                  <div className="flex items-center justify-between text-[10px] text-black/45">
                    <span>
                      {i.w}×{i.h}
                    </span>
                    <Stars n={i.stars} />
                  </div>
                  <Thumb item={i} size={78} />
                  <span className="mt-1 line-clamp-2 text-[11px] font-semibold leading-tight">{i.name}</span>
                  <span className="text-[11px] font-semibold text-emerald-700">${i.price.toLocaleString("en-US")}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {!hidden && p.tab === "design" && (
          <div className="mt-2 max-h-[40dvh] overflow-y-auto">
            <p className="text-[11px] text-black/45">Tap one to try it on. You only pay when you apply it, and ones you&apos;ve bought stay yours.</p>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-black/45">Wall paint</p>
            <div className="mt-1 grid grid-cols-4 gap-2">
              {PAINTS.map((paint) => {
                const owned = p.unlocks.paints.includes(paint.id) || paint.price === 0;
                const on = (p.previewPaint ?? p.currentPaint) === paint.id;
                return (
                  <button key={paint.id} onClick={() => p.onPreviewPaint(paint.id)} className={`rounded-2xl p-1.5 text-left ${on ? "ring-2 ring-[#1d1830]" : "ring-1 ring-black/5"}`}>
                    <span className="block h-9 rounded-xl" style={{ background: `linear-gradient(90deg, ${paint.color} 50%, ${paint.color}cc 50%)` }} />
                    <span className="mt-1 block truncate text-[10px] font-semibold">{paint.name}</span>
                    <span className="block text-[10px] text-black/50">{owned ? "Owned" : `$${paint.price}`}</span>
                  </button>
                );
              })}
            </div>
            {p.previewPaint && p.previewPaint !== p.currentPaint && (
              <ApplyBar
                text={`Paint the walls ${PAINTS.find((x) => x.id === p.previewPaint)?.name}`}
                price={p.unlocks.paints.includes(p.previewPaint) ? 0 : PAINTS.find((x) => x.id === p.previewPaint)?.price ?? 0}
                onApply={() => p.onApplyPaint(p.previewPaint!)}
                onCancel={() => p.onPreviewPaint(null)}
              />
            )}
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-black/45">Floor</p>
            <div className="mt-1 grid grid-cols-4 gap-2">
              {FLOORS.filter((f) => !f.fixed).map((floor) => {
                const owned = p.unlocks.floors.includes(floor.id) || floor.price === 0;
                const on = (p.previewFloor ?? p.currentFloor) === floor.id;
                return (
                  <button key={floor.id} onClick={() => p.onPreviewFloor(floor.id)} className={`rounded-2xl p-1.5 text-left ${on ? "ring-2 ring-[#1d1830]" : "ring-1 ring-black/5"}`}>
                    <FloorSwatch color={floor.color} alt={floor.alt} pattern={floor.pattern} />
                    <span className="mt-1 block truncate text-[10px] font-semibold">{floor.name}</span>
                    <span className="block text-[10px] text-black/50">{owned ? "Owned" : `$${floor.price}`}</span>
                  </button>
                );
              })}
            </div>
            {p.previewFloor && p.previewFloor !== p.currentFloor && (
              <ApplyBar
                text={p.isLot ? `Buy ${FLOORS.find((x) => x.id === p.previewFloor)?.name} to lay in Build` : `Lay ${FLOORS.find((x) => x.id === p.previewFloor)?.name}`}
                price={p.unlocks.floors.includes(p.previewFloor) ? 0 : FLOORS.find((x) => x.id === p.previewFloor)?.price ?? 0}
                onApply={() => p.onApplyFloor(p.previewFloor!)}
                onCancel={() => p.onPreviewFloor(null)}
              />
            )}
            <p className="mt-2 text-[11px] text-black/40">Kitchens and bathrooms keep their tiles.</p>
          </div>
        )}

        {!hidden && p.tab === "build" && (
          <div className="mt-2">
            {!p.isLot ? (
              <div className="rounded-2xl bg-black/5 p-3 text-xs text-black/60">
                This is a rental, so the walls stay where the landlord put them. Buy land in <b>Phone → Houses → Land</b> to build your own place from the
                ground up.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-5 gap-1.5">
                  {TOOLS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => p.onTool(p.tool === t.id ? null : t.id)}
                      className={`flex flex-col items-center rounded-2xl py-2 text-[11px] font-semibold ${p.tool === t.id ? "bg-[#1d1830] text-white" : "bg-black/5"}`}
                    >
                      <span className="text-lg">{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-black/50">{TOOLS.find((t) => t.id === p.tool)?.hint ?? "Pick a tool, then draw on your lot."}</p>
                {p.tool === "floor" && (
                  <div className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
                    {FLOORS.filter((f) => f.fixed || f.price === 0 || p.unlocks.floors.includes(f.id)).map((f) => (
                      <button key={f.id} onClick={() => p.onBrush(f.id)} className={`w-16 shrink-0 rounded-xl p-1 ${p.brush === f.id ? "ring-2 ring-[#1d1830]" : "ring-1 ring-black/5"}`}>
                        <FloorSwatch color={f.color} alt={f.alt} pattern={f.pattern} />
                        <span className="mt-0.5 block truncate text-[9px] font-semibold">{f.name}</span>
                      </button>
                    ))}
                    <span className="self-center px-2 text-[10px] text-black/40">Buy more in Design</span>
                  </div>
                )}
                {p.pendingCount > 0 && (
                  <div className="mt-2 flex items-center gap-2 rounded-2xl bg-emerald-50 p-2">
                    <p className="flex-1 text-xs font-semibold text-emerald-900">
                      {p.pendingCount} change{p.pendingCount === 1 ? "" : "s"} · {p.pendingCost >= 0 ? `$${p.pendingCost}` : `+$${-p.pendingCost} back`}
                    </p>
                    <button onClick={p.onClearBuild} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold">
                      Undo all
                    </button>
                    <button
                      onClick={p.onConfirmBuild}
                      disabled={p.pendingCost > p.cash}
                      className="rounded-full bg-[#1d1830] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-30"
                    >
                      Build
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}

function ApplyBar({ text, price, onApply, onCancel }: { text: string; price: number; onApply: () => void; onCancel: () => void }) {
  return (
    <div className="mt-2 flex items-center gap-2 rounded-2xl bg-black/5 p-2">
      <p className="min-w-0 flex-1 truncate text-xs font-semibold">{text}</p>
      <button onClick={onCancel} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold">
        Cancel
      </button>
      <button onClick={onApply} className="rounded-full bg-[#1d1830] px-3 py-1.5 text-xs font-semibold text-white">
        {price ? `Buy $${price}` : "Apply"}
      </button>
    </div>
  );
}

function FloorSwatch({ color, alt, pattern }: { color: string; alt: string; pattern: string }) {
  const bg =
    pattern === "plank"
      ? `repeating-linear-gradient(0deg, ${color} 0 10px, ${alt} 10px 12px)`
      : pattern === "check"
        ? `repeating-conic-gradient(${color} 0 25%, ${alt} 0 50%) 0 0 / 18px 18px`
        : pattern === "tile"
          ? `linear-gradient(${alt} 1px, transparent 1px) 0 0 / 12px 12px, linear-gradient(90deg, ${alt} 1px, ${color} 1px) 0 0 / 12px 12px`
          : `radial-gradient(${alt} 15%, ${color} 16%) 0 0 / 8px 8px`;
  return <span className="block h-9 rounded-xl" style={{ background: bg }} />;
}

function Thumb({ item, size }: { item: ItemDef; size: number }) {
  const url = useThumb(item.id);
  return (
    <span className="grid place-items-center self-center" style={{ width: size, height: size }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- a data URL rendered in the browser, nothing to optimize
        <img src={url} alt="" width={size} height={size} />
      ) : (
        <span className="size-1/2 animate-pulse rounded-xl" style={{ backgroundColor: item.color }} />
      )}
    </span>
  );
}

function Stars({ n }: { n: number }) {
  return <span className="text-[10px] tracking-tight text-amber-500">{"★".repeat(n)}</span>;
}

function Sheet({ children, tall }: { children: React.ReactNode; tall?: boolean }) {
  return (
    <div
      className={`absolute inset-x-2 bottom-2 z-30 mx-auto max-w-lg rounded-3xl bg-white/97 p-3 text-[#1d1830] shadow-2xl ${tall ? "" : ""}`}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}
