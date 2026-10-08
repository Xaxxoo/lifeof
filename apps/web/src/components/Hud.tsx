"use client";

import { useEffect, useState } from "react";
import {
  activeMoodlets,
  activityProgress,
  computeMood,
  decayNeeds,
  moodBand,
  NEED_KEYS,
  needsDuringActivity,
  weatherEffectText,
  weatherNeedMultipliers,
  type NeedKey,
} from "@nyl/game-core";
import { GIG_BY_ID, ROOMS } from "@nyl/content";
import { api } from "@/lib/api";
import { playerMessage } from "@/lib/errors";
import { useGame } from "@/lib/store";
import { useSocket } from "@/lib/SocketContext";
import type { CharacterDoc, CityStateDoc } from "@/lib/types";

const NEED_LABEL: Record<NeedKey, string> = {
  hunger: "Hunger",
  energy: "Energy",
  hygiene: "Hygiene",
  bladder: "Bladder",
  fun: "Fun",
  social: "Social",
};

/** Satirical one-liners for the most common Brooklyn 311 complaint types. */
const COMPLAINT_COPY: Record<string, string> = {
  "Noise - Residential": "Your neighbor discovered subwoofers",
  "Noise - Street/Sidewalk": "Someone is having a block party without you",
  "Illegal Parking": "Alternate-side parking claims more victims",
  "HEAT/HOT WATER": "A landlord somewhere says the heat is 'on'",
  Rodent: "A rat is living better than you",
  "Blocked Driveway": "A Honda Civic has blocked a driveway, again",
  "Noise - Vehicle": "A car alarm is singing to the block",
  "UNSANITARY CONDITION": "Your building is 'pre-war' in every sense",
};

interface HudProps {
  roomId: string;
  me: CharacterDoc | null;
  city: CityStateDoc | null;
  clockLabel: string;
  online: number;
  place: string;
  neighborhoodId: string | null;
  isHome: boolean;
  buildMode: boolean;
  onToggleBuild: () => void;
  onOpenPhone: () => void;
  hideBottomPanels: boolean;
}

