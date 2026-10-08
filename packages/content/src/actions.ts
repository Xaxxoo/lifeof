import type { Needs, SkillKey } from "@nyl/game-core";

/**
 * Everything a player can do by tapping an object (PRD §5, §6). Durations are real time and kept short
 * (5–45 s) so the game stays snappy.
 * `needs` are the totals for a full run; stopping early pays the share done.
 */
export type ActionKind = "use" | "travel" | "work" | "ride";

export interface ActionDef {
  id: string;
  label: string;
  kind: ActionKind;
  durationMs: number;
  needs?: Partial<Needs>;
  cost?: number;
  skill?: { key: SkillKey; xp: number };
  moodlet?: { id: string; label: string; value: number; hours: number };
  /** Pose while doing it. */
  pose?: "stand" | "sit" | "sleep";
  /** Shown as a speech-bubble-style status above the avatar. */
  status: string;
  /** Minimum skill level to do it. */
  requires?: { key: SkillKey; level: number };
}

const SEC = 1000;

export const ACTIONS: Record<string, ActionDef> = {
  // Home
  sleep: { id: "sleep", label: "Sleep", kind: "use", durationMs: 45 * SEC, needs: { energy: 100 }, pose: "sleep", status: "Sleeping 💤",
    moodlet: { id: "rested", label: "Well rested", value: 8, hours: 4 } },
  nap: { id: "nap", label: "Nap", kind: "use", durationMs: 20 * SEC, needs: { energy: 30 }, pose: "sleep", status: "Napping 😴" },
  eat_leftovers: { id: "eat_leftovers", label: "Eat leftovers", kind: "use", durationMs: 8 * SEC, needs: { hunger: 35 }, cost: 4, pose: "stand", status: "Eating leftovers 🍱" },
  cook: { id: "cook", label: "Cook a meal", kind: "use", durationMs: 15 * SEC, needs: { hunger: 70, fun: 5 }, cost: 6, pose: "stand", status: "Cooking 🍳",
    skill: { key: "cooking", xp: 25 }, moodlet: { id: "home-cooked", label: "Home-cooked meal", value: 6, hours: 3 } },
  shower: { id: "shower", label: "Shower", kind: "use", durationMs: 8 * SEC, needs: { hygiene: 100 }, pose: "stand", status: "Showering 🚿" },
  toilet: { id: "toilet", label: "Use the toilet", kind: "use", durationMs: 5 * SEC, needs: { bladder: 100 }, pose: "sit", status: "Busy 🚽" },
  watch_tv: { id: "watch_tv", label: "Watch TV", kind: "use", durationMs: 15 * SEC, needs: { fun: 40 }, pose: "sit", status: "Watching TV 📺" },
  lounge: { id: "lounge", label: "Lounge", kind: "use", durationMs: 8 * SEC, needs: { fun: 10, energy: 8 }, pose: "sit", status: "Lounging 🛋️" },
  practice_charisma: { id: "practice_charisma", label: "Practice a speech", kind: "use", durationMs: 12 * SEC, needs: { fun: 8 }, pose: "stand",
    status: "Practicing 🗣️", skill: { key: "charisma", xp: 20 } },
  study_coding: { id: "study_coding", label: "Learn to code", kind: "use", durationMs: 15 * SEC, needs: { fun: 5, energy: -8 }, pose: "sit",
    status: "Coding 💻", skill: { key: "coding", xp: 25 } },
  play_guitar: { id: "play_guitar", label: "Play guitar", kind: "use", durationMs: 12 * SEC, needs: { fun: 30 }, pose: "sit",
    status: "Playing guitar 🎸", skill: { key: "creativity", xp: 20 } },
  work_out: { id: "work_out", label: "Work out", kind: "use", durationMs: 12 * SEC, needs: { energy: -15, hygiene: -15, fun: 10 }, pose: "stand",
    status: "Working out 💪", skill: { key: "fitness", xp: 25 } },
  take_bath: { id: "take_bath", label: "Take a bath", kind: "use", durationMs: 15 * SEC, needs: { hygiene: 100, fun: 15 }, pose: "sit", status: "Bubble bath 🛁",
    moodlet: { id: "bath", label: "Long soak", value: 5, hours: 2 } },
  play_games: { id: "play_games", label: "Play video games", kind: "use", durationMs: 15 * SEC, needs: { fun: 45, energy: -5 }, pose: "sit", status: "Gaming 🎮" },
  listen_records: { id: "listen_records", label: "Put on a record", kind: "use", durationMs: 12 * SEC, needs: { fun: 25 }, pose: "stand", status: "Vibing 🎶",
    skill: { key: "creativity", xp: 8 } },
  paint_canvas: { id: "paint_canvas", label: "Paint", kind: "use", durationMs: 15 * SEC, needs: { fun: 20 }, pose: "stand", status: "Painting 🎨",
    skill: { key: "creativity", xp: 22 } },
  play_piano: { id: "play_piano", label: "Play piano", kind: "use", durationMs: 15 * SEC, needs: { fun: 30 }, pose: "sit", status: "Playing piano 🎹",
    skill: { key: "creativity", xp: 30 } },
  yoga: { id: "yoga", label: "Do yoga", kind: "use", durationMs: 12 * SEC, needs: { fun: 10, energy: 5 }, pose: "stand", status: "Downward dog 🧘🏾",
    skill: { key: "fitness", xp: 18 } },
  read_home: { id: "read_home", label: "Read a book", kind: "use", durationMs: 10 * SEC, needs: { fun: 15 }, pose: "stand", status: "Reading 📖",
    skill: { key: "charisma", xp: 8 } },
  go_out: { id: "go_out", label: "Go outside", kind: "travel", durationMs: 0, status: "" },

  // Street
  go_home: { id: "go_home", label: "Go home", kind: "travel", durationMs: 0, status: "" },
  bodega_bec: { id: "bodega_bec", label: "Bacon, egg & cheese ($6)", kind: "use", durationMs: 8 * SEC, needs: { hunger: 40 }, cost: 6, pose: "stand",
    status: "Chopping a BEC 🥪", moodlet: { id: "bodega-cat", label: "Bodega cat sat on you", value: 5, hours: 1 } },
  bodega_coffee: { id: "bodega_coffee", label: "Coffee ($3)", kind: "use", durationMs: 5 * SEC, needs: { energy: 15 }, cost: 3, pose: "stand", status: "Coffee ☕" },
  halal: { id: "halal", label: "Chicken over rice ($10)", kind: "use", durationMs: 10 * SEC, needs: { hunger: 65 }, cost: 10, pose: "stand",
    status: "White sauce, hot sauce 🍗" },
  laundry: { id: "laundry", label: "Wash clothes ($5)", kind: "use", durationMs: 12 * SEC, needs: { hygiene: 30 }, cost: 5, pose: "sit", status: "Laundry 🧺" },
  haircut: { id: "haircut", label: "Get a lineup ($20)", kind: "use", durationMs: 15 * SEC, needs: { hygiene: 15, social: 20 }, cost: 20, pose: "sit",
    status: "Getting a lineup 💈", moodlet: { id: "fresh-cut", label: "Fresh cut", value: 10, hours: 6 } },
  people_watch: { id: "people_watch", label: "Sit and people-watch", kind: "use", durationMs: 10 * SEC, needs: { fun: 12, social: 6 }, pose: "sit",
    status: "People-watching 👀" },
  go_to_work: { id: "go_to_work", label: "Take the L to work", kind: "work", durationMs: 0, status: "" },

  // M2: neighborhoods
  ride_subway: { id: "ride_subway", label: "Ride the subway", kind: "ride", durationMs: 0, status: "On the train 🚇" },
  enter_venue: { id: "enter_venue", label: "Go inside", kind: "travel", durationMs: 0, status: "" },
  patty: { id: "patty", label: "Beef patty + coco bread ($5)", kind: "use", durationMs: 8 * SEC, needs: { hunger: 35 }, cost: 5, pose: "stand", status: "Eating a patty 🥟" },
  roti: { id: "roti", label: "Buss-up shut roti ($13)", kind: "use", durationMs: 10 * SEC, needs: { hunger: 65 }, cost: 13, pose: "stand", status: "Roti 🫓" },
  church_service: { id: "church_service", label: "Go to the service", kind: "use", durationMs: 20 * SEC, needs: { social: 30, fun: 15 }, pose: "sit",
    status: "In church 🙏🏾", moodlet: { id: "uplifted", label: "Uplifted", value: 6, hours: 4 } },
  see_show: { id: "see_show", label: "See tonight's show ($35)", kind: "use", durationMs: 25 * SEC, needs: { fun: 60, social: 10 }, cost: 35, pose: "sit",
    status: "At the show 🎭", moodlet: { id: "great-show", label: "Saw a great show", value: 8, hours: 4 } },
  bowl: { id: "bowl", label: "Bowl a game ($20)", kind: "use", durationMs: 15 * SEC, needs: { fun: 40, social: 15 }, cost: 20, pose: "stand", status: "Bowling 🎳",
    skill: { key: "fitness", xp: 8 } },
  waakye: { id: "waakye", label: "Waakye plate ($11)", kind: "use", durationMs: 10 * SEC, needs: { hunger: 60, social: 5 }, cost: 11, pose: "stand", status: "Waakye time 🍛" },
  community_dinner: { id: "community_dinner", label: "Community dinner (free)", kind: "use", durationMs: 15 * SEC, needs: { hunger: 40, social: 25 }, pose: "sit",
    status: "Community dinner 🍲", moodlet: { id: "fed-and-seen", label: "Fed and seen", value: 6, hours: 3 } },
  soulfood: { id: "soulfood", label: "Mac, greens & fried chicken ($14)", kind: "use", durationMs: 10 * SEC, needs: { hunger: 75 }, cost: 14, pose: "stand",
    status: "Soul food 🍗", moodlet: { id: "itis", label: "The itis", value: 4, hours: 2 } },
  garden: { id: "garden", label: "Volunteer in the garden", kind: "use", durationMs: 12 * SEC, needs: { fun: 20, social: 10, hygiene: -10 }, pose: "stand",
    status: "Gardening 🌱", skill: { key: "creativity", xp: 10 } },
  jollof: { id: "jollof", label: "Jollof + chicken ($13)", kind: "use", durationMs: 10 * SEC, needs: { hunger: 70 }, cost: 13, pose: "stand",
    status: "Party jollof 🍚", moodlet: { id: "jollof", label: "Jollof hit different", value: 5, hours: 3 } },
  braids: { id: "braids", label: "Get braids done ($60)", kind: "use", durationMs: 25 * SEC, needs: { hygiene: 20, social: 25, energy: -10 }, cost: 60, pose: "sit",
    status: "Getting braids 💇🏾", moodlet: { id: "fresh-braids", label: "Fresh braids", value: 10, hours: 8 } },
  snacks: { id: "snacks", label: "Chips and a juice ($2)", kind: "use", durationMs: 5 * SEC, needs: { hunger: 15 }, cost: 2, pose: "stand", status: "Snacking 🥤" },
  fruit: { id: "fruit", label: "Mango on a stick ($4)", kind: "use", durationMs: 5 * SEC, needs: { hunger: 15, energy: 5 }, cost: 4, pose: "stand", status: "Mango 🥭" },
  records: { id: "records", label: "Dig through records", kind: "use", durationMs: 12 * SEC, needs: { fun: 20 }, pose: "stand", status: "Crate digging 💿",
    skill: { key: "creativity", xp: 15 } },
  spin_class: { id: "spin_class", label: "Spin class ($15)", kind: "use", durationMs: 15 * SEC, needs: { energy: -20, hygiene: -25, fun: 10 }, cost: 15, pose: "stand",
    status: "Spin class 🚴", skill: { key: "fitness", xp: 40 } },
  smoothie: { id: "smoothie", label: "Green smoothie ($11)", kind: "use", durationMs: 5 * SEC, needs: { hunger: 15, energy: 10 }, cost: 11, pose: "stand", status: "Smoothie 🥤" },
  look_art: { id: "look_art", label: "Look at art", kind: "use", durationMs: 10 * SEC, needs: { fun: 20 }, pose: "stand", status: "Contemplating 🖼️",
    skill: { key: "creativity", xp: 10 } },
  pizza: { id: "pizza", label: "Wait in the pizza line ($5)", kind: "use", durationMs: 12 * SEC, needs: { hunger: 50, fun: 5 }, cost: 5, pose: "stand", status: "In the pizza line 🍕" },
  coding_class: { id: "coding_class", label: "Free coding class", kind: "use", durationMs: 18 * SEC, needs: { energy: -10, fun: 5 }, pose: "sit", status: "Coding class 💻",
    skill: { key: "coding", xp: 35 } },
  read_book: { id: "read_book", label: "Read in the library", kind: "use", durationMs: 10 * SEC, needs: { fun: 15 }, pose: "sit", status: "Reading 📚",
    skill: { key: "charisma", xp: 8 } },
  penthouse: { id: "penthouse", label: "Window-shop the penthouse", kind: "use", durationMs: 8 * SEC, needs: { fun: 5 }, pose: "stand", status: "Manifesting ✨",
    skill: { key: "hustle", xp: 10 }, moodlet: { id: "manifesting", label: "Manifesting", value: 3, hours: 2 } },
  photo: { id: "photo", label: "Take the bridge photo", kind: "use", durationMs: 6 * SEC, needs: { fun: 15, social: 5 }, pose: "stand", status: "Posing 📸" },
  picnic: { id: "picnic", label: "Picnic on the lawn", kind: "use", durationMs: 12 * SEC, needs: { fun: 20, social: 10 }, pose: "sit", status: "Picnic 🧺" },
  nap_lawn: { id: "nap_lawn", label: "Nap in the sun", kind: "use", durationMs: 15 * SEC, needs: { energy: 25 }, pose: "sleep", status: "Sunbathing 😎" },
  drum_circle: { id: "drum_circle", label: "Join the drum circle", kind: "use", durationMs: 12 * SEC, needs: { fun: 30, social: 15 }, pose: "stand",
    status: "Drumming 🥁", skill: { key: "creativity", xp: 20 } },
  grill: { id: "grill", label: "Grill with strangers ($5)", kind: "use", durationMs: 12 * SEC, needs: { hunger: 50, social: 20 }, cost: 5, pose: "stand", status: "At the BBQ 🔥" },
  run: { id: "run", label: "Run the loop", kind: "use", durationMs: 12 * SEC, needs: { energy: -20, hygiene: -20, fun: 10 }, pose: "stand", status: "Running 🏃",
    skill: { key: "fitness", xp: 30 } },
  produce: { id: "produce", label: "Buy fresh produce ($8)", kind: "use", durationMs: 8 * SEC, needs: { hunger: 25 }, cost: 8, pose: "stand", status: "Greenmarket 🥬",
    moodlet: { id: "farmers-market", label: "Supported local farmers", value: 3, hours: 3 } },

  // Venues
  order_drink: { id: "order_drink", label: "Order a drink ($9)", kind: "use", durationMs: 8 * SEC, needs: { fun: 15, social: 5 }, cost: 9, pose: "stand", status: "Cheers 🍹" },
  order_water: { id: "order_water", label: "Ask for water (free)", kind: "use", durationMs: 5 * SEC, needs: { energy: 3 }, pose: "stand", status: "Hydrating 💧" },
  dance: { id: "dance", label: "Dance", kind: "use", durationMs: 15 * SEC, needs: { fun: 30, social: 10, energy: -15 }, pose: "stand", status: "Dancing 💃🏾",
    skill: { key: "fitness", xp: 10 } },
  dj_set: { id: "dj_set", label: "Play a set", kind: "use", durationMs: 18 * SEC, needs: { fun: 20, social: 10 }, pose: "stand", status: "On the decks 🎧",
    skill: { key: "creativity", xp: 30 }, requires: { key: "creativity", level: 3 } },
  latte: { id: "latte", label: "Oat latte ($7)", kind: "use", durationMs: 5 * SEC, needs: { energy: 20 }, cost: 7, pose: "stand", status: "Oat latte ☕" },
  pastry: { id: "pastry", label: "Croissant ($6)", kind: "use", durationMs: 5 * SEC, needs: { hunger: 20 }, cost: 6, pose: "stand", status: "Croissant 🥐" },
  laptop_work: { id: "laptop_work", label: "Work on your laptop", kind: "use", durationMs: 15 * SEC, needs: { fun: -5, energy: -5 }, pose: "sit", status: "Typing 💻",
    skill: { key: "coding", xp: 20 } },

  // NPCs
  chat_npc: { id: "chat_npc", label: "Chat", kind: "use", durationMs: 8 * SEC, needs: { social: 12, fun: 4 }, pose: "stand", status: "Chatting 💬",
    skill: { key: "charisma", xp: 8 } },
  talk_home: { id: "talk_home", label: "Talk about home", kind: "use", durationMs: 10 * SEC, needs: { social: 25, fun: 5 }, pose: "stand", status: "Talking about home 🏠",
    moodlet: { id: "felt-at-home", label: "Felt at home", value: 6, hours: 3 } },

  // Gigs (only offered when a gig's next stop is the thing you tapped)
  gig_pickup: { id: "gig_pickup", label: "Pick up", kind: "use", durationMs: 4 * SEC, needs: { energy: -3 }, pose: "stand", status: "Picking up 📦" },
  gig_dropoff: { id: "gig_dropoff", label: "Drop off", kind: "use", durationMs: 4 * SEC, needs: { energy: -3 }, pose: "stand", status: "Dropping off 📦" },
  gig_task: { id: "gig_task", label: "Do the task", kind: "use", durationMs: 15 * SEC, needs: { energy: -15, hygiene: -10 }, pose: "stand", status: "On a task 🔧" },

  // Phone (no object)
  call_home: { id: "call_home", label: "Call home ($2)", kind: "use", durationMs: 10 * SEC, needs: { social: 40 }, cost: 2, pose: "stand",
    status: "On the phone with family 📞", moodlet: { id: "called-home", label: "Heard from family", value: 6, hours: 3 } },
};

export type ActionId = keyof typeof ACTIONS;
