/** M0 guest session: a random token kept in this browser. Replaced by real auth in M1. */
const KEY = "nyl.session";

export function getSessionToken(): string {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const token = crypto.randomUUID() + crypto.randomUUID();
    localStorage.setItem(KEY, token);
    return token;
  } catch {
    // Private mode or blocked storage: the session lasts for this tab only.
    return crypto.randomUUID() + crypto.randomUUID();
  }
}
