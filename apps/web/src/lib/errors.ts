/** Convex wraps thrown errors in request metadata; pull out the sentence meant for the player. */
export function playerMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const m = raw.match(/Uncaught Error: ([^\n]+)/);
  return (m?.[1] ?? raw.split("\n")[0] ?? "Something went wrong").trim();
}
