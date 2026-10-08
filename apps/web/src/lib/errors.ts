/** Extract a player-facing error message from a REST API error or plain Error. */
export function playerMessage(e: unknown): string {
  if (e instanceof Error) return e.message || "Something went wrong";
  return String(e) || "Something went wrong";
}
