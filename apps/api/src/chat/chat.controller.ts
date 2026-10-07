import { Controller, Get, Post, Body, Param, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/auth.guard";
import { ChatService } from "./chat.service";

@Controller("chat")
export class ChatController {
  constructor(private chat: ChatService) {}

  @Post("send")
  @UseGuards(JwtAuthGuard)
  say(@Req() req: { user: { token: string } }, @Body() body: { roomId: string; body: string }) {
    return this.chat.say(req.user.token, body.roomId, body.body);
  }

  @Get(":roomId")
  recent(@Param("roomId") roomId: string) {
    return this.chat.recent(roomId);
  }
}
