/**
 * Chat safety rules shared by room chat and DMs. Pure: no I/O, no clock.
 *
 * Two checks:
 * - content: slurs, self-harm harassment and sexual content, matched after
 *   undoing the usual bypasses (leetspeak, spacing, lookalike letters, repeats)
 * - personal info: phone numbers, emails, links, street addresses and
 *   "add me on snap" style contact swaps. Blocked for everyone, like Roblox,
 *   because moving a conversation off-platform is how grooming starts.
 */

export type ChatBlockReason = "slur" | "self_harm" | "sexual" | "personal_info" | "spam" | "rate_limited";

export type ChatVerdict = { ok: true } | { ok: false; reason: ChatBlockReason };

/** What the sender sees when a message is refused. */
export const CHAT_BLOCK_MESSAGES: Record<ChatBlockReason, string> = {
  slur: "That message can't be sent",
  self_harm: "That message can't be sent",
  sexual: "That message can't be sent",
  personal_info: "Keep phone numbers, addresses, links and socials out of chat",
  spam: "You already said that",
  rate_limited: "Slow down a little",
};

const ZERO_WIDTH = /[­​-‏⁠-⁤﻿]/g;

/** Cyrillic/Greek lookalikes that survive NFKD. */
const CONFUSABLES: Record<string, string> = {
  а: "a", в: "b", е: "e", ё: "e", к: "k", м: "m", н: "h", о: "o", р: "p", с: "c", т: "t", у: "y", х: "x",
  і: "i", ї: "i", ј: "j", ѕ: "s", ԁ: "d", ɡ: "g", ү: "y", һ: "h",
  α: "a", β: "b", ε: "e", η: "n", ι: "i", κ: "k", ν: "v", ο: "o", ρ: "p", τ: "t", υ: "u", χ: "x",
};

const LEET: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "9": "g",
  "@": "a", "$": "s", "!": "i", "|": "i", "+": "t", "€": "e", "¡": "i",
};

/** Lowercase, strip accents and invisible characters, undo lookalike letters. */
function baseNormalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(ZERO_WIDTH, "")
    .toLowerCase()
    .replace(/./gu, (ch) => CONFUSABLES[ch] ?? ch);
}

/**
 * Forms of a message used for content matching.
 * - spaced: letters only, words separated by single spaces, runs of single
 *   letters joined ("n i g g a" and "k.y.s" become one word)
 * - compact: every letter with no spaces, to catch slurs hidden inside
 *   longer strings ("xxniggerxx")
 */
export function normalizeForFilter(text: string): { spaced: string; compact: string } {
  const leet = baseNormalize(text).replace(/./gu, (ch) => LEET[ch] ?? ch);
  const words = leet.replace(/[^a-z]+/g, " ").trim().split(" ").filter(Boolean);
  const joined: string[] = [];
  let run = "";
  for (const w of words) {
    if (w.length === 1) {
      run += w;
      continue;
    }
    if (run) joined.push(run);
    run = "";
    joined.push(w);
  }
  if (run) joined.push(run);
  const spaced = joined.join(" ");
  return { spaced, compact: spaced.replace(/ /g, "") };
}

/** "nigg" → /n+i+g+g+/, so stretched letters ("niiigga") still match. */
function stretch(stem: string): string {
  return stem
    .split("")
    .map((c) => (c === " " ? "\\s*" : `${c}+`))
    .join("");
}

/** Whole-word match on the spaced form, with optional endings. */
function word(stem: string, endings: string[] = []): RegExp {
  const tail = endings.length ? `(?:${endings.map(stretch).join("|")})?` : "";
  return new RegExp(`(?:^|\\s)${stretch(stem)}${tail}(?=\\s|$)`);
}

type Rule = { reason: ChatBlockReason; spaced: RegExp[]; compact?: RegExp[] };

