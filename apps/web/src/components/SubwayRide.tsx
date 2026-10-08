"use client";

import { useCallback, useEffect, useState } from "react";
import { activityProgress } from "@nyl/game-core";
import { SUBWAY_MOMENTS, roomDef } from "@nyl/content";
import { api } from "@/lib/api";
import { playerMessage } from "@/lib/errors";
import { usePolling } from "@/lib/hooks";
import { serverNow, useGame } from "@/lib/store";
import { LineBullet } from "./LineBullet";
import { SubwayScene } from "./scene/SubwayScene";

/** On the train: the character is off the map until the next station. */
export function SubwayRide() {
  const meFetcher = useCallback(() => api.me(), []);
  const me = usePolling(meFetcher, 4000);
  const toast = useGame((s) => s.toast);
  const [now, setNow] = useState(() => serverNow());
  // Leaving the train: the next street plays the walk up the stairs.
  useEffect(() => () => useGame.setState({ emergeAt: serverNow() }), []);
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

  const line = a?.rideLines?.[0] ?? "L";
  return (
    <main className="relative h-full overflow-hidden bg-[#07070b]">
      <div className="absolute inset-0">
        <SubwayScene
          progress={() => (a ? activityProgress(a, serverNow()) : 0)}
          line={line}
          from={from?.station?.name ?? from?.neighborhood ?? ""}
          to={dest?.station?.name ?? ""}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-md items-center gap-2 rounded-2xl bg-black/55 p-3 backdrop-blur">
          {(a?.rideLines ?? []).map((l, i) => (
            <span key={`${l}${i}`} className="flex items-center gap-2">
              {i > 0 && <span className="text-xs text-white/40">transfer</span>}
              <LineBullet line={l} size={30} />
            </span>
          ))}
          <div className="ml-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-white/50">Next stop</p>
            <p className="truncate text-lg font-semibold leading-tight">{dest?.station?.name ?? "…"}</p>
          </div>
          <span className="ml-auto text-sm tabular-nums text-white/70">{Math.ceil(left / 1000)}s</span>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-md rounded-2xl bg-black/60 p-4 backdrop-blur">
          {a?.trainDelayed && (
            <p className="mb-3 rounded-lg bg-amber-400/15 px-3 py-2 text-xs text-amber-200">
              &quot;We are delayed because of train traffic ahead of us.&quot; This line is delayed in real life right now.
            </p>
          )}
          {moment && <p className="text-sm leading-relaxed text-white/90">{moment.text}</p>}
          {moment?.tip && (
            <button
              disabled={!!a?.tipped}
              onClick={() => void api.transitTip().catch((e) => toast(playerMessage(e), "error"))}
              className="mt-3 rounded-full bg-[#f3a712] px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
            >
              {a?.tipped ? "You tipped $1 ✓" : "Tip $1"}
            </button>
          )}
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-white/70" style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-white/50">
            {from?.neighborhood} → {dest?.neighborhood}
          </p>
        </div>
      </div>
    </main>
  );
}
