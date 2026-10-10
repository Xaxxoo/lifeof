"use client";

import { useCallback, useState } from "react";
import { SKILL_KEYS, activeMoodlets, rentPeriodKey, skillLevel, skillProgress } from "@nyl/game-core";
import {
  CAREERS,
  DELAY_CAP,
  FOOD_CAREER,
  GIG_BY_ID,
  GIG_WINDOW_MS,
  ITEM_CATEGORIES,
  ITEMS,
  NEIGHBORHOOD_MAP,
  ORIGINS,
  ROOMS,
  STATUSES,
  STREETS,
  STUDENT_SHIFTS_PER_WEEK,
  SUBWAY_FARE,
  roomDef,
  route,
} from "@nyl/content";
import { weatherEffectText } from "@nyl/game-core";
import { LineBullet, lineColor } from "./LineBullet";
import { api } from "@/lib/api";
import { playerMessage } from "@/lib/errors";
import { usePolling } from "@/lib/hooks";
import { serverNow, useGame } from "@/lib/store";
import type { CharacterDoc, CityStateDoc, RelationshipDoc, BlockedPlayerDoc, DmThreadDoc, DirectMessageDoc, CrewDoc, ListingDoc, ApplicationDoc, LeaseDoc, QuestProgressDoc, StoryChapterDoc } from "@/lib/types";
import { SOCIAL_INTERACTIONS, SOCIAL_INTERACTION_LIST, RELATIONSHIP_LEVELS } from "@nyl/content";

export type PhoneTab = "map" | "gigs" | "jobs" | "bank" | "wallet" | "me" | "shop" | "today" | "settings" | "people" | "chats" | "homes";

