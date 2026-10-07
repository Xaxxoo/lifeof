"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import { ORIGINS, SHIRT_COLORS, SKIN_TONES, STATUSES, TRAITS, ORIGIN_CASH_BONUS } from "@nyl/content";

export function CreateCharacter({ token }: { token: string }) {
  const create = useMutation(api.characters.create);
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState<string>(ORIGINS[0].id);
  const [status, setStatus] = useState<string>(STATUSES[0].id);
  const [trait, setTrait] = useState<string>(TRAITS[0].id);
  const [skin, setSkin] = useState<string>(SKIN_TONES[6]);
  const [shirt, setShirt] = useState<string>(SHIRT_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const statusDef = STATUSES.find((s) => s.id === status);
  const cash = (statusDef?.startingCash ?? 0) + (ORIGIN_CASH_BONUS[origin] ?? 0);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await create({ token, name, origin, status, trait, look: { skin, shirt } });
    } catch (e) {
      setError(e instanceof Error ? e.message.replace(/^.*Uncaught Error: /, "").split("\n")[0]! : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-full overflow-y-auto bg-[#11131a] px-4 pb-10 pt-8">
      <div className="mx-auto max-w-md">
        <p className="text-xs font-medium uppercase tracking-widest text-white/50">JFK Terminal 4 · Arrivals</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">You just landed.</h1>
        <p className="mt-2 text-sm text-white/70">Two suitcases and some savings. Who are you, and where did you come from?</p>

        <section className="mt-8 space-y-6">
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              placeholder="What should Brooklyn call you?"
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-base outline-none focus:border-white/40"
            />
          </Field>

          <Field label="Skin tone">
            <div className="flex flex-wrap gap-2">
              {SKIN_TONES.map((c) => (
                <Swatch key={c} color={c} selected={skin === c} onClick={() => setSkin(c)} />
              ))}
            </div>
          </Field>

          <Field label="Shirt">
            <div className="flex flex-wrap gap-2">
              {SHIRT_COLORS.map((c) => (
                <Swatch key={c} color={c} selected={shirt === c} onClick={() => setShirt(c)} />
              ))}
            </div>
          </Field>

          <Field label="Where you're from">
            <div className="grid gap-2">
              {ORIGINS.map((o) => (
                <Choice key={o.id} selected={origin === o.id} onClick={() => setOrigin(o.id)} title={o.name} note={o.perk} />
              ))}
            </div>
          </Field>

          <Field label="Your status">
            <div className="grid gap-2">
              {STATUSES.map((s) => (
                <Choice key={s.id} selected={status === s.id} onClick={() => setStatus(s.id)} title={s.name} note={s.workRules} />
              ))}
            </div>
          </Field>

          <Field label="Trait">
            <div className="flex flex-wrap gap-2">
              {TRAITS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTrait(t.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${trait === t.id ? "border-white bg-white text-black" : "border-white/20 text-white/80"}`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </Field>
        </section>

        <div className="mt-8 rounded-lg bg-white/5 p-3 text-sm text-white/70">
          You arrive with <span className="font-semibold text-white">${cash.toLocaleString("en-US")}</span>. Rent is due Sunday.
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <button
          onClick={submit}
          disabled={busy || name.trim().length < 2}
          className="mt-4 w-full rounded-lg bg-[#f3a712] py-3 font-semibold text-black disabled:opacity-40"
        >
          {busy ? "Getting your MetroCard…" : "Leave the airport"}
        </button>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-white/50">{label}</p>
      {children}
    </div>
  );
}

function Swatch({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      aria-label={color}
      onClick={onClick}
      style={{ backgroundColor: color }}
      className={`size-9 rounded-full ring-offset-2 ring-offset-[#11131a] ${selected ? "ring-2 ring-white" : ""}`}
    />
  );
}

function Choice({ selected, onClick, title, note }: { selected: boolean; onClick: () => void; title: string; note: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-2.5 text-left ${selected ? "border-[#f3a712] bg-[#f3a712]/10" : "border-white/15 bg-white/5"}`}
    >
      <span className="block text-sm font-medium">{title}</span>
      <span className="block text-xs text-white/60">{note}</span>
    </button>
  );
}
