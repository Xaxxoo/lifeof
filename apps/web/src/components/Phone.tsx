"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { SKILL_KEYS, activeMoodlets, rentPeriodKey, skillLevel, skillProgress } from "@nyl/game-core";
import { CAREERS, FOOD_CAREER, ORIGINS, STATUSES, STUDENT_SHIFTS_PER_WEEK } from "@nyl/content";
import { playerMessage } from "@/lib/errors";
import { serverNow, useGame } from "@/lib/store";

type Tab = "jobs" | "bank" | "me";

export function Phone({ token, me, onClose, onCallHome }: { token: string; me: Doc<"characters">; onClose: () => void; onCallHome: () => void }) {
  const [tab, setTab] = useState<Tab>("jobs");
  const origin = ORIGINS.find((o) => o.id === me.origin);
  const home = origin?.name.split(",")[0] ?? "home";

  return (
    <div className="absolute inset-x-3 bottom-20 top-24 z-30 mx-auto flex max-w-sm flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0f1117]/95 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between px-4 pt-3">
        <p className="text-sm font-semibold">Phone</p>
        <button onClick={onClose} className="text-xs text-white/50">
          Close
        </button>
      </div>
      <div className="mt-2 flex gap-1 px-3">
        {(["jobs", "bank", "me"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full py-1.5 text-xs font-semibold capitalize ${tab === t ? "bg-white text-black" : "bg-white/10 text-white/70"}`}
          >
            {t === "me" ? "Me" : t}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {tab === "jobs" && <Jobs token={token} me={me} />}
        {tab === "bank" && <Bank token={token} me={me} />}
        {tab === "me" && <Me me={me} />}
      </div>
      <div className="border-t border-white/10 p-3">
        <button onClick={onCallHome} className="w-full rounded-xl bg-emerald-500/90 py-2.5 text-sm font-semibold text-black">
          📞 Call family in {home} ($2)
        </button>
      </div>
    </div>
  );
}

function Jobs({ token, me }: { token: string; me: Doc<"characters"> }) {
  const apply = useMutation(api.work.apply);
  const quit = useMutation(api.work.quit);
  const toast = useGame((s) => s.toast);

  if (!me.job) {
    const c = FOOD_CAREER;
    return (
      <div>
        <p className="text-xs text-white/50">Hiring now</p>
        <div className="mt-2 rounded-2xl bg-white/5 p-3">
          <p className="text-sm font-semibold">🍳 {c.levels[0]!.title}</p>
          <p className="text-xs text-white/60">{c.employer}</p>
          <p className="mt-2 text-xs text-white/70">
            ${c.levels[0]!.payPerShift} a shift, up to ${c.levels.at(-1)!.payPerShift} as {c.levels.at(-1)!.title}. Shifts start{" "}
            {c.hours.open} AM–{c.hours.close - 12} PM.
          </p>
          {me.status === "student" && (
            <p className="mt-1 text-xs text-amber-300">Campus dining job: student visa allows {STUDENT_SHIFTS_PER_WEEK} shifts a week.</p>
          )}
          <button
            onClick={() =>
              apply({ token, careerId: c.id })
                .then((t) => toast(`You're hired: ${t}. Take the L to work.`, "good"))
                .catch((e) => toast(playerMessage(e), "error"))
            }
            className="mt-3 w-full rounded-xl bg-[#f3a712] py-2 text-sm font-semibold text-black"
          >
            Apply
          </button>
        </div>
        <p className="mt-3 text-xs text-white/40">Retail, Tech, Health and Creative careers open soon.</p>
      </div>
    );
  }

  const career = CAREERS[me.job.careerId]!;
  const level = career.levels[me.job.level - 1]!;
  const next = career.levels[me.job.level];
  const cooking = skillLevel(me.skills.cooking);
  const period = rentPeriodKey(serverNow());
  const worked = me.shiftWeek.period === period ? me.shiftWeek.count : 0;
  return (
    <div>
      <div className="rounded-2xl bg-white/5 p-3">
        <p className="text-sm font-semibold">🍳 {level.title}</p>
        <p className="text-xs text-white/60">{career.employer}</p>
        <p className="mt-2 text-xs text-white/70">
          ${level.payPerShift} a shift · {me.job.totalShifts} shifts worked · {worked} this week
        </p>
        <p className="mt-2 text-xs text-white/60">To go to work, tap the L subway entrance on your block.</p>
      </div>
      {next ? (
        <div className="mt-3 rounded-2xl bg-white/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Next: {next.title}</p>
          <Req done={me.job.shiftsAtLevel >= next.shiftsAtPrevLevel} text={`${me.job.shiftsAtLevel}/${next.shiftsAtPrevLevel} shifts at this level`} />
          <Req done={cooking >= next.cookingLevel} text={`Cooking level ${cooking}/${next.cookingLevel} (cook at home to train)`} />
        </div>
      ) : (
        <p className="mt-3 text-xs text-emerald-300">Top of the career. Chef&apos;s kiss.</p>
      )}
      <button
        onClick={() => quit({ token }).catch((e) => toast(playerMessage(e), "error"))}
        className="mt-4 text-xs text-white/40 underline"
      >
        Quit job
      </button>
    </div>
  );
}

function Req({ done, text }: { done: boolean; text: string }) {
  return (
    <p className={`mt-1 text-xs ${done ? "text-emerald-300" : "text-white/70"}`}>
      {done ? "✓" : "○"} {text}
    </p>
  );
}

function Bank({ token, me }: { token: string; me: Doc<"characters"> }) {
  const ledger = useQuery(api.bank.ledger, { token }) ?? [];
  const payRent = useMutation(api.bank.payRent);
  const toast = useGame((s) => s.toast);
  return (
    <div>
      <p className="text-3xl font-semibold tabular-nums">${me.cash.toLocaleString("en-US")}</p>
      <div className="mt-3 rounded-2xl bg-white/5 p-3 text-xs text-white/70">
        <p>
          Rent: <span className="font-semibold text-white">${me.rent.perWeek}/week</span>, auto-paid Sundays at 8 PM.
        </p>
        {me.rent.owed > 0 && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-red-300">You owe ${me.rent.owed} (incl. late fees)</p>
            <button
              onClick={() =>
                payRent({ token })
                  .then(() => toast("Rent paid. The landlord stopped texting.", "good"))
                  .catch((e) => toast(playerMessage(e), "error"))
              }
              className="rounded-full bg-white px-3 py-1 font-semibold text-black"
            >
              Pay
            </button>
          </div>
        )}
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-white/50">Recent</p>
      <div className="mt-1 divide-y divide-white/5">
        {ledger.map((l) => (
          <div key={l._id} className="flex justify-between py-1.5 text-xs">
            <span className="text-white/75">{l.label ?? l.reason}</span>
            <span className={`tabular-nums ${l.delta >= 0 ? "text-emerald-300" : "text-white/60"}`}>
              {l.delta >= 0 ? "+" : "−"}${Math.abs(l.delta)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Me({ me }: { me: Doc<"characters"> }) {
  const origin = ORIGINS.find((o) => o.id === me.origin);
  const status = STATUSES.find((s) => s.id === me.status);
  const moodlets = activeMoodlets(me.moodlets, serverNow());
  return (
    <div>
      <p className="text-lg font-semibold">{me.name}</p>
      <p className="text-xs text-white/60">
        From {origin?.name} · {status?.name}
      </p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-white/50">Skills</p>
      <div className="mt-1 space-y-2">
        {SKILL_KEYS.map((k) => (
          <div key={k}>
            <div className="flex justify-between text-xs capitalize">
              <span>{k}</span>
              <span className="text-white/60">Lv {skillLevel(me.skills[k])}</span>
            </div>
            <div className="mt-0.5 h-1 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-sky-400" style={{ width: `${skillProgress(me.skills[k]) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      {moodlets.length > 0 && (
        <>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-white/50">Feeling</p>
          {moodlets.map((m) => (
            <p key={m.id} className={`mt-1 text-xs ${m.value >= 0 ? "text-emerald-300" : "text-red-300"}`}>
              {m.value >= 0 ? "+" : ""}
              {m.value} {m.label}
            </p>
          ))}
        </>
      )}
    </div>
  );
}
