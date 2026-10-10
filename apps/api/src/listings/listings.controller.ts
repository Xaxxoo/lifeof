import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/auth.guard";
import { ListingsService } from "./listings.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class ListingsController {
  constructor(private listings: ListingsService) {}

  @Post("listings")
  createListing(
    @Req() req: { user: { token: string } },
    @Body() body: { homeId: string; kind: string; rentPerWeek: number; description?: string },
  ) {
    return this.listings.createListing(req.user.token, body.homeId, body.kind, body.rentPerWeek, body.description);
  }

  @Get("listings")
  browse(@Query("kind") kind?: string, @Query("maxRent") maxRent?: string) {
    return this.listings.browse({
      kind,
      maxRent: maxRent ? Number(maxRent) : undefined,
    });
  }

  @Post("listings/:id/apply")
  apply(
    @Req() req: { user: { token: string } },
    @Param("id") id: string,
    @Body() body: { message?: string },
  ) {
    return this.listings.apply(req.user.token, id, body.message);
  }

  @Get("listings/my-applications")
  myApplications(@Req() req: { user: { characterId: string } }) {
    return this.listings.myApplications(req.user.characterId);
  }

  @Get("listings/:id/applications")
  reviewApplications(
    @Req() req: { user: { token: string } },
    @Param("id") id: string,
  ) {
    return this.listings.reviewApplications(req.user.token, id);
  }

  @Post("listings/accept")
  acceptApplication(
    @Req() req: { user: { token: string } },
    @Body() body: { applicationId: string },
  ) {
    return this.listings.acceptApplication(req.user.token, body.applicationId);
  }

  @Post("listings/reject")
  rejectApplication(
    @Req() req: { user: { token: string } },
    @Body() body: { applicationId: string },
  ) {
    return this.listings.rejectApplication(req.user.token, body.applicationId);
  }

  @Post("listings/:id/close")
  closeListing(
    @Req() req: { user: { token: string } },
    @Param("id") id: string,
  ) {
    return this.listings.closeListing(req.user.token, id);
  }

  @Post("leases/:id/terminate")
  terminateLease(
    @Req() req: { user: { token: string } },
    @Param("id") id: string,
  ) {
    return this.listings.terminateLease(req.user.token, id);
  }

  @Get("leases/mine")
  myLeases(@Req() req: { user: { characterId: string } }) {
    return this.listings.myLeases(req.user.characterId);
  }
}
