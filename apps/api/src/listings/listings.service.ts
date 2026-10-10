import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Character } from "../entities/character.entity";
import { Listing } from "../entities/listing.entity";
import { Application } from "../entities/application.entity";
import { Lease } from "../entities/lease.entity";
import { Home } from "../entities/home.entity";
import { BankService } from "../bank/bank.service";

const CITY_FEE_RATE = 0.05;

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(Character) private characters: Repository<Character>,
    @InjectRepository(Listing) private listings: Repository<Listing>,
    @InjectRepository(Application) private applications: Repository<Application>,
    @InjectRepository(Lease) private leases: Repository<Lease>,
    @InjectRepository(Home) private homes: Repository<Home>,
    private bank: BankService,
  ) {}

  private async requireByToken(token: string): Promise<Character> {
    const c = await this.characters.findOne({ where: { token } });
    if (!c) throw new BadRequestException("No character for this session");
    return c;
  }

  async createListing(
    token: string,
    homeId: string,
    kind: string,
    rentPerWeek: number,
    description?: string,
  ) {
    const c = await this.requireByToken(token);
    const home = await this.homes.findOneBy({ id: homeId });
    if (!home) throw new BadRequestException("Home not found");
    if (home.ownerId !== c.id) throw new BadRequestException("You don't own this home");
    if (!["rental", "roommate"].includes(kind)) throw new BadRequestException("Invalid listing kind");
    if (rentPerWeek <= 0) throw new BadRequestException("Rent must be positive");

    const existing = await this.listings.findOne({
      where: { homeId, status: "open" },
    });
    if (existing) throw new BadRequestException("There's already an open listing for this home");

    return this.listings.save({
      homeId,
      landlordId: c.id,
      kind,
      rentPerWeek,
      description: description ?? null,
      status: "open",
      applicantCount: 0,
      createdAt: Date.now(),
      closedAt: null,
    });
  }

  async browse(filters?: { kind?: string; maxRent?: number }) {
    const query = this.listings
      .createQueryBuilder("l")
      .where("l.status = :status", { status: "open" })
      .orderBy("l.createdAt", "DESC");

    if (filters?.kind) query.andWhere("l.kind = :kind", { kind: filters.kind });
    if (filters?.maxRent) query.andWhere("l.rentPerWeek <= :maxRent", { maxRent: filters.maxRent });

    const rows = await query.take(50).getMany();
    const result = [];
    for (const listing of rows) {
      const landlord = await this.characters.findOneBy({ id: listing.landlordId });
      result.push({
        ...listing,
        landlordName: landlord?.name ?? "Unknown",
      });
    }
    return result;
  }

  async apply(token: string, listingId: string, message?: string) {
    const c = await this.requireByToken(token);
    const listing = await this.listings.findOneBy({ id: listingId });
    if (!listing) throw new BadRequestException("Listing not found");
    if (listing.status !== "open") throw new BadRequestException("Listing is closed");
    if (listing.landlordId === c.id) throw new BadRequestException("Can't apply to your own listing");

    const existing = await this.applications.findOne({
      where: { listingId, applicantId: c.id },
    });
    if (existing) throw new BadRequestException("You already applied");

    const app = await this.applications.save({
      listingId,
      applicantId: c.id,
      message: message ?? null,
      status: "pending",
      appliedAt: Date.now(),
    });

    await this.listings.update(listingId, {
      applicantCount: listing.applicantCount + 1,
    });

    return app;
  }

  async myApplications(characterId: string) {
    return this.applications.find({
      where: { applicantId: characterId },
      order: { appliedAt: "DESC" },
    });
  }

  async reviewApplications(token: string, listingId: string) {
    const c = await this.requireByToken(token);
    const listing = await this.listings.findOneBy({ id: listingId });
    if (!listing) throw new BadRequestException("Listing not found");
    if (listing.landlordId !== c.id) throw new BadRequestException("Not your listing");

    const apps = await this.applications.find({
      where: { listingId },
      order: { appliedAt: "ASC" },
    });

    const result = [];
    for (const app of apps) {
      const applicant = await this.characters.findOneBy({ id: app.applicantId });
      result.push({ ...app, applicantName: applicant?.name ?? "Unknown" });
    }
    return result;
  }

  async acceptApplication(token: string, applicationId: string) {
    const c = await this.requireByToken(token);
    const app = await this.applications.findOneBy({ id: applicationId });
    if (!app) throw new BadRequestException("Application not found");

    const listing = await this.listings.findOneBy({ id: app.listingId });
    if (!listing) throw new BadRequestException("Listing not found");
    if (listing.landlordId !== c.id) throw new BadRequestException("Not your listing");
    if (app.status !== "pending") throw new BadRequestException("Application already processed");

    // Create lease
    const lease = await this.leases.save({
      homeId: listing.homeId,
      tenantId: app.applicantId,
      landlordId: listing.landlordId,
      rentPerWeek: listing.rentPerWeek,
      status: "active",
      startedAt: Date.now(),
      endedAt: null,
    });

    // Update application and listing
    await this.applications.update(app.id, { status: "accepted" });
    await this.listings.update(listing.id, {
      status: "filled",
      closedAt: Date.now(),
    });

    // Reject remaining applications
    await this.applications
      .createQueryBuilder()
      .update()
      .set({ status: "rejected" })
      .where("listingId = :listingId AND id != :id AND status = 'pending'", {
        listingId: listing.id,
        id: app.id,
      })
      .execute();

    return lease;
  }

  async rejectApplication(token: string, applicationId: string) {
    const c = await this.requireByToken(token);
    const app = await this.applications.findOneBy({ id: applicationId });
    if (!app) throw new BadRequestException("Application not found");

    const listing = await this.listings.findOneBy({ id: app.listingId });
    if (!listing || listing.landlordId !== c.id) throw new BadRequestException("Not your listing");

    await this.applications.update(app.id, { status: "rejected" });
  }

  async closeListing(token: string, listingId: string) {
    const c = await this.requireByToken(token);
    const listing = await this.listings.findOneBy({ id: listingId });
    if (!listing) throw new BadRequestException("Listing not found");
    if (listing.landlordId !== c.id) throw new BadRequestException("Not your listing");

    await this.listings.update(listingId, {
      status: "closed",
      closedAt: Date.now(),
    });
  }

  async terminateLease(token: string, leaseId: string) {
    const c = await this.requireByToken(token);
    const lease = await this.leases.findOneBy({ id: leaseId });
    if (!lease) throw new BadRequestException("Lease not found");
    if (lease.tenantId !== c.id && lease.landlordId !== c.id) {
      throw new BadRequestException("Not your lease");
    }

    await this.leases.update(leaseId, {
      status: "terminated",
      endedAt: Date.now(),
    });
  }

  async myLeases(characterId: string) {
    return this.leases.find({
      where: [
        { tenantId: characterId, status: "active" },
        { landlordId: characterId, status: "active" },
      ],
      order: { startedAt: "DESC" },
    });
  }

  /** Housing lottery: 3 random winners from pending applications weekly. */
  async runLottery() {
    const pendingApps = await this.applications.find({
      where: { status: "pending" },
    });
    if (pendingApps.length === 0) return;

    // Shuffle and pick 3
    const shuffled = pendingApps.sort(() => Math.random() - 0.5);
    const winners = shuffled.slice(0, 3);

    for (const app of winners) {
      const listing = await this.listings.findOneBy({ id: app.listingId });
      if (!listing || listing.status !== "open") continue;

      const discountedRent = Math.floor(Number(listing.rentPerWeek) * 0.5);

      const lease = await this.leases.save({
        homeId: listing.homeId,
        tenantId: app.applicantId,
        landlordId: listing.landlordId,
        rentPerWeek: discountedRent,
        status: "active",
        startedAt: Date.now(),
        endedAt: null,
      });

      await this.applications.update(app.id, { status: "accepted" });
      await this.listings.update(listing.id, { status: "filled", closedAt: Date.now() });
    }
  }

  /** Collect rent for player-landlord leases. Called from BankService.collectRent(). */
  async collectLandlordRent() {
    const activeLeases = await this.leases.find({ where: { status: "active" } });
    for (const lease of activeLeases) {
      const tenant = await this.characters.findOneBy({ id: lease.tenantId });
      if (!tenant) continue;

      const rent = Number(lease.rentPerWeek);
      if (Number(tenant.cash) < rent) continue;

      const cityFee = Math.round(rent * CITY_FEE_RATE);
      const landlordPay = rent - cityFee;
      const now = Date.now();

      await this.bank.addMoney(
        lease.tenantId,
        -rent,
        "lease:rent",
        `lease-rent:${lease.id}:${now}`,
        { label: "Rent to landlord" },
      );

      await this.bank.addMoney(
        lease.landlordId,
        landlordPay,
        "lease:income",
        `lease-income:${lease.id}:${now}`,
        { label: "Rental income (minus 5% city fee)" },
      );
    }
  }
}
