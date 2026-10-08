"use client";

import { useCallback, useState } from "react";
import { SKILL_KEYS, activeMoodlets, nycTime, rentPeriodKey, skillLevel, skillProgress } from "@nyl/game-core";
import { CAREERS, FOOD_CAREER, GIG_BY_ID, GIG_WINDOW_MS, ORIGINS, ROOMS, STATUSES, STUDENT_SHIFTS_PER_WEEK } from "@nyl/content";
import { CityMap, type Place } from "./CityMap";
import { api } from "@/lib/api";
import { playerMessage } from "@/lib/errors";
import { usePolling } from "@/lib/hooks";
import { serverNow, useGame } from "@/lib/store";
import type { CharacterDoc, CityStateDoc } from "@/lib/types";

export type PhoneTab = "home" | "map" | "gigs" | "jobs" | "bank" | "me" | "call" | "houses";

const FLAGS: Record<string, string> = { lagos: "🇳🇬", accra: "🇬🇭", kingston: "🇯🇲", "santo-domingo": "🇩🇴", dhaka: "🇧🇩", ohio: "🇺🇸" };

const APPS: { id: Exclude<PhoneTab, "home">; name: string; icon: string; bg: string }[] = [
  { id: "map", name: "Maps", icon: "🗺️", bg: "from-emerald-300 to-sky-500" },
  { id: "gigs", name: "Gigs", icon: "🛵", bg: "from-orange-400 to-rose-500" },
  { id: "jobs", name: "Jobs", icon: "💼", bg: "from-amber-300 to-yellow-600" },
  { id: "bank", name: "Bank", icon: "🏦", bg: "from-indigo-400 to-violet-700" },
  { id: "houses", name: "Houses", icon: "🔑", bg: "from-amber-500 to-orange-700" },
  { id: "me", name: "Me", icon: "🙂", bg: "from-fuchsia-400 to-purple-600" },
  { id: "call", name: "Phone", icon: "📞", bg: "from-green-400 to-emerald-600" },
];

/**
 * Your phone, as a phone: a device frame with a status bar (NYC time, signal, a battery that is
 * your energy), a home screen of apps, and a home bar to get back.
 */
