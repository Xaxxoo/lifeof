"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@convex/_generated/api";
import { BUSHWICK_BLOCK } from "@nyl/content";
import { getSessionToken } from "@/lib/session";
import { useGame } from "@/lib/store";
import { CreateCharacter } from "./CreateCharacter";
import { Splash } from "./GameLoader";
import { World } from "./World";

const ROOM_ID = BUSHWICK_BLOCK.id;
const HEARTBEAT_MS = 15_000;

export function Game() {
  const token = useMemo(() => getSessionToken(), []);
  const me = useQuery(api.characters.me, { token });

  if (me === undefined) return <Splash />;
  if (me === null) return <CreateCharacter token={token} />;
  return <InRoom token={token} roomId={ROOM_ID} />;
}

function InRoom({ token, roomId }: { token: string; roomId: string }) {
  const join = useMutation(api.world.join);
  const heartbeat = useMutation(api.world.heartbeat);
  const leave = useMutation(api.world.leave);
  const setClockOffset = useGame((s) => s.setClockOffset);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const sentAt = Date.now();
    join({ token, roomId }).then(({ serverNow }) => {
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
  }, [token, roomId, join, heartbeat, leave, setClockOffset]);

  if (!joined) return <Splash note="Taking the L to Bushwick…" />;
  return <World token={token} roomId={roomId} />;
}
