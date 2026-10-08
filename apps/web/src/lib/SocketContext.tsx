"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { getSocket, updateSocketAuth, destroySocket } from "./socket";
import { initSession } from "./api";

interface SocketContextValue {
  socket: Socket;
  connected: boolean;
  subscribeRoom: (roomId: string) => void;
}

const SocketCtx = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const currentRoomRef = useRef<string | null>(null);
  const socketRef = useRef<Socket>(getSocket());

  useEffect(() => {
    const socket = socketRef.current;

    const onConnect = () => {
      setConnected(true);
      // Re-subscribe to room on reconnect
      if (currentRoomRef.current) {
        socket.emit("room:subscribe", { roomId: currentRoomRef.current });
      }
    };
    const onDisconnect = () => setConnected(false);
    const onConnectError = async (err: Error) => {
      // If auth failed, refresh the JWT and retry
      if (err.message?.includes("auth") || err.message?.includes("token") || err.message?.includes("jwt")) {
        try {
          await initSession();
          const jwt = typeof window !== "undefined" ? localStorage.getItem("nyl_jwt") : null;
          if (jwt) {
            updateSocketAuth(jwt);
            socket.connect();
          }
        } catch {
          // session refresh failed, will retry via reconnection
        }
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      destroySocket();
    };
  }, []);

  const subscribeRoom = useCallback((roomId: string) => {
    currentRoomRef.current = roomId;
    const socket = socketRef.current;
    if (socket.connected) {
      socket.emit("room:subscribe", { roomId });
    }
  }, []);

  return (
    <SocketCtx.Provider value={{ socket: socketRef.current, connected, subscribeRoom }}>
      {children}
    </SocketCtx.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketCtx);
  if (!ctx) throw new Error("useSocket must be inside SocketProvider");
  return ctx;
}

export function useSocketEvent<T>(event: string, handler: (data: T) => void) {
  const { socket } = useSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const fn = (data: T) => handlerRef.current(data);
    socket.on(event, fn as (...args: unknown[]) => void);
    return () => {
      socket.off(event, fn as (...args: unknown[]) => void);
    };
  }, [socket, event]);
}
