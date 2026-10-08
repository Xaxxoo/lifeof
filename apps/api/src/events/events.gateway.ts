import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { WorldService } from "../world/world.service";
import { ChatService } from "../chat/chat.service";

@WebSocketGateway({ cors: { origin: "*" } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  /** characterId → set of socket IDs */
  private socketsByCharacter = new Map<string, Set<string>>();
  /** socket ID → { characterId, token } */
  private characterBySocket = new Map<string, { characterId: string; token: string }>();

  constructor(
    private jwt: JwtService,
    private world: WorldService,
    private chat: ChatService,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error("No token");
      const payload = this.jwt.verify(token);
      const sessionToken: string = payload.token;
      const characterId: string = payload.sub;
      if (!sessionToken) throw new Error("Invalid token");

      socket.data.characterId = characterId;
      socket.data.token = sessionToken;

      this.characterBySocket.set(socket.id, { characterId, token: sessionToken });
      let sockets = this.socketsByCharacter.get(characterId);
      if (!sockets) {
        sockets = new Set();
        this.socketsByCharacter.set(characterId, sockets);
      }
      sockets.add(socket.id);
    } catch {
      socket.disconnect();
    }
  }

  async handleDisconnect(socket: Socket) {
    const info = this.characterBySocket.get(socket.id);
    if (!info) return;
    this.characterBySocket.delete(socket.id);

    const sockets = this.socketsByCharacter.get(info.characterId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) this.socketsByCharacter.delete(info.characterId);
    }

    // If no more sockets for this character, clean up presence
    if (!this.socketsByCharacter.has(info.characterId)) {
      try {
        await this.world.leave(info.token);
      } catch {
        // character may already have left
      }
      // Broadcast leave to any rooms the socket was in
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          socket.to(room).emit("occupant:leave", { characterId: info.characterId });
        }
      }
    }
  }

  @SubscribeMessage("room:subscribe")
  async handleRoomSubscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const info = this.characterBySocket.get(socket.id);
    if (!info) return;

    // Leave all current rooms (except the socket's own room)
    for (const room of socket.rooms) {
      if (room !== socket.id) socket.leave(room);
    }

    socket.join(data.roomId);

    // Build occupant data for this character and broadcast join to room
    try {
      const occupants = await this.world.occupants(data.roomId);
      const me = occupants.find((o) => o.characterId === info.characterId);
      if (me) {
        socket.to(data.roomId).emit("occupant:join", me);
      }
    } catch {
      // room may not exist yet
    }
  }

  @SubscribeMessage("chat:send")
  async handleChatSend(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string; body: string },
  ) {
    const info = this.characterBySocket.get(socket.id);
    if (!info) return;

    try {
      const message = await this.chat.say(info.token, data.roomId, data.body);
      if (message) {
        this.server.to(data.roomId).emit("chat:message", {
          id: message.id,
          roomId: message.roomId,
          characterId: message.characterId,
          name: message.name,
          body: message.body,
          createdAt: message.createdAt,
        });
      }
    } catch (e) {
      socket.emit("error", { message: e instanceof Error ? e.message : "Chat failed" });
    }
  }

  @SubscribeMessage("world:move")
  async handleWorldMove(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { target: { x: number; y: number } },
  ) {
    const info = this.characterBySocket.get(socket.id);
    if (!info) return;

    try {
      const result = await this.world.move(info.token, data.target);
      if (result.ok) {
        // Broadcast move to room (excluding sender)
        for (const room of socket.rooms) {
          if (room !== socket.id) {
            socket.to(room).emit("occupant:move", {
              characterId: info.characterId,
              path: result.path,
              startedAt: result.startedAt,
            });
          }
        }
      }
      return { ok: result.ok };
    } catch (e) {
      socket.emit("error", { message: e instanceof Error ? e.message : "Move failed" });
      return { ok: false };
    }
  }

  @SubscribeMessage("world:heartbeat")
  async handleWorldHeartbeat(@ConnectedSocket() socket: Socket) {
    const info = this.characterBySocket.get(socket.id);
    if (!info) return;

    try {
      await this.world.heartbeat(info.token);
    } catch {
      // ignore heartbeat errors
    }
  }

  // --- Public methods for other services to call ---

  broadcastToRoom(roomId: string, event: string, payload: unknown) {
    this.server.to(roomId).emit(event, payload);
  }

  handleRoomChange(characterId: string, oldRoomId: string, newRoomId: string) {
    const sockets = this.socketsByCharacter.get(characterId);
    if (!sockets) return;

    for (const socketId of sockets) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (!socket) continue;

      // Leave old room, join new room
      socket.leave(oldRoomId);
      socket.join(newRoomId);

      // Notify the player's own socket
      socket.emit("room:changed", { roomId: newRoomId });
    }

    // Tell old room that occupant left
    this.server.to(oldRoomId).emit("occupant:leave", { characterId });
  }
}
