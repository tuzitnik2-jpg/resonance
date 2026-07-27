import { Controller, Get } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/guards/auth.guard";
import { StatsService } from "./stats.service";

@Controller("stats")
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.statsService.getStats(user);
  }
}
