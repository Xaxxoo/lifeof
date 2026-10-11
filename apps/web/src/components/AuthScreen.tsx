"use client";

import { useState } from "react";
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

  return (
    <main className="flex min-h-full items-center justify-center bg-[#11131a] px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-3xl font-semibold tracking-tight">
          New York Life
        </h1>
        <p className="mt-2 text-center text-sm text-white/60">
          {mode === "login" ? "Welcome back." : "Create your account."}
        </p>

        <div className="mt-8 flex rounded-lg border border-white/15 bg-white/5 p-0.5">
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
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-base outline-none focus:border-white/40"
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
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-base outline-none focus:border-white/40"
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
    </main>
  );
}
