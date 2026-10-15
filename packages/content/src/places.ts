import { baseRoomId, ROOMS } from "./rooms";

/**
 * Real places in the game: every spot a brand campaign, an order or a booking can point at.
 * Each one is a prop on a block (`roomId` + `target`), so a hunt clue sends players somewhere they can walk to.
 *
 * `real: true` means the in-game name is a real business or landmark at that address.
 * `real: false` is an open storefront: a generic shop a partner (a barber, a salon, a restaurant) can take over
 * and brand. Addresses are for display; confirm them with the partner before a campaign goes live.
 */
export type PlaceCategory =
  | "eatery"
  | "cafe"
  | "bar"
  | "barber"
  | "salon"
  | "court"
  | "venue"
  | "shop"
  | "library"
  | "landmark"
  | "park";

/** What players will be able to do there with a partner: order food, book a chair. */
export type PlaceService = "order" | "book";

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  /** The street block or park the place sits on. */
  roomId: string;
  /** Interactable key on that block, e.g. `prop:pizza`. */
  target: string;
  real: boolean;
  address?: string;
  services?: PlaceService[];
}

export const PLACES: Place[] = [
  // Crown Heights · Nostrand Ave
  { id: "allans-bakery", name: "Allan's Bakery", category: "eatery", roomId: "crown-heights", target: "prop:patty", real: true, address: "1109 Nostrand Ave", services: ["order"] },
  { id: "ghanaian-shop", name: "Ghanaian shop", category: "eatery", roomId: "crown-heights", target: "prop:ghana-shop", real: false, services: ["order"] },
  { id: "gees-caribbean", name: "Gee's Caribbean", category: "eatery", roomId: "crown-heights", target: "prop:gees", real: false, services: ["order"] },
  { id: "first-baptist-crown-heights", name: "First Baptist Church of Crown Heights", category: "landmark", roomId: "crown-heights", target: "prop:church-hall", real: true },
  { id: "crown-heights-library", name: "Crown Heights Library", category: "library", roomId: "crown-heights", target: "prop:library", real: true, address: "560 New York Ave" },

  // Bushwick · Knickerbocker Ave
  { id: "bushwick-bodega", name: "Bodega 24/7", category: "eatery", roomId: "bushwick-block", target: "prop:bodega", real: false, services: ["order"] },
  { id: "house-of-yes", name: "House of Yes", category: "venue", roomId: "bushwick-block", target: "prop:warehouse", real: true, address: "2 Wyckoff Ave" },
  { id: "bushwick-barbershop", name: "Barbershop", category: "barber", roomId: "bushwick-block", target: "prop:barber", real: false, services: ["book"] },
  { id: "bushwick-laundromat", name: "Laundromat", category: "shop", roomId: "bushwick-block", target: "prop:laundromat", real: false },
  { id: "bushwick-library", name: "Bushwick Library", category: "library", roomId: "bushwick-block", target: "prop:library", real: true, address: "340 Bushwick Ave" },
  { id: "st-barbaras", name: "St. Barbara's Church", category: "landmark", roomId: "bushwick-block", target: "prop:church", real: true },
  { id: "maria-hernandez-courts", name: "Maria Hernandez Park courts", category: "court", roomId: "bushwick-block", target: "prop:court", real: true, address: "Knickerbocker Ave & Suydam St" },

  // Bed-Stuy · Halsey St
  { id: "peaches-hothouse", name: "Peaches HotHouse", category: "eatery", roomId: "bed-stuy", target: "prop:soulfood", real: true, address: "415 Tompkins Ave", services: ["order"] },
  { id: "hattie-carthan-garden", name: "Hattie Carthan Garden", category: "park", roomId: "bed-stuy", target: "prop:garden", real: true },
  { id: "concord-baptist", name: "Concord Baptist Church", category: "landmark", roomId: "bed-stuy", target: "prop:concord", real: true },
  { id: "sugar-hill", name: "Sugar Hill Supper Club", category: "venue", roomId: "bed-stuy", target: "prop:sugarhill", real: true },

  // Flatbush · Flatbush Ave
  { id: "flatbush-jollof", name: "Jollof spot", category: "eatery", roomId: "flatbush", target: "prop:jollof", real: false, services: ["order"] },
  { id: "flatbush-soundsystem", name: "Sound system bar", category: "bar", roomId: "flatbush", target: "prop:soundsystem", real: false },
  { id: "flatbush-braiding", name: "Braiding salon", category: "salon", roomId: "flatbush", target: "prop:salon", real: false, services: ["book"] },
  { id: "flatbush-99c", name: "99¢ store", category: "shop", roomId: "flatbush", target: "prop:dollar", real: false },
  { id: "flatbush-dutch-church", name: "Flatbush Reformed Dutch Church", category: "landmark", roomId: "flatbush", target: "prop:dutch-church", real: true, address: "890 Flatbush Ave" },
  { id: "kings-theatre", name: "Kings Theatre", category: "venue", roomId: "flatbush", target: "prop:kings", real: true, address: "1027 Flatbush Ave" },

  // Williamsburg · Bedford Ave
  { id: "devocion", name: "Devoción", category: "cafe", roomId: "williamsburg", target: "prop:cafe", real: true, address: "69 Grand St", services: ["order"] },
  { id: "williamsburg-records", name: "Record store", category: "shop", roomId: "williamsburg", target: "prop:records", real: false },
  { id: "westlight", name: "Westlight", category: "bar", roomId: "williamsburg", target: "prop:rooftop", real: true, address: "111 N 12th St" },
  { id: "williamsburg-gym", name: "Boutique gym", category: "shop", roomId: "williamsburg", target: "prop:gym", real: false, services: ["book"] },
  { id: "brooklyn-bowl", name: "Brooklyn Bowl", category: "venue", roomId: "williamsburg", target: "prop:bowl", real: true, address: "61 Wythe Ave" },
  { id: "williamsburgh-library", name: "Williamsburgh Library", category: "library", roomId: "williamsburg", target: "prop:library", real: true, address: "240 Division Ave" },

  // DUMBO · Washington St
  { id: "smack-mellon", name: "Smack Mellon", category: "landmark", roomId: "dumbo", target: "prop:gallery", real: true, address: "92 Plymouth St" },
  { id: "grimaldis", name: "Grimaldi's", category: "eatery", roomId: "dumbo", target: "prop:pizza", real: true, address: "1 Front St", services: ["order"] },
  { id: "brooklyn-heights-library", name: "Brooklyn Heights Library", category: "library", roomId: "dumbo", target: "prop:library", real: true },
  { id: "clock-tower", name: "The Clock Tower", category: "landmark", roomId: "dumbo", target: "prop:tower", real: true },
  { id: "st-anns-warehouse", name: "St. Ann's Warehouse", category: "venue", roomId: "dumbo", target: "prop:st-anns", real: true, address: "45 Water St" },
  { id: "manhattan-bridge-view", name: "Manhattan Bridge view", category: "landmark", roomId: "dumbo", target: "prop:photo", real: true, address: "Washington St & Water St" },

  // Prospect Park
  { id: "long-meadow", name: "Long Meadow", category: "park", roomId: "prospect-park", target: "prop:lawn", real: true },
  { id: "drummers-grove", name: "Drummer's Grove", category: "park", roomId: "prospect-park", target: "prop:drums", real: true },
  { id: "grand-army-greenmarket", name: "Grand Army Plaza Greenmarket", category: "eatery", roomId: "prospect-park", target: "prop:market", real: true },
  { id: "parade-ground-courts", name: "Parade Ground courts", category: "court", roomId: "prospect-park", target: "prop:court", real: true },
];

export const PLACE_BY_ID: Record<string, Place> = Object.fromEntries(PLACES.map((p) => [p.id, p]));

/** The place at a tapped thing, if it is one. Venue instances (`venue:x:2`) resolve to their base room. */
export function placeAt(roomId: string, target: string): Place | undefined {
  const base = baseRoomId(roomId);
  return PLACES.find((p) => p.roomId === base && p.target === target);
}

/** The prop a place points at, for checks and labels. */
export function placeProp(place: Place) {
  return ROOMS[place.roomId]?.props.find((p) => `prop:${p.id}` === place.target);
}
