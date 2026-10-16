"use client";

import { useCallback, useEffect, useState } from "react";
import { api, guestStartedAt } from "@/lib/api";
import { playerMessage } from "@/lib/errors";
import { usePolling } from "@/lib/hooks";
import { useGame, type SaveReason } from "@/lib/store";

const PLAYED_PROMPT_MS = 10 * 60_000;
/** After "Not now", don't pop up again on our own for this long. */
const SNOOZE_MS = 20 * 60_000;
const PROMPTED_KEY = "nyl_save_prompted";
const SNOOZE_KEY = "nyl_save_snoozed_until";

const HEADLINES: Record<SaveReason, string> = {
  paycheck: "First paycheck! Save your progress so you don't lose it.",
  gig: "First gig done! Save your progress so you don't lose it.",
  time: "You've been in the city a while. Save your progress?",
  prize: "You won a prize. Save your account so it stays yours.",
  manual: "Save your progress and play on any device.",
};

function readPrompted(): SaveReason[] {
  try {
    return JSON.parse(localStorage.getItem(PROMPTED_KEY) ?? "[]") as SaveReason[];
  } catch {
    return [];
  }
}

function snoozed(): boolean {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY)) > Date.now();
  } catch {
    return false;
  }
}

function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private browsing
  }
}

/**
 * Guests play straight away; this asks them to save after something worth keeping
 * (first paycheck, first gig, ten minutes in, or a prize). Each reason pops up on its own once.
 */
export function SavePrompt() {
  const isGuest = useGame((s) => s.isGuest);
  const setIsGuest = useGame((s) => s.setIsGuest);
  const reason = useGame((s) => s.saveReason);
  const openSave = useGame((s) => s.openSave);

  useEffect(() => {
    api.authMe().then((s) => setIsGuest(!s.userId)).catch(() => {});
  }, [setIsGuest]);

  const autoOpen = useCallback(
    (r: SaveReason) => {
      if (useGame.getState().saveReason || snoozed()) return;
      const prompted = readPrompted();
      if (prompted.includes(r)) return;
      remember(PROMPTED_KEY, JSON.stringify([...prompted, r]));
      openSave(r);
    },
    [openSave],
  );

  const meFetcher = useCallback(() => api.me(), []);
  const me = usePolling(isGuest ? meFetcher : null, 15_000);
  useEffect(() => {
    if (!me) return;
    if ((me.job?.totalShifts ?? 0) >= 1) autoOpen("paycheck");
    else if ((me.gigStats?.done ?? 0) >= 1) autoOpen("gig");
  }, [me, autoOpen]);

  useEffect(() => {
    if (!isGuest) return;
    const started = guestStartedAt() ?? Date.now();
    const id = setTimeout(() => autoOpen("time"), Math.max(0, started + PLAYED_PROMPT_MS - Date.now()));
    return () => clearTimeout(id);
  }, [isGuest, autoOpen]);

  if (!isGuest || !reason) return null;
  return <SaveSheet reason={reason} />;
}

function SaveSheet({ reason }: { reason: SaveReason }) {
  const closeSave = useGame((s) => s.closeSave);
  const setIsGuest = useGame((s) => s.setIsGuest);
  const toast = useGame((s) => s.toast);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.upgrade(email, password);
      setIsGuest(false);
      closeSave();
      toast(`Saved. Log in with ${email.trim().toLowerCase()} on any device.`, "good");
    } catch (e) {
      setError(playerMessage(e));
      setBusy(false);
    }
  }

  function notNow() {
    remember(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    closeSave();
  }

  return (
    <div className="absolute inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#15171c]/95 p-4 shadow-2xl backdrop-blur"
      >
        <p className="text-sm font-semibold">{HEADLINES[reason]}</p>
        <p className="mt-1 text-xs text-white/50">Your character, cash and progress all stay.</p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="mt-3 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-base outline-none focus:border-white/40"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (at least 6 characters)"
          autoComplete="new-password"
          className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-base outline-none focus:border-white/40"
        />
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={notNow}
            className="flex-1 rounded-lg border border-white/15 py-2.5 text-sm text-white/70"
          >
            Not now
          </button>
          <button
            type="submit"
            disabled={busy || !email.trim() || !password}
            className="flex-[2] rounded-lg bg-[#f3a712] py-2.5 text-sm font-semibold text-black disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save progress"}
          </button>
        </div>
      </form>
    </div>
  );
}
