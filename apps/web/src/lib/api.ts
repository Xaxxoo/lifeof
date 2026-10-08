import type { CharacterDoc, CityStateDoc, GigOffer, LedgerEntryDoc, MessageDoc, Occupant, PlacedObjectDoc } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const JWT_KEY = "nyl_jwt";

function getJwt(): string | null {
  try {
    return localStorage.getItem(JWT_KEY);
  } catch {
    return null;
  }
}

function setJwt(token: string) {
  try {
    localStorage.setItem(JWT_KEY, token);
  } catch {
    // private browsing
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const jwt = getJwt();
  if (jwt) headers["Authorization"] = `Bearer ${jwt}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let msg = "Something went wrong";
    try {
      const json = await res.json();
      msg = json.message ?? msg;
    } catch {
      // non-JSON error body
    }
    throw new Error(msg);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : (null as T);
}

function clearJwt() {
  try { localStorage.removeItem(JWT_KEY); } catch { /* */ }
}

/** Ensure a valid guest JWT exists; create one if missing or expired. */
export async function initSession(): Promise<void> {
  if (getJwt()) {
    // Validate the existing JWT with a lightweight call
    try {
      await request<unknown>("GET", "/characters/me");
      return;
    } catch {
      clearJwt();
    }
  }
  const data = await request<{ jwt: string }>("POST", "/auth/guest");
  setJwt(data.jwt);
}

export const api = {
  // Characters
  me: () => request<CharacterDoc | null>("GET", "/characters/me"),
  createCharacter: async (body: { name: string; origin: string; status: string; trait: string; gender: string; sexuality: string; look: unknown }) => {
    const data = await request<{ character: CharacterDoc; jwt: string }>("POST", "/characters", body);
    setJwt(data.jwt);
    return data;
  },

  // World
  join: () => request<{ serverNow: number; roomId: string }>("POST", "/world/join"),
  move: (target: { x: number; y: number }) => request<void>("POST", "/world/move", { target }),
  heartbeat: () => request<void>("POST", "/world/heartbeat"),
  leave: () => request<void>("POST", "/world/leave"),
  occupants: (roomId: string) => request<Occupant[]>("GET", `/world/occupants/${encodeURIComponent(roomId)}`),
  objects: (roomId: string) => request<PlacedObjectDoc[]>("GET", `/world/objects/${encodeURIComponent(roomId)}`),
  whereAmI: () => request<{ roomId: string }>("GET", "/world/where-am-i"),

  // Play
  startActivity: (body: { target: string; actionId: string; dest?: string }) =>
    request<{ trainDelayed?: boolean }>("POST", "/play/start", body),
  stopActivity: () => request<void>("POST", "/play/stop"),
  finishActivity: () => request<void>("POST", "/play/finish"),

  // Gigs
  gigOffers: (window: number) => request<GigOffer[]>("GET", `/gigs/offers?window=${window}`),
  acceptGig: (offerId: string) => request<void>("POST", "/gigs/accept", { offerId }),
  cancelGig: () => request<void>("POST", "/gigs/cancel"),

  // Work
  applyJob: (careerId: string) => request<string>("POST", "/work/apply", { careerId }),
  quitJob: () => request<void>("POST", "/work/quit"),

  // Bank
  ledger: () => request<LedgerEntryDoc[]>("GET", "/bank/ledger"),
  payRent: () => request<void>("POST", "/bank/pay-rent"),

  // Build
  buyItem: (body: { itemId: string; x: number; y: number; rot: number; requestId: string }) =>
    request<void>("POST", "/build/buy", body),
  sellItem: (objectId: string) => request<{ refund?: number }>("POST", "/build/sell", { objectId }),
  placeItem: (body: { itemId: string; x: number; y: number; rot: number; requestId: string }) =>
    request<void>("POST", "/build/place", body),
  moveItem: (body: { objectId: string; x: number; y: number; rot: number }) =>
    request<void>("POST", "/build/move", body),

  // City
  city: () => request<CityStateDoc>("GET", "/city"),

  // Chat
  sendChat: (body: { roomId: string; body: string }) => request<void>("POST", "/chat/send", body),
  recentChat: (roomId: string) => request<MessageDoc[]>("GET", `/chat/${encodeURIComponent(roomId)}`),

  // Transit
  transitTip: () => request<void>("POST", "/transit/tip"),
};