const RULES: Rule[] = [
  {
    reason: "slur",
    spaced: [
      word("nigg", ["er", "ers", "a", "as", "az", "ah", "uh"]),
      word("nig", ["ga", "gas", "ger", "gers"]),
      word("fag", ["s", "got", "gots", "gy"]),
      word("kike", ["s"]),
      word("chink", ["s"]),
      word("spic", ["s"]),
      word("wetback", ["s"]),
      word("tranny", []),
      word("trannie", ["s"]),
      word("retard", ["s", "ed"]),
      word("gook", ["s"]),
      word("beaner", ["s"]),
      word("towelhead", ["s"]),
      word("raghead", ["s"]),
      word("dyke", ["s"]),
    ],
    // Only stems that never appear inside innocent words. (?<!s) keeps "snigger".
    compact: [/(?<!s)n+i+g+g+(?:e+r+|a+)/, /f+a+g+g+o+t+/, /w+e+t+b+a+c+k+/, /t+o+w+e+l+h+e+a+d+/],
  },
  {
    reason: "self_harm",
    spaced: [
      word("kys"),
      /(?:^|\s)k+i+l+l+\s*(?:your|ur|yo|u)\s*self(?=\s|$)/,
      /(?:^|\s)(?:hang|neck|end)\s*(?:your|ur|yo)\s*self(?=\s|$)/,
      /(?:^|\s)go\s+die(?=\s|$)/,
      /(?:^|\s)(?:you|u)\s+should\s+die(?=\s|$)/,
    ],
    compact: [/(?<!s)k+i+l+l+(?:your|ur)self/],
  },
  {
    reason: "sexual",
    spaced: [
      word("slut", ["s", "ty"]),
      word("whore", ["s"]),
      word("nude", ["s"]),
      word("porn", ["o"]),
      word("pussy", []),
      word("blowjob", ["s"]),
      word("handjob", ["s"]),
      word("rape", ["d", "s"]),
      word("dick pic", ["s"]),
      word("send pic", ["s"]),
      word("onlyfans", []),
      word("horny", []),
      word("sexting", []),
    ],
  },
];

/** Number words → digits, so "five five five one two..." still reads as a phone number. */
const NUMBER_WORDS: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9",
};

const PLATFORMS = "snap|snapchat|sc|insta|instagram|ig|tiktok|tt|discord|whatsapp|whats app|telegram|tg|kik|twitter|onlyfans|facebook|fb|venmo|cashapp|cash app|signal";

const PERSONAL_INFO: RegExp[] = [
  // 10+ digits in a run with separators (US numbers with area code), or 555-1234 / 555 1234
  /(?:\+?\d[\s().\-_/]*){10,}/,
  /(?:^|[^\d])\d{3}[\s.\-_]\d{4}(?!\d)/,
  // emails, including "name at gmail dot com"
  /[a-z0-9._%+-]+\s*(?:@|\(at\)|\[at\])\s*[a-z0-9-]+(?:\.|\s*(?:\(dot\)|\[dot\]|\sdot\s)\s*)[a-z]{2,}/,
  /[a-z0-9._%+-]+\s+at\s+(?:gmail|yahoo|hotmail|outlook|icloud|aol|proton|protonmail)\b/,
  // links
  /\b(?:https?:\/\/|www\.)\S+/,
  /\b[a-z0-9-]{2,}(?:\.|\s*(?:\(dot\)|\[dot\]|\sdot\s)\s*)(?:com|net|org|gg|io|me|tv|ly|co|app|xyz|link|site|live)\b/,
  // contact swaps
  new RegExp(`\\b(?:add|follow|hmu|dm|message|msg|text|call|find|hit)\\s+me\\s+(?:up\\s+)?(?:on|at|in)\\s+(?:${PLATFORMS})\\b`),
  new RegExp(`\\bhmu\\s+(?:on|at|in)\\s+(?:${PLATFORMS})\\b`),
  new RegExp(`\\b(?:${PLATFORMS})\\s*(?:is|=|:|-|@)\\s*@?[a-z0-9_.]{3,}`),
  new RegExp(`\\b(?:what'?s|whats|wats|give me|gimme|send me|drop)\\s+(?:your|ur|yo)\\s+(?:${PLATFORMS}|number|digits|phone|addy|address)\\b`),
  /\b(?:my|text|call)\s+(?:number|digits|cell|phone)\s+(?:is|at)\b/,
  // street addresses: "123 Bedford Ave", "12 w 4th st"
  /\b\d{1,5}\s+(?:[nsew]\.?\s+)?[a-z0-9]+(?:\s+[a-z0-9]+)?\s+(?:st|street|ave|avenue|rd|blvd|boulevard|ln|dr|pl|ct|pkwy|parkway)\b/,
  /\b(?:apt|apartment|unit)\s*#?\s*\d+[a-z]?\b/,
];

