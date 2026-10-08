"use client";

import { useState } from "react";
import {
  DEFAULT_LOOK,
  GENDERS,
  SEXUALITIES,
  HAIR_COLORS,
  HAIR_STYLES,
  ORIGINS,
  ORIGIN_CASH_BONUS,
  PANTS_COLORS,
  SHIRT_COLORS,
  SKIN_TONES,
  STATUSES,
  TRAITS,
  type HairStyleId,
  type Look,
} from "@nyl/content";
import { api } from "@/lib/api";
import { playerMessage } from "@/lib/errors";
import { CharacterPreview } from "./CharacterPreview";

export function CreateCharacter() {
  const [name, setName] = useState("");
  const [look, setLook] = useState<Look>(DEFAULT_LOOK);
  const [origin, setOrigin] = useState<string>(ORIGINS[0].id);
  const [status, setStatus] = useState<string>(STATUSES[0].id);
  const [trait, setTrait] = useState<string>(TRAITS[0].id);
  const [gender, setGender] = useState<string>(GENDERS[0].id);
  const [sexuality, setSexuality] = useState<string>(SEXUALITIES[0].id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const statusDef = STATUSES.find((s) => s.id === status);
  const cash = (statusDef?.startingCash ?? 0) + (ORIGIN_CASH_BONUS[origin] ?? 0);
  const set = <K extends keyof Look>(k: K, v: Look[K]) => setLook((l) => ({ ...l, [k]: v }));

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.createCharacter({ name, origin, status, trait, gender, sexuality, look });
    } catch (e) {
      setError(playerMessage(e));
      setBusy(false);
    }
  }

  return (
    <main className="flex h-full flex-col overflow-hidden bg-[#11131a] md:flex-row">
      {/* Preview: pinned on top for phones, left column on desktop */}
      <div className="h-[38vh] shrink-0 md:sticky md:top-0 md:h-full md:w-1/2">
        <CharacterPreview look={look} name={name} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10 pt-6 md:px-10 md:pt-12">
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

            <Field label="Gender">
              <div className="flex flex-wrap gap-2">
                {GENDERS.map((g) => (
                  <Pill key={g.id} selected={gender === g.id} onClick={() => setGender(g.id)}>
                    {g.name}
                  </Pill>
                ))}
              </div>
            </Field>

            <Field label="Sexuality">
              <div className="flex flex-wrap gap-2">
                {SEXUALITIES.map((s) => (
                  <Pill key={s.id} selected={sexuality === s.id} onClick={() => setSexuality(s.id)}>
                    {s.name}
                  </Pill>
                ))}
              </div>
            </Field>

            <Field label="Skin tone">
              <Swatches colors={SKIN_TONES} value={look.skin} onPick={(c) => set("skin", c)} />
            </Field>

            <Field label="Hair">
              <div className="flex flex-wrap gap-2">
                {HAIR_STYLES.map((h) => (
                  <Pill key={h.id} selected={look.hair === h.id} onClick={() => set("hair", h.id as HairStyleId)}>
                    {h.name}
                  </Pill>
                ))}
              </div>
              <div className="mt-3">
                <Swatches colors={HAIR_COLORS} value={look.hairColor} onPick={(c) => set("hairColor", c)} small />
              </div>
              {(look.hair === "headwrap" || look.hair === "hijab") && (
                <p className="mt-2 text-xs text-white/50">The color above sets the fabric.</p>
              )}
            </Field>

            <Field label="Shirt">
              <Swatches colors={SHIRT_COLORS} value={look.shirt} onPick={(c) => set("shirt", c)} />
            </Field>

            <Field label="Pants">
              <Swatches colors={PANTS_COLORS} value={look.pants} onPick={(c) => set("pants", c)} />
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
                  <Pill key={t.id} selected={trait === t.id} onClick={() => setTrait(t.id)}>
                    {t.name}
                  </Pill>
                ))}
              </div>
            </Field>
          </section>

          <div className="mt-8 rounded-lg bg-white/5 p-3 text-sm text-white/70">
            You arrive with <span className="font-semibold text-white">${cash.toLocaleString("en-US")}</span> and a basement
            room in Crown Heights at $180 a week. Rent is due Sunday.
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

function Swatches({
  colors,
  value,
  onPick,
  small,
}: {
  colors: readonly string[];
  value: string;
  onPick: (c: string) => void;
  small?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((c) => (
        <button
          key={c}
          aria-label={c}
          onClick={() => onPick(c)}
          style={{ backgroundColor: c }}
          className={`${small ? "size-7" : "size-9"} rounded-full ring-offset-2 ring-offset-[#11131a] ${value === c ? "ring-2 ring-white" : ""}`}
        />
      ))}
    </div>
  );
}

function Pill({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm ${selected ? "border-white bg-white text-black" : "border-white/20 text-white/80"}`}
    >
      {children}
    </button>
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
