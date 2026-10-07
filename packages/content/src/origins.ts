/** Launch origins (PRD §6.2). Copy for each origin is reviewed by someone from that place before release. */
export const ORIGINS = [
  {
    id: "lagos",
    name: "Lagos, Nigeria",
    perk: "+20% Hustle skill gain",
    anchor: "Nigerian church and jollof spot in Flatbush",
  },
  {
    id: "accra",
    name: "Accra, Ghana",
    perk: "+15% Social from group hangs",
    anchor: "Ghanaian shop in Crown Heights",
  },
  {
    id: "kingston",
    name: "Kingston, Jamaica",
    perk: "+20% Cooking skill gain",
    anchor: "Patty shop and sound system on Flatbush Ave",
  },
  {
    id: "santo-domingo",
    name: "Santo Domingo, DR",
    perk: "+15% Fun from music and dancing",
    anchor: "Bodega and barbershop in Bushwick",
  },
  {
    id: "dhaka",
    name: "Dhaka, Bangladesh",
    perk: "+20% Coding skill gain",
    anchor: "Grocery and mosque in Kensington",
  },
  {
    id: "ohio",
    name: "Small-town Ohio, USA",
    perk: "Starts with $1,000 extra, no community anchor",
    anchor: "None: build a network from zero",
  },
] as const;

export type OriginId = (typeof ORIGINS)[number]["id"];
export const ORIGIN_IDS = ORIGINS.map((o) => o.id) as [OriginId, ...OriginId[]];
