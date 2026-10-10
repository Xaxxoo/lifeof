import type {
  ApplicationDoc,
  BlockedPlayerDoc,
  BuildOp,
  CharacterDoc,
  CityStateDoc,
  CrewDoc,
  DirectMessageDoc,
  DmThreadDoc,
  GigOffer,
  HomeDoc,
  HomesMine,
  LeaseDoc,
  LedgerEntryDoc,
  ListingDoc,
  MessageDoc,
  Occupant,
  PlacedObjectDoc,
  QuestProgressDoc,
  RelationshipDoc,
  SocialInteractionResult,
  StoryChapterDoc,
} from "./types";

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

  // Nest sends an empty body for a null result; usePolling reads undefined as "still loading".
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
    request<{ trainDelayed?: boolean; startsAt: number; arrival: number }>("POST", "/play/start", body),
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

  // Homes
  homesMine: () => request<HomesMine>("GET", "/homes/mine"),
  homeLayout: (homeId: string) => request<HomeDoc>("GET", `/homes/layout/${encodeURIComponent(homeId)}`),
  rentHome: (tierId: string) => request<{ homeId: string; refunded: number }>("POST", "/homes/rent", { tierId }),
  buyLot: (lotId: string) => request<HomeDoc>("POST", "/homes/buy-lot", { lotId }),
  moveIntoHome: (homeId: string) => request<{ homeId: string; refunded: number }>("POST", "/homes/move-in", { homeId }),
  visitHome: (homeId: string) => request<{ roomId: string }>("POST", "/homes/visit", { homeId }),
  paintWalls: (paintId: string) => request<void>("POST", "/homes/paint", { paintId }),
  layFloor: (floorId: string) => request<void>("POST", "/homes/floor", { floorId }),
  unlockFloor: (floorId: string) => request<void>("POST", "/homes/unlock-floor", { floorId }),
  build: (ops: BuildOp[]) => request<{ cost: number; refund: number }>("POST", "/homes/build", { ops }),

  // City
  city: () => request<CityStateDoc>("GET", "/city"),

  // Chat
  sendChat: (body: { roomId: string; body: string }) => request<void>("POST", "/chat/send", body),
  recentChat: (roomId: string) => request<MessageDoc[]>("GET", `/chat/${encodeURIComponent(roomId)}`),

  // Transit
  transitTip: () => request<void>("POST", "/transit/tip"),

  // Stellar
  stellarWallet: () => request<import("./types").StellarWalletDoc | null>("GET", "/stellar/wallet"),
  createStellarWallet: () => request<import("./types").StellarWalletDoc>("POST", "/stellar/wallet"),
  retryStellarFunding: () => request<import("./types").StellarWalletDoc>("POST", "/stellar/wallet/retry-funding"),
  setStellarExternalAddress: (address: string) => request<void>("POST", "/stellar/external-address", { address }),
  stellarWithdraw: (body: { amount: number; requestId: string }) => request<{ txHash: string }>("POST", "/stellar/withdraw", body),
  stellarBalance: () => request<{ xlm: string; usdt: string }>("GET", "/stellar/balance"),

  // Social
  interact: (targetId: string, interactionId: string) =>
    request<SocialInteractionResult>("POST", "/social/interact", { targetId, interactionId }),
  friends: () => request<RelationshipDoc[]>("GET", "/social/friends"),
  relationship: (targetId: string) =>
    request<RelationshipDoc>("GET", `/social/relationship/${encodeURIComponent(targetId)}`),
  blockPlayer: (targetId: string) => request<void>("POST", "/social/block", { targetId }),
  unblockPlayer: (targetId: string) => request<void>("POST", "/social/unblock", { targetId }),
  reportPlayer: (body: { targetId: string; reason: string; detail?: string; messageId?: string }) =>
    request<void>("POST", "/social/report", body),
  blockedList: () => request<BlockedPlayerDoc[]>("GET", "/social/blocked"),

  // DMs
  sendDm: (recipientId: string, body: string) =>
    request<DirectMessageDoc>("POST", "/dm/send", { recipientId, body }),
  dmThreads: () => request<DmThreadDoc[]>("GET", "/dm/threads"),
  dmConversation: (partnerId: string, before?: string) =>
    request<DirectMessageDoc[]>("GET", `/dm/conversation/${encodeURIComponent(partnerId)}${before ? `?before=${before}` : ""}`),
  markDmRead: (partnerId: string) => request<void>("POST", `/dm/read/${encodeURIComponent(partnerId)}`),
  dmUnreadCount: () => request<{ count: number }>("GET", "/dm/unread-count"),

  // Crews
  createCrew: (name: string) => request<CrewDoc>("POST", "/crews", { name }),
  inviteToCrew: (targetId: string) => request<void>("POST", "/crews/invite", { targetId }),
  joinCrew: (crewId: string) => request<void>("POST", "/crews/join", { crewId }),
  leaveCrew: () => request<void>("POST", "/crews/leave"),
  kickFromCrew: (memberId: string) => request<void>("POST", "/crews/kick", { memberId }),
  disbandCrew: () => request<void>("POST", "/crews/disband"),
  myCrew: () => request<CrewDoc | null>("GET", "/crews/mine"),
  setCrewGoal: (goalId: string) => request<void>("POST", "/crews/goal", { goalId }),

  // Listings / Housing Market
  createListing: (body: { homeId: string; kind: string; rentPerWeek: number; description?: string }) =>
    request<ListingDoc>("POST", "/listings", body),
  browseListings: (params?: { kind?: string; maxRent?: number }) => {
    const qs = new URLSearchParams();
    if (params?.kind) qs.set("kind", params.kind);
    if (params?.maxRent) qs.set("maxRent", String(params.maxRent));
    const q = qs.toString();
    return request<ListingDoc[]>("GET", `/listings${q ? `?${q}` : ""}`);
  },
  applyToListing: (listingId: string, message?: string) =>
    request<ApplicationDoc>("POST", `/listings/${encodeURIComponent(listingId)}/apply`, { message }),
  myApplications: () => request<ApplicationDoc[]>("GET", "/listings/my-applications"),
  listingApplications: (listingId: string) =>
    request<ApplicationDoc[]>("GET", `/listings/${encodeURIComponent(listingId)}/applications`),
  acceptApplication: (applicationId: string) =>
    request<LeaseDoc>("POST", "/listings/accept", { applicationId }),
  rejectApplication: (applicationId: string) =>
    request<void>("POST", "/listings/reject", { applicationId }),
  closeListing: (listingId: string) =>
    request<void>("POST", `/listings/${encodeURIComponent(listingId)}/close`),
  terminateLease: (leaseId: string) =>
    request<void>("POST", `/leases/${encodeURIComponent(leaseId)}/terminate`),
  myLeases: () => request<LeaseDoc[]>("GET", "/leases/mine"),

  // Quests
  questProgress: () => request<QuestProgressDoc | null>("GET", "/quests/progress"),

  // Stories
  availableChapters: () => request<StoryChapterDoc[]>("GET", "/stories/available"),
  startChapter: (chapterId: string) => request<StoryChapterDoc>("POST", "/stories/start", { chapterId }),
  completeChapter: (chapterId: string) => request<{ reward: unknown }>("POST", "/stories/complete", { chapterId }),
};
