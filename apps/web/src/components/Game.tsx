"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@convex/_generated/api";
import { getSessionToken } from "@/lib/session";
import { useGame } from "@/lib/store";
import { CreateCharacter } from "./CreateCharacter";
import { Splash } from "./GameLoader";
import { Toasts } from "./Toasts";
import { WorkScreen } from "./WorkScreen";
import { World } from "./World";

const HEARTBEAT_MS = 15_000;

export function Game() {
  const token = useMemo(() => getSessionToken(), []);
  const me = useQuery(api.characters.me, { token });

  if (me === undefined) return <Splash />;
  if (me === null) return <CreateCharacter token={token} />;
  return <Session token={token} />;
}

/** Joins once, keeps the heartbeat going, and swaps scenes when the server moves us between rooms. */
function Session({ token }: { token: string }) {
  const join = useMutation(api.world.join);
  const heartbeat = useMutation(api.world.heartbeat);
  const leave = useMutation(api.world.leave);
  const setClockOffset = useGame((s) => s.setClockOffset);
  const setLocalIntent = useGame((s) => s.setLocalIntent);
  const roomId = useQuery(api.world.whereAmI, { token });
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const sentAt = Date.now();
    join({ token }).then(({ serverNow }) => {
      if (cancelled) return;
      const receivedAt = Date.now();
      setClockOffset(serverNow - (sentAt + receivedAt) / 2);
      setJoined(true);
    });
    const beat = setInterval(() => void heartbeat({ token }), HEARTBEAT_MS);
    const onHide = () => void leave({ token });
    window.addEventListener("pagehide", onHide);
    return () => {
      cancelled = true;
      clearInterval(beat);
      window.removeEventListener("pagehide", onHide);
    };
  }, [token, join, heartbeat, leave, setClockOffset]);

  // A new room means a new scene; drop any optimistic path from the old one.
  useEffect(() => setLocalIntent(null), [roomId, setLocalIntent]);

  if (!joined || !roomId) return <Splash note="Taking the L to Bushwick…" />;
  return (
    <>
      {roomId === "work" ? <WorkScreen token={token} /> : <World key={roomId} token={token} roomId={roomId} />}
      <Toasts />
    </>
  );
}
