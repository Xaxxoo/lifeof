import { io, type Socket } from "socket.io-client";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const JWT_KEY = "nyl_jwt";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;
  const token = typeof window !== "undefined" ? localStorage.getItem(JWT_KEY) : null;
  socket = io(BASE, {
    autoConnect: false,
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  return socket;
}

export function updateSocketAuth(token: string) {
  const s = getSocket();
  s.auth = { token };
}

export function destroySocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
