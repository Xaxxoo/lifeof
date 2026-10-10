"use client";

import { useCallback } from "react";
import { ONBOARDING_QUEST } from "@nyl/content";
import { api } from "@/lib/api";
import { usePolling } from "@/lib/hooks";
import type { QuestProgressDoc } from "@/lib/types";

export function QuestTracker() {
  const fetcher = useCallback(() => api.questProgress(), []);
  const progress = usePolling(fetcher, 5000);

  if (progress === undefined || progress === null || progress.completed) return null;

  const quest = ONBOARDING_QUEST;
  const step = quest.steps[progress.step];
  if (!step) return null;

  return (
    <div className="absolute left-3 right-3 top-14 z-20 mx-auto max-w-sm">
      <div className="rounded-2xl border border-white/10 bg-[#0f1117]/90 px-4 py-3 backdrop-blur">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">{quest.name}</p>
        <p className="mt-1 text-sm font-semibold">{step.title}</p>
        <p className="text-xs text-white/60">{step.hint}</p>
        <div className="mt-2 flex gap-1">
          {quest.steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i < progress.step ? "bg-emerald-400" : i === progress.step ? "bg-[#f3a712]" : "bg-white/10"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
