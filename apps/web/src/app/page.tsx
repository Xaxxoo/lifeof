"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   Hooks
   ═══════════════════════════════════════════════════════════════════════════ */

function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function useCountUp(target: number, active: boolean, duration = 1400) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t0 = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      setN(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return n;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Shared components
   ═══════════════════════════════════════════════════════════════════════════ */

function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(44px)",
        transition: `opacity 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

function GlowCard({ children, glow = "rgba(255,154,213,0.15)" }: { children: ReactNode; glow?: string }) {
  return (
    <div className="group relative">
      <div
        className="absolute -inset-1 rounded-2xl opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: glow }}
      />
      <div className="relative h-full rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur-sm transition duration-300 group-hover:border-white/[0.12] group-hover:bg-white/[0.06]">
        {children}
      </div>
    </div>
  );
}

function Stat({ value, label, suffix = "" }: { value: number; label: string; suffix?: string }) {
  const { ref, visible } = useReveal();
  const n = useCountUp(value, visible);
  return (
    <div ref={ref} className="text-center">
      <p className="text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl">
        {n}
        {suffix}
      </p>
      <p className="mt-2 text-sm text-white/35">{label}</p>
    </div>
  );
}

function Particles() {
  const [dots, setDots] = useState<{ l: number; t: number; s: number; dl: number; dr: number }[]>([]);
  useEffect(() => {
    setDots(
      Array.from({ length: 60 }, () => ({
        l: Math.random() * 100,
        t: Math.random() * 100,
        s: 1 + Math.random() * 1.5,
        dl: Math.random() * 18,
        dr: 10 + Math.random() * 16,
      })),
    );
  }, []);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {dots.map((d, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white/30 animate-float-up"
          style={{
            left: `${d.l}%`,
            top: `${d.t}%`,
            width: d.s,
            height: d.s,
            animationDelay: `${d.dl}s`,
            animationDuration: `${d.dr}s`,
          }}
        />
      ))}
    </div>
  );
}

function SubwayDivider() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-1">
      <div className="relative h-px overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
        <div className="absolute top-0 h-full w-24 animate-subway-light bg-gradient-to-r from-transparent via-[#ff9ad5]/40 to-transparent" />
      </div>
    </div>
  );
}

function Marquee({ items, reverse = false }: { items: { q: string; n: string }[]; reverse?: boolean }) {
  return (
    <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
      <div className={`flex shrink-0 items-center gap-4 ${reverse ? "animate-marquee-right" : "animate-marquee-left"}`}>
        {[...items, ...items].map((item, i) => (
          <div
            key={i}
            className="shrink-0 whitespace-nowrap rounded-full border border-white/[0.06] bg-white/[0.03] px-5 py-2.5 backdrop-blur-sm"
          >
            <span className="text-sm text-white/60">&ldquo;{item.q}&rdquo;</span>
            <span className="ml-2 text-xs text-white/30">&mdash; {item.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MTA badges
   ═══════════════════════════════════════════════════════════════════════════ */

const LC: Record<string, string> = {
  "1": "#EE352E", "2": "#EE352E", "3": "#EE352E",
  "4": "#00933C", "5": "#00933C", "6": "#00933C",
  A: "#0039A6", C: "#0039A6", E: "#0039A6",
  B: "#FF6319", D: "#FF6319", F: "#FF6319", M: "#FF6319",
  G: "#6CBE45",
  J: "#996633", Z: "#996633",
  L: "#A7A9AC",
  N: "#FCCC0A", Q: "#FCCC0A", R: "#FCCC0A", W: "#FCCC0A",
};

function Badge({ line }: { line: string }) {
  const dark = "NQRW".includes(line);
  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold leading-none ${dark ? "text-[#1a1a1a]" : "text-white"}`}
      style={{ backgroundColor: LC[line] ?? "#808183" }}
    >
      {line}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Data
   ═══════════════════════════════════════════════════════════════════════════ */

