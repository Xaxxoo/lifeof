import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { StellarWallet } from "../entities/stellar-wallet.entity";
import { BankService } from "../bank/bank.service";

type StellarSdk = typeof import("@stellar/stellar-sdk");
let _sdk: StellarSdk | null = null;
async function sdk(): Promise<StellarSdk> {
  if (!_sdk) _sdk = await import("@stellar/stellar-sdk");
  return _sdk;
}

@Injectable()
export class StellarDepositService {
  private readonly log = new Logger(StellarDepositService.name);
  private processing = false;
  private readonly horizonUrl: string;
  private readonly usdtCode: string;
  private readonly usdtIssuer: string;

  constructor(
    private config: ConfigService,
    @InjectRepository(StellarWallet) private wallets: Repository<StellarWallet>,
    private bank: BankService,
  ) {
    this.horizonUrl = config.get("STELLAR_HORIZON_URL", "https://horizon-testnet.stellar.org");
    this.usdtCode = config.get("STELLAR_USDT_CODE", "USDT");
    this.usdtIssuer = config.get("STELLAR_USDT_ISSUER", "");
  }

  async pollDeposits() {
    if (this.processing) return;
    this.processing = true;
    try {
      const eligible = await this.wallets.find({
        where: { funded: true, trustlineEstablished: true },
      });
      if (!eligible.length) return;

      for (const wallet of eligible) {
        try {
          await this.checkWalletDeposits(wallet);
        } catch (err: any) {
          this.log.warn(`Deposit check failed for ${wallet.publicKey}: ${err.message}`);
        }
      }
    } finally {
      this.processing = false;
    }
  }

  private async checkWalletDeposits(wallet: StellarWallet) {
    const { Horizon } = await sdk();
    const server = new Horizon.Server(this.horizonUrl);

    let call = server
      .payments()
      .forAccount(wallet.publicKey)
      .order("asc")
      .limit(50);

    if (wallet.depositCursor) {
      call = call.cursor(wallet.depositCursor);
    }

    const { records } = await call.call();
    if (!records.length) return;

    let latestCursor = wallet.depositCursor;

    for (const record of records) {
      latestCursor = record.paging_token;

      // Only process incoming payments of the correct USDT asset
      if (record.type !== "payment") continue;
      const payment = record as any;
      if (payment.to !== wallet.publicKey) continue;
      if (payment.asset_code !== this.usdtCode || payment.asset_issuer !== this.usdtIssuer) continue;

      const amount = Math.floor(parseFloat(payment.amount));
      if (amount <= 0) continue;

      const opId = `stellar-deposit:${record.id}`;
      try {
        await this.bank.addMoney(wallet.characterId, amount, "stellar:deposit", opId, {
          label: "USDT deposit",
        });
        this.log.log(`Credited ${amount} for deposit ${record.id} to ${wallet.characterId}`);
      } catch (err: any) {
        // Duplicate requestId — already credited, safe to skip
        if (err.message?.includes("duplicate")) continue;
        throw err;
      }
    }

    if (latestCursor && latestCursor !== wallet.depositCursor) {
      await this.wallets.update(wallet.id, { depositCursor: latestCursor });
    }
  }
}