function personalInfoForm(text: string): string {
  return baseNormalize(text)
    .replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine)\b/g, (w) => NUMBER_WORDS[w]!)
    .replace(/\s+/g, " ");
}

/** Content and personal-info check for one message. */
export function checkChatText(text: string): ChatVerdict {
  const { spaced, compact } = normalizeForFilter(text);
  for (const rule of RULES) {
    if (rule.spaced.some((r) => r.test(spaced)) || rule.compact?.some((r) => r.test(compact))) {
      return { ok: false, reason: rule.reason };
    }
  }
  const pi = personalInfoForm(text);
  if (PERSONAL_INFO.some((r) => r.test(pi))) return { ok: false, reason: "personal_info" };
  return { ok: true };
}

/** Letters and digits only, so "Buy gold!!" repeats "buy gold". */
function repeatKey(text: string): string {
  return baseNormalize(text).replace(/[^a-z0-9]+/g, "");
}

export type ChatRateLimits = {
  /** Max messages in `burstMs`. */
  burst: number;
  burstMs: number;
  /** Max messages per minute. */
  perMinute: number;
  /** Same message again within this window counts as spam. */
  duplicateMs: number;
};

export const ROOM_CHAT_LIMITS: ChatRateLimits = { burst: 4, burstMs: 8_000, perMinute: 15, duplicateMs: 30_000 };
export const DM_LIMITS: ChatRateLimits = { burst: 5, burstMs: 10_000, perMinute: 20, duplicateMs: 30_000 };

export type SentMessage = { at: number; text: string };

/**
 * Rate and repeat check against a sender's recent messages.
 * Returns the history to keep (pruned to the last minute, plus this message if allowed).
 */
export function checkChatRate(
  history: SentMessage[],
  text: string,
  now: number,
  limits: ChatRateLimits,
): { verdict: ChatVerdict; history: SentMessage[] } {
  const recent = history.filter((m) => now - m.at < 60_000);
  // Short replies like "lol" or "ok" can repeat; longer repeats are spam.
  const key = repeatKey(text);
  if (key.length >= 6 && recent.some((m) => now - m.at < limits.duplicateMs && repeatKey(m.text) === key)) {
    return { verdict: { ok: false, reason: "spam" }, history: recent };
  }
  const inBurst = recent.filter((m) => now - m.at < limits.burstMs).length;
  if (inBurst >= limits.burst || recent.length >= limits.perMinute) {
    return { verdict: { ok: false, reason: "rate_limited" }, history: recent };
  }
  return { verdict: { ok: true }, history: [...recent, { at: now, text }] };
}

/** Blocked content attempts that trigger an automatic mute. */
export const AUTO_MUTE_STRIKES = 3;
export const AUTO_MUTE_WINDOW_MS = 10 * 60_000;
export const AUTO_MUTE_MS = 15 * 60_000;

/** Reasons that count as strikes (not rate limits or repeats). */
export function isStrike(reason: ChatBlockReason): boolean {
  return reason === "slur" || reason === "self_harm" || reason === "sexual";
}

/** Permanent bans are stored as this "until" time. */
export const PERMANENT = Number.MAX_SAFE_INTEGER;

export function isActiveUntil(until: number | string | null | undefined, now: number): boolean {
  return until != null && Number(until) > now;
}