export function Phone({
  me,
  city,
  initialTab = "map",
  onClose,
  onCallHome,
  onRide,
  onGo,
  onGoHome,
  onGoToWork,
  hereId,
}: {
  me: CharacterDoc;
  city: CityStateDoc | null;
  initialTab?: PhoneTab;
  onClose: () => void;
  onCallHome: () => void;
  onRide?: (dest: string) => void;
  onGo?: (p: { roomId: string; target: string }) => void;
  onGoHome?: () => void;
  onGoToWork?: () => void;
  hereId?: string | null;
}) {
  const [tab, setTab] = useState<PhoneTab>(initialTab);
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
      <div className="mt-2 flex flex-wrap gap-1 px-3">
        {(["map", "people", "chats", "gigs", "jobs", "bank", "wallet", "me", "shop", "homes", "today", "settings"] as PhoneTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-2.5 py-1.5 text-xs font-semibold capitalize ${tab === t ? "bg-white text-black" : "bg-white/10 text-white/70"}`}
          >
            {t === "me" ? "Me" : t}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {tab === "map" && <MapApp me={me} city={city} onRide={onRide ?? (() => {})} />}
        {tab === "people" && <People me={me} />}
        {tab === "chats" && <Chats me={me} />}
        {tab === "gigs" && <Gigs me={me} />}
        {tab === "jobs" && <Jobs me={me} />}
        {tab === "bank" && <Bank me={me} onSwitchTab={setTab} />}
        {tab === "wallet" && <Wallet me={me} onSwitchTab={setTab} />}
        {tab === "me" && <MeTab me={me} />}
        {tab === "shop" && <Shop me={me} />}
        {tab === "homes" && <HomesTab me={me} />}
        {tab === "today" && <Today me={me} city={city} />}
        {tab === "settings" && <Settings me={me} />}
      </div>
      <div className="border-t border-white/10 p-3">
        <button onClick={onCallHome} className="w-full rounded-xl bg-emerald-500/90 py-2.5 text-sm font-semibold text-black">
          📞 Call family in {home} ($2)
        </button>
      </div>
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

function Bank({ me, onSwitchTab }: { me: CharacterDoc; onSwitchTab: (t: PhoneTab) => void }) {
  const ledgerFetcher = useCallback(() => api.ledger(), []);
  const ledger = usePolling(ledgerFetcher, 10000) ?? [];
  const walletFetcher = useCallback(() => api.stellarWallet(), []);
  const wallet = usePolling(walletFetcher, 10000);
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
      {/* Stellar wallet summary */}
      <div className="mt-3 rounded-2xl bg-white/5 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold">
              {wallet === null ? "USDT Wallet available" : wallet ? `${wallet.balances?.usdt ?? "0"} USDT` : ""}
            </p>
            {wallet && <p className="text-[11px] text-white/50">Stellar on-chain wallet</p>}
            {wallet === null && <p className="text-[11px] text-white/50">Earn real crypto from gameplay</p>}
          </div>
          {wallet !== undefined && (
            <button onClick={() => onSwitchTab("wallet")} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">
              {wallet ? "Manage" : "Set up"}
            </button>
          )}
        </div>
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

function MeTab({ me }: { me: CharacterDoc }) {
  const origin = ORIGINS.find((o) => o.id === me.origin);
  const status = STATUSES.find((s) => s.id === me.status);
  const moodlets = activeMoodlets(me.moodlets, serverNow());
  const chaptersFetcher = useCallback(() => api.availableChapters(), []);
  const chapters = usePolling(chaptersFetcher, 15000) ?? [];
  const toast = useGame((s) => s.toast);
  const [readingChapter, setReadingChapter] = useState<StoryChapterDoc | null>(null);

  if (readingChapter) {
    return (
      <div>
        <button onClick={() => setReadingChapter(null)} className="text-xs text-white/50 mb-3">
          &larr; Back
        </button>
        <p className="text-sm font-semibold">{readingChapter.title}</p>
        <div className="mt-3 space-y-3">
          {readingChapter.scenes.map((s, i) => (
            <div key={i} className={`rounded-xl px-3 py-2 text-xs ${s.speaker === "You" ? "bg-sky-500/20 ml-4" : "bg-white/5 mr-4"}`}>
              <p className="font-semibold text-white/60">{s.speaker}</p>
              <p className="mt-0.5">{s.text}</p>
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            api.completeChapter(readingChapter.id)
              .then((r) => { toast("Chapter complete!", "good"); setReadingChapter(null); })
              .catch((e) => toast(playerMessage(e), "error"));
          }}
          className="mt-4 w-full rounded-xl bg-[#f3a712] py-2 text-sm font-semibold text-black"
        >
          Complete Chapter
        </button>
      </div>
    );
  }

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
      {chapters.length > 0 && (
        <>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-white/50">Your Story</p>
          <div className="mt-2 space-y-2">
            {chapters.map((ch) => (
              <button
                key={ch.id}
                onClick={() => {
                  api.startChapter(ch.id)
                    .then((full) => setReadingChapter(full))
                    .catch((e) => toast(playerMessage(e), "error"));
                }}
                className="w-full rounded-xl bg-white/5 px-3 py-2 text-left"
              >
                <p className="text-xs font-semibold">Ch. {ch.chapter}: {ch.title}</p>
                {ch.reward.cash && <p className="text-[11px] text-emerald-300">Reward: ${ch.reward.cash}</p>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Brooklyn map: where you are, live line status, and a ride to anywhere from your block's station. */
function MapApp({ me, city, onRide }: { me: CharacterDoc; city: CityStateDoc | null; onRide: (dest: string) => void }) {
  const here = roomDef(me.roomId);
  const street = here?.station ? here : here?.exitTo ? roomDef(here.exitTo.roomId) : null;
  const canRide = !!here?.station;
  const status = (line: string) => city?.subway.lines.find((l) => l.line === line)?.status ?? "good";
  const W = 260;
  const H = 230;
  const px = (x: number) => 20 + (x / 6) * (W - 40);
  const py = (y: number) => 16 + (y / 7.6) * (H - 32);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-2xl bg-[#1a2230]">
        <path d={`M ${px(0)} ${py(0.4)} C ${px(-0.3)} ${py(3)}, ${px(0.4)} ${py(7)}, ${px(1)} ${py(7.6)}`} stroke="#3b6ea5" strokeWidth="10" fill="none" opacity="0.5" />
        {STREETS.map((s) => {
          const p = NEIGHBORHOOD_MAP[s.id]!;
          const isHere = street?.id === s.id;
          return (
            <g key={s.id}>
              <circle cx={px(p.x)} cy={py(p.y)} r={isHere ? 9 : 6} fill={isHere ? "#f3a712" : "#e5e7eb"} />
              <text x={px(p.x)} y={py(p.y) + (isHere ? 21 : 17)} textAnchor="middle" fontSize="9" fill="#e5e7eb">
                {s.neighborhood}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-xs text-white/60">
        You&apos;re in <span className="font-semibold text-white">{here?.neighborhood ?? "Brooklyn"}</span>
        {here && here.kind !== "street" && here.kind !== "park" ? ` (${here.name})` : ""}.
        {canRide ? ` Fare $${SUBWAY_FARE}.` : " Head outside to the subway to ride."}
      </p>
      <div className="mt-3 space-y-1.5">
        {STREETS.filter((s) => s.id !== street?.id).map((s) => {
          const r = street ? route(street.id, s.id) : null;
          const late = r?.lines.some((l) => status(l) === "delays" || status(l) === "suspended");
          const secs = r ? Math.round((r.baseMs * (late ? 1 + DELAY_CAP : 1)) / 1000) : null;
          return (
            <div key={s.id} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
              <div className="flex gap-1">
                {s.station!.lines.map((l) => (
                  <LineBullet key={l} line={l} size={18} status={status(l)} />
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{s.neighborhood}</p>
                <p className="truncate text-[11px] text-white/50">
                  {secs ? `${secs}s ride${r!.transfers ? " · 1 transfer" : ""}${late ? " · delayed (real)" : ""}` : s.station!.name}
                </p>
              </div>
              <button
                disabled={!canRide}
                onClick={() => onRide(s.id)}
                className="rounded-full px-3 py-1 text-[11px] font-semibold text-black disabled:opacity-30"
                style={{ backgroundColor: lineColor(r?.lines[0] ?? s.station!.lines[0]!) }}
              >
                Ride
              </button>
            </div>
          );
        })}
      </div>
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

function Wallet({ me, onSwitchTab }: { me: CharacterDoc; onSwitchTab: (t: PhoneTab) => void }) {
  const walletFetcher = useCallback(() => api.stellarWallet(), []);
  const wallet = usePolling(walletFetcher, 10000);
  const toast = useGame((s) => s.toast);
  const [extAddr, setExtAddr] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // No wallet yet — pitch card
  if (wallet === undefined) return null; // still loading
  if (wallet === null) {
    return (
      <div>
        <div className="rounded-2xl bg-white/5 p-3">
          <p className="text-sm font-semibold">USDT Wallet</p>
          <p className="mt-2 text-xs text-white/70">
            Earn real USDT (Stellar) from your in-game economy. Create a wallet to deposit, withdraw, and hold USDT on-chain.
          </p>
          <button
            disabled={loading}
            onClick={() => {
              setLoading(true);
              api.createStellarWallet()
                .then(() => toast("Wallet created!", "good"))
                .catch((e) => toast(playerMessage(e), "error"))
                .finally(() => setLoading(false));
            }}
            className="mt-3 w-full rounded-xl bg-[#f3a712] py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create Wallet"}
          </button>
        </div>
      </div>
    );
  }

  const ready = wallet.funded && wallet.trustlineEstablished;

  // Wallet exists but not funded / no trustline
  if (!ready) {
    return (
      <div>
        <div className="rounded-2xl bg-white/5 p-3">
          <p className="text-sm font-semibold">Wallet Setup</p>
          <div className="mt-2 flex gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${wallet.funded ? "bg-emerald-400/20 text-emerald-300" : "bg-amber-400/20 text-amber-300"}`}>
              {wallet.funded ? "Funded" : "Unfunded"}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${wallet.trustlineEstablished ? "bg-emerald-400/20 text-emerald-300" : "bg-amber-400/20 text-amber-300"}`}>
              {wallet.trustlineEstablished ? "Trustline OK" : "No Trustline"}
            </span>
          </div>
          <p className="mt-2 text-xs text-white/60">Your wallet is being set up on the Stellar network. This may take a moment.</p>
          <button
            disabled={loading}
            onClick={() => {
              setLoading(true);
              api.retryStellarFunding()
                .then(() => toast("Funding retried", "good"))
                .catch((e) => toast(playerMessage(e), "error"))
                .finally(() => setLoading(false));
            }}
            className="mt-3 w-full rounded-xl bg-[#f3a712] py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {loading ? "Retrying…" : "Retry Funding"}
          </button>
        </div>
      </div>
    );
  }

  // Wallet ready — full management UI
  const balances = wallet.balances;
  return (
    <div className="space-y-3">
      {/* Balances */}
      <div className="rounded-2xl bg-white/5 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Balance</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{balances ? `${balances.usdt} USDT` : "—"}</p>
        <p className="text-xs text-white/50 tabular-nums">{balances ? `${balances.xlm} XLM` : "—"}</p>
      </div>

      {/* Deposit */}
      <div className="rounded-2xl bg-white/5 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Deposit</p>
        <p className="mt-1 text-xs text-white/70">Send USDT (Stellar) to your public key:</p>
        <div className="mt-2 flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate rounded-lg bg-black/40 px-3 py-2 text-xs text-white/80">{wallet.publicKey}</p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(wallet.publicKey);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* External address */}
      <div className="rounded-2xl bg-white/5 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Withdrawal Address</p>
        <p className="mt-1 text-xs text-white/70">
          {wallet.externalAddress ? `Set to ${wallet.externalAddress.slice(0, 8)}…${wallet.externalAddress.slice(-4)}` : "No external address set"}
        </p>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            placeholder="Stellar address (G…)"
            value={extAddr}
            onChange={(e) => setExtAddr(e.target.value)}
            className="min-w-0 flex-1 rounded-lg bg-black/40 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-white/30"
          />
          <button
            disabled={!extAddr.trim() || loading}
            onClick={() => {
              setLoading(true);
              api.setStellarExternalAddress(extAddr.trim())
                .then(() => { toast("Address saved", "good"); setExtAddr(""); })
                .catch((e) => toast(playerMessage(e), "error"))
                .finally(() => setLoading(false));
            }}
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>

      {/* Withdraw */}
      <div className="rounded-2xl bg-white/5 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Withdraw USDT</p>
        {!wallet.externalAddress && <p className="mt-1 text-xs text-amber-300">Set a withdrawal address first.</p>}
        <div className="mt-2 flex gap-2">
          <input
            type="number"
            placeholder="Amount"
            value={withdrawAmt}
            onChange={(e) => setWithdrawAmt(e.target.value)}
            disabled={!wallet.externalAddress}
            className="min-w-0 flex-1 rounded-lg bg-black/40 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-white/30 disabled:opacity-50"
          />
          <button
            disabled={!wallet.externalAddress || !withdrawAmt || Number(withdrawAmt) <= 0 || loading}
            onClick={() => {
              setLoading(true);
              api.stellarWithdraw({ amount: Number(withdrawAmt), requestId: crypto.randomUUID() })
                .then((r) => { toast(`Withdrawn! TX: ${r.txHash.slice(0, 8)}…`, "good"); setWithdrawAmt(""); })
                .catch((e) => toast(playerMessage(e), "error"))
                .finally(() => setLoading(false));
            }}
            className="rounded-xl bg-[#f3a712] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {loading ? "Sending…" : "Withdraw"}
          </button>
        </div>
      </div>
    </div>
  );
}

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

function Shop({ me }: { me: CharacterDoc }) {
  const [category, setCategory] = useState(ITEM_CATEGORIES[0]!.id);
  const items = ITEMS.filter((it) => it.category === category);
  return (
    <div>
      <p className="text-xs text-white/50">Browse the catalog. Go home and use Build mode to buy and place.</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {ITEM_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${category === c.id ? "bg-white text-black" : "bg-white/10 text-white/70"}`}
          >
            {c.icon} {c.id}
          </button>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{it.name}</p>
              <p className="text-[11px] text-white/50">{"★".repeat(it.stars)}{"☆".repeat(4 - it.stars)}</p>
            </div>
            <p className="text-xs font-semibold tabular-nums">${it.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Today({ me, city }: { me: CharacterDoc; city: CityStateDoc | null }) {
  if (!city) return <p className="text-xs text-white/50">City data loading...</p>;

  const here = roomDef(me.roomId);
  const neighborhoodId = here?.kind === "street" || here?.kind === "park" ? here.id : here?.exitTo ? here.exitTo.roomId : null;
  const neighborhoodRoom = neighborhoodId ? ROOMS[neighborhoodId] : undefined;
  const effect = weatherEffectText(city.weather);
  const local = city.blockEvents.items.filter((i) => i.neighborhood === neighborhoodId);
  const borough = city.blockEvents.items.filter((i) => !i.neighborhood);

  return (
    <div>
      <p className="text-sm font-semibold">Today in Brooklyn</p>
      <p className="mt-1 text-[11px] text-white/50">What happens in the real city happens here.</p>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">Subway</p>
          <span className={`rounded px-1 text-[9px] font-bold uppercase ${city.subway.source === "live" ? "bg-red-500/80" : "bg-white/15 text-white/60"}`}>
            {city.subway.source}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {city.subway.lines.map((l) => (
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
        {city.subway.lines
          .filter((l) => l.status !== "good" && l.text)
          .slice(0, 3)
          .map((l) => (
            <p key={l.line} className="mt-2 text-xs text-white/75">
              {l.text}
            </p>
          ))}
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">Weather</p>
          <span className={`rounded px-1 text-[9px] font-bold uppercase ${city.weather.source === "live" ? "bg-red-500/80" : "bg-white/15 text-white/60"}`}>
            {city.weather.source}
          </span>
        </div>
        <p className="text-xs text-white/80">
          {Math.round(city.weather.tempF)}&deg;F, {city.weather.summary.toLowerCase()}, {city.weather.precipChance}% chance of rain.
        </p>
        {effect && <p className="mt-1 text-xs text-sky-300">{effect}</p>}
        {city.weather.alerts.map((a) => (
          <p key={a} className="mt-1 text-xs font-semibold text-amber-300">
            {a}
          </p>
        ))}
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
            {neighborhoodRoom ? `311 in ${neighborhoodRoom.neighborhood}` : "311 in Brooklyn"}
          </p>
          <span className={`rounded px-1 text-[9px] font-bold uppercase ${city.blockEvents.source === "live" ? "bg-red-500/80" : "bg-white/15 text-white/60"}`}>
            {city.blockEvents.source}
          </span>
        </div>
        {(local.length ? local : borough).slice(0, 4).map((e) => (
          <p key={e.type} className="text-xs text-white/80">
            {COMPLAINT_COPY[e.type] ?? e.type} <span className="text-white/45">&middot; {e.count} reports</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function Settings({ me }: { me: CharacterDoc }) {
  const origin = ORIGINS.find((o) => o.id === me.origin);
  const status = STATUSES.find((s) => s.id === me.status);
  return (
    <div>
      <div className="rounded-2xl bg-white/5 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Account</p>
        <p className="mt-2 text-sm font-semibold">{me.name}</p>
        <p className="text-xs text-white/60">From {origin?.name ?? me.origin}</p>
        <p className="text-xs text-white/60">{status?.name ?? me.status}</p>
      </div>
      <div className="mt-3 rounded-2xl bg-white/5 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">About</p>
        <p className="mt-2 text-xs text-white/70">New York Life &mdash; Brooklyn Beta</p>
      </div>
      <button
        onClick={() => {
          localStorage.removeItem("nyl_token");
          window.location.reload();
        }}
        className="mt-4 w-full rounded-xl bg-red-500/80 py-2.5 text-sm font-semibold text-white"
      >
        Log out
      </button>
    </div>
  );
}

function People({ me }: { me: CharacterDoc }) {
  const [view, setView] = useState<"friends" | "blocked" | "crew">("friends");
  const friendsFetcher = useCallback(() => api.friends(), []);
  const friendsList = usePolling(friendsFetcher, 10000) ?? [];
  const blockedFetcher = useCallback(() => api.blockedList(), []);
  const blockedList = usePolling(blockedFetcher, 15000) ?? [];
  const crewFetcher = useCallback(() => api.myCrew(), []);
  const crew = usePolling(crewFetcher, 10000);
  const toast = useGame((s) => s.toast);

  return (
    <div>
      <div className="flex gap-1 mb-3">
        {(["friends", "crew", "blocked"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${view === v ? "bg-white text-black" : "bg-white/10 text-white/70"}`}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "friends" && (
        <div>
          {friendsList.length === 0 && <p className="text-xs text-white/50">No friends yet. Interact with people you meet to build relationships.</p>}
          <div className="space-y-2">
            {friendsList.map((f) => (
              <div key={f.characterId} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
                <div className="size-8 rounded-full" style={{ backgroundColor: f.look.skin }} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">{f.name}</p>
                  <p className="text-[11px] text-white/50 capitalize">{f.level}{f.romantic ? ` · ${f.romantic}` : ""}</p>
                </div>
                <span className="text-[11px] text-white/40">{f.points} RP</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "crew" && (
        <div>
          {crew === undefined ? null : crew === null ? (
            <div>
              <p className="text-xs text-white/50">You&apos;re not in a crew. Create one or get invited by a friend.</p>
              <button
                onClick={() => {
                  const name = prompt("Crew name (max 24 chars):");
                  if (name) api.createCrew(name).then(() => toast("Crew created!", "good")).catch((e) => toast(playerMessage(e), "error"));
                }}
                className="mt-3 w-full rounded-xl bg-[#f3a712] py-2 text-sm font-semibold text-black"
              >
                Create a Crew
              </button>
            </div>
          ) : (
            <div>
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-sm font-semibold">{crew.name}</p>
                <p className="text-xs text-white/50">{crew.members.length} members</p>
                {crew.weeklyGoal && (
                  <div className="mt-2">
                    <p className="text-xs text-white/70">{crew.weeklyGoal.type}: {crew.weeklyGoal.progress}/{crew.weeklyGoal.target}</p>
                    <div className="mt-1 h-1.5 rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(100, (crew.weeklyGoal.progress / crew.weeklyGoal.target) * 100)}%` }} />
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3 space-y-1.5">
                {crew.members.map((m) => (
                  <div key={m.characterId} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
                    <div className="size-8 rounded-full" style={{ backgroundColor: m.look.skin }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold">{m.name}</p>
                      <p className="text-[11px] text-white/50 capitalize">{m.role}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => api.leaveCrew().catch((e) => toast(playerMessage(e), "error"))} className="mt-3 text-xs text-white/40 underline">
                Leave crew
              </button>
            </div>
          )}
        </div>
      )}

      {view === "blocked" && (
        <div>
          {blockedList.length === 0 && <p className="text-xs text-white/50">No blocked players.</p>}
          <div className="space-y-2">
            {blockedList.map((b) => (
              <div key={b.characterId} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
                <div className="size-8 rounded-full" style={{ backgroundColor: b.look.skin }} />
                <p className="min-w-0 flex-1 text-xs font-semibold">{b.name}</p>
                <button
                  onClick={() => api.unblockPlayer(b.characterId).then(() => toast("Unblocked", "good")).catch((e) => toast(playerMessage(e), "error"))}
                  className="rounded-full bg-white/10 px-2 py-1 text-[11px]"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Chats({ me }: { me: CharacterDoc }) {
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [msgInput, setMsgInput] = useState("");
  const threadsFetcher = useCallback(() => api.dmThreads(), []);
  const threads = usePolling(threadsFetcher, 5000) ?? [];
  const convoFetcher = useCallback(() => partnerId ? api.dmConversation(partnerId) : Promise.resolve([]), [partnerId]);
  const convo = usePolling(convoFetcher, 3000) ?? [];
  const toast = useGame((s) => s.toast);

  if (partnerId) {
    return (
      <div className="flex flex-col h-full">
        <button onClick={() => setPartnerId(null)} className="text-xs text-white/50 mb-2">
          &larr; Back to threads
        </button>
        <div className="flex-1 overflow-y-auto space-y-2 mb-3">
          {convo.map((m) => (
            <div key={m.id} className={`rounded-xl px-3 py-2 text-xs ${m.senderId === me.id ? "bg-sky-500/20 ml-6" : "bg-white/5 mr-6"}`}>
              <p className="font-semibold text-white/60">{m.senderName}</p>
              <p className="mt-0.5">{m.body}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Message…"
            value={msgInput}
            onChange={(e) => setMsgInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && msgInput.trim()) {
                api.sendDm(partnerId, msgInput.trim()).then(() => setMsgInput("")).catch((e) => toast(playerMessage(e), "error"));
              }
            }}
            className="min-w-0 flex-1 rounded-lg bg-black/40 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-white/30"
          />
          <button
            disabled={!msgInput.trim()}
            onClick={() => {
              if (msgInput.trim()) api.sendDm(partnerId, msgInput.trim()).then(() => setMsgInput("")).catch((e) => toast(playerMessage(e), "error"));
            }}
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {threads.length === 0 && <p className="text-xs text-white/50">No messages yet. DM friends from the People tab.</p>}
      <div className="space-y-1.5">
        {threads.map((t) => (
          <button
            key={t.partnerId}
            onClick={() => { setPartnerId(t.partnerId); api.markDmRead(t.partnerId); }}
            className="flex w-full items-center gap-3 rounded-xl bg-white/5 px-3 py-2 text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold">{t.partnerName}</p>
                {t.unread > 0 && <span className="rounded-full bg-sky-500 px-1.5 text-[10px] font-bold">{t.unread}</span>}
              </div>
              <p className="truncate text-[11px] text-white/50">{t.lastMessage}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function HomesTab({ me }: { me: CharacterDoc }) {
  const [view, setView] = useState<"mine" | "browse" | "applications">("mine");
  const listingsFetcher = useCallback(() => api.browseListings(), []);
  const listings = usePolling(listingsFetcher, 15000) ?? [];
  const appsFetcher = useCallback(() => api.myApplications(), []);
  const apps = usePolling(appsFetcher, 15000) ?? [];
  const leasesFetcher = useCallback(() => api.myLeases(), []);
  const leases = usePolling(leasesFetcher, 15000) ?? [];
  const toast = useGame((s) => s.toast);

  return (
    <div>
      <div className="flex gap-1 mb-3">
        {(["mine", "browse", "applications"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${view === v ? "bg-white text-black" : "bg-white/10 text-white/70"}`}
          >
            {v === "mine" ? "My Leases" : v === "browse" ? "Browse" : "Applications"}
          </button>
        ))}
      </div>

      {view === "mine" && (
        <div>
          {leases.length === 0 && <p className="text-xs text-white/50">No active leases.</p>}
          <div className="space-y-2">
            {leases.map((l) => (
              <div key={l.id} className="rounded-2xl bg-white/5 p-3">
                <p className="text-xs font-semibold">${l.rentPerWeek}/week</p>
                <p className="text-[11px] text-white/50 capitalize">{l.status}</p>
                {l.status === "active" && (
                  <button
                    onClick={() => api.terminateLease(l.id).then(() => toast("Lease terminated", "good")).catch((e) => toast(playerMessage(e), "error"))}
                    className="mt-2 text-xs text-red-300 underline"
                  >
                    Terminate
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "browse" && (
        <div>
          {listings.length === 0 && <p className="text-xs text-white/50">No listings available.</p>}
          <div className="space-y-2">
            {listings.map((l) => (
              <div key={l.id} className="rounded-2xl bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold capitalize">{l.kind}</p>
                  <p className="text-xs font-semibold">${l.rentPerWeek}/wk</p>
                </div>
                {l.description && <p className="mt-1 text-[11px] text-white/50">{l.description}</p>}
                <p className="mt-1 text-[11px] text-white/40">{l.applicantCount} applicants</p>
                <button
                  onClick={() => api.applyToListing(l.id).then(() => toast("Applied!", "good")).catch((e) => toast(playerMessage(e), "error"))}
                  className="mt-2 w-full rounded-xl bg-[#f3a712] py-1.5 text-xs font-semibold text-black"
                >
                  Apply
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "applications" && (
        <div>
          {apps.length === 0 && <p className="text-xs text-white/50">No applications.</p>}
          <div className="space-y-2">
            {apps.map((a) => (
              <div key={a.id} className="rounded-2xl bg-white/5 p-3">
                <p className="text-xs font-semibold capitalize">{a.status}</p>
                {a.message && <p className="mt-1 text-[11px] text-white/50">{a.message}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function labelFor(roomId: string, target: string) {
  const room = ROOMS[roomId];
  const prop = room?.props.find((p) => `prop:${p.id}` === target);
  return prop?.label ?? target;
}