export function Phone({
  me,
  city,
  initialTab = "home",
  onClose,
  onCallHome,
  onGo,
  onGoHome,
  onGoToWork,
  hereId,
}: {
  me: CharacterDoc;
  hereId: string | null;
  city: CityStateDoc | null;
  initialTab?: PhoneTab;
  onClose: () => void;
  onCallHome: () => void;
  onGo: (place: Place) => void;
  onGoHome: () => void;
  onGoToWork: () => void;
}) {
  const [tab, setTab] = useState<PhoneTab>(initialTab);
  const origin = ORIGINS.find((o) => o.id === me.origin);
  const home = origin?.name.split(",")[0] ?? "home";
  const app = APPS.find((a) => a.id === tab);
  const t = nycTime(serverNow());
  const time = `${t.hour % 12 || 12}:${String(t.minute).padStart(2, "0")}`;
  const battery = Math.round(me.needs.energy);
  const lightApp = tab === "map";

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-3 backdrop-blur-[2px]" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative h-[min(760px,calc(100dvh-24px))] w-[min(370px,calc(100vw-24px))] animate-phone-in rounded-[3.2rem] bg-[#0b0b0f] p-[11px] shadow-[0_30px_80px_rgba(0,0,0,.6)] ring-1 ring-white/15"
      >
        {/* Side buttons */}
        <span className="absolute -left-[3px] top-28 h-8 w-[3px] rounded-l bg-[#2a2a30]" />
        <span className="absolute -left-[3px] top-40 h-14 w-[3px] rounded-l bg-[#2a2a30]" />
        <span className="absolute -right-[3px] top-36 h-20 w-[3px] rounded-r bg-[#2a2a30]" />

        <div className="relative flex h-full flex-col overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-[#3b2a63] via-[#7a4f8f] to-[#f08fb0]">
          {/* Status bar + dynamic island */}
          <div className={`relative z-10 flex h-12 shrink-0 items-center justify-between px-7 text-[13px] font-semibold ${lightApp ? "bg-[#2a2140] text-white" : app ? "bg-[#0f1117] text-white" : "text-white"}`}>
            <span className="tabular-nums">{time}</span>
            <span className="absolute left-1/2 top-2.5 h-[26px] w-[96px] -translate-x-1/2 rounded-full bg-black" />
            <span className="flex items-center gap-1.5">
              <span className="flex items-end gap-[2px]">
                {[4, 6, 8, 10].map((h) => (
                  <span key={h} className="w-[3px] rounded-sm bg-current" style={{ height: h }} />
                ))}
              </span>
              <span className="text-[11px]">5G</span>
              <span className="relative flex h-[12px] w-[24px] items-center rounded-[4px] border border-current/60 p-[1.5px]">
                <span className={`h-full rounded-[2px] ${battery < 25 ? "bg-red-500" : "bg-current"}`} style={{ width: `${Math.max(8, battery)}%` }} />
                <span className="absolute -right-[3px] h-[5px] w-[2px] rounded-r bg-current/60" />
              </span>
            </span>
          </div>

          {app ? (
            <div className={`flex min-h-0 flex-1 flex-col ${lightApp ? "bg-[#2a2140]" : "bg-[#0f1117]"}`}>
              {!lightApp && (
                <div className="flex items-center gap-2 px-4 pb-2">
                  <button onClick={() => setTab("home")} className="text-sm text-sky-400">
                    ‹ Home
                  </button>
                  <p className="flex-1 text-center text-sm font-semibold">{app.name}</p>
                  <span className="w-12" />
                </div>
              )}
              <div className={`min-h-0 flex-1 ${lightApp ? "" : "overflow-y-auto px-4 pb-4"}`}>
                {tab === "map" && <CityMap me={me} hereId={hereId} city={city} onGo={onGo} onGoHome={onGoHome} onGoToWork={onGoToWork} />}
                {tab === "gigs" && <Gigs me={me} />}
                {tab === "jobs" && <Jobs me={me} />}
                {tab === "bank" && <Bank me={me} />}
                {tab === "houses" && <Houses me={me} onDone={onClose} />}
                {tab === "me" && <Me me={me} />}
                {tab === "call" && <CallHome home={home} flag={FLAGS[me.origin]} onCall={onCallHome} />}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col px-5 pt-6">
              <p className="text-center text-6xl font-light tabular-nums text-white/95">{time}</p>
              <p className="mt-1 text-center text-sm text-white/80">
                {city ? `${Math.round(city.weather.tempF)}°F · ${city.weather.summary}` : "Brooklyn"}
              </p>
              <div className="mt-10 grid grid-cols-4 gap-x-3 gap-y-5">
                {APPS.map((a) => (
                  <button key={a.id} onClick={() => setTab(a.id)} className="flex flex-col items-center gap-1.5">
                    <span className={`grid size-[58px] place-items-center rounded-[1.1rem] bg-gradient-to-br ${a.bg} text-[28px] shadow-lg`}>
                      {a.icon}
                    </span>
                    <span className="text-[11px] font-medium text-white drop-shadow">{a.name}</span>
                  </button>
                ))}
              </div>
              <div className="mt-auto mb-4 flex justify-around rounded-[1.8rem] bg-white/20 p-3 backdrop-blur-md">
                {APPS.filter((a) => a.id === "call" || a.id === "map" || a.id === "bank").map((a) => (
                  <button key={a.id} onClick={() => setTab(a.id)} className={`grid size-[54px] place-items-center rounded-[1.05rem] bg-gradient-to-br ${a.bg} text-[26px] shadow`}>
                    {a.icon}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Home bar: back to the home screen, or put the phone away from there */}
          <button
            aria-label={app ? "Home screen" : "Put phone away"}
            onClick={() => (app ? setTab("home") : onClose())}
            className="absolute inset-x-0 bottom-0 z-20 flex h-6 items-center justify-center"
          >
            <span className={`h-[5px] w-32 rounded-full ${lightApp ? "bg-white/0" : "bg-white/70"}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Rent a better place, buy land to build on, and get to any home you have. */
function Houses({ me, onDone }: { me: CharacterDoc; onDone: () => void }) {
  const [view, setView] = useState<"rent" | "land" | "mine">("rent");
  const [rev, setRev] = useState(0);
  const fetcher = useCallback(() => api.homesMine(), [rev]); // eslint-disable-line react-hooks/exhaustive-deps -- rev refetches after a purchase
  const data = usePolling(fetcher, 15000);
  const toast = useGame((s) => s.toast);
  const busy = me.roomId === "transit" || me.roomId === "work" || !!me.activity;
  const act = (p: Promise<unknown>, ok: string, close = false) =>
    p
      .then(() => {
        toast(ok, "good");
        setRev((r) => r + 1);
        if (close) onDone();
      })
      .catch((e) => toast(playerMessage(e), "error"));

  if (!data) return <p className="pt-6 text-center text-xs text-white/50">Loading listings…</p>;
  const residence = data.homes.find((h) => h.id === data.residenceId);
  const lots = new Map(data.homes.filter((h) => h.kind === "lot").map((h) => [h.defId, h]));

  return (
    <div>
      <div className="flex gap-1 rounded-full bg-white/10 p-1">
        {(["rent", "land", "mine"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={`flex-1 rounded-full py-1.5 text-xs font-semibold ${view === v ? "bg-white text-black" : "text-white/70"}`}>
            {v === "rent" ? "🤝 Rent" : v === "land" ? "🌱 Land" : "🏠 Mine"}
          </button>
        ))}
      </div>
      {view === "rent" && (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] text-white/50">Found a better place? Pay the move-in and your furniture comes with you.</p>
          {data.tiers.map((t) => {
            const here = residence?.kind === "rental" && residence.defId === t.id;
            return (
              <div key={t.id} className={`rounded-2xl p-3 ${here ? "bg-emerald-500/15 ring-1 ring-emerald-400/50" : "bg-white/5"}`}>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold">
                    {t.name} · {t.neighborhood}
                  </p>
                  <span className="text-[11px] text-white/45">
                    {t.width}×{t.height}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-white/55">{t.blurb}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-white/70">${t.rentPerWeek}/week</span>
                  {here ? (
                    <span className="text-xs font-semibold text-emerald-300">You live here</span>
                  ) : (
                    <button
                      disabled={busy || me.cash < t.moveIn}
                      onClick={() => act(api.rentHome(t.id), `Welcome to your ${t.name.toLowerCase()}`)}
                      className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-black disabled:opacity-30"
                    >
                      Move in{t.moveIn ? ` $${t.moveIn.toLocaleString("en-US")}` : ""}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {view === "land" && (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] text-white/50">Buy a lot and build from the ground up: walls, doors, windows, floors. No rent, ever.</p>
          {data.lots.map((l) => {
            const owned = lots.get(l.id);
            return (
              <div key={l.id} className="rounded-2xl bg-white/5 p-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold">{l.name}</p>
                  <span className="text-[11px] text-white/45">
                    {l.width}×{l.height}
                  </span>
                </div>
                <p className="text-[11px] text-white/45">{l.neighborhood}</p>
                <p className="mt-0.5 text-[11px] text-white/55">{l.blurb}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs font-semibold">${l.price.toLocaleString("en-US")}</span>
                  {owned ? (
                    <button
                      disabled={busy}
                      onClick={() => act(api.visitHome(owned.id), "Cab's here. Time to build.", true)}
                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black disabled:opacity-30"
                    >
                      Go build (cab $12)
                    </button>
                  ) : (
                    <button
                      disabled={me.cash < l.price}
                      onClick={() => act(api.buyLot(l.id), `You own land in ${l.neighborhood}!`)}
                      className="rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-black disabled:opacity-30"
                    >
                      Buy
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {view === "mine" && (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] text-white/50">Rent: ${data.rentPerWeek}/week{data.rentPerWeek === 0 ? " (you own your home)" : ""}.</p>
          {data.homes.map((h) => {
            const name = h.kind === "rental" ? data.tiers.find((t) => t.id === h.defId)?.name : data.lots.find((l) => l.id === h.defId)?.name;
            const isRes = h.id === data.residenceId;
            const here = me.roomId === `home:${h.id}`;
            return (
              <div key={h.id} className="rounded-2xl bg-white/5 p-3">
                <p className="text-sm font-semibold">
                  {h.kind === "lot" ? "🌱" : "🏠"} {name}
                </p>
                <p className="text-[11px] text-white/45">
                  {isRes ? "Where you live" : h.kind === "lot" ? `${h.layout.walls.length} walls built` : ""}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    disabled={busy || here}
                    onClick={() => act(api.visitHome(h.id), "Cab's here", true)}
                    className="flex-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-30"
                  >
                    {here ? "You're here" : "Go there (cab $12)"}
                  </button>
                  {!isRes && (
                    <button
                      disabled={busy}
                      onClick={() => act(api.moveIntoHome(h.id), "Moved in. No more rent!")}
                      className="flex-1 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-30"
                    >
                      Live here
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CallHome({ home, flag, onCall }: { home: string; flag?: string; onCall: () => void }) {
  return (
    <div className="flex h-full flex-col items-center pt-10 text-center">
      <span className="grid size-24 place-items-center rounded-full bg-white/10 text-5xl">{flag ?? "🏠"}</span>
      <p className="mt-4 text-xl font-semibold">Family</p>
      <p className="text-sm text-white/55">{home}</p>
      <p className="mt-6 max-w-[15rem] text-xs text-white/50">International call, $2. They&apos;ll ask if you&apos;re eating.</p>
      <button onClick={onCall} className="mt-8 grid size-16 place-items-center rounded-full bg-emerald-500 text-2xl shadow-lg">
        📞
      </button>
    </div>
  );
}

function Jobs({ me }: { me: CharacterDoc }) {
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
              api.applyJob(c.id)
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
        onClick={() => api.quitJob().catch((e) => toast(playerMessage(e), "error"))}
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

function Bank({ me }: { me: CharacterDoc }) {
  const ledgerFetcher = useCallback(() => api.ledger(), []);
  const ledger = usePolling(ledgerFetcher, 10000) ?? [];
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
                api.payRent()
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
          <div key={l.id} className="flex justify-between py-1.5 text-xs">
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

function Me({ me }: { me: CharacterDoc }) {
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

function Gigs({ me }: { me: CharacterDoc }) {
  const [window] = useState(() => Math.floor(serverNow() / GIG_WINDOW_MS));
  const offersFetcher = useCallback(() => api.gigOffers(window), [window]);
  const offers = usePolling(offersFetcher, 15000) ?? [];
  const toast = useGame((s) => s.toast);
  const stats = me.gigStats;

  if (me.gig) {
    const def = GIG_BY_ID[me.gig.gigId];
    const left = Math.max(0, me.gig.deadline - serverNow());
    return (
      <div>
        <div className="rounded-2xl bg-white/5 p-3">
          <p className="text-sm font-semibold">
            {def?.emoji} {def?.app}: {def?.name}
          </p>
          <p className="text-xs text-white/60">
            ${me.gig.pay} + tip · {left > 0 ? `${Math.ceil(left / 60000)} min left for full tip` : "Late: tip cut"}
          </p>
          <ol className="mt-3 space-y-1.5">
            {me.gig.steps.map((st, i) => {
              const place = ROOMS[me.gig!.roomId] ? labelFor(me.gig!.roomId, st.target) : st.target;
              return (
                <li key={i} className={`text-xs ${i < me.gig!.step ? "text-white/35 line-through" : i === me.gig!.step ? "font-semibold text-[#f3a712]" : "text-white/70"}`}>
                  {i + 1}. {st.label} at {place}
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-[11px] text-white/50">Tap the highlighted place on the street to do the next step.</p>
        </div>
        <button onClick={() => void api.cancelGig()} className="mt-3 text-xs text-white/40 underline">
          Cancel gig (hurts your rating)
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-white/50">
        Gigs near you{stats ? ` · ${stats.done} done · ${stats.rating.toFixed(1)}★` : ""}. Real rain doubles delivery tips.
      </p>
      {offers.length === 0 && <p className="mt-3 text-xs text-white/60">No gigs here. Head out to a street or the park.</p>}
      <div className="mt-2 space-y-2">
        {offers.map((o) => (
          <div key={o.offerId} className="rounded-2xl bg-white/5 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                {o.emoji} {o.app}
              </p>
              <p className="text-sm font-semibold">${o.pay}+</p>
            </div>
            <p className="text-xs text-white/60">
              {o.name} · {o.steps.map((s) => s.place).join(" → ")} · {o.minutes} min
            </p>
            {o.locked ? (
              <p className="mt-2 text-xs text-amber-300">{o.locked}</p>
            ) : (
              <button
                onClick={() =>
                  api.acceptGig(o.offerId)
                    .then(() => toast(`${o.app} gig accepted. Go!`, "good"))
                    .catch((e) => toast(playerMessage(e), "error"))
                }
                className="mt-2 w-full rounded-xl bg-[#f3a712] py-1.5 text-xs font-semibold text-black"
              >
                Accept
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function labelFor(roomId: string, target: string) {
  const room = ROOMS[roomId];
  const prop = room?.props.find((p) => `prop:${p.id}` === target);
  return prop?.label ?? target;
}
