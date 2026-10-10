export interface StoryChapterDef {
  id: string;
  title: string;
  origin: string;
  chapter: number;
  unlockLevel: string;
  scenes: { speaker: string; text: string }[];
  reward: { cash?: number; moodlet?: { id: string; label: string; value: number; hours: number } };
}

export const STORY_CHAPTERS: StoryChapterDef[] = [
  // Lagos arc
  {
    id: "lagos-1",
    title: "The Call Home",
    origin: "lagos",
    chapter: 1,
    unlockLevel: "stranger",
    scenes: [
      { speaker: "You", text: "The phone rings at 3 AM. It's Mama." },
      { speaker: "Mama", text: "How is America? Are you eating?" },
      { speaker: "You", text: "I'm fine, Mama. Brooklyn is... big." },
      { speaker: "Mama", text: "Don't forget who you are. Send money when you can." },
      { speaker: "You", text: "I won't forget. I promise." },
    ],
    reward: { cash: 10, moodlet: { id: "called-lagos", label: "Mama's voice", value: 8, hours: 4 } },
  },
  {
    id: "lagos-2",
    title: "The Hustle",
    origin: "lagos",
    chapter: 2,
    unlockLevel: "acquaintance",
    scenes: [
      { speaker: "You", text: "I need to find work. Real work." },
      { speaker: "Marcus", text: "You just got here? Everyone starts at the bottom, my guy." },
      { speaker: "You", text: "In Lagos I was running things. Here I'm invisible." },
      { speaker: "Marcus", text: "Invisible means nobody's watching. That's freedom." },
      { speaker: "You", text: "I never thought of it that way." },
    ],
    reward: { cash: 25 },
  },
  {
    id: "lagos-3",
    title: "Finding Your Spot",
    origin: "lagos",
    chapter: 3,
    unlockLevel: "friend",
    scenes: [
      { speaker: "You", text: "This jollof spot on Flatbush... it tastes like home." },
      { speaker: "Mama Rose", text: "You're Nigerian? I can tell by how you eat." },
      { speaker: "You", text: "Lagos born and raised." },
      { speaker: "Mama Rose", text: "Come back anytime. This is your spot now." },
    ],
    reward: { cash: 15, moodlet: { id: "found-spot", label: "Found your spot", value: 10, hours: 6 } },
  },
  {
    id: "lagos-4",
    title: "The Letter",
    origin: "lagos",
    chapter: 4,
    unlockLevel: "close",
    scenes: [
      { speaker: "You", text: "A letter from my brother. He wants to come too." },
      { speaker: "You", text: "How do I tell him it's not what he thinks?" },
      { speaker: "You", text: "That the streets are cold and the rent is cruel?" },
      { speaker: "You", text: "But also... that I'm starting to find my way." },
    ],
    reward: { cash: 50 },
  },
  {
    id: "lagos-5",
    title: "Making It",
    origin: "lagos",
    chapter: 5,
    unlockLevel: "day-one",
    scenes: [
      { speaker: "Mama", text: "Your father would be proud." },
      { speaker: "You", text: "I'm not done yet, Mama. This is just the beginning." },
      { speaker: "You", text: "Brooklyn didn't make it easy. But it made me better." },
      { speaker: "You", text: "Lagos raised me. Brooklyn is raising me again." },
    ],
    reward: { cash: 100, moodlet: { id: "made-it", label: "Making it", value: 15, hours: 12 } },
  },

  // Kingston arc
  {
    id: "kingston-1",
    title: "The Yard",
    origin: "kingston",
    chapter: 1,
    unlockLevel: "stranger",
    scenes: [
      { speaker: "You", text: "Crown Heights smells like home. Patties and exhaust." },
      { speaker: "Auntie Grace", text: "You from yard? Which part?" },
      { speaker: "You", text: "Kingston. Trench Town side." },
      { speaker: "Auntie Grace", text: "Lawd. Come eat something. You look mawga." },
    ],
    reward: { cash: 10, moodlet: { id: "yard-vibes", label: "Yard vibes", value: 8, hours: 4 } },
  },
  {
    id: "kingston-2",
    title: "The Kitchen",
    origin: "kingston",
    chapter: 2,
    unlockLevel: "acquaintance",
    scenes: [
      { speaker: "You", text: "The restaurant kitchen is hot. Hotter than Kingston in August." },
      { speaker: "Chef", text: "You know how to cook?" },
      { speaker: "You", text: "My grandmother taught me. Ackee and saltfish, oxtail, everything." },
      { speaker: "Chef", text: "Show me what you got." },
    ],
    reward: { cash: 25 },
  },
  {
    id: "kingston-3",
    title: "Reggae Night",
    origin: "kingston",
    chapter: 3,
    unlockLevel: "friend",
    scenes: [
      { speaker: "You", text: "Sound system in Flatbush. Feels like Passa Passa." },
      { speaker: "DJ", text: "Request?" },
      { speaker: "You", text: "Anything Beres Hammond." },
      { speaker: "DJ", text: "Say no more, selector." },
      { speaker: "You", text: "For a moment, I'm back on Orange Street." },
    ],
    reward: { cash: 15, moodlet: { id: "reggae-night", label: "Reggae night", value: 10, hours: 6 } },
  },
  {
    id: "kingston-4",
    title: "Island in Brooklyn",
    origin: "kingston",
    chapter: 4,
    unlockLevel: "close",
    scenes: [
      { speaker: "You", text: "Labor Day Parade on Eastern Parkway." },
      { speaker: "You", text: "The music. The flags. The food." },
      { speaker: "You", text: "All these islands, all in one street." },
      { speaker: "You", text: "Maybe Brooklyn IS an island." },
    ],
    reward: { cash: 50 },
  },
  {
    id: "kingston-5",
    title: "Home Two",
    origin: "kingston",
    chapter: 5,
    unlockLevel: "day-one",
    scenes: [
      { speaker: "Grandma", text: "You nah come back?" },
      { speaker: "You", text: "I am back, Grandma. Every day. In everything I cook." },
      { speaker: "You", text: "Kingston is where I'm from. Brooklyn is where I'm going." },
      { speaker: "You", text: "Two homes. One heart." },
    ],
    reward: { cash: 100, moodlet: { id: "home-two", label: "Two homes, one heart", value: 15, hours: 12 } },
  },

  // Accra arc
  {
    id: "accra-1",
    title: "Mama's Shop",
    origin: "accra",
    chapter: 1,
    unlockLevel: "stranger",
    scenes: [
      { speaker: "You", text: "The shop on Nostrand Avenue. It smells like Makola Market." },
      { speaker: "Auntie Grace", text: "You are Ghanaian? Come, come!" },
      { speaker: "You", text: "From Accra. Osu." },
      { speaker: "Auntie Grace", text: "I knew it. I can see it in your face. Welcome home." },
    ],
    reward: { cash: 10, moodlet: { id: "accra-welcome", label: "Akwaaba", value: 8, hours: 4 } },
  },
  {
    id: "accra-2",
    title: "Sunday Best",
    origin: "accra",
    chapter: 2,
    unlockLevel: "acquaintance",
    scenes: [
      { speaker: "You", text: "The church choir sounds like Hillsong Accra." },
      { speaker: "Brother James", text: "You sing?" },
      { speaker: "You", text: "Only when nobody's listening." },
      { speaker: "Brother James", text: "God is always listening. And He likes what He hears." },
    ],
    reward: { cash: 25 },
  },
  {
    id: "accra-3",
    title: "The Funeral Call",
    origin: "accra",
    chapter: 3,
    unlockLevel: "friend",
    scenes: [
      { speaker: "Mama", text: "Uncle Kwame has passed." },
      { speaker: "You", text: "I... I can't come home for the funeral." },
      { speaker: "Mama", text: "I know. Send what you can for the cloth." },
      { speaker: "You", text: "I'm sorry, Mama. I'm so sorry." },
    ],
    reward: { cash: 15, moodlet: { id: "funeral-call", label: "Missing home", value: -5, hours: 6 } },
  },
  {
    id: "accra-4",
    title: "Market Day",
    origin: "accra",
    chapter: 4,
    unlockLevel: "close",
    scenes: [
      { speaker: "You", text: "Saturday market in Crown Heights." },
      { speaker: "You", text: "Plantain, yam, palm oil. All here." },
      { speaker: "You", text: "The old woman selling kenkey doesn't speak English." },
      { speaker: "You", text: "But when I speak Twi, her whole face lights up." },
    ],
    reward: { cash: 50 },
  },
  {
    id: "accra-5",
    title: "Roots",
    origin: "accra",
    chapter: 5,
    unlockLevel: "day-one",
    scenes: [
      { speaker: "You", text: "They ask me where I'm from." },
      { speaker: "You", text: "I used to say Accra. Then Brooklyn. Now I say both." },
      { speaker: "You", text: "The kente cloth Mama sent hangs on my wall." },
      { speaker: "You", text: "These roots don't break. They just grow longer." },
    ],
    reward: { cash: 100, moodlet: { id: "roots", label: "Deep roots", value: 15, hours: 12 } },
  },
];

export const STORY_CHAPTER_BY_ID: Record<string, StoryChapterDef> = Object.fromEntries(
  STORY_CHAPTERS.map((c) => [c.id, c]),
);

export const STORY_ORIGINS = ["lagos", "kingston", "accra"] as const;
export type StoryOrigin = (typeof STORY_ORIGINS)[number];
