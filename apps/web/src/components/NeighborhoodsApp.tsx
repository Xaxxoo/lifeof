"use client";

import { useState } from "react";
import {
  FACADE_COLORS,
  FACADE_STYLES,
  FOUNDABLE_BY_ID,
  SHOP_NAME_MAX,
  SHOP_TEMPLATES,
  SHOP_TEMPLATE_IDS,
  type Architecture,
  type PlayerBlockDoc,
  type PlayerLot,
  type PlayerShop,
  type ShopTemplateId,
} from "@nyl/content";
import { api } from "@/lib/api";
import { playerMessage } from "@/lib/errors";
import { useGame } from "@/lib/store";
import type { CharacterDoc } from "@/lib/types";

const STYLE_LABEL: Record<Architecture, string> = {
  rowhouse: "Painted storefront",
  brownstone: "Brownstone",
  tenement: "Tenement",
  warehouse: "Warehouse",
  loft: "Loft",
  glass: "Glass tower",
  stone: "Stone",
};

/** Name your shop, pick what it sells, its color and how the building looks. */
export function ShopBuilder({ block, lot, cash, onDone }: { block: PlayerBlockDoc; lot: PlayerLot; cash: number; onDone?: () => void }) {
  const toast = useGame((s) => s.toast);
  const prices = useGame((s) => s.neighborhoods?.prices);
  const [name, setName] = useState(lot.shop?.name ?? "");
  const [template, setTemplate] = useState<ShopTemplateId>(lot.shop?.template ?? "cafe");
  const [color, setColor] = useState(lot.shop?.color ?? FACADE_COLORS[3]!);
  const [arch, setArch] = useState<Architecture>(lot.shop?.arch ?? "rowhouse");
  const [busy, setBusy] = useState(false);

  async function build() {
    setBusy(true);
    try {
      const shop: PlayerShop = { name: name.trim(), template, color, arch };
      await api.buildBlockLot(block.id, lot.index, shop);
      toast(`${shop.name} is open on ${block.street}!`, "good");
      onDone?.();
    } catch (e) {
      toast(playerMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-[11px] uppercase tracking-wide text-white/50">Shop name</span>
        <input
          value={name}
          maxLength={SHOP_NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          placeholder="Mama Ada's Kitchen"
          className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none focus:bg-white/15"
        />
      </label>
      <div>
        <span className="text-[11px] uppercase tracking-wide text-white/50">What it is</span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {SHOP_TEMPLATE_IDS.map((id) => (
            <button
              key={id}
              onClick={() => setTemplate(id)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${template === id ? "bg-white text-black" : "bg-white/10 text-white/70"}`}
            >
              {SHOP_TEMPLATES[id].emoji} {SHOP_TEMPLATES[id].label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="text-[11px] uppercase tracking-wide text-white/50">Color</span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {FACADE_COLORS.map((c) => (
            <button
              key={c}
              aria-label={c}
              onClick={() => setColor(c)}
              className={`size-7 rounded-full border-2 ${color === c ? "border-white" : "border-transparent"}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <div>
        <span className="text-[11px] uppercase tracking-wide text-white/50">Building</span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {FACADE_STYLES.map((a) => (
            <button
              key={a}
              onClick={() => setArch(a)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${arch === a ? "bg-white text-black" : "bg-white/10 text-white/70"}`}
            >
              {STYLE_LABEL[a]}
            </button>
          ))}
        </div>
      </div>
      <button
        disabled={busy || name.trim().length < 3 || cash < (prices?.build ?? 300)}
        onClick={() => void build()}
        className="w-full rounded-full bg-[#f3a712] py-2.5 text-sm font-bold text-black disabled:opacity-40"
      >
        {lot.shop ? "Redesign" : "Build it"} · ${prices?.build ?? 300}
      </button>
      <p className="text-center text-[11px] text-white/50">
        {cash < (prices?.build ?? 300)
          ? `You need $${prices?.build ?? 300} to build. Work a few shifts and come back.`
          : `You keep ${Math.round((prices?.ownerShare ?? 0.7) * 100)}% of everything other players spend here.`}
      </p>
    </div>
  );
}

/** What you see when you tap a lot on a player-built block: buy it, build on it, or see whose it is. */
export function LotSheet({ blockId, propId, me, onClose }: { blockId: string; propId: string; me: CharacterDoc | null; onClose: () => void }) {
  const doc = useGame((s) => s.neighborhoods);
  const toast = useGame((s) => s.toast);
  const [busy, setBusy] = useState(false);
  const block = doc?.blocks.find((b) => b.id === blockId);
  const index = Number(propId.replace(/^prop:lot-/, "")) - 1;
  const lot = block?.lots.find((l) => l.index === index);
  if (!block || !lot) return null;
  const hood = FOUNDABLE_BY_ID[block.id];
  const mine = !!me && lot.ownerId === me.id;
  const owned = me ? doc!.blocks.flatMap((b) => b.lots).filter((l) => l.ownerId === me.id).length : 0;

  async function buy() {
    setBusy(true);
    try {
      await api.buyBlockLot(block!.id, lot!.index);
      toast(`Lot ${lot!.index + 1} on ${block!.street} is yours. Build something!`, "good");
    } catch (e) {
      toast(playerMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="absolute inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 mx-auto max-h-[70vh] max-w-sm overflow-y-auto rounded-3xl border border-white/10 bg-[#0f1117]/95 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            Lot {lot.index + 1} · {block.street}
          </p>
          <p className="text-xs text-white/50">
            {hood?.name} · founded by {block.founderName}
          </p>
        </div>
        <button onClick={onClose} className="text-xs text-white/50">
          Close
        </button>
      </div>
      <div className="mt-3">
        {!lot.ownerId ? (
          <>
            <p className="text-sm text-white/80">This lot is for sale. Buy it and open your own spot on the block.</p>
            <button
              disabled={busy || !me || Number(me.cash) < (doc?.prices.lot ?? 400) || owned >= (doc?.prices.maxLots ?? 2)}
              onClick={() => void buy()}
              className="mt-3 w-full rounded-full bg-[#f3a712] py-2.5 text-sm font-bold text-black disabled:opacity-40"
            >
              Buy for ${doc?.prices.lot ?? 400}
            </button>
            <p className="mt-2 text-center text-[11px] text-white/50">
              {owned >= (doc?.prices.maxLots ?? 2) ? `You already own ${owned} lots, the most anyone can.` : `You own ${owned} of ${doc?.prices.maxLots ?? 2} lots you can have.`}
            </p>
          </>
        ) : mine ? (
          <ShopBuilder block={block} lot={lot} cash={Number(me?.cash ?? 0)} onDone={onClose} />
        ) : (
          <p className="text-sm text-white/80">
            {lot.ownerName ?? "A neighbor"} owns this lot{lot.shop ? "." : ". Something's coming soon."}
          </p>
        )}
      </div>
    </div>
  );
}

/** Phone app: found a neighborhood, see who's building where, and manage your lots. */
export function NeighborhoodsApp({ me }: { me: CharacterDoc }) {
  const doc = useGame((s) => s.neighborhoods);
  const toast = useGame((s) => s.toast);
  const [editing, setEditing] = useState<string | null>(null);
  const [street, setStreet] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  if (!doc) return <p className="text-xs text-white/50">Loading…</p>;
  const myLots = doc.blocks.flatMap((b) => b.lots.filter((l) => l.ownerId === me.id).map((l) => ({ block: b, lot: l })));
  const foundedByMe = doc.blocks.some((b) => b.founderId === me.id);

  async function found(id: string, streets: string[]) {
    setBusy(id);
    try {
      const s = street[id] ?? streets[0]!;
      await api.foundNeighborhood(id, s);
      toast(`You founded ${FOUNDABLE_BY_ID[id]?.name}! ${s} is on the subway map now.`, "good");
    } catch (e) {
      toast(playerMessage(e), "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold">Build New York</p>
        <p className="mt-1 text-xs text-white/60">
          Found a neighborhood the city doesn&apos;t have yet (${doc.prices.found}, first lot free). Six lots open up for anyone: buy one
          (${doc.prices.lot}) and build your own shop (${doc.prices.build}). You keep {Math.round(doc.prices.ownerShare * 100)}% of every sale.
        </p>
      </div>

      {myLots.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] uppercase tracking-wide text-white/50">Your lots</p>
          {myLots.map(({ block, lot }) => {
            const key = `${block.id}:${lot.index}`;
            return (
              <div key={key} className="rounded-xl bg-white/5 px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">
                      {lot.shop ? `${SHOP_TEMPLATES[lot.shop.template].emoji} ${lot.shop.name}` : `Empty lot ${lot.index + 1}`}
                    </p>
                    <p className="truncate text-[11px] text-white/50">
                      {block.street} · {FOUNDABLE_BY_ID[block.id]?.name}
                    </p>
                  </div>
                  <button onClick={() => setEditing(editing === key ? null : key)} className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold">
                    {editing === key ? "Close" : lot.shop ? "Redesign" : "Build"}
                  </button>
                </div>
                {editing === key && (
                  <div className="mt-3">
                    <ShopBuilder block={block} lot={lot} cash={Number(me.cash)} onDone={() => setEditing(null)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {doc.blocks.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] uppercase tracking-wide text-white/50">Player neighborhoods</p>
          {doc.blocks.map((b) => {
            const built = b.lots.filter((l) => l.shop).length;
            const forSale = b.lots.filter((l) => !l.ownerId).length;
            return (
              <div key={b.id} className="rounded-xl bg-white/5 px-3 py-2">
                <p className="text-xs font-semibold">
                  {FOUNDABLE_BY_ID[b.id]?.name} · {b.street}
                </p>
                <p className="text-[11px] text-white/50">
                  Founded by {b.founderName} · {built} shop{built === 1 ? "" : "s"} open · {forSale} lot{forSale === 1 ? "" : "s"} for sale
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-[11px] uppercase tracking-wide text-white/50">Found a neighborhood</p>
        {doc.foundable
          .filter((f) => !f.founded)
          .map((f) => (
            <div key={f.id} className="rounded-xl bg-white/5 px-3 py-2">
              <p className="text-xs font-semibold">
                {f.name} <span className="font-normal text-white/50">· {f.borough}</span>
              </p>
              <p className="mt-0.5 text-[11px] text-white/60">{f.pitch}</p>
              <div className="mt-2 flex items-center gap-2">
                <select
                  value={street[f.id] ?? f.streets[0]}
                  onChange={(e) => setStreet((s) => ({ ...s, [f.id]: e.target.value }))}
                  className="min-w-0 flex-1 rounded-lg bg-white/10 px-2 py-1 text-xs"
                >
                  {f.streets.map((s) => (
                    <option key={s} value={s} className="bg-[#0f1117]">
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  disabled={!!busy || foundedByMe || Number(me.cash) < doc.prices.found}
                  onClick={() => void found(f.id, f.streets)}
                  className="rounded-full bg-[#f3a712] px-3 py-1 text-[11px] font-bold text-black disabled:opacity-40"
                >
                  Found · ${doc.prices.found}
                </button>
              </div>
            </div>
          ))}
        {foundedByMe && <p className="text-[11px] text-white/50">You&apos;ve founded a neighborhood already. One each.</p>}
      </div>
    </div>
  );
}
