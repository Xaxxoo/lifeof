"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ArrivalIntroProps {
  name: string;
  origin: string;
  onComplete: () => void;
}

const ENTER_MS = 600;
const HOLD_MS = 3000;
const EXIT_MS = 600;

type Phase = "enter" | "hold" | "exit";

const INTERNATIONAL_ORIGINS = ["lagos", "accra", "kingston", "santo-domingo", "dhaka"];

function isInternational(origin: string) {
  return INTERNATIONAL_ORIGINS.includes(origin);
}

export function ArrivalIntro({ name, origin, onComplete }: ArrivalIntroProps) {
  const [panel, setPanel] = useState(0);
  const [phase, setPhase] = useState<Phase>("enter");
  const [now, setNow] = useState(() => Date.now());
  const [showHint, setShowHint] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animation tick for scrolling elements
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(id);
  }, []);

  // Show "tap to continue" hint after 1.5s on first panel
  useEffect(() => {
    if (panel === 0 && phase === "hold") {
      const id = setTimeout(() => setShowHint(true), 1500);
      return () => clearTimeout(id);
    }
  }, [panel, phase]);

  // Auto-advance through phases
  useEffect(() => {
    if (phase === "enter") {
      timerRef.current = setTimeout(() => setPhase("hold"), ENTER_MS);
    } else if (phase === "hold") {
      timerRef.current = setTimeout(() => setPhase("exit"), HOLD_MS);
    } else if (phase === "exit") {
      timerRef.current = setTimeout(() => {
        if (panel >= 2) {
          onComplete();
        } else {
          setPanel((p) => p + 1);
          setPhase("enter");
        }
      }, EXIT_MS);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [panel, phase, onComplete]);

  const advance = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (panel >= 2) {
      onComplete();
    } else {
      setPanel((p) => p + 1);
      setPhase("enter");
    }
  }, [panel, onComplete]);

  const phaseClass =
    phase === "enter"
      ? "opacity-0 translate-y-4"
      : phase === "hold"
        ? "opacity-100 translate-y-0"
        : "opacity-0 -translate-y-4";

  const intl = isInternational(origin);

  return (
    <main className="relative flex h-full cursor-pointer select-none flex-col" onClick={advance}>
      <div className={`flex flex-1 flex-col transition-all duration-[600ms] ease-out ${phaseClass}`}>
        {panel === 0 && <PanelPlane now={now} intl={intl} origin={origin} name={name} />}
        {panel === 1 && <PanelTerminal now={now} />}
        {panel === 2 && <PanelTaxi now={now} name={name} />}
      </div>

      {/* Progress dots */}
      <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === panel
                ? "w-6 bg-[#f3a712]"
                : i < panel
                  ? "w-1.5 bg-white/40"
                  : "w-1.5 bg-white/15"
            }`}
          />
        ))}
      </div>

      {/* Tap hint */}
      {showHint && (
        <p className="absolute bottom-16 left-0 right-0 text-center text-xs text-white/30">
          Tap to continue
        </p>
      )}
    </main>
  );
}

/* ─── Panel 0: Plane Landing ─── */

const ORIGIN_LABELS: Record<string, string> = {
  lagos: "Lagos",
  accra: "Accra",
  kingston: "Kingston",
  "santo-domingo": "Santo Domingo",
  dhaka: "Dhaka",
  ohio: "Columbus",
};

function PanelPlane({ now, intl, origin, name }: { now: number; intl: boolean; origin: string; name: string }) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#1a2744] to-[#0d1117] px-6">
      {/* Cloud strips */}
      <div className="pointer-events-none absolute inset-0">
        {[20, 35, 55].map((top, i) => (
          <div
            key={i}
            className="absolute h-1 rounded-full bg-white/[0.06]"
            style={{
              top: `${top}%`,
              width: `${30 + i * 15}%`,
              transform: `translateX(${((now / (12000 + i * 3000)) * 100) % 200 - 50}%)`,
            }}
          />
        ))}
      </div>

      {/* Plane */}
      <div
        className="absolute transition-transform duration-[2000ms] ease-out"
        style={{
          transform: `translate(${-20 + Math.min(20, (now % 10000) / 500)}px, ${10 + Math.min(10, (now % 10000) / 1000)}px)`,
        }}
      >
        <div className="relative">
          {/* Fuselage */}
          <div className="h-3 w-20 rounded-r-full bg-white/20" />
          {/* Wing */}
          <div className="absolute -top-3 left-6 h-2 w-12 -skew-y-6 bg-white/15" />
          {/* Tail */}
          <div className="absolute -top-4 left-0 h-5 w-3 -skew-x-12 bg-white/15" />
        </div>
      </div>

      {/* NYC skyline silhouette */}
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-[2px] px-4">
        {[40, 55, 30, 70, 45, 80, 35, 60, 50, 25, 65, 38, 72, 42, 55, 30, 48, 62].map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-white/[0.08]"
            style={{ height: `${h}px` }}
          />
        ))}
      </div>

      {/* Text */}
      <div className="relative z-10 text-center">
        <p className="text-xs uppercase tracking-widest text-white/40">
          {intl ? "Somewhere over the Atlantic" : "Somewhere over Pennsylvania"}
        </p>
        <p className="mt-3 text-2xl font-semibold tracking-tight">
          {ORIGIN_LABELS[origin] ?? origin} &rarr; New York
        </p>
        <p className="mt-2 text-sm text-white/60">{name} is on the way.</p>
      </div>
    </div>
  );
}

/* ─── Panel 1: Airport Terminal ─── */

function PanelTerminal({ now }: { now: number }) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-[#15171c] px-6">
      {/* Terminal header */}
      <p className="absolute top-12 text-xs uppercase tracking-widest text-white/50">
        JFK Terminal 4 &middot; Arrivals
      </p>

      {/* Terminal floor with reflection */}
      <div className="absolute bottom-0 left-0 right-0 h-24 overflow-hidden bg-gradient-to-t from-white/[0.04] to-transparent">
        <div
          className="h-full w-[300%] bg-[repeating-linear-gradient(90deg,transparent_0px,transparent_60px,white/[0.03]_60px,white/[0.03]_62px)]"
          style={{ transform: `translateX(-${(now / 20) % 200}px)` }}
        />
      </div>

      {/* Walking silhouettes */}
      <div className="absolute bottom-24 left-0 right-0">
        {[
          { speed: 18, offset: 10, h: 32 },
          { speed: 25, offset: 40, h: 28 },
          { speed: 15, offset: 65, h: 35 },
          { speed: 22, offset: 85, h: 30 },
        ].map((fig, i) => (
          <div
            key={i}
            className="absolute bottom-0"
            style={{
              left: `${(fig.offset + (now / (fig.speed * 100)) * 10) % 110 - 5}%`,
            }}
          >
            {/* Head */}
            <div className="mx-auto size-2 rounded-full bg-white/10" />
            {/* Body */}
            <div className="mx-auto mt-0.5 bg-white/10" style={{ width: 6, height: fig.h - 8 }} />
          </div>
        ))}
      </div>

      {/* Text */}
      <div className="relative z-10 text-center">
        <p className="text-2xl font-semibold tracking-tight">You collect your bags.</p>
        <p className="mt-2 text-sm text-white/60">Two suitcases and some savings.</p>
      </div>
    </div>
  );
}

/* ─── Panel 2: Taxi to Brooklyn ─── */

function PanelTaxi({ now, name }: { now: number; name: string }) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-[#0d0f14] px-6">
      {/* Scrolling road */}
      <div className="absolute bottom-28 left-0 right-0 h-16 overflow-hidden">
        {/* Road surface */}
        <div className="absolute inset-0 bg-[#1a1c22]" />
        {/* Dashed center line */}
        <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 overflow-hidden">
          <div
            className="h-full w-[300%] bg-[repeating-linear-gradient(90deg,#f3a712_0px,#f3a712_20px,transparent_20px,transparent_40px)]"
            style={{ transform: `translateX(-${(now / 8) % 100}px)` }}
          />
        </div>
      </div>

      {/* Taxi */}
      <div
        className="absolute bottom-36 left-1/2 -translate-x-1/2"
        style={{ transform: `translateX(-50%) translateY(${Math.sin(now / 300) * 2}px)` }}
      >
        {/* Cab body */}
        <div className="h-6 w-16 rounded-t-lg bg-[#f3a712]" />
        <div className="h-4 w-20 -translate-x-0.5 rounded-sm bg-[#f3a712]" />
        {/* Wheels */}
        <div className="flex justify-between px-1">
          <div className="size-3 rounded-full bg-[#0d0f14]" />
          <div className="size-3 rounded-full bg-[#0d0f14]" />
        </div>
      </div>

      {/* Brooklyn buildings growing from right */}
      <div className="absolute bottom-28 right-0 flex items-end gap-[2px]">
        {[30, 50, 35, 60, 40, 55, 25].map((h, i) => (
          <div
            key={i}
            className="bg-white/[0.06]"
            style={{ width: 14, height: h }}
          />
        ))}
      </div>

      {/* Night sky dots (stars) */}
      <div className="pointer-events-none absolute inset-0">
        {[
          { x: 15, y: 10 }, { x: 45, y: 8 }, { x: 72, y: 15 },
          { x: 88, y: 5 }, { x: 30, y: 20 }, { x: 60, y: 12 },
        ].map((s, i) => (
          <div
            key={i}
            className="absolute size-0.5 rounded-full bg-white/20"
            style={{ left: `${s.x}%`, top: `${s.y}%` }}
          />
        ))}
      </div>

      {/* Text */}
      <div className="relative z-10 text-center">
        <p className="text-xs uppercase tracking-widest text-white/40">
          Belt Parkway &rarr; Brooklyn
        </p>
        <p className="mt-3 text-2xl font-semibold tracking-tight">
          Welcome to Crown Heights, {name}.
        </p>
        <p className="mt-2 text-sm text-white/60">Your new life starts now.</p>
      </div>
    </div>
  );
}