export function Hud({
  roomId,
  me,
  city,
  clockLabel,
  online,
  place,
  neighborhoodId,
  isHome,
  buildMode,
  onToggleBuild,
  onOpenPhone,
  hideBottomPanels,
}: HudProps) {
  const [todayOpen, setTodayOpen] = useState(false);
  const [needsOpen, setNeedsOpen] = useState(false);
  const toast = useGame((s) => s.toast);
  const clockOffset = useGame((s) => s.clockOffset);
  // Re-render every second so timers and need bars move.
  const nowS = useNow(1000) + clockOffset;

  const needs = me
    ? needsDuringActivity(decayNeeds(me.needs, me.needsUpdatedAt, nowS, { multipliers: weatherNeedMultipliers(city?.weather) }), me.activity, nowS)
    : null;
  const gig = me?.gig;
  const gigDef = gig ? GIG_BY_ID[gig.gigId] : undefined;
  const gigStep = gig?.steps[gig.step];
  const gigPlace = gig && gigStep ? ROOMS[gig.roomId]?.props.find((p) => `prop:${p.id}` === gigStep.target)?.label : undefined;
  const moodlets = activeMoodlets(me?.moodlets, nowS);
  const mood = needs ? computeMood(needs, moodlets, nowS) : 0;
  const act = me?.activity && me.activity.kind === "use" ? me.activity : null;
  const band = moodBand(mood);
  const troubled = city?.subway.lines.filter((l) => l.status !== "good") ?? [];

  return (
    <>
      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto min-w-0 rounded-xl bg-black/65 px-3 py-2 backdrop-blur">
          <p className="whitespace-nowrap text-sm font-semibold tabular-nums">{clockLabel}</p>
          <p className="truncate text-[11px] text-white/70">
            {city ? `${Math.round(city.weather.tempF)}°F · ${city.weather.summary}` : "Brooklyn"}
          </p>
          <p className="hidden truncate text-[10px] text-white/45 sm:block">{place}</p>
        </div>
        <button
          onClick={() => setTodayOpen((v) => !v)}
          className="pointer-events-auto flex items-center gap-2 rounded-xl bg-black/65 px-3 py-2 text-left backdrop-blur"
        >
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
          </span>
          <span className="whitespace-nowrap">
            <span className="block text-[11px] font-semibold uppercase tracking-wider">
              <span className="sm:hidden">Live</span>
              <span className="hidden sm:inline">Today in Brooklyn</span>
            </span>
            <span className="block text-[11px] text-white/70">
              {troubled.length ? `${troubled.length} lines late` : "Trains OK"}
              <span className="hidden sm:inline"> · {online} here</span>
            </span>
          </span>
        </button>
        <div className="pointer-events-auto whitespace-nowrap rounded-xl bg-black/65 px-3 py-2 text-right backdrop-blur">
          <p className="text-sm font-semibold tabular-nums">${(me?.cash ?? 0).toLocaleString("en-US")}</p>
          <p className={`text-[11px] ${me && me.rent.owed > 0 ? "text-red-300" : "text-white/70"}`}>
            {me && me.rent.owed > 0 ? `Owe $${me.rent.owed}` : `Rent $${me?.rent.perWeek ?? 180} Sun`}
          </p>
        </div>
      </div>

      {todayOpen && city && <TodayCard city={city} neighborhoodId={neighborhoodId} onClose={() => setTodayOpen(false)} />}

      {/* Bottom: activity, mood, chat, phone */}
      <div className="absolute inset-x-0 bottom-0 z-20 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {gig && gigStep && !hideBottomPanels && (
          <div className="mx-auto mb-2 flex max-w-md items-center gap-2 rounded-xl bg-[#f3a712]/95 px-3 py-2 text-black">
            <span className="text-base">{gigDef?.emoji}</span>
            <p className="min-w-0 flex-1 truncate text-xs font-semibold">
              {gigDef?.app}: {gigStep.label} at {gigPlace ?? "the marked spot"}
              {gig.roomId !== roomId ? ` (${ROOMS[gig.roomId]?.neighborhood})` : ""}
            </p>
            <span className="text-[11px] font-semibold tabular-nums">{fmt(Math.max(0, gig.deadline - nowS))}</span>
          </div>
        )}
        {act && !hideBottomPanels && (
          <div className="mx-auto mb-2 flex max-w-md items-center gap-3 rounded-xl bg-black/75 px-3 py-2 backdrop-blur">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">
                {nowS < act.startsAt ? `Heading over… then ${act.status}` : act.status}
              </p>
              <div className="mt-1 h-1.5 rounded-full bg-white/15">
                <div className="h-full rounded-full bg-sky-400" style={{ width: `${activityProgress(act, nowS) * 100}%` }} />
              </div>
            </div>
            <span className="text-[11px] tabular-nums text-white/60">{fmt(Math.max(0, act.endsAt - nowS))}</span>
            <button
              onClick={() => void api.stopActivity().catch((e) => toast(playerMessage(e), "error"))}
              className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold"
            >
              Stop
            </button>
          </div>
        )}
        {needsOpen && needs && !hideBottomPanels && (
          <div className="mb-2 rounded-xl bg-black/75 p-3 backdrop-blur">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/70">
              Mood: {band} ({Math.round(mood)})
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {NEED_KEYS.map((k) => (
                <div key={k}>
                  <div className="flex justify-between text-[11px]">
                    <span>{NEED_LABEL[k]}</span>
                    <span className="tabular-nums text-white/60">{Math.round(needs[k])}</span>
                  </div>
                  <div className="mt-0.5 h-1.5 rounded-full bg-white/15">
                    <div
                      className={`h-full rounded-full ${needs[k] > 60 ? "bg-emerald-400" : needs[k] > 30 ? "bg-amber-400" : "bg-red-500"}`}
                      style={{ width: `${needs[k]}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {moodlets.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {moodlets.map((m) => (
                  <span key={m.id} className={`rounded-full px-2 py-0.5 text-[10px] ${m.value >= 0 ? "bg-emerald-500/20 text-emerald-200" : "bg-red-500/20 text-red-200"}`}>
                    {m.value >= 0 ? "+" : ""}
                    {m.value} {m.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNeedsOpen((v) => !v)}
            aria-label="Needs"
            className={`grid size-11 shrink-0 place-items-center rounded-full border-2 bg-black/65 text-[10px] font-bold backdrop-blur ${
              mood >= 60 ? "border-emerald-400" : mood >= 40 ? "border-amber-400" : "border-red-500"
            }`}
          >
            {Math.round(mood)}
          </button>
          <ChatBar roomId={roomId} />
          {isHome && (
            <button
              onClick={onToggleBuild}
              className={`shrink-0 rounded-full px-3 py-2.5 text-sm font-semibold ${buildMode ? "bg-white text-black" : "bg-black/65 text-white backdrop-blur"}`}
            >
              🛠️
            </button>
          )}
          <button onClick={onOpenPhone} aria-label="Phone" className="shrink-0 rounded-full bg-black/65 px-3 py-2.5 text-sm backdrop-blur">
            📱
          </button>
        </div>
      </div>
    </>
  );
}

function TodayCard({ city, neighborhoodId, onClose }: { city: CityStateDoc; neighborhoodId: string | null; onClose: () => void }) {
  const lines = city.subway.lines;
  const effect = weatherEffectText(city.weather);
  const here = neighborhoodId ? ROOMS[neighborhoodId] : undefined;
  const local = city.blockEvents.items.filter((i) => i.neighborhood === neighborhoodId);
  const borough = city.blockEvents.items.filter((i) => !i.neighborhood);
  return (
    <div className="absolute inset-x-3 top-24 z-10 mx-auto max-h-[60vh] max-w-md overflow-y-auto rounded-2xl bg-[#171a22]/95 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Today in Brooklyn</p>
        <button onClick={onClose} className="text-xs text-white/60">
          Close
        </button>
      </div>
      <p className="mt-1 text-[11px] text-white/50">What happens in the real city happens here.</p>

      <Section title="Subway" source={city.subway.source}>
        <div className="flex flex-wrap gap-1.5">
          {lines.map((l) => (
            <span
              key={l.line}
              title={l.text}
              className={`grid size-7 place-items-center rounded-full text-xs font-bold ${
                l.status === "good"
                  ? "bg-white/10 text-white/80"
                  : l.status === "suspended"
                    ? "bg-red-600 text-white"
                    : l.status === "delays"
                      ? "bg-amber-400 text-black"
                      : "bg-sky-500 text-white"
              }`}
            >
              {l.line}
            </span>
          ))}
        </div>
        {lines
          .filter((l) => l.status !== "good" && l.text)
          .slice(0, 3)
          .map((l) => (
            <p key={l.line} className="mt-2 text-xs text-white/75">
              {l.text}
            </p>
          ))}
      </Section>

      <Section title="Weather" source={city.weather.source}>
        <p className="text-xs text-white/80">
          {Math.round(city.weather.tempF)}°F, {city.weather.summary.toLowerCase()}, {city.weather.precipChance}% chance of
          rain.
        </p>
        {effect && <p className="mt-1 text-xs text-sky-300">{effect}</p>}
        {city.weather.alerts.map((a) => (
          <p key={a} className="mt-1 text-xs font-semibold text-amber-300">
            {a}
          </p>
        ))}
      </Section>

      <Section title={here ? `311 in ${here.neighborhood}` : "311 in Brooklyn"} source={city.blockEvents.source}>
        {(local.length ? local : borough).slice(0, 4).map((e) => (
          <p key={e.type} className="text-xs text-white/80">
            {COMPLAINT_COPY[e.type] ?? e.type} <span className="text-white/45">· {e.count} reports</span>
          </p>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, source, children }: { title: string; source: "live" | "simulated"; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">{title}</p>
        <span className={`rounded px-1 text-[9px] font-bold uppercase ${source === "live" ? "bg-red-500/80" : "bg-white/15 text-white/60"}`}>
          {source}
        </span>
      </div>
      {children}
    </div>
  );
}

function ChatBar({ roomId }: { roomId: string }) {
  const [text, setText] = useState("");
  const { socket, connected } = useSocket();
  return (
    <form
      className="flex min-w-0 flex-1 gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const body = text.trim();
        if (!body) return;
        setText("");
        if (connected) {
          socket.emit("chat:send", { roomId, body });
        } else {
          void api.sendChat({ roomId, body }).catch(() => undefined);
        }
      }}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={140}
        placeholder="Say something…"
        className="min-w-0 flex-1 rounded-full bg-black/65 px-4 py-2.5 text-base outline-none backdrop-blur placeholder:text-white/40 focus:ring-1 focus:ring-white/40"
      />
      <button aria-label="Say" className="shrink-0 rounded-full bg-[#f3a712] px-3.5 text-sm font-bold text-black">
        ↑
      </button>
    </form>
  );
}

function fmt(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function useNow(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
