"use client";

import { useState } from "react";
import { DELAY_CAP, ROOMS, STREETS, SUBWAY_FARE, roomDef, route, type Prop, type RoomDef } from "@nyl/content";
import { LineBullet } from "./LineBullet";
import { useLabelAnchors } from "./scene/Labels";
import { MapLabels, MapScene } from "./scene/MapScene";
import type { CharacterDoc, CityStateDoc } from "@/lib/types";

/** Somewhere you can go: a tappable thing on a block. */
export interface Place {
  key: string;
  roomId: string;
  target: string;
  label: string;
  neighborhood: string;
  icon: string;
}

const ICONS: Partial<Record<Prop["kind"], string>> = {
  cart: "🛒", photospot: "📸", lawn: "🌳", drumcircle: "🥁", grill: "🔥", track: "🏃", stall: "🥬", bench: "🪑",
};

/** Shops are marked by what you do inside them. */
const ACTION_ICONS: Record<string, string> = { read_book: "📚", church_service: "⛪", see_show: "🎭", bowl: "🎳" };

function iconFor(p: Prop): string {
  if (ICONS[p.kind]) return ICONS[p.kind]!;
  const inside = p.enter ? roomDef(p.enter) : null;
  const acts = [...(p.actions ?? []), ...(inside?.props.flatMap((q) => q.actions ?? []) ?? [])];
  const special = acts.find((a) => ACTION_ICONS[a]);
  if (special) return ACTION_ICONS[special];
  if (p.enter?.startsWith("venue:")) return "🎶";
  if (p.tags?.includes("food")) return "🍽️";
  if (p.tags?.includes("residential")) return "🏠";
  if (p.tags?.includes("outdoor")) return "🌱";
  return "🏪";
}

/** Every labelled thing you can do something with, on every block. */
export const PLACES: Place[] = STREETS.flatMap((s) =>
  s.props
    .filter((p) => p.label && p.actions?.length && p.kind !== "subway" && p.kind !== "door")
    .map((p) => ({
      key: `${s.id}:${p.id}`,
      roomId: s.id,
      target: `prop:${p.id}`,
      label: p.label!.replace(/\s*\(.*\)$/, ""),
      neighborhood: s.neighborhood,
      icon: iconFor(p),
    })),
);

/** The block a room belongs to: itself for a street, the street outside for an interior. */
export function blockOf(room: RoomDef | null): RoomDef | null {
  if (!room) return null;
  if (room.kind === "street" || room.kind === "park") return room;
  return room.exitTo ? roomDef(room.exitTo.roomId) : null;
}

/**
 * Brooklyn in the city's dusk style. Tap a neighborhood to zoom in, tap a place to see how to get
 * there, then Go. Places on your own block are a walk; anywhere else is a subway ride.
 */