const NEIGHBORHOODS = [
  { name: "Crown Heights", street: "Nostrand Ave", lines: ["2", "3", "4", "5"], color: "#8e4a35", vibe: "Caribbean bakeries, church halls, and stoops where everybody knows your name." },
  { name: "Bushwick", street: "Knickerbocker Ave", lines: ["L", "M"], color: "#6a5acd", vibe: "Warehouse parties, halal carts, and the best bodega BEC in Brooklyn." },
  { name: "Bed-Stuy", street: "Halsey St", lines: ["A", "C"], color: "#b5651d", vibe: "Brownstone heritage, soul food, and a community that raised itself." },
  { name: "Flatbush", street: "Flatbush Ave", lines: ["2", "5", "B", "Q"], color: "#e63946", vibe: "Jollof wars, braiding salons, sound system bars, and Kings Theatre." },
  { name: "Williamsburg", street: "Bedford Ave", lines: ["L", "G"], color: "#457b9d", vibe: "Oat cortados, record shops, rooftop bars, and startup culture." },
  { name: "DUMBO", street: "Washington St", lines: ["F", "A", "C"], color: "#7c8fa6", vibe: "Art galleries, pizza legends, and the Manhattan Bridge view everyone photographs." },
  { name: "Prospect Park", street: "The Park", lines: ["B", "Q"], color: "#3e9e5c", vibe: "Drum circles, marathon training, BBQ smoke, and Saturday greenmarkets." },
];

const ORIGINS = [
  { name: "Lagos, Nigeria", perk: "+20% Hustle skill gain" },
  { name: "Accra, Ghana", perk: "+15% Social from group hangs" },
  { name: "Kingston, Jamaica", perk: "+20% Cooking skill gain" },
  { name: "Santo Domingo, DR", perk: "+15% Fun from music & dancing" },
  { name: "Dhaka, Bangladesh", perk: "+20% Coding skill gain" },
  { name: "Small-town Ohio", perk: "Starts with $1,000 extra" },
  { name: "Brooklyn native", perk: "Subway rides 15% faster" },
];

const FEATURES = [
  { title: "Work your way up", desc: "Start as a dishwasher. Climb to head chef. Or hustle gig deliveries across the borough between shifts." },
  { title: "Ride the subway", desc: "The 2/3/4/5, the L, the A/C. Real lines, real stops. Transfer at Franklin Av like you actually would." },
  { title: "Go out at night", desc: "House of Yes at midnight. Sugar Hill for jazz. Westlight for $19 spritzes and the skyline." },
  { title: "Build your spot", desc: "Furnish your Crown Heights walk-up. Bed, desk, fridge. Make it feel like yours." },
  { title: "Know your block", desc: "NPCs with real stories. The barber, the braider, the bodega cat. They remember you." },
  { title: "Share the city", desc: "Every player lives in the same Brooklyn. Same weather. Same subway. Same block. Your neighbor is real." },
];

const PITCH = [
  { title: "Real places", body: "Seven Brooklyn neighborhoods. Actual streets, real subway lines, and shops named after the ones you walk past every day." },
  { title: "Real people", body: "NPCs with stories. Auntie Grace runs the Ghanaian shop. Brother James feeds the block. Miss Pearl has been here since 1971." },
  { title: "Your story", body: "Pick where you're from. Pick who you are. Get a room in Crown Heights, $800, and a phone. The city does the rest." },
  { title: "One city", body: "Every player shares the same Brooklyn. Same weather, same subway delays, same blocks. Your neighbor is another player." },
];

const MQ1 = [
  { q: "You have eaten? Come, the waakye is hot.", n: "Auntie Grace" },
  { q: "The cat is the real manager. I just work here.", n: "Tito" },
  { q: "Baby, this block raised me and I raised it back.", n: "Miss Pearl" },
  { q: "$19 for the spritz. The view is free.", n: "Jules" },
  { q: "Feel it, don't count it.", n: "Andre" },
  { q: "We're like Uber, but for borrowing a cup of sugar.", n: "Brooke" },
  { q: "Long road to Brooklyn, but God is faithful.", n: "Brother James" },
];

