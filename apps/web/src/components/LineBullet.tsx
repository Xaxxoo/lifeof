/** Our own subway line marker: a colored circle with the line name (not the MTA's trademarked bullet artwork). */
const LINE_COLORS: Record<string, string> = {
  A: "#2850ad", C: "#2850ad", E: "#2850ad",
  B: "#ff6319", D: "#ff6319", F: "#ff6319", M: "#ff6319",
  G: "#6cbe45",
  J: "#996633", Z: "#996633",
  L: "#a7a9ac",
  N: "#fccc0a", Q: "#fccc0a", R: "#fccc0a", W: "#fccc0a",
  "1": "#ee352e", "2": "#ee352e", "3": "#ee352e",
  "4": "#00933c", "5": "#00933c", "6": "#00933c",
  "7": "#b933ad",
};

export function lineColor(line: string) {
  return LINE_COLORS[line] ?? "#808183";
}

export function LineBullet({ line, size = 22, status }: { line: string; size?: number; status?: string }) {
  const dark = ["N", "Q", "R", "W"].includes(line);
  return (
    <span
      title={status}
      className={`relative inline-grid shrink-0 place-items-center rounded-full font-bold ${dark ? "text-black" : "text-white"}`}
      style={{ width: size, height: size, backgroundColor: lineColor(line), fontSize: size * 0.5 }}
    >
      {line}
      {status && status !== "good" && (
        <span
          className={`absolute -right-0.5 -top-0.5 size-2.5 rounded-full ring-2 ring-[#0f1117] ${status === "suspended" ? "bg-red-500" : status === "delays" ? "bg-amber-400" : "bg-sky-400"}`}
        />
      )}
    </span>
  );
}
