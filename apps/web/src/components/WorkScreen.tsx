"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@convex/_generated/api";
import { activityProgress } from "@nyl/game-core";
import { CAREERS } from "@nyl/content";
import { playerMessage } from "@/lib/errors";
import { serverNow, useGame } from "@/lib/store";

/** During a shift the character is off the map; this is what the player sees. */
export function WorkScreen({ token }: { token: string }) {
  const me = useQuery(api.characters.me, { token });
  const stop = useMutation(api.play.stop);
  const toast = useGame((s) => s.toast);
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), 1000);
    return () => clearInterval(id);
  }, []);

  const a = me?.activity;
  const career = me?.job ? CAREERS[me.job.careerId] : undefined;
  const level = career && me?.job ? career.levels[me.job.level - 1] : undefined;
  const progress = a ? activityProgress(a, now) : 0;
  const left = a ? Math.max(0, a.endsAt - now) : 0;
  const pay = level ? Math.round(level.payPerShift * (a?.moodMultiplier ?? 1)) : 0;

  return (
    <main className="grid h-full place-items-center bg-[#151a14] px-6">
      <div className="w-full max-w-sm text-center">
        <p className="text-5xl">🍳</p>
        <p className="mt-4 text-xs font-medium uppercase tracking-widest text-white/50">On shift</p>
        <h1 className="mt-1 text-2xl font-semibold">{level?.title ?? "Working"}</h1>
        <p className="text-sm text-white/60">{career?.employer}</p>

        {a?.trainDelayed && (
          <p className="mt-4 rounded-lg bg-amber-400/15 px-3 py-2 text-xs text-amber-200">
            The L was delayed in real life, so you clocked in late. Your manager let it slide.
          </p>
        )}

        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-emerald-400 transition-[width] duration-1000" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="mt-2 text-sm tabular-nums text-white/70">
          {Math.floor(left / 60000)}:{String(Math.floor((left % 60000) / 1000)).padStart(2, "0")} left · about ${pay}
        </p>
        <p className="mt-1 text-xs text-white/40">A 20-minute shift counts as a full 8 hours.</p>

        <button
          onClick={() => void stop({ token }).catch((e) => toast(playerMessage(e), "error"))}
          className="mt-8 rounded-full border border-white/20 px-5 py-2 text-sm text-white/80"
        >
          Leave early (partial pay)
        </button>
      </div>
    </main>
  );
}
