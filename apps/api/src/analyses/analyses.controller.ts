import { Controller, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/guards/auth.guard";
import { AnalysesService } from "./analyses.service";

@Controller("analyses")
export class AnalysesController {
  constructor(private readonly analysesService: AnalysesService) {}

  /** The "AI Inbox": every analysis still awaiting a decision (get_pending_changes). */
  @Get("pending")
  findPending() {
    return this.analysesService.findPending();
  }

  @Post(":id/approve")
  approve(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.analysesService.review(id, "approve", user);
  }

  @Post(":id/reject")
  reject(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.analysesService.review(id, "reject", user);
  }
}
