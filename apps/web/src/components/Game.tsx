"use client";

import { useCallback, useEffect, useState } from "react";
import { api, initSession } from "@/lib/api";
import { usePolling } from "@/lib/hooks";
import { useGame } from "@/lib/store";
import { CreateCharacter } from "./CreateCharacter";
import { Splash } from "./GameLoader";
import { Toasts } from "./Toasts";
import { SubwayRide } from "./SubwayRide";
import { WorkScreen } from "./WorkScreen";
import { World } from "./World";

const HEARTBEAT_MS = 15_000;

export function Game() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initSession().then(() => setReady(true));
  }, []);

  const meFetcher = useCallback(() => api.me(), []);
  const me = usePolling(ready ? meFetcher : null, 4000);

  if (!ready || me === undefined) return <Splash />;
  if (me === null) return <CreateCharacter />;
  return <Session />;
}

/** Joins once, keeps the heartbeat going, and swaps scenes when the server moves us between rooms. */
function Session() {
  const setClockOffset = useGame((s) => s.setClockOffset);
  const setLocalIntent = useGame((s) => s.setLocalIntent);
  const [joined, setJoined] = useState(false);

  const whereAmIFetcher = useCallback(() => api.whereAmI(), []);
  const whereResult = usePolling(joined ? whereAmIFetcher : null, 4000);
  const roomId = whereResult?.roomId ?? null;

  useEffect(() => {
    let cancelled = false;
    const sentAt = Date.now();
    api.join().then(({ serverNow }) => {
      if (cancelled) return;
      const receivedAt = Date.now();
      setClockOffset(serverNow - (sentAt + receivedAt) / 2);
      setJoined(true);
    });
    const beat = setInterval(() => void api.heartbeat(), HEARTBEAT_MS);
    const onHide = () => void api.leave();
    window.addEventListener("pagehide", onHide);
    return () => {
      cancelled = true;
      clearInterval(beat);
      window.removeEventListener("pagehide", onHide);
    };
  }, [setClockOffset]);

  // A new room means a new scene; drop any optimistic path from the old one.
  useEffect(() => setLocalIntent(null), [roomId, setLocalIntent]);

  if (!joined || !roomId) return <Splash note="Heading to Crown Heights…" />;
  return (
    <>
      {roomId === "work" ? (
        <WorkScreen />
      ) : roomId === "transit" ? (
        <SubwayRide />
      ) : (
        <World key={roomId} roomId={roomId} />
      )}
      <Toasts />
    </>
  );
}
