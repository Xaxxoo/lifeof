"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { playerMessage } from "@/lib/errors";

type Mode = "login" | "signup";

export function AuthScreen({
  onAuth,
  onGuest,
}: {
  onAuth: () => void;
  onGuest: () => void;
}) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Animation tick
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(id);
  }, []);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        await api.signup(email, password);
      } else {
        await api.login(email, password);
      }
      onAuth();
    } catch (e) {
      setError(playerMessage(e));
      setBusy(false);
    }
  }

  function handleGuest() {
    setBusy(true);
    setError(null);
    onGuest();
  }

  // Plane descends from top-left to center-right over a ~20s loop
  const planeT = (now % 20000) / 20000;
  const planeX = -10 + planeT * 70;  // -10% → 60%
  const planeY = 8 + planeT * 35;    // 8% → 43%
  const planeScale = 0.6 + planeT * 0.6;

  return (
    <main className="relative flex min-h-full flex-col overflow-hidden bg-gradient-to-b from-[#1a2744] via-[#141a2e] to-[#0d1117]">
      {/* ─── Animated sky scene ─── */}
      <div className="pointer-events-none absolute inset-0">
        {/* Stars */}
        {STARS.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              opacity: 0.12 + Math.sin(now / (1200 + i * 400)) * 0.08,
            }}
          />
        ))}

        {/* Cloud layers — parallax drift */}
        {CLOUDS.map((c, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/[0.04]"
            style={{
              top: `${c.y}%`,
              width: c.w,
              height: c.h,
              transform: `translateX(${((now / c.speed) % (120 + c.w)) - c.w}px)`,
            }}
          />
        ))}

        {/* Plane */}
        <div
          className="absolute"
          style={{
            left: `${planeX}%`,
            top: `${planeY}%`,
            transform: `scale(${planeScale}) rotate(-8deg)`,
            transition: "transform 50ms linear",
          }}
        >
          {/* Fuselage */}
          <div className="h-3 w-24 rounded-r-full bg-white/25" />
          {/* Cockpit windows */}
          <div className="absolute right-1 top-0.5 flex gap-[2px]">
            <div className="h-1.5 w-1 rounded-sm bg-[#8ec8f0]/30" />
            <div className="h-1.5 w-1 rounded-sm bg-[#8ec8f0]/30" />
          </div>
          {/* Wing */}
          <div className="absolute -top-4 left-6 h-2.5 w-16 -skew-y-6 rounded-sm bg-white/15" />
          {/* Wing underside highlight */}
          <div className="absolute -top-1.5 left-8 h-0.5 w-10 bg-white/[0.06]" />
          {/* Tail fin */}
          <div className="absolute -top-5 left-0 h-6 w-3 -skew-x-12 rounded-t-sm bg-white/15" />
          {/* Engine glow */}
          <div className="absolute left-8 top-3 h-1 w-3 rounded-full bg-[#f3a712]/20 blur-[2px]" />
          <div className="absolute left-14 top-3 h-1 w-3 rounded-full bg-[#f3a712]/20 blur-[2px]" />
        </div>

        {/* Landing lights — two beams from the plane */}
        <div
          className="absolute h-[1px] bg-gradient-to-r from-white/10 to-transparent"
          style={{
            left: `${planeX + 4}%`,
            top: `${planeY + 2}%`,
            width: 60,
            transform: `rotate(12deg)`,
            opacity: 0.3 + Math.sin(now / 800) * 0.15,
          }}
        />

        {/* NYC skyline silhouette at bottom */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-[2px] px-2">
          {SKYLINE.map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-white/[0.06]"
              style={{ height: h }}
            />
          ))}
        </div>

        {/* Runway approach lights */}
        <div className="absolute bottom-0 left-[40%] flex items-end gap-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: 3,
                height: 3,
                backgroundColor: "#f3a712",
                opacity: 0.15 + Math.sin(now / 500 + i * 0.8) * 0.1,
                marginBottom: 2 + i * 3,
              }}
            />
          ))}
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Title */}
          <p className="text-center text-xs uppercase tracking-widest text-white/40">
            JFK Terminal 4 &middot; Arrivals
          </p>
          <h1 className="mt-2 text-center text-3xl font-semibold tracking-tight">
            New York Life
          </h1>
          <p className="mt-1.5 text-center text-sm text-white/50">
            {mode === "login"
              ? "Welcome back to Brooklyn."
              : "Your flight just landed."}
          </p>

          {/* Toggle */}
          <div className="mt-8 flex rounded-lg border border-white/15 bg-white/5 p-0.5 backdrop-blur-sm">
            <button
              onClick={() => { setMode("login"); setError(null); }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                mode === "login" ? "bg-white/10 text-white" : "text-white/50"
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => { setMode("signup"); setError(null); }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                mode === "signup" ? "bg-white/10 text-white" : "text-white/50"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            className="mt-6 space-y-4"
          >
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-widest text-white/50">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-base outline-none backdrop-blur-sm focus:border-white/40"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-widest text-white/50">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 6 characters" : ""}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-base outline-none backdrop-blur-sm focus:border-white/40"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={busy || !email.trim() || !password}
              className="w-full rounded-lg bg-[#f3a712] py-3 font-semibold text-black disabled:opacity-40"
            >
              {busy
                ? "Hold on…"
                : mode === "signup"
                  ? "Create account"
                  : "Log in"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={handleGuest}
              disabled={busy}
              className="text-sm text-white/50 underline decoration-white/20 underline-offset-2 hover:text-white/70 disabled:opacity-40"
            >
              Play as guest
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ─── Scene data ─── */

const STARS = [
  { x: 8, y: 5, size: 1.5 },
  { x: 22, y: 12, size: 1 },
  { x: 35, y: 3, size: 2 },
  { x: 48, y: 9, size: 1 },
  { x: 62, y: 6, size: 1.5 },
  { x: 75, y: 14, size: 1 },
  { x: 88, y: 4, size: 2 },
  { x: 14, y: 18, size: 1 },
  { x: 55, y: 16, size: 1 },
  { x: 92, y: 11, size: 1.5 },
  { x: 40, y: 20, size: 1 },
  { x: 70, y: 2, size: 1 },
];

const CLOUDS = [
  { y: 15, w: 140, h: 6, speed: 25000 },
  { y: 28, w: 200, h: 4, speed: 35000 },
  { y: 40, w: 100, h: 5, speed: 18000 },
  { y: 22, w: 170, h: 3, speed: 30000 },
  { y: 50, w: 120, h: 4, speed: 22000 },
];

const SKYLINE = [
  30, 45, 25, 55, 35, 70, 28, 50, 42, 20, 60, 32, 75, 38, 48, 22, 58, 30, 40, 65, 28, 52, 36, 45,
];
