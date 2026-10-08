"use client";

import { useCallback, useEffect, useState } from "react";
import { activityProgress } from "@nyl/game-core";
import { SUBWAY_MOMENTS, STREET_ID, roomDef } from "@nyl/content";
import { api } from "@/lib/api";
import { playerMessage } from "@/lib/errors";
import { usePolling } from "@/lib/hooks";
import { serverNow, useGame } from "@/lib/store";
import { LineBullet } from "./LineBullet";

const HOME_MOMENTS = [
  "You lean your head against the window. Almost home.",
  "Your playlist shuffles to that one song. The city blurs past.",
  "You close your eyes for a second. The train rocks you like it knows.",
  "Someone's cooking something good a few cars down. Soon you will be too.",
  "The seat is warm. The day is done. Crown Heights is close.",
  "You scroll your phone, then put it away. Nothing beats getting home.",
  "A kid across from you is asleep on their mom's shoulder. Same energy.",
];

function pickHomeMoment(seed: number) {
  return HOME_MOMENTS[Math.abs(seed) % HOME_MOMENTS.length]!;
}

/** On the train: the character is off the map until the next station. */
export function SubwayRide() {
  const meFetcher = useCallback(() => api.me(), []);
  const me = usePolling(meFetcher, 4000);
  const toast = useGame((s) => s.toast);
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), 250);
    return () => clearInterval(id);
  }, []);

  const a = me?.activity;
  const dest = a?.travelTo ? roomDef(a.travelTo) : null;
  const from = a ? roomDef(a.roomId) : null;
  const moment = SUBWAY_MOMENTS.find((m) => m.id === a?.rideMoment);
  const progress = a ? activityProgress(a, now) : 0;
  const left = a ? Math.max(0, a.endsAt - now) : 0;
  const goingHome = a?.travelTo === STREET_ID;

  // Stable seed so the home moment doesn't change every re-render
  const [homeSeed] = useState(() => Math.floor(Math.random() * 10000));

  if (goingHome) {
    return (
      <main className="flex h-full flex-col items-center justify-center bg-[#1a1610] px-6">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="flex items-center gap-2">
            {(a?.rideLines ?? []).map((l, i) => (
              <span key={`${l}${i}`} className="flex items-center gap-2">
                {i > 0 && <span className="text-xs text-white/40">transfer</span>}
                <LineBullet line={l} size={32} />
              </span>
            ))}
            <div className="ml-1">
              <p className="text-xs uppercase tracking-widest text-[#f3a712]/70">Heading home</p>
              <p className="text-lg font-semibold text-[#ffd9a0]">{dest?.station?.name ?? "…"}</p>
            </div>
          </div>

          {/* The car: warmer window glow when going home */}
          <div className="relative mt-6 h-36 overflow-hidden rounded-2xl border border-[#f3a712]/15 bg-[#c9ccd1]">
            <div className="absolute inset-x-0 top-3 flex justify-around">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-14 w-16 overflow-hidden rounded-md bg-[#1a1610]">
                  <div
                    className="h-full w-[300%] bg-[repeating-linear-gradient(90deg,#1a1610_0px,#1a1610_30px,#ffd9a0_30px,#ffd9a0_34px)]"
                    style={{ transform: `translateX(-${(now / 12) % 100}px)` }}
                  />
                </div>
              ))}
            </div>
            <div className="absolute inset-x-0 bottom-0 h-12 bg-[#7e8794]" />
            <div className="absolute bottom-3 left-4 right-4 flex justify-between">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-6 w-8 rounded-t-md bg-[#f3a712]/90" />
              ))}
            </div>
          </div>

          {a?.trainDelayed && (
            <p className="mt-4 rounded-lg bg-amber-400/15 px-3 py-2 text-xs text-amber-200">
              &quot;We are delayed because of train traffic ahead of us.&quot; This line is delayed in real life right now.
            </p>
          )}

          {/* Home moment text */}
          <p className="mt-4 text-sm leading-relaxed text-[#ffd9a0]/85">
            {pickHomeMoment(homeSeed)}
          </p>

          {/* Subway moment still shows if present (can coexist) */}
          {moment && <p className="mt-3 text-sm leading-relaxed text-white/65">{moment.text}</p>}
          {moment?.tip && (
            <button
              disabled={!!a?.tipped}
              onClick={() => void api.transitTip().catch((e) => toast(playerMessage(e), "error"))}
              className="mt-3 rounded-full bg-[#f3a712] px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
            >
              {a?.tipped ? "You tipped $1 \u2713" : "Tip $1"}
            </button>
          )}

          {/* Progress bar — golden when going home */}
          <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-[#f3a712]/15">
            <div className="h-full rounded-full bg-[#f3a712]/80" style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-[#ffd9a0]/50">
            {from?.neighborhood} → {dest?.neighborhood} · {Math.ceil(left / 1000)}s
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-full flex-col items-center justify-center bg-[#15171c] px-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2">
          {(a?.rideLines ?? []).map((l, i) => (
            <span key={`${l}${i}`} className="flex items-center gap-2">
              {i > 0 && <span className="text-xs text-white/40">transfer</span>}
              <LineBullet line={l} size={32} />
            </span>
          ))}
          <div className="ml-1">
            <p className="text-xs uppercase tracking-widest text-white/50">Next stop</p>
            <p className="text-lg font-semibold">{dest?.station?.name ?? "…"}</p>
          </div>
        </div>

        {/* The car: windows flicker past while the train moves */}
        <div className="relative mt-6 h-36 overflow-hidden rounded-2xl border border-white/10 bg-[#c9ccd1]">
          <div className="absolute inset-x-0 top-3 flex justify-around">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 w-16 overflow-hidden rounded-md bg-[#0d0f14]">
                <div
                  className="h-full w-[300%] bg-[repeating-linear-gradient(90deg,#0d0f14_0px,#0d0f14_30px,#f3d27a_30px,#f3d27a_34px)]"
                  style={{ transform: `translateX(-${(now / 8) % 100}px)` }}
                />
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 h-12 bg-[#7e8794]" />
          <div className="absolute bottom-3 left-4 right-4 flex justify-between">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-6 w-8 rounded-t-md bg-[#f3a712]/90" />
            ))}
          </div>
        </div>

        {a?.trainDelayed && (
          <p className="mt-4 rounded-lg bg-amber-400/15 px-3 py-2 text-xs text-amber-200">
            &quot;We are delayed because of train traffic ahead of us.&quot; This line is delayed in real life right now.
          </p>
        )}
        {moment && <p className="mt-4 text-sm leading-relaxed text-white/85">{moment.text}</p>}
        {moment?.tip && (
          <button
            disabled={!!a?.tipped}
            onClick={() => void api.transitTip().catch((e) => toast(playerMessage(e), "error"))}
            className="mt-3 rounded-full bg-[#f3a712] px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
          >
            {a?.tipped ? "You tipped $1 \u2713" : "Tip $1"}
          </button>
        )}

        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-white/70" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="mt-2 text-xs text-white/50">
          {from?.neighborhood} → {dest?.neighborhood} · {Math.ceil(left / 1000)}s
        </p>
      </div>
    </main>
  );
}
