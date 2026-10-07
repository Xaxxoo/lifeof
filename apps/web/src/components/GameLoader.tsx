"use client";

import dynamic from "next/dynamic";

// The game reads localStorage, the clock and WebGL, so it only renders in the browser.
const Game = dynamic(() => import("./Game").then((m) => m.Game), {
  ssr: false,
  loading: () => <Splash />,
});

export function GameLoader() {
  return <Game />;
}

export function Splash({ note }: { note?: string }) {
  return (
    <main className="grid h-full place-items-center bg-[#11131a]">
      <div className="text-center">
        <p className="text-2xl font-semibold tracking-tight">New York Life</p>
        <p className="mt-2 text-sm text-white/60">{note ?? "Landing at JFK…"}</p>
      </div>
    </main>
  );
}
