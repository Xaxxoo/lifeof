import { Controller, Get, Post, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/auth.guard";
import { BankService } from "./bank.service";

@Controller("bank")
@UseGuards(JwtAuthGuard)
export class BankController {
  constructor(private bank: BankService) {}

  @Get("ledger")
  getLedger(@Req() req: { user: { characterId: string } }) {
    return this.bank.getLedger(req.user.characterId);
  }

  @Post("pay-rent")
  payRent(@Req() req: { user: { characterId: string } }) {
    return this.bank.payRent(req.user.characterId);
  }
}
