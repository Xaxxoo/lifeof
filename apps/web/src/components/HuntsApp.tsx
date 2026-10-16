"use client";

import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { playerMessage } from "@/lib/errors";
import { usePolling } from "@/lib/hooks";
import { serverNow, useGame } from "@/lib/store";
import type { HuntDoc } from "@/lib/types";

const NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK === "public" ? "public" : "testnet";

export const txUrl = (hash: string) => `https://stellar.expert/explorer/${NETWORK}/tx/${hash}`;

function timeLeft(ms: number) {
  if (ms <= 0) return "ended";
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  return d > 0 ? `${d}d ${h}h left` : `${h}h ${Math.floor((ms % 3_600_000) / 60_000)}m left`;
}

export function prizeText(h: Pick<HuntDoc, "prize">) {
  const parts = [];
  if (h.prize.cash) parts.push(`$${h.prize.cash}`);
  if (h.prize.stellar) parts.push(`${h.prize.stellar.amount} ${h.prize.stellar.asset} on Stellar`);
  return parts.join(" + ") || "Bragging rights";
}

/** Phone → Hunts: join campaigns, read your clue, see what you found and your prize. */
export function HuntsApp() {
  const fetcher = useCallback(() => api.hunts(), []);
  const hunts = usePolling(fetcher, 8000);
  const toast = useGame((s) => s.toast);
  const isGuest = useGame((s) => s.isGuest);
  const openSave = useGame((s) => s.openSave);
  const [busy, setBusy] = useState<string | null>(null);
  const [joined, setJoined] = useState<Record<string, HuntDoc>>({});

  if (hunts === undefined) return <p className="text-xs text-white/50">Loading hunts…</p>;
  const list = hunts.map((h) => joined[h.id] ?? h);
  if (!list.length) return <p className="text-xs text-white/50">No treasure hunts running right now. Check back soon.</p>;

  return (
    <div className="grid gap-3">
      <p className="text-xs text-white/60">
        Solve the clue, get to the place, tap it and search. Wrong spot? Catch your breath and try somewhere else.
      </p>
      {list.map((h) => {
        const left = Math.max(0, h.supply - h.claimed);
        return (
          <div key={h.id} className="overflow-hidden rounded-2xl bg-white/5">
            <div className="h-1.5" style={{ background: h.sponsor.color }} />
            <div className="p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: h.sponsor.color }}>
                {h.sponsor.name}
              </p>
              <p className="text-sm font-semibold">{h.name}</p>
              <p className="mt-1 text-xs text-white/60">{h.blurb}</p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/70">
                <span>🏆 {prizeText(h)}</span>
                <span>{left > 0 ? `${left} of ${h.supply} prizes left` : "All prizes claimed"}</span>
                <span>{h.running ? timeLeft(h.endsAt - serverNow()) : "Ended"}</span>
              </div>

              {h.joined && (
                <div className="mt-3 flex gap-1">
                  {Array.from({ length: h.totalSteps }, (_, i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full ${i < h.step ? "bg-emerald-400" : i === h.step && !h.completedAt ? "bg-[#f3a712]" : "bg-white/10"}`} />
                  ))}
                </div>
              )}

              {h.clue && (
                <div className="mt-3 rounded-xl bg-black/40 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    Clue {h.step + 1} of {h.totalSteps}
                  </p>
                  <p className="mt-1 text-sm italic">“{h.clue}”</p>
                </div>
              )}

              {h.found.length > 0 && (
                <ul className="mt-3 grid gap-1 text-xs text-white/70">
                  {h.found.map((f, i) => (
                    <li key={i}>
                      ✅ {f.name} <span className="text-white/40">· {f.neighborhood}</span>
                    </li>
                  ))}
                </ul>
              )}

              {h.completedAt && (
                <div className="mt-3 rounded-xl bg-emerald-400/10 p-3 text-xs">
                  {h.rank ? (
                    <>
                      <p className="font-semibold text-emerald-300">Finished #{h.rank}. You won {prizeText(h)}.</p>
                      {isGuest && (
                        <button onClick={() => openSave("prize")} className="mt-1 block font-semibold text-[#f3a712] underline">
                          You&apos;re playing as a guest. Save your account to keep this prize.
                        </button>
                      )}
                      {h.payout?.status === "paid" && h.payout.txHash && (
                        <a href={txUrl(h.payout.txHash)} target="_blank" rel="noreferrer" className="mt-1 block text-emerald-200 underline">
                          See the payment on Stellar
                        </a>
                      )}
                      {h.payout?.status === "pending" && <p className="mt-1 text-white/60">Stellar payment on its way to your wallet…</p>}
                      {h.payout?.status === "failed" && <p className="mt-1 text-red-300">Stellar payment failed. Support has been flagged.</p>}
                    </>
                  ) : (
                    <p className="text-white/70">You found them all, but every prize was already claimed. Next season!</p>
                  )}
                </div>
              )}

              {!h.joined && h.running && (
                <button
                  disabled={busy === h.id}
                  onClick={() => {
                    setBusy(h.id);
                    api
                      .joinHunt(h.id)
                      .then((doc) => {
                        setJoined((j) => ({ ...j, [h.id]: doc }));
                        toast("You're in. Read your first clue.", "good");
                      })
                      .catch((e) => toast(playerMessage(e), "error"))
                      .finally(() => setBusy(null));
                  }}
                  className="mt-3 w-full rounded-xl py-2 text-sm font-semibold text-black disabled:opacity-50"
                  style={{ background: h.sponsor.color }}
                >
                  {busy === h.id ? "Joining…" : "Join the hunt"}
                </button>
              )}
              {h.sponsor.url && (
                <a href={h.sponsor.url} target="_blank" rel="noreferrer" className="mt-2 block text-center text-[11px] text-white/40 underline">
                  About {h.sponsor.name}
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
