"use client";

import { useCallback, useState } from "react";
import { isInstanceable } from "@nyl/content";
import { api } from "@/lib/api";
import { usePolling } from "@/lib/hooks";
import { useGame } from "@/lib/store";
import { useSocket } from "@/lib/SocketContext";

/**
 * Busy rooms split into copies. Shows which copy you're in, and offers to join a friend or
 * crewmate who landed in a different one. Says nothing in a room that has only one copy.
 */
export function InstanceBadge({ roomId }: { roomId: string }) {
  const { socket } = useSocket();
  const toast = useGame((s) => s.toast);
  const [busy, setBusy] = useState(false);
  const fetcher = useCallback(() => api.instances(), []);
  // World is keyed by room id, so a room change remounts this and refetches straight away.
  const info = usePolling(isInstanceable(roomId) ? fetcher : null, 15_000);
  if (!info || info.roomId !== roomId) return null;

  const elsewhere = info.instances.filter((i) => i.roomId !== roomId && i.friends.length && i.count < info.capacity);
  const split = info.instance > 1 || info.instances.length > 1;
  if (!split && !elsewhere.length) return null;

  function join(friendId: string) {
    setBusy(true);
    socket.emit("world:hop", { friendId }, (res: { ok: boolean; message?: string }) => {
      setBusy(false);
      if (!res?.ok) toast(res?.message ?? "Couldn't join them", "error");
    });
  }

  const target = elsewhere[0];
  const friend = target?.friends[0];
  return (
    <div className="mt-1 text-[10px] text-white/45">
      <p title={`This place is busy, so it's split into copies of up to ${info.capacity} people`}>
        Instance {info.instance}
        {info.instances.length > 1 ? ` of ${info.instances.length}` : ""}
      </p>
      {target && friend && (
        <button
          onClick={() => join(friend.characterId)}
          disabled={busy}
          className="mt-0.5 block font-semibold text-[#f3a712] disabled:opacity-50"
        >
          {busy ? "Joining…" : `Join ${friend.name}${target.friends.length > 1 ? ` +${target.friends.length - 1}` : ""} in ${target.instance}`}
        </button>
      )}
    </div>
  );
}
