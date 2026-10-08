"use client";

import { useCallback, useEffect, useState } from "react";
import { api, initSession } from "@/lib/api";
import { usePolling } from "@/lib/hooks";
import { useGame } from "@/lib/store";
import { SocketProvider, useSocket, useSocketEvent } from "@/lib/SocketContext";
import { ArrivalIntro } from "./ArrivalIntro";
import { CreateCharacter } from "./CreateCharacter";
import { Splash } from "./GameLoader";
import { Toasts } from "./Toasts";
import { SubwayRide } from "./SubwayRide";
import { WorkScreen } from "./WorkScreen";
import { World } from "./World";

const HEARTBEAT_MS = 15_000;

export function Game() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [introData, setIntroData] = useState<{ name: string; origin: string } | null>(null);

  const handleCreated = useCallback((data: { name: string; origin: string }) => {
    if (data.origin === "bk-native") return;
    setIntroData(data);
  }, []);

  const clearIntro = useCallback(() => setIntroData(null), []);

  useEffect(() => {
    let cancelled = false;
    const attempt = () => {
      setError(null);
      initSession()
        .then(() => { if (!cancelled) setReady(true); })
        .catch((e) => {
          if (!cancelled) setError(e instanceof Error ? e.message : "Cannot reach server");
        });
    };
    attempt();
    // Retry every 5s if the API is down
    const id = setInterval(() => { if (!cancelled && !ready) attempt(); }, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, [ready]);

  const meFetcher = useCallback(() => api.me(), []);
  const me = usePolling(ready ? meFetcher : null, 4000);

  if (error) return <Splash note={`API unreachable — retrying… (${error})`} />;
  if (!ready || me === undefined) return <Splash />;
  if (me === null) return <CreateCharacter onCreated={handleCreated} />;
  if (introData) return <ArrivalIntro name={introData.name} origin={introData.origin} onComplete={clearIntro} />;
  return (
    <SocketProvider>
      <Session />
    </SocketProvider>
  );
}

/** Joins once, keeps the heartbeat going, and swaps scenes when the server moves us between rooms. */
function Session() {
  const setClockOffset = useGame((s) => s.setClockOffset);
  const setLocalIntent = useGame((s) => s.setLocalIntent);
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const { socket, connected, subscribeRoom } = useSocket();

  // Listen for server-pushed room changes
  useSocketEvent<{ roomId: string }>("room:changed", (data) => {
    setRoomId(data.roomId);
  });

  // Fallback: poll whereAmI when disconnected
  const whereAmIFetcher = useCallback(() => api.whereAmI(), []);
  const whereResult = usePolling(joined && !connected ? whereAmIFetcher : null, 4000);

  useEffect(() => {
    if (!connected && whereResult?.roomId) {
      setRoomId(whereResult.roomId);
    }
  }, [connected, whereResult]);

  useEffect(() => {
    let cancelled = false;
    const sentAt = Date.now();
    api.join().then(({ serverNow, roomId: joinedRoom }) => {
      if (cancelled) return;
      const receivedAt = Date.now();
      setClockOffset(serverNow - (sentAt + receivedAt) / 2);
      setRoomId(joinedRoom);
      setJoined(true);
    });
    const onHide = () => void api.leave();
    window.addEventListener("pagehide", onHide);
    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", onHide);
    };
  }, [setClockOffset]);

  // Socket heartbeat (fallback to REST when disconnected)
  useEffect(() => {
    if (!joined) return;
    const beat = setInterval(() => {
      if (connected) {
        socket.emit("world:heartbeat");
      } else {
        void api.heartbeat();
      }
    }, HEARTBEAT_MS);
    return () => clearInterval(beat);
  }, [joined, connected, socket]);

  // Subscribe to room via socket when room changes
  useEffect(() => {
    if (roomId && joined) subscribeRoom(roomId);
  }, [roomId, joined, subscribeRoom]);

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
