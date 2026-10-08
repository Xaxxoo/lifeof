import { Controller, Get, Post, Body, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/auth.guard";
import { StellarService } from "./stellar.service";

@Controller("stellar")
@UseGuards(JwtAuthGuard)
export class StellarController {
  constructor(private stellar: StellarService) {}

  @Get("wallet")
  getWallet(@Req() req: { user: { characterId: string } }) {
    return this.stellar.getWalletInfo(req.user.characterId);
  }

  @Post("wallet")
  createWallet(@Req() req: { user: { characterId: string } }) {
    return this.stellar.createWallet(req.user.characterId);
  }

  @Post("wallet/retry-funding")
  retryFunding(@Req() req: { user: { characterId: string } }) {
    return this.stellar.retryFunding(req.user.characterId);
  }

  @Post("external-address")
  setExternalAddress(
    @Req() req: { user: { characterId: string } },
    @Body() body: { address: string },
  ) {
    return this.stellar.setExternalAddress(req.user.characterId, body.address);
  }

  @Post("withdraw")
  withdraw(
    @Req() req: { user: { characterId: string } },
    @Body() body: { amount: number; requestId: string },
  ) {
    return this.stellar.withdraw(req.user.characterId, body.amount, body.requestId);
  }

  @Get("balance")
  getBalance(@Req() req: { user: { characterId: string } }) {
    return this.stellar.getStellarBalance(req.user.characterId);
  }
}
