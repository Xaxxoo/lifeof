import { describe, expect, it } from "vitest";
import { checkChatRate, checkChatText, normalizeForFilter, ROOM_CHAT_LIMITS, type SentMessage } from "./index";

const reason = (t: string) => {
  const v = checkChatText(t);
  return v.ok ? null : v.reason;
};

describe("normalizeForFilter", () => {
  it("joins spaced-out letters and strips punctuation", () => {
    expect(normalizeForFilter("k.y.s now").spaced).toBe("kys now");
    expect(normalizeForFilter("hey   there!!").spaced).toBe("hey thereii");
  });

  it("undoes accents, lookalikes and invisible characters", () => {
    expect(normalizeForFilter("ｆáɡ​gоt").compact).toBe("faggot"); // fullwidth f, accent, latin script g, zero-width, cyrillic о
  });
});

describe("checkChatText: content", () => {
  it.each([
    "nigger",
    "NIGGA",
    "n1gg@",
    "n i g g e r",
    "n.i.g.g.a",
    "niiiiggaaa",
    "nіgger", // cyrillic і
    "you f@g",
    "f a g g o t",
    "fa​ggot",
    "xxniggerxx",
    "stupid retard",
    "kike",
    "wetbacks",
  ])("blocks slur %j", (t) => expect(reason(t)).toBe("slur"));

  it.each(["kys", "k y s", "just kill yourself", "kill urself", "k1ll y0ur self", "go die", "neck yourself"])(
    "blocks self-harm harassment %j",
    (t) => expect(reason(t)).toBe("self_harm"),
  );

  it.each(["send nudes", "s3nd pics", "ur a slut", "wh0re", "porn"])("blocks sexual content %j", (t) =>
    expect(reason(t)).toBe("sexual"),
  );

  it.each([
    "hello neighbor",
    "that was a snigger",
    "I live in Nigeria",
    "the spicy wings are good",
    "skills, kill the boss",
    "practice that skill yourself",
    "grape juice",
    "flame retardant jacket",
    "cucumber salad",
    "I am a b",
    "die hard fan",
    "I'm at home",
    "found 1 good place to eat",
    "rent is $180",
    "I made $1,000,000 today",
    "hi. me too",
    "meet @ bar. ok",
    "see you at 10:30",
    "I love instagram lol",
    "the L train is down again",
    "Bedford Ave station is packed",
  ])("allows %j", (t) => expect(reason(t)).toBeNull());
});

describe("checkChatText: personal info", () => {
  it.each([
    "call me 718-555-1234",
    "7185551234",
    "(718) 555 1234",
    "+1 718 555 1234",
    "text 555-1234",
    "seven one eight five five five one two three four",
    "my email is jo.doe@gmail.com",
    "jo at gmail",
    "jo (at) mail (dot) com",
    "go to https://example.com",
    "www.example.com",
    "join discord.gg",
    "mysite dot com",
    "add me on snap",
    "hmu on insta",
    "snap: coolkid99",
    "ig @coolkid99",
    "whats ur snapchat",
    "whats your number",
    "i live at 123 Bedford Ave",
    "12 w 4th st",
    "apt 4b",
  ])("blocks %j", (t) => expect(reason(t)).toBe("personal_info"));
});

describe("checkChatRate", () => {
  const send = (history: SentMessage[], text: string, at: number) => checkChatRate(history, text, at, ROOM_CHAT_LIMITS);

  it("allows normal pacing", () => {
    let h: SentMessage[] = [];
    for (let i = 0; i < 10; i++) {
      const r = send(h, `message number ${i}`, i * 5_000);
      expect(r.verdict.ok).toBe(true);
      h = r.history;
    }
  });

  it("limits bursts", () => {
    let h: SentMessage[] = [];
    for (let i = 0; i < ROOM_CHAT_LIMITS.burst; i++) h = send(h, `burst ${"x".repeat(i + 1)}`, i * 100).history;
    expect(send(h, "one more please", 500).verdict).toEqual({ ok: false, reason: "rate_limited" });
    expect(send(h, "one more please", ROOM_CHAT_LIMITS.burstMs + 1_000).verdict.ok).toBe(true);
  });

  it("caps messages per minute", () => {
    let h: SentMessage[] = [];
    for (let i = 0; i < ROOM_CHAT_LIMITS.perMinute; i++) h = send(h, `minute ${"y".repeat(i + 1)}`, i * 3_000).history;
    expect(send(h, "too many now", 50_000).verdict).toEqual({ ok: false, reason: "rate_limited" });
  });

  it("blocks repeats, including disguised ones, but not short replies", () => {
    const h = send([], "buy cheap gold here", 0).history;
    expect(send(h, "BUY CHEAP GOLD HERE!!", 2_000).verdict).toEqual({ ok: false, reason: "spam" });
    expect(send(h, "buy cheap gold here", ROOM_CHAT_LIMITS.duplicateMs + 1).verdict.ok).toBe(true);
    const lol = send([], "lol", 0).history;
    expect(send(lol, "lol", 2_000).verdict.ok).toBe(true);
  });

  it("does not record refused messages", () => {
    const h = send([], "buy cheap gold here", 0).history;
    const r = send(h, "buy cheap gold here", 1_000);
    expect(r.history).toHaveLength(1);
  });
});
