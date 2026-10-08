"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { useSocket, useSocketEvent } from "./SocketContext";
import { usePolling } from "./hooks";
import type { MessageDoc, Occupant } from "./types";

export function useRealtimeChat(roomId: string): MessageDoc[] {
  const { connected } = useSocket();
  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const initialLoaded = useRef(false);

  // Fetch initial messages via REST
  useEffect(() => {
    initialLoaded.current = false;
    setMessages([]);
    api.recentChat(roomId).then((msgs) => {
      setMessages(msgs);
      initialLoaded.current = true;
    }).catch(() => {});
  }, [roomId]);

  // Append new messages from socket
  useSocketEvent<MessageDoc>("chat:message", (msg) => {
    if (msg.roomId !== roomId) return;
    setMessages((prev) => {
      // Deduplicate by id
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev.slice(-99), msg];
    });
  });

  // Fallback polling when disconnected
  const fallbackFetcher = useCallback(() => api.recentChat(roomId), [roomId]);
  const fallback = usePolling(!connected ? fallbackFetcher : null, 2000);

  useEffect(() => {
    if (!connected && fallback) {
      setMessages(fallback);
    }
  }, [connected, fallback]);

  return messages;
}

export function useRealtimeOccupants(roomId: string): Occupant[] {
  const { connected } = useSocket();
  const [occupants, setOccupants] = useState<Occupant[]>([]);
  const initialLoaded = useRef(false);

  // Fetch initial occupants via REST
  useEffect(() => {
    initialLoaded.current = false;
    setOccupants([]);
    api.occupants(roomId).then((occ) => {
      // Deduplicate by characterId in case of stale presence rows
      const seen = new Set<string>();
      const unique = occ.filter((o) => {
        if (seen.has(o.characterId)) return false;
        seen.add(o.characterId);
        return true;
      });
      setOccupants(unique);
      initialLoaded.current = true;
    }).catch(() => {});
  }, [roomId]);

  useSocketEvent<Occupant>("occupant:join", (data) => {
    setOccupants((prev) => {
      // Replace if already exists, otherwise append
      const idx = prev.findIndex((o) => o.characterId === data.characterId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = data;
        return next;
      }
      return [...prev, data];
    });
  });

  useSocketEvent<{ characterId: string; path: { x: number; y: number }[]; startedAt: number }>(
    "occupant:move",
    (data) => {
      setOccupants((prev) =>
        prev.map((o) =>
          o.characterId === data.characterId
            ? { ...o, path: data.path, startedAt: data.startedAt }
            : o,
        ),
      );
    },
  );

  useSocketEvent<{ characterId: string }>("occupant:leave", (data) => {
    setOccupants((prev) => prev.filter((o) => o.characterId !== data.characterId));
  });

  useSocketEvent<{ characterId: string; activity: Occupant["activity"] }>(
    "activity:start",
    (data) => {
      setOccupants((prev) =>
        prev.map((o) =>
          o.characterId === data.characterId ? { ...o, activity: data.activity } : o,
        ),
      );
    },
  );

  useSocketEvent<{ characterId: string }>("activity:stop", (data) => {
    setOccupants((prev) =>
      prev.map((o) =>
        o.characterId === data.characterId ? { ...o, activity: null } : o,
      ),
    );
  });

  useSocketEvent<{ characterId: string }>("activity:complete", (data) => {
    setOccupants((prev) =>
      prev.map((o) =>
        o.characterId === data.characterId ? { ...o, activity: null } : o,
      ),
    );
  });

  // Fallback polling when disconnected
  const fallbackFetcher = useCallback(() => api.occupants(roomId), [roomId]);
  const fallback = usePolling(!connected ? fallbackFetcher : null, 3000);

  useEffect(() => {
    if (!connected && fallback) {
      setOccupants(fallback);
    }
  }, [connected, fallback]);

  return occupants;
}
