"use client";

import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { computeMood, decayNeeds, moodBand, NEED_KEYS, type NeedKey } from "@nyl/game-core";

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
  token: string;
  roomId: string;
  me: Doc<"characters"> | null;
  city: Doc<"cityState"> | null;
  clockLabel: string;
  online: number;
}

export function Hud({ token, roomId, me, city, clockLabel, online }: HudProps) {
  const [todayOpen, setTodayOpen] = useState(false);
  const [needsOpen, setNeedsOpen] = useState(false);
  const now = useNow(5000);

  const needs = me ? decayNeeds(me.needs, me.needsUpdatedAt, now) : null;
  const mood = needs ? computeMood(needs) : 0;
  const band = moodBand(mood);
  const troubled = city?.subway.lines.filter((l) => l.status !== "good") ?? [];

  return (
    <>
      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto rounded-xl bg-black/65 px-3 py-2 backdrop-blur">
          <p className="text-sm font-semibold tabular-nums">{clockLabel}</p>
          <p className="text-[11px] text-white/70">
            {city ? `${Math.round(city.weather.tempF)}°F · ${city.weather.summary}` : "Brooklyn"}
          </p>
        </div>
        <button
          onClick={() => setTodayOpen((v) => !v)}
          className="pointer-events-auto flex items-center gap-2 rounded-xl bg-black/65 px-3 py-2 text-left backdrop-blur"
        >
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
          </span>
          <span>
            <span className="block text-[11px] font-semibold uppercase tracking-wider">Today in Brooklyn</span>
            <span className="block text-[11px] text-white/70">
              {troubled.length ? `${troubled.length} lines with issues` : "Trains running"} · {online} here
            </span>
          </span>
        </button>
        <div className="pointer-events-auto rounded-xl bg-black/65 px-3 py-2 text-right backdrop-blur">
          <p className="text-sm font-semibold tabular-nums">${(me?.cash ?? 0).toLocaleString("en-US")}</p>
          <p className="text-[11px] text-white/70">Rent due Sun</p>
        </div>
      </div>

      {todayOpen && city && <TodayCard city={city} onClose={() => setTodayOpen(false)} />}

      {/* Bottom: mood + chat */}
      <div className="absolute inset-x-0 bottom-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {needsOpen && needs && (
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
          <ChatBar token={token} roomId={roomId} />
        </div>
      </div>
    </>
  );
}

function TodayCard({ city, onClose }: { city: Doc<"cityState">; onClose: () => void }) {
  const lines = city.subway.lines;
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
        {city.weather.alerts.map((a) => (
          <p key={a} className="mt-1 text-xs font-semibold text-amber-300">
            {a}
          </p>
        ))}
      </Section>

      <Section title="On the block (311)" source={city.blockEvents.source}>
        {city.blockEvents.items.slice(0, 4).map((e) => (
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

function ChatBar({ token, roomId }: { token: string; roomId: string }) {
  const say = useMutation(api.chat.say);
  const [text, setText] = useState("");
  return (
    <form
      className="flex flex-1 gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const body = text.trim();
        if (!body) return;
        setText("");
        void say({ token, roomId, body }).catch(() => undefined);
      }}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={140}
        placeholder="Say something to the block…"
        className="min-w-0 flex-1 rounded-full bg-black/65 px-4 py-2.5 text-base outline-none backdrop-blur placeholder:text-white/40 focus:ring-1 focus:ring-white/40"
      />
      <button className="rounded-full bg-[#f3a712] px-4 text-sm font-semibold text-black">Say</button>
    </form>
  );
}

function useNow(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
