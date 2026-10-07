import { NEIGHBORHOOD_MAP, ROOMS } from "./rooms";

/** Real OMNY base fare; check it against mta.info when it changes. */
export const SUBWAY_FARE = 3;
/** Real delays add at most this much to a trip (PRD §6.9). */
export const DELAY_CAP = 0.3;

export interface Route {
  from: string;
  to: string;
  lines: string[];
  transfers: number;
  baseMs: number;
}

/** Compressed ride time: a short base, plus distance on the map, plus a transfer if no line connects. */
export function route(fromRoomId: string, toRoomId: string): Route | null {
  const a = ROOMS[fromRoomId]?.station;
  const b = ROOMS[toRoomId]?.station;
  const pa = NEIGHBORHOOD_MAP[fromRoomId];
  const pb = NEIGHBORHOOD_MAP[toRoomId];
  if (!a || !b || !pa || !pb || fromRoomId === toRoomId) return null;
  const shared = a.lines.filter((l) => b.lines.includes(l));
  const transfers = shared.length ? 0 : 1;
  const dist = Math.hypot(pa.x - pb.x, pa.y - pb.y);
  const lines = shared.length ? [shared[0]!] : [a.lines[0]!, b.lines[0]!];
  return { from: fromRoomId, to: toRoomId, lines, transfers, baseMs: Math.round(25_000 + dist * 9_000 + transfers * 15_000) };
}

/** Things that happen on the train. One is picked per ride. */
export const SUBWAY_MOMENTS = [
  { id: "showtime", text: "\"SHOWTIME! What time is it?\" Three kids flip off the pole inches from your face.", tip: true },
  { id: "mariachi", text: "A mariachi trio boards at the next stop and plays like it's a wedding.", tip: true },
  { id: "seat", text: "A seat opens. You and a man with a cello lock eyes. The cello wins.", tip: false },
  { id: "snack", text: "Someone across from you is eating an entire rotisserie chicken. With confidence.", tip: false },
  { id: "preacher", text: "A preacher in the middle car reminds everyone the end is near. The F agrees.", tip: false },
  { id: "candy", text: "\"Candy, candy, candy! Churros, churros!\" You consider it.", tip: true },
  { id: "announcement", text: "The announcement is pure static. Everyone looks at each other. Nobody knows.", tip: false },
] as const;