export function CityMap({
  me,
  hereId,
  city,
  onGo,
  onGoHome,
  onGoToWork,
}: {
  me: CharacterDoc;
  /** The street block you're on (or just outside of). */
  hereId: string | null;
  city: CityStateDoc | null;
  onGo: (place: Place) => void;
  onGoHome: () => void;
  onGoToWork: () => void;
}) {
  const here = hereId ? roomDef(hereId) : blockOf(roomDef(me.roomId));
  const anchors = useLabelAnchors();
  const [focus, setFocus] = useState<string | null>(null);
  const [picked, setPicked] = useState<Place | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const status = (line: string) => city?.subway.lines.find((l) => l.line === line)?.status ?? "good";

  const results = query.trim()
    ? PLACES.filter((p) => `${p.label} ${p.neighborhood}`.toLowerCase().includes(query.trim().toLowerCase()))
    : PLACES.filter((p) => p.roomId === (focus ?? here?.id));

  const trip = picked ? tripTo(picked, here, status) : null;

  return (
    <div className="relative h-full overflow-hidden bg-[#2a2140]">
      <div className="absolute inset-0">
        <MapScene
          anchors={anchors}
          places={PLACES}
          hereId={here?.id ?? null}
          focus={focus}
          picked={picked}
          lineStatus={status}
          onFocus={(id) => {
            setFocus(id);
            if (!id || id !== picked?.roomId) setPicked(null);
            setSearching(false);
          }}
          onPick={(p) => {
            setPicked(p);
            setFocus(p.roomId);
          }}
        />
      </div>
      <MapLabels
        anchors={anchors}
        places={PLACES}
        hereId={here?.id ?? null}
        focus={focus}
        picked={picked}
        onFocus={(id) => {
          setFocus(id);
          if (id !== picked?.roomId) setPicked(null);
          setSearching(false);
        }}
        onPick={(p) => {
          setPicked(p);
          setFocus(p.roomId);
        }}
      />

      {focus && (
        <button
          onClick={() => { setFocus(null); setPicked(null); }}
          className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#1d1830] shadow"
        >
          ‹ Brooklyn
        </button>
      )}

      {/* Bottom sheet */}
      <div className="absolute inset-x-2 bottom-2 z-40 rounded-3xl bg-white/95 p-3 text-[#1d1830] shadow-2xl backdrop-blur">
        <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-black/15" />
        {picked && trip ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-black/45">{picked.neighborhood}</p>
            <div className="flex items-start justify-between gap-2">
              <p className="text-lg font-semibold leading-tight">
                {picked.icon} {picked.label}
              </p>
              <div className="text-right">
                <p className="text-lg font-semibold leading-tight tabular-nums">{trip.time}</p>
                <p className="text-[10px] text-black/45">{trip.kind === "walk" ? "walk" : "ride"}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-black/60">
              {trip.kind === "walk" ? (
                <span>🚶 On your block</span>
              ) : (
                <>
                  {trip.lines.map((l, i) => (
                    <span key={`${l}${i}`} className="flex items-center gap-1">
                      {i > 0 && <span>→</span>}
                      <LineBullet line={l} size={18} status={status(l)} />
                    </span>
                  ))}
                  <span>
                    {trip.transfers ? "1 transfer · " : ""}${SUBWAY_FARE} fare{trip.late ? " · delayed (real)" : ""}
                  </span>
                </>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setPicked(null)} className="rounded-2xl bg-black/5 px-4 py-3 text-sm font-semibold">
                Back
              </button>
              <button onClick={() => onGo(picked)} className="flex-1 rounded-2xl bg-[#1d1830] py-3 text-sm font-semibold text-white">
                {trip.kind === "walk" ? "Walk there" : "Go"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <label className="flex items-center gap-2 rounded-2xl bg-black/5 px-3 py-2.5">
              <span className="text-sm">🔍</span>
              <input
                value={query}
                onFocus={() => setSearching(true)}
                onChange={(e) => { setQuery(e.target.value); setSearching(true); }}
                placeholder="Where to?"
                className="w-full bg-transparent text-sm outline-none placeholder:text-black/40"
              />
              {searching && (
                <button onClick={() => { setSearching(false); setQuery(""); }} className="text-xs text-black/45">
                  Cancel
                </button>
              )}
            </label>
            {searching || focus ? (
              <div className="mt-2 max-h-44 space-y-0.5 overflow-y-auto">
                {results.map((p) => (
                  <button key={p.key} onClick={() => { setPicked(p); setFocus(p.roomId); setSearching(false); }} className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-black/5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-black/5 text-sm">{p.icon}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{p.label}</span>
                      <span className="block truncate text-[11px] text-black/45">{p.neighborhood}</span>
                    </span>
                  </button>
                ))}
                {results.length === 0 && <p className="px-2 py-3 text-xs text-black/45">Nothing by that name in Brooklyn yet.</p>}
              </div>
            ) : (
              <div className="mt-2 flex gap-2">
                <Chip icon="🏠" label="Home" onClick={onGoHome} />
                <Chip icon="💼" label="Work" onClick={onGoToWork} disabled={!me.job} />
                <Chip icon="📍" label={here?.neighborhood ?? "Nearby"} onClick={() => here && setFocus(here.id)} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ icon, label, onClick, disabled }: { icon: string; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button disabled={disabled} onClick={onClick} className="flex min-w-0 items-center gap-1.5 rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold disabled:opacity-35">
      <span>{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}






function tripTo(p: Place, here: RoomDef | null, status: (l: string) => string) {
  if (here?.id === p.roomId) return { kind: "walk" as const, time: "<1 min", lines: [] as string[], transfers: 0, late: false };
  const r = here ? route(here.id, p.roomId) : null;
  if (!r) return { kind: "ride" as const, time: "—", lines: ROOMS[p.roomId]?.station?.lines.slice(0, 1) ?? [], transfers: 0, late: false };
  const late = r.lines.some((l) => status(l) === "delays" || status(l) === "suspended");
  const secs = Math.round((r.baseMs * (late ? 1 + DELAY_CAP : 1)) / 1000);
  return { kind: "ride" as const, time: `${secs}s`, lines: r.lines, transfers: r.transfers, late };
}

