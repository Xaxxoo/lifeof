import type { Needs, SkillKey } from "@nyl/game-core";

/**
 * Everything a player can do by tapping an object (PRD §5, §6). Durations are real time and kept short
 * (5–45 s) so the game stays snappy.
 * `needs` are the totals for a full run; stopping early pays the share done.
 */
/** `menu` opens a panel on the client (buying a lot, say) and never runs on the server. */
export type ActionKind = "use" | "travel" | "work" | "ride" | "menu";

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
  pose?: "stand" | "sit" | "sleep" | "dance";
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
  shoot_hoops: { id: "shoot_hoops", label: "Run a pickup game", kind: "use", durationMs: 12 * SEC, needs: { energy: -20, hygiene: -15, fun: 25, social: 15 },
    pose: "stand", status: "Hooping 🏀", skill: { key: "fitness", xp: 30 } },
  // Downtown and the bridge
  walk_over: { id: "walk_over", label: "Walk over", kind: "travel", durationMs: 0, status: "" },
  bridge_photo: { id: "bridge_photo", label: "Take the skyline photo", kind: "use", durationMs: 8 * SEC, needs: { fun: 25, social: 10 }, pose: "stand",
    status: "Golden hour 🌇", moodlet: { id: "that-view", label: "That view", value: 6, hours: 3 } },
  dumplings: { id: "dumplings", label: "Five pork dumplings ($3)", kind: "use", durationMs: 8 * SEC, needs: { hunger: 40 }, cost: 3, pose: "stand", status: "Dumplings 🥟" },
  egg_tart: { id: "egg_tart", label: "Egg tarts ($3)", kind: "use", durationMs: 5 * SEC, needs: { hunger: 20, fun: 5 }, cost: 3, pose: "stand", status: "Egg tart 🥧" },
  boba: { id: "boba", label: "Brown sugar boba ($7)", kind: "use", durationMs: 5 * SEC, needs: { hunger: 10, energy: 10, fun: 5 }, cost: 7, pose: "stand", status: "Boba 🧋" },
  haggle: { id: "haggle", label: "Haggle for a 'Prada' bag ($15)", kind: "use", durationMs: 10 * SEC, needs: { fun: 20, social: 10 }, cost: 15, pose: "stand",
    status: "Haggling 👜", skill: { key: "hustle", xp: 20 } },
  temple_visit: { id: "temple_visit", label: "Light incense", kind: "use", durationMs: 10 * SEC, needs: { fun: 10, social: 5 }, pose: "stand", status: "Peaceful 🪷",
    moodlet: { id: "peaceful", label: "At peace", value: 5, hours: 3 } },
  xiangqi: { id: "xiangqi", label: "Play xiangqi with Uncle Wen", kind: "use", durationMs: 12 * SEC, needs: { fun: 20, social: 15 }, pose: "stand",
    status: "Playing xiangqi ♟️", skill: { key: "charisma", xp: 15 } },
  pastrami: { id: "pastrami", label: "Pastrami on rye ($28)", kind: "use", durationMs: 12 * SEC, needs: { hunger: 90 }, cost: 28, pose: "stand",
    status: "Pastrami on rye 🥪", moodlet: { id: "katz", label: "I'll have what she's having", value: 6, hours: 3 } },
  dollar_slice: { id: "dollar_slice", label: "A slice ($2)", kind: "use", durationMs: 5 * SEC, needs: { hunger: 30 }, cost: 2, pose: "stand", status: "Folding a slice 🍕" },
  tattoo: { id: "tattoo", label: "Get a tattoo ($80)", kind: "use", durationMs: 25 * SEC, needs: { fun: 25, social: 10, energy: -10 }, cost: 80, pose: "sit",
    status: "Getting inked 🖋️", skill: { key: "creativity", xp: 10 }, moodlet: { id: "fresh-ink", label: "Fresh ink", value: 8, hours: 12 } },
  thrift: { id: "thrift", label: "Thrift a fit ($25)", kind: "use", durationMs: 12 * SEC, needs: { fun: 25 }, cost: 25, pose: "stand", status: "Thrifting 🧥",
    moodlet: { id: "thrifted", label: "Thrifted a fit", value: 6, hours: 6 } },
  museum_tour: { id: "museum_tour", label: "Tour a 1900s tenement ($30)", kind: "use", durationMs: 18 * SEC, needs: { fun: 20, social: 10 }, cost: 30, pose: "stand",
    status: "On the tour 🏛️", skill: { key: "charisma", xp: 12 },
    moodlet: { id: "footsteps", label: "Walked in their footsteps", value: 7, hours: 4 } },
  watch_ticker: { id: "watch_ticker", label: "Watch the ticker", kind: "use", durationMs: 10 * SEC, needs: { fun: 5 }, pose: "stand", status: "Watching stocks 📈",
    skill: { key: "hustle", xp: 15 } },
  network: { id: "network", label: "Network in the lobby", kind: "use", durationMs: 12 * SEC, needs: { social: 15, energy: -5 }, pose: "stand", status: "Networking 🤝",
    skill: { key: "charisma", xp: 15 } },
  bull_photo: { id: "bull_photo", label: "Rub the bull for luck", kind: "use", durationMs: 6 * SEC, needs: { fun: 15 }, pose: "stand", status: "Rubbing the bull 🐂",
    skill: { key: "hustle", xp: 5 }, moodlet: { id: "lucky", label: "Feeling lucky", value: 4, hours: 3 } },
  salad: { id: "salad", label: "Power lunch salad ($16)", kind: "use", durationMs: 8 * SEC, needs: { hunger: 45, energy: 5 }, cost: 16, pose: "stand", status: "Salad 🥗" },

  // Player-built neighborhoods
  lot_open: { id: "lot_open", label: "Look at this lot", kind: "menu", durationMs: 0, status: "" },
  pb_plate: { id: "pb_plate", label: "House plate ($12)", kind: "use", durationMs: 10 * SEC, needs: { hunger: 65, social: 5 }, cost: 12, pose: "stand",
    status: "Eating local 🍲", moodlet: { id: "ate-local", label: "Ate at a neighbor's spot", value: 4, hours: 3 } },
  pb_coffee: { id: "pb_coffee", label: "Coffee ($5)", kind: "use", durationMs: 5 * SEC, needs: { energy: 20 }, cost: 5, pose: "stand", status: "Coffee ☕" },
  pb_pastry: { id: "pb_pastry", label: "Pastry ($4)", kind: "use", durationMs: 5 * SEC, needs: { hunger: 20 }, cost: 4, pose: "stand", status: "Pastry 🥐" },
  pb_shop: { id: "pb_shop", label: "Shop the new drop ($30)", kind: "use", durationMs: 10 * SEC, needs: { fun: 25 }, cost: 30, pose: "stand", status: "Shopping 🛍️",
    moodlet: { id: "new-fit", label: "New fit", value: 6, hours: 6 } },
  pb_vinyl: { id: "pb_vinyl", label: "Buy a record ($15)", kind: "use", durationMs: 8 * SEC, needs: { fun: 20 }, cost: 15, pose: "stand", status: "New vinyl 💿",
    skill: { key: "creativity", xp: 10 } },
  pb_book: { id: "pb_book", label: "Buy a book ($12)", kind: "use", durationMs: 8 * SEC, needs: { fun: 15 }, cost: 12, pose: "stand", status: "New book 📚",
    skill: { key: "charisma", xp: 10 } },

  // Treasure hunts: only offered where a hunt you joined says to look (see hunts.ts).
  hunt_search: { id: "hunt_search", label: "Search for the treasure 🔎", kind: "use", durationMs: 6 * SEC, needs: { fun: 10 }, pose: "stand",
    status: "Searching… 🔎" },
  produce: { id: "produce", label: "Buy fresh produce ($8)", kind: "use", durationMs: 8 * SEC, needs: { hunger: 25 }, cost: 8, pose: "stand", status: "Greenmarket 🥬",
    moodlet: { id: "farmers-market", label: "Supported local farmers", value: 3, hours: 3 } },

  // Venues
  order_drink: { id: "order_drink", label: "Order a drink ($9)", kind: "use", durationMs: 8 * SEC, needs: { fun: 15, social: 5 }, cost: 9, pose: "stand", status: "Cheers 🍹" },
  order_water: { id: "order_water", label: "Ask for water (free)", kind: "use", durationMs: 5 * SEC, needs: { energy: 3 }, pose: "stand", status: "Hydrating 💧" },
  dance: { id: "dance", label: "Dance", kind: "use", durationMs: 15 * SEC, needs: { fun: 30, social: 10, energy: -15 }, pose: "dance", status: "Dancing 💃🏾",
    skill: { key: "fitness", xp: 10 } },
  dj_set: { id: "dj_set", label: "Play a set", kind: "use", durationMs: 18 * SEC, needs: { fun: 20, social: 10 }, pose: "stand", status: "On the decks 🎧",
    skill: { key: "creativity", xp: 30 }, requires: { key: "creativity", level: 3 } },
  latte: { id: "latte", label: "Oat latte ($7)", kind: "use", durationMs: 5 * SEC, needs: { energy: 20 }, cost: 7, pose: "stand", status: "Oat latte ☕" },
  pastry: { id: "pastry", label: "Croissant ($6)", kind: "use", durationMs: 5 * SEC, needs: { hunger: 20 }, cost: 6, pose: "stand", status: "Croissant 🥐" },
  // Clubs
  shots: { id: "shots", label: "Round of shots ($30)", kind: "use", durationMs: 8 * SEC, needs: { fun: 25, social: 20, energy: -5 }, cost: 30, pose: "stand",
    status: "Shots! 🥃" },
  vip_table: { id: "vip_table", label: "Bottle service in VIP ($150)", kind: "use", durationMs: 20 * SEC, needs: { fun: 50, social: 40 }, cost: 150, pose: "sit",
    status: "In VIP 🍾", skill: { key: "charisma", xp: 20 }, moodlet: { id: "vip", label: "Bottle service", value: 12, hours: 6 } },
  photo_booth: { id: "photo_booth", label: "Photo booth strip ($5)", kind: "use", durationMs: 6 * SEC, needs: { fun: 15, social: 10 }, cost: 5, pose: "stand",
    status: "Striking a pose 📸" },
  club_bathroom: { id: "club_bathroom", label: "Wait for the bathroom", kind: "use", durationMs: 15 * SEC, needs: { bladder: 100, social: 5 }, pose: "stand",
    status: "In the bathroom line 🚻" },
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
  gig_vend: { id: "gig_vend", label: "Set up and sell", kind: "use", durationMs: 18 * SEC, needs: { energy: -8, social: 8 }, pose: "stand", status: "Selling 🛒" },
  gig_flip: { id: "gig_flip", label: "Make the sale", kind: "use", durationMs: 10 * SEC, needs: { energy: -5 }, pose: "stand", status: "Making the sale 👟" },

  // Phone (no object)
  call_home: { id: "call_home", label: "Call home ($2)", kind: "use", durationMs: 10 * SEC, needs: { social: 40 }, cost: 2, pose: "stand",
    status: "On the phone with family 📞", moodlet: { id: "called-home", label: "Heard from family", value: 6, hours: 3 } },
};

export type ActionId = keyof typeof ACTIONS;