const MQ2 = [
  { q: "This next one's for the people who came here alone.", n: "DJ Nova" },
  { q: "Twelve-hour shift. I deserve this.", n: "Nina" },
  { q: "BEC, salt pepper ketchup? Say less.", n: "Tito" },
  { q: "Knotless? Sit, it's six hours, bring snacks.", n: "Mama Rose" },
  { q: "Brooklyn is home now.", n: "Marcus" },
  { q: "Jazz on a Tuesday. That's how you know a place loves you.", n: "Mr. Earl" },
  { q: "Came for the circus act, stayed till 4.", n: "Marco" },
];

/* ═══════════════════════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/[0.04] bg-[#11131a]/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <span className="text-sm font-semibold tracking-[0.15em] uppercase text-white/70">New York Life</span>
          <Link
            href="/play"
            className="rounded-full bg-tile px-4 py-1.5 text-sm font-semibold text-[#11131a] transition hover:bg-white hover:shadow-[0_0_20px_rgba(244,241,234,0.25)]"
          >
            Play free
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section
        className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center"
        style={{
          background: [
            "radial-gradient(ellipse 90% 60% at 50% -5%, rgba(88,62,118,0.35), transparent)",
            "radial-gradient(ellipse 40% 35% at 75% 15%, rgba(255,154,213,0.1), transparent)",
            "radial-gradient(ellipse 50% 40% at 20% 70%, rgba(142,74,53,0.1), transparent)",
            "radial-gradient(ellipse 35% 30% at 80% 80%, rgba(62,90,60,0.08), transparent)",
          ].join(", "),
        }}
      >
        <Particles />

        <h1 className="animate-fade-up relative z-10 font-bold leading-[0.85] tracking-tighter text-7xl sm:text-8xl md:text-9xl lg:text-[11rem]">
          <span className="block animate-glow-pulse">NEW YORK</span>
          <span
            className="block bg-clip-text text-transparent animate-gradient-x"
            style={{
              backgroundImage: "linear-gradient(90deg, #ffd9a0, #ff9ad5, #b8a2c8, #ff9ad5, #ffd9a0)",
              backgroundSize: "300% 100%",
            }}
          >
            LIFE
          </span>
        </h1>

        <p
          className="animate-fade-up relative z-10 mt-8 max-w-md text-lg leading-relaxed text-white/50 sm:text-xl"
          style={{ animationDelay: "0.15s" }}
        >
          You just landed in Brooklyn. The city is real, live, and shared with every other player. Make it.
        </p>

        <Link
          href="/play"
          className="animate-fade-up relative z-10 mt-10 inline-flex items-center gap-2 rounded-full bg-tile px-9 py-4 text-base font-semibold text-[#11131a] transition hover:scale-[1.05] hover:bg-white hover:shadow-[0_0_40px_rgba(244,241,234,0.3)] active:scale-[0.97]"
          style={{ animationDelay: "0.3s" }}
        >
          Play free
          <span aria-hidden className="text-[#11131a]/40">&#8594;</span>
        </Link>

        <div
          className="animate-fade-up relative z-10 mt-8 flex gap-3 text-xs uppercase tracking-[0.2em] text-white/20"
          style={{ animationDelay: "0.45s" }}
        >
          <span>Free</span>
          <span className="text-white/10">&#183;</span>
          <span>In-browser</span>
          <span className="text-white/10">&#183;</span>
          <span>No download</span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </section>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 sm:grid-cols-4">
          <Stat value={7} label="Neighborhoods" />
          <Stat value={30} label="Venues & shops" suffix="+" />
          <Stat value={7} label="Origin stories" />
          <Stat value={1} label="Brooklyn" />
        </div>
      </section>

      <SubwayDivider />

      {/* ── Pitch ───────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">The game</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
              A life sim set in real Brooklyn
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-5 sm:grid-cols-2">
            {PITCH.map((c, i) => (
              <Reveal key={c.title} delay={i * 0.08}>
                <GlowCard>
                  <h3 className="text-lg font-semibold">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/50">{c.body}</p>
                </GlowCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <SubwayDivider />

      {/* ── Neighborhoods ───────────────────────────────────────────────── */}
      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">The city</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
              Seven neighborhoods
            </h2>
            <p className="mt-4 max-w-xl text-white/35">
              Each block has its own feel, its own people, and its own subway stop.
            </p>
          </Reveal>
          <div className="mt-14 grid gap-5 sm:grid-cols-2">
            {NEIGHBORHOODS.map((n, i) => (
              <Reveal key={n.name} delay={i * 0.06}>
                <GlowCard glow={`${n.color}40`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <div className="h-3 w-3 shrink-0 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: n.color, color: n.color }} />
                        <h3 className="text-lg font-semibold">{n.name}</h3>
                      </div>
                      <p className="mt-1 text-sm text-white/30">{n.street}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {n.lines.map((l) => (
                        <Badge key={l} line={l} />
                      ))}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-white/50">{n.vibe}</p>
                </GlowCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Marquee ─────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28">
        <Reveal>
          <p className="mb-10 text-center text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
            Voices from the block
          </p>
        </Reveal>
        <div className="space-y-4">
          <Marquee items={MQ1} />
          <Marquee items={MQ2} reverse />
        </div>
      </section>

      <SubwayDivider />

      {/* ── Origins ─────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">Your background</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
              Where you&rsquo;re from matters
            </h2>
            <p className="mt-4 max-w-xl text-white/35">
              Your origin shapes your skills, your community anchor, and your starting cash.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-14 divide-y divide-white/[0.06] rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6">
              {ORIGINS.map((o) => (
                <div
                  key={o.name}
                  className="group flex flex-col gap-1 py-5 transition sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <span className="font-medium transition group-hover:text-white">{o.name}</span>
                  <span className="text-sm text-white/35 transition group-hover:text-white/60">{o.perk}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <SubwayDivider />

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">Your life</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
              What you&rsquo;ll do
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.06}>
                <GlowCard>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/50">{f.desc}</p>
                </GlowCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section
        className="relative flex flex-col items-center justify-center px-6 py-32 text-center md:py-44"
        style={{
          background: [
            "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(142,74,53,0.2), transparent)",
            "radial-gradient(ellipse 40% 40% at 30% 80%, rgba(255,154,213,0.07), transparent)",
            "radial-gradient(ellipse 35% 35% at 70% 90%, rgba(88,62,118,0.12), transparent)",
          ].join(", "),
        }}
      >
        <Reveal>
          <p className="text-lg text-white/35 sm:text-xl">Your flight just landed.</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">Terminal B, JFK.</h2>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mt-5 max-w-sm leading-relaxed text-white/40">
            You have $800, a phone, and a room in Crown Heights. Brooklyn is waiting.
          </p>
        </Reveal>
        <Reveal delay={0.24}>
          <div
            className="mt-12 inline-flex rounded-full p-[2px]"
            style={{ background: "linear-gradient(135deg, #ffd9a0, #ff9ad5, #b8a2c8)" }}
          >
            <Link
              href="/play"
              className="inline-flex items-center gap-2 rounded-full bg-[#11131a] px-10 py-4 text-lg font-semibold text-tile transition hover:bg-[#181b24] hover:shadow-[0_0_50px_rgba(255,154,213,0.2)]"
            >
              Play free
              <span aria-hidden className="text-white/40">&#8594;</span>
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] px-6 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between text-sm text-white/20">
          <span>New York Life</span>
          <span>2026</span>
        </div>
      </footer>
    </div>
  );
}
