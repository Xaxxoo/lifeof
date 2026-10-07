"use client";

import { useGame } from "@/lib/store";

export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  const dismiss = useGame((s) => s.dismissToast);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-20 z-40 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto max-w-sm rounded-full px-4 py-2 text-sm font-medium shadow-lg backdrop-blur ${
            t.tone === "error" ? "bg-red-600/90 text-white" : t.tone === "good" ? "bg-emerald-500/90 text-black" : "bg-black/80 text-white"
          }`}
        >
          {t.text}
        </button>
      ))}
    </div>
  );
}
