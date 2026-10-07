import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("subway feed", { minutes: 1 }, internal.city.pollSubway, {});
crons.interval("weather feed", { minutes: 10 }, internal.city.pollWeather, {});
crons.interval("311 feed", { minutes: 15 }, internal.city.poll311, {});
crons.interval("presence cleanup", { minutes: 1 }, internal.world.cleanupPresence, {});

export default crons;
