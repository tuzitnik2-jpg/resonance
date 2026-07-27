import { Controller, Get } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../common/guards/auth.guard";
import { ContextService } from "./context.service";

@Controller("context")
export class ContextController {
  constructor(private readonly contextService: ContextService) {}

  @Get()
  getContext(@CurrentUser() user: AuthenticatedUser) {
    return this.contextService.getContext(user);
  }
}
