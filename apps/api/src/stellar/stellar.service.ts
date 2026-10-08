import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { StellarWallet } from "../entities/stellar-wallet.entity";
import { BankService } from "../bank/bank.service";

/** Lazily-loaded Stellar SDK types. */
type StellarSdk = typeof import("@stellar/stellar-sdk");
let _sdk: StellarSdk | null = null;
async function sdk(): Promise<StellarSdk> {
  if (!_sdk) _sdk = await import("@stellar/stellar-sdk");
  return _sdk;
}

@Injectable()
export class StellarService {
  private readonly log = new Logger(StellarService.name);
  private readonly network: string;
  private readonly horizonUrl: string;
  private readonly usdtCode: string;
  private readonly usdtIssuer: string;
  private readonly masterPublic: string;
  private readonly masterSecret: string;
  private readonly encryptionKey: Buffer;
  private readonly minXlmFunding: string;

  constructor(
    private config: ConfigService,
    @InjectRepository(StellarWallet) private wallets: Repository<StellarWallet>,
    private bank: BankService,
  ) {
    this.network = config.get("STELLAR_NETWORK", "testnet");
    this.horizonUrl = config.get("STELLAR_HORIZON_URL", "https://horizon-testnet.stellar.org");
    this.usdtCode = config.get("STELLAR_USDT_CODE", "USDT");
    this.usdtIssuer = config.get("STELLAR_USDT_ISSUER", "");
    this.masterPublic = config.get("STELLAR_MASTER_PUBLIC", "");
    this.masterSecret = config.get("STELLAR_MASTER_SECRET", "");
    this.minXlmFunding = config.get("STELLAR_MIN_XLM_FUNDING", "2.5");

    const hexKey = config.get("STELLAR_ENCRYPTION_KEY", "");
    this.encryptionKey = hexKey ? Buffer.from(hexKey, "hex") : randomBytes(32);
  }

  // ── Encryption ──────────────────────────────────────────

  private encrypt(secret: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
  }

