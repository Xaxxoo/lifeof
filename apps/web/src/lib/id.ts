/**
 * Random hex id. crypto.randomUUID only exists on secure pages (https or localhost), so phones testing over
 * http://<LAN IP> would crash; getRandomValues works everywhere.
 */
export function randomId(bytes = 16): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}
