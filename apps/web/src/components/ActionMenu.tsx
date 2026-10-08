"use client";

import { ACTIONS, SHIFT_MINUTES } from "@nyl/content";

function duration(ms: number) {
  if (ms === 0) return "";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60_000)} min`;
}

/** Bottom sheet listing what you can do with the thing you tapped. */
export function ActionMenu({
  title,
  actionIds,
  onChoose,
  onClose,
  note,
}: {
  title: string;
  actionIds: string[];
  onChoose: (actionId: string) => void;
  onClose: () => void;
  note?: string;
}) {
  return (
    <div className="absolute inset-x-3 bottom-20 z-30 mx-auto max-w-sm rounded-2xl bg-[#171a22]/95 p-3 shadow-2xl backdrop-blur">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-sm font-semibold">{title}</p>
        <button onClick={onClose} className="text-xs text-white/50">
          Close
        </button>
      </div>
      <div className="grid gap-1.5">
        {actionIds.map((id) => {
          const a = ACTIONS[id];
          if (!a) return null;
          return (
            <button
              key={id}
              onClick={() => onChoose(id)}
              className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5 text-left text-sm hover:bg-white/10"
            >
              <span>{a.label}</span>
              <span className="text-xs text-white/50">{a.kind === "work" ? `${SHIFT_MINUTES} min shift` : duration(a.durationMs)}</span>
            </button>
          );
        })}
      </div>
      {note && <p className="mt-2 px-1 text-xs text-white/50">{note}</p>}
    </div>
  );
}