  private decrypt(stored: string): string {
    const parts = stored.split(":");
    const iv = Buffer.from(parts[0]!, "base64");
    const authTag = Buffer.from(parts[1]!, "base64");
    const data = Buffer.from(parts[2]!, "base64");
    const decipher = createDecipheriv("aes-256-gcm", this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(data) + decipher.final("utf8");
  }

  // ── Horizon helper ──────────────────────────────────────

  private async horizon() {
    const { Horizon } = await sdk();
    return new Horizon.Server(this.horizonUrl);
  }

  private async networkPassphrase(): Promise<string> {
    const { Networks } = await sdk();
    return this.network === "public" ? Networks.PUBLIC : Networks.TESTNET;
  }

  private usdtAsset() {
    // Returns a plain object; the SDK Asset is constructed where needed.
    return { code: this.usdtCode, issuer: this.usdtIssuer };
  }

  // ── Wallet creation ─────────────────────────────────────

  async createWallet(characterId: string) {
    const existing = await this.wallets.findOne({ where: { characterId } });
    if (existing) return this.walletDto(existing);

    const { Keypair } = await sdk();
    const kp = Keypair.random();

    const wallet = await this.wallets.save({
      characterId,
      publicKey: kp.publicKey(),
      encryptedSecret: this.encrypt(kp.secret()),
      funded: false,
      trustlineEstablished: false,
    });

    // Attempt funding + trustline in the background — failure is fine, retryable.
    this.fundAndTrust(wallet).catch((err) =>
      this.log.warn(`Initial funding failed for ${characterId}: ${err.message}`),
    );

    return this.walletDto(wallet);
  }

  private async fundAndTrust(wallet: StellarWallet) {
    if (!this.masterSecret) {
      this.log.warn("No STELLAR_MASTER_SECRET configured — skipping funding");
      return;
    }

    const { Keypair, TransactionBuilder, Operation, Asset } = await sdk();
    const server = await this.horizon();
    const passphrase = await this.networkPassphrase();
    const masterKp = Keypair.fromSecret(this.masterSecret);

    // 1. Fund the new account
    if (!wallet.funded) {
      const masterAccount = await server.loadAccount(masterKp.publicKey());
      const tx = new TransactionBuilder(masterAccount, {
        fee: "100",
        networkPassphrase: passphrase,
      })
        .addOperation(
          Operation.createAccount({
            destination: wallet.publicKey,
            startingBalance: this.minXlmFunding,
          }),
        )
        .setTimeout(30)
        .build();

      tx.sign(masterKp);
      await server.submitTransaction(tx);
      await this.wallets.update(wallet.id, { funded: true });
      wallet.funded = true;
      this.log.log(`Funded wallet ${wallet.publicKey} with ${this.minXlmFunding} XLM`);
    }

    // 2. Establish USDT trustline
    if (!wallet.trustlineEstablished && this.usdtIssuer) {
      const walletKp = Keypair.fromSecret(this.decrypt(wallet.encryptedSecret));
      const walletAccount = await server.loadAccount(wallet.publicKey);
      const tx = new TransactionBuilder(walletAccount, {
        fee: "100",
        networkPassphrase: passphrase,
      })
        .addOperation(
          Operation.changeTrust({
            asset: new Asset(this.usdtCode, this.usdtIssuer),
          }),
        )
        .setTimeout(30)
        .build();

      tx.sign(walletKp);
      await server.submitTransaction(tx);
      await this.wallets.update(wallet.id, { trustlineEstablished: true });
      wallet.trustlineEstablished = true;
      this.log.log(`Trustline established for ${wallet.publicKey}`);
    }
  }

  async retryFunding(characterId: string) {
    const wallet = await this.wallets.findOne({ where: { characterId } });
    if (!wallet) throw new BadRequestException("No wallet found");
    if (wallet.funded && wallet.trustlineEstablished) return this.walletDto(wallet);

    await this.fundAndTrust(wallet);
    const updated = await this.wallets.findOneOrFail({ where: { characterId } });
    return this.walletDto(updated);
  }

  // ── External address ────────────────────────────────────

  async setExternalAddress(characterId: string, address: string) {
    if (!/^G[A-Z2-7]{55}$/.test(address)) {
      throw new BadRequestException("Invalid Stellar address");
    }
    const wallet = await this.wallets.findOne({ where: { characterId } });
    if (!wallet) throw new BadRequestException("No wallet found");

    await this.wallets.update(wallet.id, { externalAddress: address });
  }

  // ── Balances ────────────────────────────────────────────

  async getStellarBalance(characterId: string) {
    const wallet = await this.wallets.findOne({ where: { characterId } });
    if (!wallet) throw new BadRequestException("No wallet found");
    if (!wallet.funded) return { xlm: "0", usdt: "0" };

    try {
      const server = await this.horizon();
      const account = await server.loadAccount(wallet.publicKey);
      let xlm = "0";
      let usdt = "0";
      for (const b of account.balances) {
        if (b.asset_type === "native") xlm = b.balance;
        if (
          "asset_code" in b &&
          b.asset_code === this.usdtCode &&
          "asset_issuer" in b &&
          b.asset_issuer === this.usdtIssuer
        ) {
          usdt = b.balance;
        }
      }
      return { xlm, usdt };
    } catch {
      return { xlm: "0", usdt: "0" };
    }
  }

  // ── Withdraw ────────────────────────────────────────────

  async withdraw(characterId: string, amount: number, requestId: string) {
    if (amount <= 0) throw new BadRequestException("Amount must be positive");

    const wallet = await this.wallets.findOne({ where: { characterId } });
    if (!wallet) throw new BadRequestException("No wallet found");
    if (!wallet.funded || !wallet.trustlineEstablished) {
      throw new BadRequestException("Wallet not fully set up");
    }
    if (!wallet.externalAddress) {
      throw new BadRequestException("No external address set");
    }

    // Debit in-game cash first
    await this.bank.addMoney(characterId, -amount, "stellar:withdraw", requestId, {
      label: "USDT withdrawal",
    });

    try {
      const { Keypair, TransactionBuilder, Operation, Asset } = await sdk();
      const server = await this.horizon();
      const passphrase = await this.networkPassphrase();
      const walletKp = Keypair.fromSecret(this.decrypt(wallet.encryptedSecret));

      const walletAccount = await server.loadAccount(wallet.publicKey);
      const tx = new TransactionBuilder(walletAccount, {
        fee: "100",
        networkPassphrase: passphrase,
      })
        .addOperation(
          Operation.payment({
            destination: wallet.externalAddress,
            asset: new Asset(this.usdtCode, this.usdtIssuer),
            amount: amount.toString(),
          }),
        )
        .setTimeout(30)
        .build();

      tx.sign(walletKp);
      const result = await server.submitTransaction(tx);
      this.log.log(`Withdrawal tx submitted: ${result.hash}`);
      return { txHash: result.hash };
    } catch (err: any) {
      // Refund on Stellar failure
      this.log.error(`Withdrawal failed, refunding: ${err.message}`);
      await this.bank.addMoney(characterId, amount, "stellar:withdraw-refund", `${requestId}:refund`, {
        label: "USDT withdrawal refund",
      });
      throw new BadRequestException("Stellar transaction failed — funds refunded");
    }
  }

  // ── Wallet info ─────────────────────────────────────────

  async getWalletInfo(characterId: string) {
    const wallet = await this.wallets.findOne({ where: { characterId } });
    if (!wallet) return null;
    const balances = wallet.funded ? await this.getStellarBalance(characterId) : { xlm: "0", usdt: "0" };
    return { ...this.walletDto(wallet), balances };
  }

  private walletDto(w: StellarWallet) {
    return {
      publicKey: w.publicKey,
      funded: w.funded,
      trustlineEstablished: w.trustlineEstablished,
      externalAddress: w.externalAddress,
    };
  }
}
